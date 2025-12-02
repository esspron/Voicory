/**
 * Input Validation & Sanitization
 * Prevents injection attacks and ensures data integrity
 * 
 * Uses Zod for schema validation - type-safe and performant
 */

const { z } = require('zod');

// ============================================
// Common Validation Patterns
// ============================================

/**
 * UUID v4 pattern - for Supabase IDs
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * E.164 phone number format
 * Examples: +14155552671, +919876543210
 */
const phoneNumberSchema = z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number format. Use E.164 format (e.g., +14155552671)');

/**
 * Safe string - no script injection
 * Strips HTML and limits length
 */
const safeStringSchema = (maxLength = 1000) =>
    z
        .string()
        .max(maxLength, `String must be ${maxLength} characters or less`)
        .transform((val) => val.replace(/<[^>]*>/g, '').trim());

/**
 * Email validation with normalization
 */
const emailSchema = z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim());

/**
 * URL validation
 */
const urlSchema = z.string().url('Invalid URL');

/**
 * Webhook URL - must be HTTPS in production
 */
const webhookUrlSchema = z
    .string()
    .url('Invalid URL')
    .refine(
        (url) => {
            if (process.env.NODE_ENV === 'production') {
                return url.startsWith('https://');
            }
            return true;
        },
        { message: 'Webhook URL must use HTTPS in production' }
    );

// ============================================
// Phone Number Import Schemas
// ============================================

/**
 * Twilio phone number import validation
 */
const twilioImportSchema = z.object({
    user_id: uuidSchema,
    phone_number: phoneNumberSchema,
    twilio_account_sid: z
        .string()
        .regex(/^AC[a-f0-9]{32}$/, 'Invalid Twilio Account SID format'),
    twilio_auth_token: z
        .string()
        .min(32, 'Auth token too short')
        .max(64, 'Auth token too long'),
    friendly_name: safeStringSchema(100).optional(),
    voice_url: webhookUrlSchema.optional(),
    sms_url: webhookUrlSchema.optional()
});

/**
 * Plivo phone number import validation
 */
const plivoImportSchema = z.object({
    user_id: uuidSchema,
    phone_number: phoneNumberSchema,
    plivo_auth_id: z
        .string()
        .regex(/^[A-Z0-9]{20}$/, 'Invalid Plivo Auth ID format'),
    plivo_auth_token: z
        .string()
        .min(30, 'Auth token too short')
        .max(50, 'Auth token too long'),
    friendly_name: safeStringSchema(100).optional()
});

// ============================================
// Assistant Schemas
// ============================================

/**
 * Create/Update assistant validation
 */
const assistantSchema = z.object({
    name: safeStringSchema(100)
        .refine((val) => val.length >= 2, 'Name must be at least 2 characters'),
    system_prompt: safeStringSchema(50000).optional(),
    first_message: safeStringSchema(1000).optional(),
    voice_id: uuidSchema.optional().nullable(),
    model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).optional(),
    language: z.string().max(10).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().min(1).max(4096).optional(),
    is_active: z.boolean().optional()
});

// ============================================
// Webhook Payload Schemas
// ============================================

/**
 * Twilio voice webhook validation
 */
const twilioVoiceWebhookSchema = z.object({
    CallSid: z.string().regex(/^CA[a-f0-9]{32}$/),
    AccountSid: z.string().regex(/^AC[a-f0-9]{32}$/),
    From: phoneNumberSchema,
    To: phoneNumberSchema,
    CallStatus: z.enum([
        'queued', 'ringing', 'in-progress', 'completed',
        'busy', 'failed', 'no-answer', 'canceled'
    ]),
    Direction: z.enum(['inbound', 'outbound-api', 'outbound-dial']),
    ApiVersion: z.string().optional(),
    ForwardedFrom: phoneNumberSchema.optional(),
    CallerName: safeStringSchema(100).optional()
});

/**
 * Twilio SMS webhook validation
 */
const twilioSmsWebhookSchema = z.object({
    MessageSid: z.string().regex(/^SM[a-f0-9]{32}$/),
    AccountSid: z.string().regex(/^AC[a-f0-9]{32}$/),
    From: phoneNumberSchema,
    To: phoneNumberSchema,
    Body: safeStringSchema(1600),
    NumMedia: z.string().transform((val) => parseInt(val, 10)).optional(),
    NumSegments: z.string().transform((val) => parseInt(val, 10)).optional()
});

/**
 * WhatsApp message webhook
 */
const whatsappMessageSchema = z.object({
    from: phoneNumberSchema,
    id: z.string().min(1).max(100),
    timestamp: z.string(),
    type: z.enum(['text', 'image', 'audio', 'video', 'document', 'sticker', 'reaction']),
    text: z.object({
        body: safeStringSchema(4096)
    }).optional()
});

// ============================================
// API Request Schemas
// ============================================

/**
 * Pagination query params
 */
const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: safeStringSchema(50).optional(),
    order: z.enum(['asc', 'desc']).default('desc')
});

/**
 * Search query params
 */
const searchSchema = z.object({
    q: safeStringSchema(200),
    fields: z.string().transform((val) => val.split(',')).optional()
});

// ============================================
// Validation Middleware Factory
// ============================================

/**
 * Create validation middleware for request body
 * 
 * @example
 * app.post('/api/assistants', validateBody(assistantSchema), handler);
 */
function validateBody(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            
            if (!result.success) {
                const errors = result.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
            }
            
            // Replace body with validated/transformed data
            req.body = result.data;
            next();
        } catch (error) {
            console.error('Validation error:', error);
            return res.status(400).json({
                error: 'Invalid request body'
            });
        }
    };
}

/**
 * Create validation middleware for query params
 * 
 * @example
 * app.get('/api/list', validateQuery(paginationSchema), handler);
 */
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.query);
            
            if (!result.success) {
                const errors = result.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: errors
                });
            }
            
            req.query = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid query parameters'
            });
        }
    };
}

/**
 * Create validation middleware for URL params
 * 
 * @example
 * app.get('/api/users/:id', validateParams(z.object({ id: uuidSchema })), handler);
 */
function validateParams(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.params);
            
            if (!result.success) {
                return res.status(400).json({
                    error: 'Invalid URL parameters'
                });
            }
            
            req.params = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid URL parameters'
            });
        }
    };
}

// ============================================
// Sanitization Utilities
// ============================================

/**
 * Deep sanitize object - remove __proto__, constructor, prototype pollution attempts
 */
function sanitizeObject(obj, depth = 0) {
    if (depth > 10) return {}; // Prevent deep recursion attacks
    
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item, depth + 1));
    }
    
    const sanitized = {};
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    for (const [key, value] of Object.entries(obj)) {
        if (dangerousKeys.includes(key)) {
            console.warn(`Blocked prototype pollution attempt: ${key}`);
            continue;
        }
        
        // Sanitize key (remove special characters)
        const safeKey = key.replace(/[^\w\-_.]/g, '');
        if (safeKey !== key) {
            console.warn(`Sanitized key: ${key} -> ${safeKey}`);
        }
        
        sanitized[safeKey] = sanitizeObject(value, depth + 1);
    }
    
    return sanitized;
}

/**
 * Sanitize request middleware
 * Apply to all routes to prevent prototype pollution
 */
function sanitizeRequest(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    next();
}

/**
 * Strip sensitive fields before logging/returning
 */
function stripSensitiveFields(obj, sensitiveKeys = []) {
    const defaultSensitive = [
        'password', 'token', 'secret', 'key', 'auth',
        'twilio_auth_token', 'plivo_auth_token', 'api_key',
        'credit_card', 'ssn', 'authorization'
    ];
    
    const allSensitive = [...defaultSensitive, ...sensitiveKeys];
    
    const strip = (o) => {
        if (o === null || typeof o !== 'object') return o;
        if (Array.isArray(o)) return o.map(strip);
        
        const result = {};
        for (const [key, value] of Object.entries(o)) {
            const lowerKey = key.toLowerCase();
            const isSensitive = allSensitive.some((s) => lowerKey.includes(s.toLowerCase()));
            
            if (isSensitive) {
                result[key] = '[REDACTED]';
            } else {
                result[key] = strip(value);
            }
        }
        return result;
    };
    
    return strip(obj);
}

module.exports = {
    // Schemas
    uuidSchema,
    phoneNumberSchema,
    safeStringSchema,
    emailSchema,
    urlSchema,
    webhookUrlSchema,
    twilioImportSchema,
    plivoImportSchema,
    assistantSchema,
    twilioVoiceWebhookSchema,
    twilioSmsWebhookSchema,
    whatsappMessageSchema,
    paginationSchema,
    searchSchema,
    
    // Middleware
    validateBody,
    validateQuery,
    validateParams,
    sanitizeRequest,
    
    // Utilities
    sanitizeObject,
    stripSensitiveFields,
    
    // Re-export Zod for custom schemas
    z
};
