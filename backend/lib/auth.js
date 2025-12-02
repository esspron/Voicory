/**
 * Authentication & Authorization Middleware
 * Protects backend routes from unauthorized access
 * 
 * Supports:
 * - Supabase JWT verification (for dashboard users)
 * - API key authentication (for external integrations)
 * - Webhook signature verification (for Twilio, Stripe, etc.)
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client for auth verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}

/**
 * Verify Supabase JWT and attach user to request
 * Use this for routes that require authenticated dashboard users
 * 
 * @example
 * app.post('/api/protected', verifySupabaseAuth, (req, res) => {
 *   console.log(req.user.id); // Authenticated user ID
 * });
 */
async function verifySupabaseAuth(req, res, next) {
    const token = extractBearerToken(req);
    
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header'
        });
    }
    
    if (!supabase) {
        console.error('Supabase not configured for auth verification');
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Authentication service unavailable'
        });
    }
    
    try {
        // Verify the JWT and get user
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }
        
        // Attach user to request for downstream handlers
        req.user = user;
        req.userId = user.id;
        req.userEmail = user.email;
        
        next();
    } catch (error) {
        console.error('Auth verification error:', error.message);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token verification failed'
        });
    }
}

/**
 * Optional auth - attaches user if token present, but doesn't block
 * Use for routes that work for both authenticated and anonymous users
 */
async function optionalSupabaseAuth(req, res, next) {
    const token = extractBearerToken(req);
    
    if (token && supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                req.user = user;
                req.userId = user.id;
                req.userEmail = user.email;
            }
        } catch {
            // Ignore errors - user remains unauthenticated
        }
    }
    
    next();
}

/**
 * Verify API key from database
 * Use for external API integrations
 * 
 * Expects header: X-API-Key: <api_key>
 */
async function verifyApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing X-API-Key header'
        });
    }
    
    if (!supabase) {
        return res.status(500).json({
            error: 'Server configuration error'
        });
    }
    
    try {
        // Look up API key in database
        const { data: keyRecord, error } = await supabase
            .from('api_keys')
            .select('id, user_id, name, permissions, is_active, last_used_at')
            .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
            .eq('is_active', true)
            .single();
        
        if (error || !keyRecord) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API key'
            });
        }
        
        // Update last used timestamp (async, don't wait)
        supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyRecord.id)
            .then(() => {});
        
        // Attach to request
        req.apiKey = keyRecord;
        req.userId = keyRecord.user_id;
        req.permissions = keyRecord.permissions || [];
        
        next();
    } catch (error) {
        console.error('API key verification error:', error.message);
        return res.status(500).json({
            error: 'Authentication failed'
        });
    }
}

/**
 * Verify Twilio webhook signature
 * CRITICAL: Always verify Twilio signatures to prevent spoofed webhooks
 * 
 * @param {string} authToken - Twilio Auth Token for verification
 */
function createTwilioSignatureVerifier(getAuthToken) {
    return async (req, res, next) => {
        const signature = req.headers['x-twilio-signature'];
        
        if (!signature) {
            console.warn('Twilio webhook missing signature');
            return res.status(403).json({ error: 'Missing Twilio signature' });
        }
        
        try {
            // Get the auth token for this webhook
            const authToken = await getAuthToken(req);
            
            if (!authToken) {
                console.error('Could not retrieve auth token for Twilio verification');
                return res.status(500).json({ error: 'Verification failed' });
            }
            
            // Build the URL Twilio used to sign
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            const url = `${protocol}://${host}${req.originalUrl}`;
            
            // Calculate expected signature
            const params = req.body;
            const data = url + Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], '');
            
            const expectedSignature = crypto
                .createHmac('sha1', authToken)
                .update(Buffer.from(data, 'utf-8'))
                .digest('base64');
            
            // Timing-safe comparison
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
            
            if (!isValid) {
                console.warn('Invalid Twilio signature');
                return res.status(403).json({ error: 'Invalid signature' });
            }
            
            next();
        } catch (error) {
            console.error('Twilio signature verification error:', error.message);
            return res.status(500).json({ error: 'Signature verification failed' });
        }
    };
}

/**
 * Verify Stripe webhook signature
 */
function verifyStripeSignature(webhookSecret) {
    return (req, res, next) => {
        const signature = req.headers['stripe-signature'];
        
        if (!signature || !webhookSecret) {
            return res.status(403).json({ error: 'Missing signature' });
        }
        
        try {
            // Stripe uses raw body for signature verification
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const event = stripe.webhooks.constructEvent(
                req.rawBody || req.body,
                signature,
                webhookSecret
            );
            
            req.stripeEvent = event;
            next();
        } catch (error) {
            console.error('Stripe signature error:', error.message);
            return res.status(403).json({ error: 'Invalid signature' });
        }
    };
}

/**
 * Check if user has required permission
 * Use after verifySupabaseAuth or verifyApiKey
 */
function requirePermission(...permissions) {
    return (req, res, next) => {
        const userPermissions = req.permissions || ['*']; // Supabase users have all permissions
        
        // Check if user has any of the required permissions
        const hasPermission = permissions.some(p => 
            userPermissions.includes('*') || userPermissions.includes(p)
        );
        
        if (!hasPermission) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Missing required permission: ${permissions.join(' or ')}`
            });
        }
        
        next();
    };
}

/**
 * Rate limiting by user/IP
 * Simple in-memory rate limiter (use Redis for production scale)
 */
const rateLimitStore = new Map();

function rateLimit({ windowMs = 60000, max = 100, keyGenerator } = {}) {
    return (req, res, next) => {
        const key = keyGenerator ? keyGenerator(req) : (req.userId || req.ip);
        const now = Date.now();
        
        // Clean old entries
        const windowStart = now - windowMs;
        let record = rateLimitStore.get(key);
        
        if (!record || record.windowStart < windowStart) {
            record = { windowStart: now, count: 0 };
        }
        
        record.count++;
        rateLimitStore.set(key, record);
        
        // Set headers
        res.set('X-RateLimit-Limit', max);
        res.set('X-RateLimit-Remaining', Math.max(0, max - record.count));
        res.set('X-RateLimit-Reset', new Date(record.windowStart + windowMs).toISOString());
        
        if (record.count > max) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again in ${Math.ceil((record.windowStart + windowMs - now) / 1000)} seconds.`
            });
        }
        
        next();
    };
}

/**
 * Request logging middleware with audit trail
 */
function auditLog(action) {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Log after response
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const logEntry = {
                timestamp: new Date().toISOString(),
                action,
                userId: req.userId || 'anonymous',
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip || req.headers['x-forwarded-for'],
                userAgent: req.headers['user-agent']
            };
            
            // In production, send to logging service
            if (res.statusCode >= 400) {
                console.warn('AUDIT:', JSON.stringify(logEntry));
            } else {
                console.log('AUDIT:', JSON.stringify(logEntry));
            }
        });
        
        next();
    };
}

module.exports = {
    verifySupabaseAuth,
    optionalSupabaseAuth,
    verifyApiKey,
    createTwilioSignatureVerifier,
    verifyStripeSignature,
    requirePermission,
    rateLimit,
    auditLog,
    extractBearerToken
};
