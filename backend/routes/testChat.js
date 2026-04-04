// ============================================
// TEST CHAT ROUTES - Dashboard Agent Testing
// ============================================
// Uses the centralized AssistantProcessor for all AI logic
// SECURITY: Requires authenticated user to prevent abuse
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { processMessage } = require('../services/assistantProcessor');
const { getCachedAssistant } = require('../services/assistant');
const { verifySupabaseAuth } = require('../lib/auth');
const { validateTestChat, sanitizePromptInput } = require('../middleware/inputValidation');
const billingGuard = require('../middleware/billingGuard');
const billing = require('../services/billing');

// ============================================
// TEST CHAT ENDPOINT - For testing agents in the dashboard
// Now uses centralized AssistantProcessor (same as WhatsApp, SMS, etc.)
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/test-chat', verifySupabaseAuth, billingGuard, validateTestChat, async (req, res) => {
    try {
        const { 
            message: rawMessage, 
            conversationHistory = [], 
            assistantId,
            assistantConfig,
            channel = 'calls'
        } = req.body;

        // SECURITY: Sanitize message to strip prompt injection attempts
        const message = sanitizePromptInput(rawMessage);

        // SECURITY: Use authenticated user ID, not from request body
        const billingUserId = req.userId;

        // Validate required fields (schema validation already done by middleware, but keep runtime guard)
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!assistantId && !assistantConfig) {
            return res.status(400).json({ error: 'Either assistantId or assistantConfig is required' });
        }

        // SECURITY: Verify user owns the assistant (if assistantId provided)
        if (assistantId) {
            const assistant = await getCachedAssistant(assistantId);
            if (!assistant) {
                return res.status(404).json({ error: 'Assistant not found' });
            }
            if (assistant.user_id !== billingUserId) {
                return res.status(403).json({ error: 'You do not have access to this assistant' });
            }
        }

        // ===== USE CENTRALIZED PROCESSOR =====
        const result = await processMessage({
            message,
            assistantId,
            assistantConfig,
            conversationHistory,
            channel,
            customer: null, // Test chat doesn't have customer context
            memory: null,   // Test chat doesn't have memory context
            userId: billingUserId,
        });

        if (result.error) {
            console.error('Test chat error:', result.error);
            return res.status(500).json({ error: result.error });
        }

        // ===== BILLING: Deduct credits =====
        const { usage } = result;
        let cost = null;
        let balance = null;

        if (usage && billingUserId) {
            // Central billing service — handles balance check, cost calc, atomic deduction
            const billingResult = await billing.deductMessageCost(billingUserId, {
                model:       usage.model,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                assistantId:  assistantId || null,
                channel:      'test_chat',
                callLogId:    null,
                conversationId: null,
            });

            if (!billingResult.success && billingResult.reason === 'insufficient_credits') {
                // Balance was consumed between billingGuard check and actual call — return 402
                return res.status(402).json({
                    error:   'insufficient_credits',
                    message: 'Your credit balance is zero. Please top up to continue.',
                    balance: 0,
                });
            }

            cost    = billingResult.cost_usd;
            balance = billingResult.new_balance;
        }

        // Return response with usage info
        res.json({
            response: result.response,
            usage: usage ? {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                totalTokens: usage.totalTokens,
                cost,
                balance,
            } : null,
        });

    } catch (error) {
        console.error('Test chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;
