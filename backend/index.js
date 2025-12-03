// ============================================
// VOICORY BACKEND - MODULAR ENTRY POINT
// Production-Grade Multi-Million Dollar SaaS Architecture
// ============================================

// Early startup logging for Railway debugging
console.log('🚀 Starting Voicory Backend...');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('   Time:', new Date().toISOString());

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const { createClient } = require('@supabase/supabase-js');

// Load env in development (Railway sets NODE_ENV=production automatically)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ set' : '✗ missing');
console.log('   SUPABASE_KEY:', (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY) ? '✓ set' : '✗ missing');

// ============================================
// SECURITY STACK
// ============================================
const { 
    verifySupabaseAuth, 
    optionalSupabaseAuth,
    rateLimit, 
    auditLog 
} = require('./lib/auth');
const { 
    sanitizeRequest
} = require('./lib/validators');
const { 
    securityHeaders, 
    requestId, 
    requestTimeout, 
    ipBlocker, 
    injectionDetector 
} = require('./lib/security');

// ============================================
// ROUTES
// ============================================
const healthRoutes = require('./routes/health');
const crawlerRoutes = require('./routes/crawler');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const twilioRoutes = require('./routes/twilio');
const aiRoutes = require('./routes/ai');
const testChatRoutes = require('./routes/testChat');
const whatsappOAuthRoutes = require('./routes/whatsappOAuth');
const whatsappWebhookRoutes = require('./routes/whatsappWebhook');
const paymentRoutes = require('./routes/payments');
const couponRoutes = require('./routes/coupons');
const adminRoutes = require('./routes/admin');
const widgetRoutes = require('./routes/widget');

// ============================================
// UTILITIES
// ============================================
const { setupGracefulShutdown } = require('./utils/shutdown');

// ============================================
// INITIALIZE SUPABASE
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase = null;
let supabaseConfigured = false;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration!');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✓ set' : '✗ missing');
    console.error('   SUPABASE_KEY:', supabaseKey ? '✓ set' : '✗ missing');
    console.error('   Server will start but API routes will fail.');
} else {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseConfigured = true;
    console.log('✅ Supabase client initialized');
}

// ============================================
// EXPRESS APP SETUP
// ============================================
const app = express();
const port = process.env.PORT || 3001;

// ============================================
// SECURITY MIDDLEWARE (Order matters!)
// ============================================

// 1. Trust proxy for correct IP detection behind Railway/Vercel
app.set('trust proxy', 1);

// 2. Request ID for tracing
app.use(requestId);

// 3. IP blocking for banned IPs
app.use(ipBlocker());

// 4. Request timeout (30 seconds)
app.use(requestTimeout(30000));

// 5. Helmet - Sets various HTTP headers for security
app.use(helmet({
    contentSecurityPolicy: false, // We handle CSP in securityHeaders
    crossOriginEmbedderPolicy: false, // Needed for some integrations
}));

// 6. Our custom security headers (CSP, etc.)
app.use(securityHeaders({ isDevelopment: process.env.NODE_ENV !== 'production' }));

// 7. HPP - Protect against HTTP Parameter Pollution attacks
app.use(hpp());

// 8. CORS with strict origin checking
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://voicory.vercel.app',
        'https://voicory.com',
        /\.vercel\.app$/,
        /\.railway\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400 // Cache preflight for 24 hours
}));

// 9. Body parsers with size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 10. Sanitize requests (prototype pollution protection)
app.use(sanitizeRequest);

// 11. Injection detection (SQL, XSS)
app.use(injectionDetector);

// 12. Rate limiters (defined but applied per-route below)
const apiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,            // 100 requests per minute
    keyGenerator: (req) => req.userId || req.ip,
    message: { error: 'Too many requests', message: 'Please try again later' }
});

const strictRateLimit = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 10,              // 10 requests per minute (for expensive operations)
    keyGenerator: (req) => req.userId || req.ip,
    message: { error: 'Rate limit exceeded', message: 'This operation is rate limited' }
});

const webhookRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,            // High limit for webhooks
    keyGenerator: (req) => req.ip
});

console.log('✅ Security middleware stack initialized');

// ============================================
// STRUCTURED REQUEST LOGGING
// ============================================
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userId: req.userId || 'anonymous',
            requestId: req.requestId
        };
        
        // Only log non-health endpoints and errors
        if (!req.path.includes('/health') && (res.statusCode >= 400 || duration > 5000)) {
            console.log(JSON.stringify(logData));
        }
    });
    
    next();
});

// ============================================
// MOUNT ROUTES WITH APPROPRIATE RATE LIMITS
// ============================================

// Health routes - no rate limit
app.use('/', healthRoutes);

// API routes with standard rate limit
app.use('/api/crawler', apiRateLimit, crawlerRoutes);
app.use('/api/knowledge-base', apiRateLimit, knowledgeBaseRoutes);
app.use('/api/twilio', apiRateLimit, twilioRoutes);
app.use('/api', apiRateLimit, aiRoutes);
app.use('/api', apiRateLimit, testChatRoutes);
app.use('/api/whatsapp', apiRateLimit, whatsappOAuthRoutes);
app.use('/api/coupons', apiRateLimit, couponRoutes);
app.use('/api/admin', apiRateLimit, adminRoutes);

// Payment routes with stricter rate limit (prevent abuse)
app.use('/api/payments', strictRateLimit, paymentRoutes);

// Webhook routes with higher limits (incoming from external services)
app.use('/api/webhooks/twilio', webhookRateLimit, twilioRoutes);
app.use('/api/webhooks/whatsapp', webhookRateLimit, whatsappWebhookRoutes);
app.use('/api/webhooks', webhookRateLimit, paymentRoutes);

// Widget routes (public API with API key auth) - widget has its own rate limiting
app.use('/api/widget', widgetRoutes);

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    // Log error (but mask sensitive data)
    console.error({
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        path: req.path,
        method: req.method,
        requestId: req.requestId,
        userId: req.userId
    });

    // Don't leak error details in production
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
        message,
        requestId: req.requestId
    });
});

// ============================================
// START SERVER WITH GRACEFUL SHUTDOWN
// ============================================
const server = setupGracefulShutdown(app, supabase, port);

module.exports = { app, server };
