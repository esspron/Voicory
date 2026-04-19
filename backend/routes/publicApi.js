/**
 * Public API Routes — exposed via API keys (pk_ / sk_)
 * 
 * Lets Voicory customers pull their data into external CRMs.
 * 
 * Endpoints:
 *   GET /api/v1/calls         — Call logs with pagination & filters
 *   GET /api/v1/calls/:id     — Single call detail
 *   GET /api/v1/customers     — Customer list with pagination & filters
 *   GET /api/v1/customers/:id — Single customer detail
 *   GET /api/v1/messages      — WhatsApp messages with pagination & filters
 *   GET /api/v1/messages/:id  — Single message detail
 * 
 * Auth: x-api-key header (public or private key from api_keys table)
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE — API Key auth
// ═══════════════════════════════════════════════════════════════

const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: { code: 'MISSING_API_KEY', message: 'x-api-key header is required' },
    });
  }

  try {
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .single();

    if (error || !keyData) {
      return res.status(401).json({
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' },
      });
    }

    req.apiKeyData = keyData;
    req.userId = keyData.user_id;
    next();
  } catch (err) {
    console.error('API key validation error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

router.use(validateApiKey);

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
    has_more: page * limit < total,
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /calls — paginated call logs
// ═══════════════════════════════════════════════════════════════

router.get('/calls', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const userId = req.userId;

    let query = supabase
      .from('call_logs')
      .select('id, call_sid, direction, status, from_number, to_number, phone_number, duration, duration_seconds, cost, summary, transcript, recording_url, provider, started_at, ended_at, created_at, assistant_id, metadata', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filters
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.direction) query = query.eq('direction', req.query.direction);
    if (req.query.assistant_id) query = query.eq('assistant_id', req.query.assistant_id);
    if (req.query.from) query = query.gte('created_at', req.query.from);
    if (req.query.to) query = query.lte('created_at', req.query.to);
    if (req.query.phone_number) query = query.eq('phone_number', req.query.phone_number);

    const { data, count, error } = await query;

    if (error) throw error;

    res.json({
      data: data || [],
      meta: buildMeta(page, limit, count || 0),
    });
  } catch (err) {
    console.error('Public API /calls error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch call logs' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /calls/:id — single call detail
// ═══════════════════════════════════════════════════════════════

router.get('/calls/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Call not found' } });
    }

    // Remove internal fields
    delete data.user_id;
    res.json({ data });
  } catch (err) {
    console.error('Public API /calls/:id error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch call' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /customers — paginated customer list
// ═══════════════════════════════════════════════════════════════

router.get('/customers', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const userId = req.userId;

    let query = supabase
      .from('customers')
      .select('id, name, email, phone_number, source, interaction_count, last_interaction, variables, created_at, updated_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filters
    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,email.ilike.%${req.query.search}%,phone_number.ilike.%${req.query.search}%`);
    }
    if (req.query.source) query = query.eq('source', req.query.source);
    if (req.query.from) query = query.gte('created_at', req.query.from);
    if (req.query.to) query = query.lte('created_at', req.query.to);

    const { data, count, error } = await query;

    if (error) throw error;

    res.json({
      data: data || [],
      meta: buildMeta(page, limit, count || 0),
    });
  } catch (err) {
    console.error('Public API /customers error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch customers' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /customers/:id — single customer detail
// ═══════════════════════════════════════════════════════════════

router.get('/customers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone_number, source, interaction_count, last_interaction, variables, created_at, updated_at')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    // Also fetch recent calls for this customer
    const { data: calls } = await supabase
      .from('call_logs')
      .select('id, direction, status, duration, cost, summary, created_at')
      .eq('user_id', req.userId)
      .eq('phone_number', data.phone_number)
      .order('created_at', { ascending: false })
      .limit(10);

    // Also fetch recent WhatsApp messages
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, content, message_type, status, created_at')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      data: {
        ...data,
        recent_calls: calls || [],
        recent_messages: messages || [],
      },
    });
  } catch (err) {
    console.error('Public API /customers/:id error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /messages — paginated WhatsApp messages
// ═══════════════════════════════════════════════════════════════

router.get('/messages', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const userId = req.userId;

    // Get all config_ids owned by this user first
    const { data: configs } = await supabase
      .from('whatsapp_configs')
      .select('id')
      .eq('user_id', userId);

    const configIds = (configs || []).map(c => c.id);

    if (configIds.length === 0) {
      return res.json({ data: [], meta: buildMeta(page, limit, 0) });
    }

    let query = supabase
      .from('whatsapp_messages')
      .select('id, direction, content, message_type, from_number, to_number, status, is_from_bot, delivered_at, read_at, created_at, customer_id, assistant_id', { count: 'exact' })
      .in('config_id', configIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filters
    if (req.query.direction) query = query.eq('direction', req.query.direction);
    if (req.query.customer_id) query = query.eq('customer_id', req.query.customer_id);
    if (req.query.from) query = query.gte('created_at', req.query.from);
    if (req.query.to) query = query.lte('created_at', req.query.to);
    if (req.query.phone_number) {
      query = query.or(`from_number.eq.${req.query.phone_number},to_number.eq.${req.query.phone_number}`);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    res.json({
      data: data || [],
      meta: buildMeta(page, limit, count || 0),
    });
  } catch (err) {
    console.error('Public API /messages error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch messages' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /messages/:id — single message detail
// ═══════════════════════════════════════════════════════════════

router.get('/messages/:id', async (req, res) => {
  try {
    // Get user's config IDs for auth
    const { data: configs } = await supabase
      .from('whatsapp_configs')
      .select('id')
      .eq('user_id', req.userId);

    const configIds = (configs || []).map(c => c.id);

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, content, message_type, from_number, to_number, status, is_from_bot, delivered_at, read_at, created_at, customer_id, assistant_id, wa_message_id')
      .eq('id', req.params.id)
      .in('config_id', configIds)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    res.json({ data });
  } catch (err) {
    console.error('Public API /messages/:id error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch message' } });
  }
});

module.exports = router;
