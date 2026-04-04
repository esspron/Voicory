/**
 * Calls Routes — Conversation History + Pagination + Export + Recording
 * VN11: GET /api/calls (paginated list) + GET /api/calls/:callId (single call)
 * VN-C2: GET /api/calls/export (CSV export) + GET /api/calls/:callId/recording (Twilio proxy)
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const { verifySupabaseAuth } = require('../lib/auth');

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    return createClient(url, key);
}

/**
 * GET /api/calls/export
 * Export call logs as CSV for the authenticated user
 * Query params: from (ISO date), to (ISO date), assistantId (UUID)
 */
router.get('/export', verifySupabaseAuth, async (req, res) => {
    try {
        const { from, to, assistantId } = req.query;
        const supabase = getSupabase();

        let query = supabase
            .from('call_logs')
            .select('id, assistant_id, assistant_name, phone_number, direction, status, duration, transcript, cost, started_at, ended_at, created_at')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });

        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);
        if (assistantId) query = query.eq('assistant_id', assistantId);

        const { data: calls, error } = await query;
        if (error) {
            console.error('Export call logs error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch call logs for export' });
        }

        // Build CSV
        const headers = ['date', 'caller', 'direction', 'duration', 'status', 'cost', 'transcript_summary'];
        const escapeCSV = (val) => {
            if (val == null) return '';
            const str = String(val);
            // Escape quotes and wrap in quotes if contains comma/newline/quote
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        const rows = (calls || []).map(c => {
            // Summarise transcript: first 200 chars, strip newlines
            const transcriptSummary = c.transcript
                ? c.transcript.replace(/\r?\n/g, ' ').slice(0, 200)
                : '';
            return [
                escapeCSV(c.created_at ? new Date(c.created_at).toISOString() : ''),
                escapeCSV(c.phone_number || ''),
                escapeCSV(c.direction || 'inbound'),
                escapeCSV(c.duration || ''),
                escapeCSV(c.status || ''),
                escapeCSV(c.cost != null ? Number(c.cost).toFixed(4) : '0.0000'),
                escapeCSV(transcriptSummary),
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\r\n');
        const filename = `call-logs-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
    } catch (err) {
        console.error('GET /api/calls/export error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

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
 * GET /api/calls/:callId/recording
 * Proxy Twilio recording for a call log — avoids exposing Twilio credentials to frontend.
 * Looks up recording_url stored in call_logs; falls back to constructing from call_sid.
 */
router.get('/:callId/recording', verifySupabaseAuth, async (req, res) => {
    try {
        const { callId } = req.params;
        const supabase = getSupabase();

        const { data: call, error } = await supabase
            .from('call_logs')
            .select('id, call_sid, recording_url, user_id')
            .eq('id', callId)
            .eq('user_id', req.userId)
            .single();

        if (error || !call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // If a direct recording URL is already stored (e.g. a public URL), redirect to it
        if (call.recording_url) {
            // If it's already a public accessible URL (non-Twilio), redirect
            if (!call.recording_url.includes('api.twilio.com')) {
                return res.redirect(call.recording_url);
            }
        }

        // Build Twilio recording URL
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!accountSid || !authToken) {
            return res.status(503).json({ error: 'Recording service not configured' });
        }

        let recordingUrl;
        if (call.recording_url && call.recording_url.includes('api.twilio.com')) {
            // Already a Twilio URL — append .mp3 if not present
            recordingUrl = call.recording_url.endsWith('.mp3')
                ? call.recording_url
                : call.recording_url + '.mp3';
        } else if (call.call_sid) {
            // Construct URL from call SID — Twilio stores recordings linked to calls
            // We'll use the recordings list endpoint to find the recording SID
            const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.call_sid}/Recordings.json`;
            const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

            const recordingData = await new Promise((resolve, reject) => {
                https.get(listUrl, { headers: { Authorization: `Basic ${auth}` } }, (twilioRes) => {
                    let body = '';
                    twilioRes.on('data', d => { body += d; });
                    twilioRes.on('end', () => {
                        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
                    });
                }).on('error', reject);
            });

            const recordings = recordingData.recordings || [];
            if (recordings.length === 0) {
                return res.status(404).json({ error: 'No recording found for this call' });
            }

            const recSid = recordings[0].sid;
            recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recSid}.mp3`;
        } else {
            return res.status(404).json({ error: 'No recording available for this call' });
        }

        // Proxy the recording from Twilio
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        https.get(recordingUrl, { headers: { Authorization: `Basic ${auth}` } }, (twilioRes) => {
            res.setHeader('Content-Type', twilioRes.headers['content-type'] || 'audio/mpeg');
            res.setHeader('Content-Disposition', `inline; filename="recording-${callId}.mp3"`);
            if (twilioRes.headers['content-length']) {
                res.setHeader('Content-Length', twilioRes.headers['content-length']);
            }
            twilioRes.pipe(res);
        }).on('error', (err) => {
            console.error('Twilio recording proxy error:', err.message);
            res.status(502).json({ error: 'Failed to fetch recording from Twilio' });
        });
    } catch (err) {
        console.error('GET /api/calls/:callId/recording error:', err.message);
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
