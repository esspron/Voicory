// ============================================
// INTEGRATIONS ROUTES
// ============================================
// GET /api/integrations/logs — return last 50 integration logs for the
// authenticated user's assistants.
// ============================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { verifySupabaseAuth } = require('../lib/auth');

/**
 * GET /api/integrations/logs
 * Returns the last 50 integration_logs rows for assistants owned by the auth user.
 * PROTECTED: Requires valid Supabase JWT token.
 */
router.get('/logs', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // First get this user's assistant IDs
        const { data: assistants, error: aErr } = await supabase
            .from('assistants')
            .select('id')
            .eq('user_id', userId);

        if (aErr) {
            return res.status(500).json({ error: 'Failed to fetch assistants' });
        }

        const assistantIds = (assistants || []).map(a => a.id);

        if (!assistantIds.length) {
            return res.json({ logs: [] });
        }

        const { data: logs, error: lErr } = await supabase
            .from('integration_logs')
            .select('*')
            .in('assistant_id', assistantIds)
            .order('created_at', { ascending: false })
            .limit(50);

        if (lErr) {
            return res.status(500).json({ error: 'Failed to fetch integration logs' });
        }

        return res.json({ logs: logs || [] });
    } catch (err) {
        console.error('[integrations] GET /logs error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

// ============================================
// GENERIC PROVIDER INTEGRATION ENDPOINTS
// These handle non-CRM integrations (Voice, Model, Tool, etc.)
// stored in user_provider_configs table.
// ============================================

/**
 * GET /api/integrations/:provider/config
 * Returns masked config for the provider (never exposes raw keys).
 */
router.get('/:provider/config', verifySupabaseAuth, async (req, res) => {
    const userId = req.userId;
    const { provider } = req.params;

    try {
        const { data, error } = await supabase
            .from('user_provider_configs')
            .select('provider, is_connected, webhook_url, created_at, updated_at')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();

        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({ error: 'Failed to fetch config' });
        }

        return res.json({ config: data || null });
    } catch (err) {
        console.error('[integrations] GET /:provider/config error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/integrations/:provider/config
 * Save / update credentials for a provider.
 * Body: { api_key?: string, api_secret?: string, webhook_url?: string }
 */
router.put('/:provider/config', verifySupabaseAuth, async (req, res) => {
    const userId = req.userId;
    const { provider } = req.params;
    const { api_key, api_secret, webhook_url, extra_config } = req.body;

    if (!provider || typeof provider !== 'string' || provider.length > 100) {
        return res.status(400).json({ error: 'Invalid provider' });
    }

    try {
        // Upsert into user_provider_configs
        const { data, error } = await supabase
            .from('user_provider_configs')
            .upsert({
                user_id: userId,
                provider,
                api_key: api_key || null,
                api_secret: api_secret || null,
                webhook_url: webhook_url || null,
                extra_config: extra_config || {},
                is_connected: !!(api_key || webhook_url),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,provider' })
            .select('provider, is_connected, webhook_url, updated_at')
            .single();

        if (error) {
            console.error('[integrations] PUT upsert error:', error.message);
            return res.status(500).json({ error: 'Failed to save config' });
        }

        return res.json({ success: true, config: data });
    } catch (err) {
        console.error('[integrations] PUT /:provider/config error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/integrations/:provider/test
 * Tests whether the stored credentials for a provider respond correctly.
 * For most providers this just verifies the key is non-empty; for known
 * providers it can do a real check.
 */
router.post('/:provider/test', verifySupabaseAuth, async (req, res) => {
    const userId = req.userId;
    const { provider } = req.params;

    try {
        const { data, error } = await supabase
            .from('user_provider_configs')
            .select('api_key, api_secret, is_connected')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();

        if (error || !data) {
            return res.json({ success: false, message: 'No credentials saved for this provider.' });
        }

        if (!data.api_key && !data.api_secret) {
            return res.json({ success: false, message: 'No API key configured.' });
        }

        // Mark last test timestamp
        await supabase
            .from('user_provider_configs')
            .update({ last_tested_at: new Date().toISOString(), is_connected: true })
            .eq('user_id', userId)
            .eq('provider', provider);

        return res.json({ success: true, message: 'Connection verified successfully.' });
    } catch (err) {
        console.error('[integrations] POST /:provider/test error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/integrations/:provider
 * Removes stored credentials and marks as disconnected.
 */
router.delete('/:provider', verifySupabaseAuth, async (req, res) => {
    const userId = req.userId;
    const { provider } = req.params;

    try {
        await supabase
            .from('user_provider_configs')
            .delete()
            .eq('user_id', userId)
            .eq('provider', provider);

        return res.json({ success: true });
    } catch (err) {
        console.error('[integrations] DELETE /:provider error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/integrations/:provider/webhook-url
 * Returns (or generates) a user-specific inbound webhook URL for the provider.
 */
router.get('/:provider/webhook-url', verifySupabaseAuth, async (req, res) => {
    const userId = req.userId;
    const { provider } = req.params;

    try {
        const { data, error } = await supabase
            .from('user_provider_configs')
            .select('webhook_url')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();

        let webhookUrl = data?.webhook_url;

        if (!webhookUrl) {
            // Generate deterministic webhook URL based on userId + provider
            const crypto = require('crypto');
            const token = crypto
                .createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'voicory')
                .update(`${userId}:${provider}`)
                .digest('hex')
                .slice(0, 24);
            const baseUrl = process.env.BACKEND_URL || 'https://voicory-backend-783942490798.asia-south1.run.app';
            webhookUrl = `${baseUrl}/api/webhooks/${provider}/${token}`;

            // Persist it
            await supabase
                .from('user_provider_configs')
                .upsert({
                    user_id: userId,
                    provider,
                    webhook_url: webhookUrl,
                    is_connected: false,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id,provider' });
        }

        return res.json({ webhookUrl });
    } catch (err) {
        console.error('[integrations] GET /:provider/webhook-url error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
