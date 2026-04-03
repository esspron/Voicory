/**
 * Input Validation & Prompt Injection Protection Middleware
 * VN13 — Input Validation Hardening
 * 
 * Uses Zod (already in project) for schema validation.
 * No new dependencies needed — integrates with existing validateBody pattern.
 */

const { z } = require('zod');

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Validation for POST /api/test-chat
 */
const testChatSchema = z.object({
    message: z
        .string({ required_error: 'message is required' })
        .min(1, 'message cannot be empty')
        .max(2000, 'message must be 2000 characters or less'),
    assistantId: z
        .string()
        .uuid('assistantId must be a valid UUID')
        .optional(),
    assistantConfig: z.any().optional(),
    conversationHistory: z.array(z.any()).optional(),
    channel: z.string().optional(),
}).refine(
    (data) => data.assistantId || data.assistantConfig,
    { message: 'Either assistantId or assistantConfig is required' }
);

/**
 * Validation for POST /api/twilio/:userId/voice
 * userId in path must be a UUID
 */
const twilioVoiceParamsSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID'),
});

/**
 * Validation for POST /api/twilio/:userId/voice/gather
 * SpeechResult from Twilio must be bounded
 */
const twilioGatherBodySchema = z.object({
    SpeechResult: z
        .string()
        .max(1000, 'SpeechResult must be 1000 characters or less')
        .optional(),
});

// ============================================
// PROMPT INJECTION SANITIZER
// ============================================

/**
 * Patterns that indicate prompt injection attempts.
 * These are stripped/replaced before the text is sent to any LLM.
 */
const INJECTION_PATTERNS = [
    // Classic ignore-previous-instructions pattern (case-insensitive)
    { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, replacement: '[filtered]' },
    // System: prefix injection
    { pattern: /^\s*system\s*:/gim, replacement: '[filtered]:' },
    // Anthropic-style turn injection
    { pattern: /\n\nHuman\s*:/gi, replacement: '\n[filtered]:' },
    { pattern: /\n\nAssistant\s*:/gi, replacement: '\n[filtered]:' },
    // OpenAI-style role override
    { pattern: /\n\n(system|user|assistant)\s*\n/gi, replacement: '\n[filtered]\n' },
    // "You are now..." / "Act as..." system prompt override attempts
    { pattern: /you\s+are\s+now\s+(a\s+)?(?!voicory|an?\s+AI assistant)/gi, replacement: '[filtered] ' },
    { pattern: /act\s+as\s+(if\s+you\s+are\s+)?(?!voicory|an?\s+AI assistant)/gi, replacement: '[filtered] ' },
    // Prompt delimiter injection
    { pattern: /```\s*(system|instructions?|prompt)/gi, replacement: '```[filtered]' },
    // Override system prompt directly
    { pattern: /override\s+(the\s+)?system\s+prompt/gi, replacement: '[filtered]' },
    { pattern: /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|training)/gi, replacement: '[filtered]' },
    { pattern: /forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|training|context)/gi, replacement: '[filtered]' },
    // Jailbreak markers
    { pattern: /\[INST\]|\[\/INST\]|<\|system\|>|<\|user\|>|<\|assistant\|>/g, replacement: '[filtered]' },
    { pattern: /###\s*(Instruction|System|Human|Assistant)\s*:/gi, replacement: '### [filtered]:' },
];

/**
 * Sanitize user input to strip prompt injection attempts.
 * Call this before passing any user text to an LLM.
 * 
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized input
 */
function sanitizePromptInput(input) {
    if (typeof input !== 'string') return input;

    let sanitized = input;
    for (const { pattern, replacement } of INJECTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized.trim();
}

// ============================================
// EXPRESS MIDDLEWARE FACTORIES
// ============================================

/**
 * Validate request body against a Zod schema.
 * Returns 400 with validation errors if invalid.
 */
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        // Replace body with parsed/coerced data
        req.body = result.data;
        next();
    };
}

/**
 * Validate route params against a Zod schema.
 * Returns 400 with validation errors if invalid.
 */
function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            const errors = result.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        next();
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Middleware arrays / factories
    validateTestChat: validateBody(testChatSchema),
    validateTwilioVoiceParams: validateParams(twilioVoiceParamsSchema),
    validateTwilioGatherBody: validateBody(twilioGatherBodySchema),

    // Generic factories (for reuse)
    validateBody,
    validateParams,

    // Sanitizer
    sanitizePromptInput,

    // Schemas (for testing)
    testChatSchema,
    twilioVoiceParamsSchema,
    twilioGatherBodySchema,
};
