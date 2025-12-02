/**
 * Security Stack Integration
 * Central configuration for all security middleware
 * 
 * Import this file in index.js to enable enterprise-grade security
 */

const { verifySupabaseAuth, optionalSupabaseAuth, verifyApiKey, rateLimit, auditLog } = require('./auth');
const { validateBody, validateQuery, sanitizeRequest, twilioImportSchema, assistantSchema } = require('./validators');
const { securityHeaders, corsConfig, requestId, requestTimeout, ipBlocker, injectionDetector, bodySizeLimit } = require('./security');
const { encrypt, decrypt, mask } = require('./crypto');

// ============================================
// Security Middleware Stack (apply in order)
// ============================================

/**
 * Apply all security middleware to an Express app
 * Call this early in your app setup, before routes
 * 
 * @example
 * const { applySecurityStack } = require('./lib/securityStack');
 * applySecurityStack(app);
 */
function applySecurityStack(app, options = {}) {
    const {
        isDevelopment = process.env.NODE_ENV === 'development',
        trustProxy = true
    } = options;
    
    // Trust proxy for correct IP detection behind Railway/Vercel
    if (trustProxy) {
        app.set('trust proxy', 1);
    }
    
    // 1. Request ID for tracing
    app.use(requestId);
    
    // 2. IP blocking for banned IPs
    app.use(ipBlocker());
    
    // 3. Request timeout
    app.use(requestTimeout(30000));
    
    // 4. Body size limit (prevent DoS)
    app.use(bodySizeLimit('5mb'));
    
    // 5. Security headers (CSP, HSTS, etc.)
    app.use(securityHeaders({ isDevelopment }));
    
    // 6. CORS with strict origin checking
    app.use(corsConfig());
    
    // 7. JSON body parser (after size limit)
    const express = require('express');
    app.use(express.json({ limit: '5mb' }));
    
    // 8. URL-encoded parser for webhooks
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    
    // 9. Sanitize all requests (prototype pollution protection)
    app.use(sanitizeRequest);
    
    // 10. Injection detection
    app.use(injectionDetector);
    
    console.log('✅ Security stack applied');
}

/**
 * Create rate limiters for different routes
 */
const rateLimiters = {
    // Strict rate limit for auth endpoints
    auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        keyGenerator: (req) => req.ip
    }),
    
    // Standard API rate limit
    api: rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 requests per minute
        keyGenerator: (req) => req.userId || req.ip
    }),
    
    // Webhook rate limit (higher for Twilio/WhatsApp)
    webhook: rateLimit({
        windowMs: 60 * 1000,
        max: 1000, // High limit for webhooks
        keyGenerator: (req) => req.ip
    })
};

/**
 * Route protection presets
 */
const protect = {
    // Requires valid Supabase JWT
    authenticated: verifySupabaseAuth,
    
    // Requires API key header
    apiKey: verifyApiKey,
    
    // Optional auth - adds user if token present
    optional: optionalSupabaseAuth
};

/**
 * Audit logging presets
 */
const audit = {
    sensitive: auditLog('SENSITIVE_ACCESS'),
    crud: auditLog('DATA_CHANGE'),
    auth: auditLog('AUTH_EVENT')
};

/**
 * Validation presets
 */
const validate = {
    twilioImport: validateBody(twilioImportSchema),
    assistant: validateBody(assistantSchema)
};

module.exports = {
    applySecurityStack,
    rateLimiters,
    protect,
    audit,
    validate,
    encrypt,
    decrypt,
    mask,
    
    // Re-export individual modules for custom usage
    auth: require('./auth'),
    validators: require('./validators'),
    security: require('./security'),
    crypto: require('./crypto')
};
