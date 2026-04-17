'use strict';
/**
 * voiceRateEngine.js — DB-driven dynamic voice call rate calculator
 *
 * Pricing is sourced from Supabase tables at runtime:
 *   - service_pricing  → TTS, STT, Infra per-minute rates
 *   - llm_pricing      → LLM input/output token rates
 *
 * Cache: Redis (key: voicory:pricing:v1) with 5-minute TTL.
 * Fallback: hardcoded safety values if DB is unreachable (never zero).
 *
 * Usage assumptions per minute of voice call:
 *   - STT:   1 full minute of user audio
 *   - LLM:   600 input + 300 output tokens/min (3 turns × ~200in+100out)
 *   - TTS:   750 characters of AI speech per minute
 *   - Infra: 1 LiveKit participant-minute
 *
 * Voicory margin: 4x on provider cost (300% markup, set in DB as selling_price_usd).
 * selling_price_usd = what Voicory charges.
 * provider_cost     = raw provider cost.
 */

// ─── Hardcoded fallback rates (used ONLY if DB is unreachable) ────────────────
// These are conservative — prefer the DB values always.
const FALLBACK = {
  stt: {
    'whisper-1':                0.024,   // $0.006 × 4
    'gpt-4o-mini-transcribe':   0.012,   // $0.003 × 4
    'gpt-4o-transcribe':        0.024,
    default:                    0.024,
  },
  tts: {
    openai:           0.045,   // tts-1: $0.01125 × 4
    openai_hd:        0.090,   // tts-1-hd: $0.0225 × 4
    elevenlabs:       0.150,   // Flash: $0.0375 × 4
    elevenlabs_ml:    0.300,   // Multilingual: $0.075 × 4
    google:           0.048,   // Chirp3-HD: $0.012 × 4
    default:          0.150,
  },
  llm: {
    // voicory cost per token (already at 4x margin)
    'gpt-4o-mini':  { input: 0.0000006,  output: 0.0000024  },
    'gpt-4o':       { input: 0.00001,    output: 0.00004    },
    'gpt-4.1':      { input: 0.000008,   output: 0.000032   },
    'gpt-4.1-mini': { input: 0.0000016,  output: 0.0000064  },
    'gpt-5.4':      { input: 0.00001,    output: 0.00006    },
    default:        { input: 0.0000006,  output: 0.0000024  },
  },
  infra_per_min: 0.004,   // LiveKit: $0.001 × 4
};

const TOKENS_PER_MIN   = { input: 600, output: 300 };
const TTS_CHARS_PER_MIN = 750;
const CACHE_KEY        = 'voicory:pricing:v1';
const CACHE_TTL_SEC    = 300; // 5 minutes

// ─── Pricing Cache ────────────────────────────────────────────────────────────
let _cache = null;
let _cacheAt = 0;

/**
 * Load pricing from DB (service_pricing + llm_pricing).
 * Uses Redis as shared cache so all instances stay in sync.
 * Falls back to hardcoded rates if DB is unreachable.
 */
async function loadPricing(supabase, redis) {
  // 1. Try Redis
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // Redis unavailable — continue to DB
    }
  }

  // 2. Try in-process cache (secondary)
  if (_cache && (Date.now() - _cacheAt) < CACHE_TTL_SEC * 1000) {
    return _cache;
  }

  // 3. Load from DB
  try {
    const [{ data: spRows }, { data: llmRows }] = await Promise.all([
      supabase.from('service_pricing')
        .select('service_code, provider, provider_model, cost_unit, provider_cost, selling_price_usd')
        .eq('is_active', true)
        .in('cost_unit', ['per_minute', 'per_participant_minute', 'per_message', 'per_1m_tokens_input', 'per_1m_tokens_output']),
      supabase.from('llm_pricing')
        .select('model, provider, voicory_input_cost_per_million, voicory_output_cost_per_million, provider_input_cost_per_million, provider_output_cost_per_million')
        .eq('is_active', true),
    ]);

    const pricing = buildPricingMap(spRows || [], llmRows || []);
    _cache = pricing;
    _cacheAt = Date.now();

    // Store in Redis
    if (redis) {
      try { await redis.set(CACHE_KEY, JSON.stringify(pricing), { ex: CACHE_TTL_SEC }); } catch (e) {}
    }

    return pricing;
  } catch (err) {
    console.warn('[voiceRateEngine] DB load failed, using fallback rates:', err.message);
    return null; // caller uses FALLBACK
  }
}

/**
 * Build a normalized pricing map from DB rows.
 */
function buildPricingMap(spRows, llmRows) {
  // TTS: keyed by our internal provider key
  const tts = {};
  const ttsServiceMap = {
    tts_openai_standard:       'openai',
    tts_openai_hd:             'openai_hd',
    tts_elevenlabs_flash:      'elevenlabs',
    tts_elevenlabs_turbo:      'elevenlabs',     // same rate
    tts_elevenlabs_multilingual: 'elevenlabs_ml',
    tts_google_neural:         'google',
  };
  for (const row of spRows) {
    const key = ttsServiceMap[row.service_code];
    if (key && !tts[key]) {
      tts[key] = parseFloat(row.selling_price_usd); // per-minute Voicory rate
    }
  }

  // STT: keyed by provider_model
  const stt = {};
  for (const row of spRows) {
    if (row.service_code.startsWith('stt_')) {
      stt[row.provider_model] = parseFloat(row.selling_price_usd); // per-minute
    }
  }

  // Infra
  const infraRow = spRows.find(r => r.service_code === 'infra_livekit');
  const infra_per_min = infraRow ? parseFloat(infraRow.selling_price_usd) : FALLBACK.infra_per_min;

  // Chat messaging
  const chatRow = spRows.find(r => r.service_code === 'chat_message');
  const waRow   = spRows.find(r => r.service_code === 'chat_whatsapp_msg');
  const chat = {
    message:   chatRow ? parseFloat(chatRow.selling_price_usd) : 0.0002,
    whatsapp:  waRow   ? parseFloat(waRow.selling_price_usd)   : 0.001,
  };

  // LLM: keyed by model name, voicory cost per token
  const llm = {};
  for (const row of llmRows) {
    llm[row.model] = {
      input:  parseFloat(row.voicory_input_cost_per_million)  / 1_000_000,
      output: parseFloat(row.voicory_output_cost_per_million) / 1_000_000,
      // Also store provider cost for P&L reporting
      provider_input:  parseFloat(row.provider_input_cost_per_million)  / 1_000_000,
      provider_output: parseFloat(row.provider_output_cost_per_million) / 1_000_000,
    };
  }

  return { tts, stt, llm, infra_per_min, chat, loadedAt: new Date().toISOString() };
}

/**
 * Invalidate cache (call after admin pricing update).
 */
async function invalidateCache(redis) {
  _cache = null;
  _cacheAt = 0;
  if (redis) {
    try { await redis.del(CACHE_KEY); } catch (e) {}
  }
}

// ─── Rate Computation ─────────────────────────────────────────────────────────

/**
 * Get TTS rate/min from pricing map (falls back to FALLBACK).
 */
function getTtsRate(pricing, ttsKey) {
  return (pricing?.tts?.[ttsKey]) ?? FALLBACK.tts[ttsKey] ?? FALLBACK.tts.default;
}

/**
 * Get STT rate/min from pricing map.
 */
function getSttRate(pricing, sttProvider) {
  return (pricing?.stt?.[sttProvider]) ?? FALLBACK.stt[sttProvider] ?? FALLBACK.stt.default;
}

/**
 * Get LLM cost per token from pricing map.
 */
function getLlmRates(pricing, llmModel) {
  return (pricing?.llm?.[llmModel]) ?? FALLBACK.llm[llmModel] ?? FALLBACK.llm.default;
}

/**
 * Compute per-minute rate for a specific assistant config.
 * All rates are Voicory-charged rates (provider cost × margin, from DB).
 *
 * @param {Object} pricing      — loaded via loadPricing()
 * @param {string} llmModel     — e.g. 'gpt-4o-mini'
 * @param {string} ttsKey       — e.g. 'elevenlabs', 'openai', 'google'
 * @param {string} sttProvider  — e.g. 'whisper-1'
 * @returns {{ ratePerMin, breakdown }}
 */
function computeRatePerMinute(pricing, { llmModel = 'gpt-4o-mini', ttsProvider = 'elevenlabs', sttProvider = 'whisper-1' } = {}) {
  const sttRatePerMin  = getSttRate(pricing, sttProvider);
  const ttsRatePerMin  = getTtsRate(pricing, ttsProvider);
  const llmRates       = getLlmRates(pricing, llmModel);
  const llmCostPerMin  = (llmRates.input * TOKENS_PER_MIN.input) + (llmRates.output * TOKENS_PER_MIN.output);
  const infraPerMin    = pricing?.infra_per_min ?? FALLBACK.infra_per_min;
  const ratePerMin     = parseFloat((sttRatePerMin + ttsRatePerMin + llmCostPerMin + infraPerMin).toFixed(6));

  return {
    ratePerMin,
    breakdown: {
      stt:   parseFloat(sttRatePerMin.toFixed(6)),
      tts:   parseFloat(ttsRatePerMin.toFixed(6)),
      llm:   parseFloat(llmCostPerMin.toFixed(6)),
      infra: parseFloat(infraPerMin.toFixed(6)),
      assumptions: { llmModel, ttsProvider, sttProvider, ttsCharsPerMin: TTS_CHARS_PER_MIN, tokensPerMin: TOKENS_PER_MIN },
    },
  };
}

/**
 * Compute total cost for a completed call — uses exact duration in seconds.
 */
function computeCallCost(pricing, {
  durationSeconds = 0,
  llmModel = 'gpt-4o-mini',
  ttsProvider = 'elevenlabs',
  sttProvider = 'whisper-1',
  actualTtsChars      = null,
  actualInputTokens   = null,
  actualOutputTokens  = null,
} = {}) {
  const durationMinutes = durationSeconds / 60;

  const sttRate = getSttRate(pricing, sttProvider);
  const sttCost = sttRate * durationMinutes;

  // LLM — actual tokens if available
  const llmRates   = getLlmRates(pricing, llmModel);
  const inputToks  = actualInputTokens  ?? (TOKENS_PER_MIN.input  * durationMinutes);
  const outputToks = actualOutputTokens ?? (TOKENS_PER_MIN.output * durationMinutes);
  const llmCost    = (llmRates.input * inputToks) + (llmRates.output * outputToks);

  // TTS — actual chars if available (per-char rate = ttsRatePerMin / TTS_CHARS_PER_MIN)
  const ttsRatePerMin = getTtsRate(pricing, ttsProvider);
  const ttsRatePerChar = ttsRatePerMin / TTS_CHARS_PER_MIN;
  const chars   = actualTtsChars ?? (TTS_CHARS_PER_MIN * durationMinutes);
  const ttsCost = ttsRatePerChar * chars;

  const infraCost = (pricing?.infra_per_min ?? FALLBACK.infra_per_min) * durationMinutes;

  const totalCostUsd = parseFloat((sttCost + llmCost + ttsCost + infraCost).toFixed(6));

  const { ratePerMin } = computeRatePerMinute(pricing, { llmModel, ttsProvider, sttProvider });

  return {
    totalCostUsd,
    ratePerMin,
    durationMinutes: parseFloat(durationMinutes.toFixed(4)),
    breakdown: {
      stt_cost:   parseFloat(sttCost.toFixed(6)),
      llm_cost:   parseFloat(llmCost.toFixed(6)),
      tts_cost:   parseFloat(ttsCost.toFixed(6)),
      infra_cost: parseFloat(infraCost.toFixed(6)),
      total:      totalCostUsd,
      pricing_source: pricing ? 'database' : 'fallback',
      actual_metrics: {
        tts_chars:     actualTtsChars     !== null ? chars      : null,
        input_tokens:  actualInputTokens  !== null ? inputToks  : null,
        output_tokens: actualOutputTokens !== null ? outputToks : null,
        estimated:     actualTtsChars === null && actualInputTokens === null,
      },
    },
  };
}

/**
 * Compute per-message chat cost.
 * @param {string} channel — 'whatsapp' | 'chat'
 */
function computeMessageCost(pricing, channel = 'chat') {
  const rates = pricing?.chat;
  if (channel === 'whatsapp') {
    return parseFloat((rates?.whatsapp ?? 0.001).toFixed(6));
  }
  return parseFloat((rates?.message ?? 0.0002).toFixed(6));
}

/**
 * Resolve TTS provider key from voices table columns.
 * voices.tts_provider: 'elevenlabs' | 'openai' | 'google'
 * voices.model:        e.g. 'eleven_flash_v2_5' | 'eleven_multilingual_v2' | 'tts-1-hd'
 */
function resolveTtsProviderKey(ttsProvider, model = '') {
  const p = (ttsProvider || '').toLowerCase();
  const m = (model || '').toLowerCase();
  if (p === 'elevenlabs') {
    return (m.includes('multilingual') || m.includes('_v2') || m.includes('_v3')) ? 'elevenlabs_ml' : 'elevenlabs';
  }
  if (p === 'openai') return m.includes('hd') ? 'openai_hd' : 'openai';
  if (p === 'google') return 'google';
  return 'elevenlabs';
}

/**
 * Fetch assistant's LLM + TTS config from DB.
 */
async function getAssistantBillingConfig(supabase, assistantId) {
  const { data: asst } = await supabase
    .from('assistants')
    .select('llm_model, voice_id')
    .eq('id', assistantId)
    .single();

  let ttsProvider = 'elevenlabs';
  let ttsModel = '';

  if (asst?.voice_id) {
    const { data: voice } = await supabase
      .from('voices')
      .select('tts_provider, model')
      .eq('id', asst.voice_id)
      .single();
    if (voice) { ttsProvider = voice.tts_provider || 'elevenlabs'; ttsModel = voice.model || ''; }
  }

  return {
    llmModel:    asst?.llm_model || 'gpt-4o-mini',
    ttsProvider: ttsProvider,
    ttsModel:    ttsModel,
    ttsKey:      resolveTtsProviderKey(ttsProvider, ttsModel),
  };
}

/**
 * Get per-minute rate quote for an assistant (for pre-call display).
 */
async function getRateForAssistant(supabase, redis, assistantId) {
  const [config, pricing] = await Promise.all([
    getAssistantBillingConfig(supabase, assistantId),
    loadPricing(supabase, redis),
  ]);
  const rate = computeRatePerMinute(pricing, { llmModel: config.llmModel, ttsProvider: config.ttsKey });
  return { ...rate, config, pricingSource: pricing ? 'database' : 'fallback' };
}

/**
 * Friendly display string: "$0.15/min"
 */
function formatRateDisplay(ratePerMin) {
  return `$${ratePerMin.toFixed(2)}/min`;
}

module.exports = {
  loadPricing,
  invalidateCache,
  computeRatePerMinute,
  computeCallCost,
  computeMessageCost,
  resolveTtsProviderKey,
  getAssistantBillingConfig,
  getRateForAssistant,
  formatRateDisplay,
  TOKENS_PER_MIN,
  TTS_CHARS_PER_MIN,
  FALLBACK,
};
