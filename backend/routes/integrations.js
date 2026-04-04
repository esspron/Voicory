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
