// ============================================
// VOICORY BACKEND - MODULAR ENTRY POINT
// Production-Grade Multi-Million Dollar SaaS Architecture
// ============================================

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Load env in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

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

// ============================================
// UTILITIES
// ============================================
const { setupGracefulShutdown } = require('./utils/shutdown');

// ============================================
// INITIALIZE SUPABASE
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// EXPRESS APP SETUP
// ============================================
const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.set('trust proxy', 1);
app.use(requestId);
app.use(ipBlocker());
app.use(requestTimeout(30000));
app.use(securityHeaders({ isDevelopment: process.env.NODE_ENV !== 'production' }));

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://voicory.vercel.app',
        'https://voicory.com',
        /\.vercel\.app$/,
        /\.railway\.app$/
    ],
    credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeRequest);
app.use(injectionDetector);

// Rate limiters
const apiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (req) => req.userId || req.ip
});

const webhookRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    keyGenerator: (req) => req.ip
});

console.log('✅ Security middleware stack initialized');

// ============================================
// MOUNT ROUTES
// ============================================
app.use('/', healthRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/webhooks/twilio', twilioRoutes);
app.use('/api', aiRoutes);
app.use('/api', testChatRoutes);
app.use('/api/whatsapp', whatsappOAuthRoutes);
app.use('/api/webhooks/whatsapp', whatsappWebhookRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// START SERVER WITH GRACEFUL SHUTDOWN
// ============================================
const server = setupGracefulShutdown(app, supabase, port);

module.exports = { app, server };
