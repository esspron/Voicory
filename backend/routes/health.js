// ============================================
// HEALTH ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const { getRedis } = require('../services/cache');

// Basic status
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Voicory Backend',
        timestamp: new Date().toISOString()
    });
});

// Detailed health check
router.get('/health', async (req, res) => {
    const redis = getRedis();
    let redisStatus = 'not configured';
    let redisLatency = null;
    let redisMode = null;
    
    if (redis) {
        try {
            const start = Date.now();
            await redis.ping();
            redisLatency = Date.now() - start;
            redisStatus = 'connected';
            redisMode = redis._isIoRedis ? 'TCP (ioredis)' : 'HTTP (@upstash/redis)';
        } catch (err) {
            redisStatus = 'error: ' + err.message;
        }
    }
    
    res.json({ 
        status: 'healthy',
        redis: {
            status: redisStatus,
            mode: redisMode,
            latency: redisLatency ? `${redisLatency}ms` : null,
            region: 'Mumbai (ap-south-1)'
        },
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
    });
});

module.exports = router;
