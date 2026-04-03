/**
 * Calls Routes — Conversation History + Pagination
 * VN11: GET /api/calls (paginated list) + GET /api/calls/:callId (single call)
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { verifySupabaseAuth } = require('../lib/auth');

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    return createClient(url, key);
}

/**
 * GET /api/calls
 * Paginated call history for the authenticated user
 * Query params: page (default 1), limit (default 20, max 100)
 */
router.get('/', verifySupabaseAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        const supabase = getSupabase();

        // Get total count
        const { count, error: countError } = await supabase
            .from('call_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.userId);

        if (countError) {
            console.error('Call count error:', countError.message);
            return res.status(500).json({ error: 'Failed to fetch call count' });
        }

        // Get paginated records (exclude conversation_history for list view — it can be large)
        const { data: calls, error } = await supabase
            .from('call_logs')
            .select('id, user_id, assistant_id, call_sid, phone_number, direction, status, duration, transcript, recording_url, cost, metadata, started_at, ended_at, created_at, updated_at')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Call list error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch calls' });
        }

        const total = count || 0;
        return res.json({
            calls: calls || [],
            total,
            page,
            limit,
            hasMore: offset + limit < total
        });
    } catch (err) {
        console.error('GET /api/calls error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/calls/:callId
 * Single call detail including full conversation_history
 */
router.get('/:callId', verifySupabaseAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const supabase = getSupabase();

        const { data: call, error } = await supabase
            .from('call_logs')
            .select('*')
            .eq('id', callId)
            .eq('user_id', req.userId)
            .single();

        if (error || !call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        return res.json({ call });
    } catch (err) {
        console.error('GET /api/calls/:callId error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
