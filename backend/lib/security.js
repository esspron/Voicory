/**
 * Security Headers & Hardening Middleware
 * Enterprise-grade security configuration
 */

const crypto = require('crypto');

/**
 * Generate CSP nonce for inline scripts
 */
function generateNonce() {
    return crypto.randomBytes(16).toString('base64');
}

/**
 * Security headers middleware
 * Comprehensive protection against common web vulnerabilities
 */
function securityHeaders(options = {}) {
    const {
        // Allow customization per environment
        isDevelopment = process.env.NODE_ENV === 'development',
        allowedOrigins = [],
        reportUri = null
    } = options;
    
    return (req, res, next) => {
        // Generate nonce for this request
        const nonce = generateNonce();
        req.cspNonce = nonce;
        
        // ============================================
        // Content Security Policy
        // ============================================
        const cspDirectives = [
            "default-src 'self'",
            `script-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-eval'" : ''}`,
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https: blob:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.twilio.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            "upgrade-insecure-requests"
        ];
        
        if (reportUri) {
            cspDirectives.push(`report-uri ${reportUri}`);
        }
        
        res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
        
        // ============================================
        // Clickjacking Protection
        // ============================================
        res.setHeader('X-Frame-Options', 'DENY');
        
        // ============================================
        // XSS Protection (legacy browsers)
        // ============================================
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // ============================================
        // MIME Type Sniffing Protection
        // ============================================
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // ============================================
        // Referrer Policy
        // ============================================
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // ============================================
        // Permissions Policy (formerly Feature-Policy)
        // ============================================
        res.setHeader('Permissions-Policy', [
            'geolocation=()',
            'microphone=(self)',  // Allow for voice features
            'camera=()',
            'payment=()',
            'usb=()',
            'magnetometer=()',
            'gyroscope=()',
            'accelerometer=()'
        ].join(', '));
        
        // ============================================
        // HSTS (HTTP Strict Transport Security)
        // ============================================
        if (!isDevelopment) {
            res.setHeader(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }
        
        // ============================================
        // Remove Server Banner
        // ============================================
        res.removeHeader('X-Powered-By');
        res.setHeader('Server', 'Voicory');
        
        // ============================================
        // Cache Control for Sensitive Data
        // ============================================
        if (req.path.includes('/api/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        
        // ============================================
        // Cross-Origin Headers
        // ============================================
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        
        next();
    };
}

/**
 * CORS configuration with security best practices
 */
function corsConfig(options = {}) {
    const {
        allowedOrigins = [],
        allowCredentials = true,
        maxAge = 86400 // 24 hours
    } = options;
    
    // Default allowed origins from environment
    const defaultOrigins = [
        process.env.FRONTEND_URL,
        'https://voicory.vercel.app',
        'https://www.voicory.com',
        'https://voicory.com'
    ].filter(Boolean);
    
    const origins = [...new Set([...defaultOrigins, ...allowedOrigins])];
    
    return (req, res, next) => {
        const origin = req.headers.origin;
        
        // Check if origin is allowed
        if (origin && origins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
        }
        
        // Preflight request handling
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', [
                'Content-Type',
                'Authorization',
                'X-API-Key',
                'X-Request-ID',
                'X-Twilio-Signature'
            ].join(', '));
            res.setHeader('Access-Control-Max-Age', maxAge.toString());
            
            if (allowCredentials) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            
            return res.status(204).end();
        }
        
        if (allowCredentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        next();
    };
}

/**
 * Request ID middleware for tracing
 */
function requestId(req, res, next) {
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
}

/**
 * Request timeout middleware
 */
function requestTimeout(timeoutMs = 30000) {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: 'Request Timeout',
                    message: 'The request took too long to process'
                });
            }
        }, timeoutMs);
        
        res.on('finish', () => clearTimeout(timeout));
        res.on('close', () => clearTimeout(timeout));
        
        next();
    };
}

/**
 * IP-based blocking for suspicious activity
 */
const blockedIPs = new Set();
const suspiciousActivity = new Map();

function ipBlocker(options = {}) {
    const {
        maxSuspiciousRequests = 10,
        windowMs = 60000,
        blockDurationMs = 3600000 // 1 hour
    } = options;
    
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
        
        if (!ip) {
            return next();
        }
        
        // Check if IP is blocked
        if (blockedIPs.has(ip)) {
            console.warn(`Blocked request from banned IP: ${ip}`);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Your IP has been temporarily blocked'
            });
        }
        
        next();
    };
}

/**
 * Mark IP as suspicious (call on failed auth, injection attempts, etc.)
 */
function markSuspicious(ip, reason) {
    if (!ip) return;
    
    const record = suspiciousActivity.get(ip) || { count: 0, firstSeen: Date.now() };
    record.count++;
    record.lastReason = reason;
    record.lastSeen = Date.now();
    
    suspiciousActivity.set(ip, record);
    
    console.warn(`Suspicious activity from ${ip}: ${reason} (count: ${record.count})`);
    
    // Auto-block after threshold
    if (record.count >= 10) {
        blockedIPs.add(ip);
        console.error(`IP blocked due to suspicious activity: ${ip}`);
        
        // Auto-unblock after duration
        setTimeout(() => {
            blockedIPs.delete(ip);
            suspiciousActivity.delete(ip);
            console.log(`IP unblocked: ${ip}`);
        }, 3600000);
    }
}

/**
 * Body size limiter
 */
function bodySizeLimit(maxSize = '1mb') {
    const sizes = {
        'kb': 1024,
        'mb': 1024 * 1024,
        'gb': 1024 * 1024 * 1024
    };
    
    let maxBytes;
    if (typeof maxSize === 'number') {
        maxBytes = maxSize;
    } else {
        const match = maxSize.match(/^(\d+)(kb|mb|gb)?$/i);
        if (match) {
            const [, num, unit] = match;
            maxBytes = parseInt(num) * (sizes[unit?.toLowerCase()] || 1);
        } else {
            maxBytes = 1024 * 1024; // Default 1MB
        }
    }
    
    return (req, res, next) => {
        let size = 0;
        
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                req.destroy();
                if (!res.headersSent) {
                    res.status(413).json({
                        error: 'Payload Too Large',
                        message: `Request body exceeds ${maxSize} limit`
                    });
                }
            }
        });
        
        next();
    };
}

/**
 * SQL injection pattern detection
 */
const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(--|\#|\/\*)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(;.*\b(DROP|DELETE|UPDATE)\b)/i
];

/**
 * XSS pattern detection
 */
const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i
];

/**
 * Injection detection middleware
 */
function injectionDetector(req, res, next) {
    const checkValue = (value, patterns, type) => {
        if (typeof value !== 'string') return false;
        return patterns.some((pattern) => pattern.test(value));
    };
    
    const checkObject = (obj, patterns, type) => {
        if (!obj || typeof obj !== 'object') return false;
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                if (checkValue(value, patterns, type)) {
                    return { key, value, type };
                }
            } else if (typeof value === 'object') {
                const result = checkObject(value, patterns, type);
                if (result) return result;
            }
        }
        return false;
    };
    
    // Check body
    const sqlInjection = checkObject(req.body, sqlInjectionPatterns, 'SQL Injection');
    if (sqlInjection) {
        markSuspicious(req.ip, `SQL Injection attempt in ${sqlInjection.key}`);
        return res.status(400).json({
            error: 'Invalid input',
            message: 'Request contains potentially harmful content'
        });
    }
    
    const xssAttempt = checkObject(req.body, xssPatterns, 'XSS');
    if (xssAttempt) {
        markSuspicious(req.ip, `XSS attempt in ${xssAttempt.key}`);
        return res.status(400).json({
            error: 'Invalid input',
            message: 'Request contains potentially harmful content'
        });
    }
    
    // Check query params
    const queryXss = checkObject(req.query, xssPatterns, 'XSS');
    if (queryXss) {
        markSuspicious(req.ip, `XSS attempt in query param ${queryXss.key}`);
        return res.status(400).json({
            error: 'Invalid input',
            message: 'Request contains potentially harmful content'
        });
    }
    
    next();
}

module.exports = {
    securityHeaders,
    corsConfig,
    requestId,
    requestTimeout,
    ipBlocker,
    markSuspicious,
    bodySizeLimit,
    injectionDetector,
    generateNonce
};
