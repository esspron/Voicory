// ============================================
// REDIS CACHE SERVICE (Upstash - HTTP-based)
// ============================================

let redis = null;
const CACHE_TTL = {
    ASSISTANT: 300,      // 5 minutes
    PHONE_CONFIG: 600,   // 10 minutes  
    WHATSAPP_CONFIG: 300, // 5 minutes
    CUSTOMER: 180,       // 3 minutes
    MESSAGE_DEDUP: 3600  // 1 hour for deduplication
};

// Initialize Upstash Redis (HTTP-based - recommended for production)
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Upstash Redis initialized (HTTP mode - Mumbai)');
} else if (process.env.REDIS_URL) {
    const IoRedis = require('ioredis');
    let redisUrl = process.env.REDIS_URL;
    if (redisUrl.startsWith('redis://') && !redisUrl.includes('localhost')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
        console.log('⚠️ Upgraded to TLS connection (rediss://)');
    }
    
    redis = new IoRedis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        connectTimeout: 5000,
        commandTimeout: 1000,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        lazyConnect: true
    });
    
    redis.on('connect', () => console.log('✅ Redis connected via TCP (Mumbai)'));
    redis.on('error', (err) => console.error('Redis TCP error:', err.message));
    
    redis.connect().catch(err => {
        console.warn('⚠️ Redis TCP connection failed:', err.message);
        redis = null;
    });
    
    redis._isIoRedis = true;
} else {
    console.warn('⚠️ No Redis configured - running without cache (slower)');
}

// ============================================
// CACHE HELPER FUNCTIONS
// ============================================

async function cacheGet(key) {
    if (!redis) return null;
    try {
        const data = await redis.get(key);
        if (!data) return null;
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (err) {
        console.error('Cache get error:', err.message);
        return null;
    }
}

async function cacheSet(key, value, ttl = 300) {
    if (!redis) return;
    try {
        const stringValue = JSON.stringify(value);
        if (redis._isIoRedis) {
            await redis.setex(key, ttl, stringValue);
        } else {
            await redis.set(key, stringValue, { ex: ttl });
        }
    } catch (err) {
        console.error('Cache set error:', err.message);
    }
}

async function cacheDelete(key) {
    if (!redis) return;
    try {
        await redis.del(key);
    } catch (err) {
        console.error('Cache delete error:', err.message);
    }
}

async function isMessageProcessed(messageId) {
    if (!redis) return false;
    try {
        const exists = await redis.exists(`msg:${messageId}`);
        return exists === 1 || exists === true;
    } catch (err) {
        return false;
    }
}

async function markMessageProcessed(messageId) {
    if (!redis) return;
    try {
        if (redis._isIoRedis) {
            await redis.setex(`msg:${messageId}`, CACHE_TTL.MESSAGE_DEDUP, '1');
        } else {
            await redis.set(`msg:${messageId}`, '1', { ex: CACHE_TTL.MESSAGE_DEDUP });
        }
    } catch (err) {
        console.error('Cache mark message error:', err.message);
    }
}

function getRedis() {
    return redis;
}

module.exports = {
    redis,
    CACHE_TTL,
    cacheGet,
    cacheSet,
    cacheDelete,
    isMessageProcessed,
    markMessageProcessed,
    getRedis
};
