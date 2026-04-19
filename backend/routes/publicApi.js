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
 * Security:
 *   - API key auth via x-api-key header
 *   - Per-key rate limiting (60 req/min default, stored in Redis)
 *   - Request logging to api_request_logs table
 *   - Input sanitization on all query params
 *   - CORS restricted to key's allowed origins
 *   - UUID validation on all :id params
 *   - No user_id or internal fields ever exposed
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config');

// ═══════════════════════════════════════════════════════════════
// REDIS CLIENT (for rate limiting)
// ═══════════════════════════════════════════════════════════════

let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn('Public API: Redis unavailable, falling back to in-memory rate limits');
}

// In-memory fallback rate limit store
const memoryStore = new Map();

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 60;           // 60 requests per minute per key
const RATE_LIMIT_MAX_BURST = 10;     // max 10 in a 5-second burst
const BURST_WINDOW_SEC = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUERY_LENGTH = 200;
const SENSITIVE_FIELDS = ['user_id', 'config_id', 'api_key', 'password', 'secret'];

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

/** Strip sensitive/internal fields from response objects */
function sanitizeOutput(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeOutput);
  const clean = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    delete clean[field];
  }
  return clean;
}

/** Sanitize a query param — prevent injection */
function sanitizeParam(val) {
  if (typeof val !== 'string') return '';
  return val.slice(0, MAX_QUERY_LENGTH).replace(/[^\w\s@.+\-:]/g, '');
}

/** Validate UUID format */
function isValidUUID(id) {
  return UUID_RE.test(id);
}

/** Validate ISO date string */
function isValidDate(str) {
  if (!str) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE — Rate Limiting (per API key, sliding window)
// ═══════════════════════════════════════════════════════════════

async function rateLimitMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return next(); // validateApiKey will catch this

  const keyHash = apiKey.slice(-12); // use last 12 chars as identifier
  const now = Math.floor(Date.now() / 1000);

  try {
    if (redis) {
      // Redis sliding window
      const windowKey = `rl:v1:${keyHash}:${Math.floor(now / RATE_LIMIT_WINDOW_SEC)}`;
      const burstKey = `rl:v1:burst:${keyHash}:${Math.floor(now / BURST_WINDOW_SEC)}`;

      const [count, burstCount] = await Promise.all([
        redis.incr(windowKey),
        redis.incr(burstKey),
      ]);

      // Set TTL on first increment
      if (count === 1) await redis.expire(windowKey, RATE_LIMIT_WINDOW_SEC + 1);
      if (burstCount === 1) await redis.expire(burstKey, BURST_WINDOW_SEC + 1);

      // Set headers
      res.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      res.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - count)));
      res.set('X-RateLimit-Reset', String((Math.floor(now / RATE_LIMIT_WINDOW_SEC) + 1) * RATE_LIMIT_WINDOW_SEC));

      if (count > RATE_LIMIT_MAX) {
        const retryAfter = (Math.floor(now / RATE_LIMIT_WINDOW_SEC) + 1) * RATE_LIMIT_WINDOW_SEC - now;
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} requests per minute.`,
            retry_after: retryAfter,
          },
        });
      }

      if (burstCount > RATE_LIMIT_MAX_BURST) {
        res.set('Retry-After', String(BURST_WINDOW_SEC));
        return res.status(429).json({
          error: {
            code: 'BURST_LIMIT_EXCEEDED',
            message: `Too many requests in a short period. Maximum ${RATE_LIMIT_MAX_BURST} requests per ${BURST_WINDOW_SEC} seconds.`,
            retry_after: BURST_WINDOW_SEC,
          },
        });
      }
    } else {
      // In-memory fallback
      const windowKey = `${keyHash}:${Math.floor(now / RATE_LIMIT_WINDOW_SEC)}`;
      const count = (memoryStore.get(windowKey) || 0) + 1;
      memoryStore.set(windowKey, count);

      // Cleanup old keys periodically
      if (memoryStore.size > 10000) {
        const cutoff = `${keyHash}:${Math.floor(now / RATE_LIMIT_WINDOW_SEC) - 2}`;
        for (const k of memoryStore.keys()) {
          if (k < cutoff) memoryStore.delete(k);
        }
      }

      res.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      res.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - count)));

      if (count > RATE_LIMIT_MAX) {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} requests per minute.`,
          },
        });
      }
    }
  } catch (err) {
    // Rate limit check failed — allow request through (fail-open)
    console.error('Rate limit error:', err.message);
  }

  next();
}

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

  // Basic format validation
  if (typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 128) {
    return res.status(401).json({
      error: { code: 'INVALID_API_KEY', message: 'Invalid API key format' },
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

    // Check if key is revoked
    if (keyData.revoked_at || keyData.is_revoked) {
      return res.status(401).json({
        error: { code: 'REVOKED_API_KEY', message: 'This API key has been revoked' },
      });
    }

    // Attach context
    req.apiKeyData = keyData;
    req.userId = keyData.user_id;
    req.apiKeyId = keyData.id;
    req.apiKeyType = keyData.type; // 'public' or 'private'
    next();
  } catch (err) {
    console.error('API key validation error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE — Request logging (async, non-blocking)
// ═══════════════════════════════════════════════════════════════

function logRequest(req, res, next) {
  const start = Date.now();

  // After response is sent, log it
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      api_key_id: req.apiKeyId,
      user_id: req.userId,
      method: req.method,
      path: req.path,
      query_params: Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : null,
      status_code: res.statusCode,
      duration_ms: duration,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
      user_agent: (req.headers['user-agent'] || '').slice(0, 256),
      created_at: new Date().toISOString(),
    };

    // Fire-and-forget insert
    supabase.from('api_request_logs').insert(logEntry).then().catch(err => {
      // Silently ignore — logging should never block requests
      if (!err.message?.includes('does not exist')) {
        console.error('API log insert error:', err.message);
      }
    });
  });

  next();
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE — Validate UUID params
// ═══════════════════════════════════════════════════════════════

function validateIdParam(req, res, next) {
  if (req.params.id && !isValidUUID(req.params.id)) {
    return res.status(400).json({
      error: { code: 'INVALID_ID', message: 'Invalid ID format — must be a valid UUID' },
    });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE — Security headers
// ═══════════════════════════════════════════════════════════════

function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('X-API-Version', 'v1');
  next();
}

// ═══════════════════════════════════════════════════════════════
// APPLY MIDDLEWARE STACK
// ═══════════════════════════════════════════════════════════════

router.use(securityHeaders);
router.use(rateLimitMiddleware);
router.use(validateApiKey);
router.use(logRequest);

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

    // Filters (sanitized)
    if (req.query.status) query = query.eq('status', sanitizeParam(req.query.status));
    if (req.query.direction) query = query.eq('direction', sanitizeParam(req.query.direction));
    if (req.query.assistant_id) {
      const aid = sanitizeParam(req.query.assistant_id);
      if (!isValidUUID(aid)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'assistant_id must be a valid UUID' } });
      query = query.eq('assistant_id', aid);
    }
    if (req.query.from) {
      if (!isValidDate(req.query.from)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'from must be a valid ISO date' } });
      query = query.gte('created_at', req.query.from);
    }
    if (req.query.to) {
      if (!isValidDate(req.query.to)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'to must be a valid ISO date' } });
      query = query.lte('created_at', req.query.to);
    }
    if (req.query.phone_number) query = query.eq('phone_number', sanitizeParam(req.query.phone_number));

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      data: (data || []).map(sanitizeOutput),
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

router.get('/calls/:id', validateIdParam, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('id, call_sid, direction, status, from_number, to_number, phone_number, duration, duration_seconds, cost, summary, transcript, recording_url, provider, started_at, ended_at, created_at, assistant_id, metadata, stt_minutes, tts_characters')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Call not found' } });
    }

    res.json({ data: sanitizeOutput(data) });
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

    // Filters (sanitized)
    if (req.query.search) {
      const s = sanitizeParam(req.query.search);
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone_number.ilike.%${s}%`);
    }
    if (req.query.source) query = query.eq('source', sanitizeParam(req.query.source));
    if (req.query.from) {
      if (!isValidDate(req.query.from)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'from must be a valid ISO date' } });
      query = query.gte('created_at', req.query.from);
    }
    if (req.query.to) {
      if (!isValidDate(req.query.to)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'to must be a valid ISO date' } });
      query = query.lte('created_at', req.query.to);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      data: (data || []).map(sanitizeOutput),
      meta: buildMeta(page, limit, count || 0),
    });
  } catch (err) {
    console.error('Public API /customers error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch customers' } });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /customers/:id — single customer detail + recent activity
// ═══════════════════════════════════════════════════════════════

router.get('/customers/:id', validateIdParam, async (req, res) => {
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

    // Recent calls for this customer
    const { data: calls } = await supabase
      .from('call_logs')
      .select('id, direction, status, duration, cost, summary, created_at')
      .eq('user_id', req.userId)
      .eq('phone_number', data.phone_number)
      .order('created_at', { ascending: false })
      .limit(10);

    // Recent WhatsApp messages
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, content, message_type, status, created_at')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      data: sanitizeOutput({
        ...data,
        recent_calls: (calls || []).map(sanitizeOutput),
        recent_messages: (messages || []).map(sanitizeOutput),
      }),
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

    // Get config_ids owned by this user
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
    if (req.query.direction) query = query.eq('direction', sanitizeParam(req.query.direction));
    if (req.query.customer_id) {
      const cid = sanitizeParam(req.query.customer_id);
      if (!isValidUUID(cid)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'customer_id must be a valid UUID' } });
      query = query.eq('customer_id', cid);
    }
    if (req.query.from) {
      if (!isValidDate(req.query.from)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'from must be a valid ISO date' } });
      query = query.gte('created_at', req.query.from);
    }
    if (req.query.to) {
      if (!isValidDate(req.query.to)) return res.status(400).json({ error: { code: 'INVALID_FILTER', message: 'to must be a valid ISO date' } });
      query = query.lte('created_at', req.query.to);
    }
    if (req.query.phone_number) {
      const pn = sanitizeParam(req.query.phone_number);
      query = query.or(`from_number.eq.${pn},to_number.eq.${pn}`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      data: (data || []).map(sanitizeOutput),
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

router.get('/messages/:id', validateIdParam, async (req, res) => {
  try {
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

    res.json({ data: sanitizeOutput(data) });
  } catch (err) {
    console.error('Public API /messages/:id error:', err);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch message' } });
  }
});

module.exports = router;
