'use strict';
/**
 * voiceRateEngine.js — Dynamic per-minute voice call rate calculator
 *
 * Architecture:
 *   Rate = STT_cost/min + LLM_cost/min + TTS_cost/min + Infra_cost/min
 *   All costs are PROVIDER cost. Voicory applies 4x margin on top.
 *
 * Verified rates (April 17, 2026):
 *   STT:  openai.com/api/pricing
 *   LLM:  openai.com/api/pricing
 *   TTS:  elevenlabs.io/pricing/api | cloud.google.com/text-to-speech/pricing | openai.com/api/pricing
 *   Infra: livekit.com/pricing
 *
 * Usage assumptions per minute of voice call:
 *   - STT: full 1 minute of user audio → whisper = $0.006/min
 *   - LLM: ~3 turns/min, ~200 input + 100 output tokens/turn = 600 input + 300 output tokens
 *   - TTS: ~750 characters of AI speech per minute
 *   - Infra: 1 participant-minute LiveKit = $0.001/min
 */

// ─── Raw Provider Rates (NO margin applied here) ──────────────────────────────

// STT rates (per audio minute)
const STT_RATES = {
  'whisper-1':           0.006,   // OpenAI Whisper — $0.006/min
  'gpt-4o-transcribe':   0.006,   // OpenAI gpt-4o-transcribe — $0.006/min
  'gpt-4o-mini-transcribe': 0.003, // OpenAI gpt-4o-mini-transcribe — $0.003/min
  'elevenlabs-scribe':   0.00367, // ElevenLabs Scribe v1/v2 — $0.22/hr = $0.00367/min
  'elevenlabs-scribe-rt': 0.0065, // ElevenLabs Scribe Realtime — $0.39/hr = $0.0065/min
  default:               0.006,   // safe default: Whisper rate
};

// LLM rates (per token — input/output)
// Assumes 600 input + 300 output tokens per minute of conversation
const LLM_RATES_PER_TOKEN = {
  'gpt-5.4':         { input: 0.0000025,   output: 0.000015   }, // $2.50/$15.00 per 1M
  'gpt-5.4-mini':    { input: 0.00000075,  output: 0.0000045  }, // $0.75/$4.50
  'gpt-5.4-nano':    { input: 0.0000002,   output: 0.00000125 }, // $0.20/$1.25
  'gpt-4.1':         { input: 0.000002,    output: 0.000008   }, // $2.00/$8.00
  'gpt-4.1-mini':    { input: 0.0000004,   output: 0.0000016  }, // $0.40/$1.60
  'gpt-4.1-nano':    { input: 0.0000001,   output: 0.0000004  }, // $0.10/$0.40
  'gpt-4o':          { input: 0.0000025,   output: 0.00001    }, // $2.50/$10.00
  'gpt-4o-mini':     { input: 0.00000015,  output: 0.0000006  }, // $0.15/$0.60
  'o4-mini':         { input: 0.0000011,   output: 0.0000044  }, // $1.10/$4.40
  'o3':              { input: 0.00001,     output: 0.00004    }, // $10.00/$40.00
  'o3-mini':         { input: 0.0000011,   output: 0.0000044  }, // $1.10/$4.40
  'o1':              { input: 0.000015,    output: 0.00006    }, // $15.00/$60.00
  'o1-mini':         { input: 0.0000011,   output: 0.0000044  }, // $1.10/$4.40
  'gpt-4-turbo':     { input: 0.00001,     output: 0.00003    }, // $10.00/$30.00
  'gpt-3.5-turbo':   { input: 0.0000005,   output: 0.0000015  }, // $0.50/$1.50
  default:           { input: 0.00000015,  output: 0.0000006  }, // gpt-4o-mini rates
};

// Token usage per minute of conversation (assumptions)
const TOKENS_PER_MIN = { input: 600, output: 300 };

// TTS rates (per character)
// Assumes 750 characters of AI speech per minute
const TTS_RATES_PER_CHAR = {
  // OpenAI TTS
  'openai':          0.000015,  // tts-1: $15.00/1M chars
  'openai_hd':       0.000030,  // tts-1-hd: $30.00/1M chars
  // ElevenLabs — pay-as-you-go API rates (elevenlabs.io/pricing/api, Apr 17 2026)
  'elevenlabs':      0.00005,   // Flash/Turbo models: $0.05/1K chars
  'elevenlabs_ml':   0.0001,    // Multilingual v2/v3: $0.10/1K chars
  // Google TTS
  'google':          0.00003,   // Chirp 3 HD: $0.03/1K chars (cloud.google.com/text-to-speech/pricing)
  default:           0.00005,   // safe default: ElevenLabs Flash
};

// Characters per minute of AI speech
const TTS_CHARS_PER_MIN = 750;

// Infrastructure cost per participant-minute (LiveKit Cloud)
const INFRA_COST_PER_MIN = 0.001;

// Voicory margin multiplier
const MARGIN = 4.0; // 4x = 300% markup

// ─── Rate Computation ─────────────────────────────────────────────────────────

/**
 * Compute provider cost per minute for a specific assistant config.
 *
 * @param {Object} config
 * @param {string} config.llmModel      — e.g. 'gpt-4o-mini'
 * @param {string} config.ttsProvider   — e.g. 'elevenlabs', 'openai', 'google'
 * @param {string} config.sttProvider   — e.g. 'whisper-1' (optional, defaults to whisper)
 * @returns {{ providerCostPerMin: number, ratePerMin: number, breakdown: Object }}
 */
function computeRatePerMinute({ llmModel = 'gpt-4o-mini', ttsProvider = 'elevenlabs', sttProvider = 'whisper-1' } = {}) {
  // STT cost per minute
  const sttRate = STT_RATES[sttProvider] ?? STT_RATES.default;
  const sttCostPerMin = sttRate;

  // LLM cost per minute
  const llmKey = llmModel in LLM_RATES_PER_TOKEN ? llmModel : 'default';
  const llmRates = LLM_RATES_PER_TOKEN[llmKey];
  const llmCostPerMin = (llmRates.input * TOKENS_PER_MIN.input) + (llmRates.output * TOKENS_PER_MIN.output);

  // TTS cost per minute
  const ttsKey = ttsProvider in TTS_RATES_PER_CHAR ? ttsProvider : 'default';
  const ttsCostPerMin = TTS_RATES_PER_CHAR[ttsKey] * TTS_CHARS_PER_MIN;

  // Infrastructure
  const infraCostPerMin = INFRA_COST_PER_MIN;

  const providerCostPerMin = sttCostPerMin + llmCostPerMin + ttsCostPerMin + infraCostPerMin;
  const ratePerMin = parseFloat((providerCostPerMin * MARGIN).toFixed(6));

  return {
    providerCostPerMin: parseFloat(providerCostPerMin.toFixed(6)),
    ratePerMin,           // What Voicory charges the user per minute
    marginMultiplier: MARGIN,
    breakdown: {
      stt:   parseFloat(sttCostPerMin.toFixed(6)),
      llm:   parseFloat(llmCostPerMin.toFixed(6)),
      tts:   parseFloat(ttsCostPerMin.toFixed(6)),
      infra: parseFloat(infraCostPerMin.toFixed(6)),
      total_provider: parseFloat(providerCostPerMin.toFixed(6)),
      voicory_rate:   ratePerMin,
      assumptions: {
        llm_input_tokens_per_min:  TOKENS_PER_MIN.input,
        llm_output_tokens_per_min: TOKENS_PER_MIN.output,
        tts_chars_per_min:         TTS_CHARS_PER_MIN,
        stt_provider:              sttProvider,
        llm_model:                 llmModel,
        tts_provider:              ttsProvider,
      },
    },
  };
}

/**
 * Compute total cost for a completed call.
 *
 * @param {Object} params
 * @param {number} params.durationSeconds — actual call duration in seconds
 * @param {string} params.llmModel
 * @param {string} params.ttsProvider
 * @param {string} params.sttProvider
 * @param {number} params.actualTtsChars  — if known, use actual; else estimate
 * @param {number} params.actualInputTokens  — if known
 * @param {number} params.actualOutputTokens — if known
 * @returns {{ totalCostUsd: number, ratePerMin: number, breakdown: Object }}
 */
function computeCallCost({
  durationSeconds = 0,
  llmModel = 'gpt-4o-mini',
  ttsProvider = 'elevenlabs',
  sttProvider = 'whisper-1',
  actualTtsChars = null,
  actualInputTokens = null,
  actualOutputTokens = null,
} = {}) {
  const durationMinutes = durationSeconds / 60;

  // STT
  const sttRate = STT_RATES[sttProvider] ?? STT_RATES.default;
  const sttCost = sttRate * durationMinutes;

  // LLM — use actual tokens if available, else estimate
  const llmKey = llmModel in LLM_RATES_PER_TOKEN ? llmModel : 'default';
  const llmRates = LLM_RATES_PER_TOKEN[llmKey];
  const inputToks  = actualInputTokens  ?? (TOKENS_PER_MIN.input  * durationMinutes);
  const outputToks = actualOutputTokens ?? (TOKENS_PER_MIN.output * durationMinutes);
  const llmCost = (llmRates.input * inputToks) + (llmRates.output * outputToks);

  // TTS — use actual chars if available, else estimate
  const ttsKey = ttsProvider in TTS_RATES_PER_CHAR ? ttsProvider : 'default';
  const chars = actualTtsChars ?? (TTS_CHARS_PER_MIN * durationMinutes);
  const ttsCost = TTS_RATES_PER_CHAR[ttsKey] * chars;

  // Infra
  const infraCost = INFRA_COST_PER_MIN * durationMinutes;

  const providerTotal = sttCost + llmCost + ttsCost + infraCost;
  const totalCostUsd  = parseFloat((providerTotal * MARGIN).toFixed(6));

  const { ratePerMin } = computeRatePerMinute({ llmModel, ttsProvider, sttProvider });

  return {
    totalCostUsd,
    providerCostUsd: parseFloat(providerTotal.toFixed(6)),
    ratePerMin,
    durationMinutes: parseFloat(durationMinutes.toFixed(4)),
    breakdown: {
      stt_cost:    parseFloat(sttCost.toFixed(6)),
      llm_cost:    parseFloat(llmCost.toFixed(6)),
      tts_cost:    parseFloat(ttsCost.toFixed(6)),
      infra_cost:  parseFloat(infraCost.toFixed(6)),
      margin:      MARGIN,
      provider_total: parseFloat(providerTotal.toFixed(6)),
      voicory_total:  totalCostUsd,
      actual_metrics: {
        tts_chars:      actualTtsChars !== null ? chars : null,
        input_tokens:   actualInputTokens  !== null ? inputToks  : null,
        output_tokens:  actualOutputTokens !== null ? outputToks : null,
        estimated:      actualTtsChars === null && actualInputTokens === null,
      },
    },
  };
}

/**
 * Resolve TTS provider key from voices table `tts_provider` column value.
 * voices.tts_provider = 'elevenlabs' | 'openai' | 'google'
 * voices.model        = 'eleven_flash_v2' | 'tts-1' | 'tts-1-hd' | 'chirp3-hd' etc.
 */
function resolveTtsProviderKey(ttsProvider, model = '') {
  const p = (ttsProvider || '').toLowerCase();
  const m = (model || '').toLowerCase();

  if (p === 'elevenlabs') {
    // Flash/Turbo = cheaper; Multilingual = more expensive
    if (m.includes('multilingual') || m.includes('v2') || m.includes('v3')) {
      return 'elevenlabs_ml';
    }
    return 'elevenlabs'; // Flash/Turbo default
  }
  if (p === 'openai') {
    if (m.includes('hd')) return 'openai_hd';
    return 'openai';
  }
  if (p === 'google') return 'google';
  return 'elevenlabs'; // safe default
}

/**
 * Friendly display string for customer-facing pricing.
 * Returns: "$0.12/min" style string
 */
function formatRateDisplay(ratePerMin) {
  return `$${ratePerMin.toFixed(2)}/min`;
}

/**
 * Pre-flight rate quote for token generation.
 * Fetch assistant config → return rate so frontend can display before call.
 */
async function getRateForAssistant(supabase, assistantId) {
  const { data: assistant } = await supabase
    .from('assistants')
    .select('llm_model, voice_id')
    .eq('id', assistantId)
    .single();

  let ttsProvider = 'elevenlabs';
  let ttsModel = '';

  if (assistant?.voice_id) {
    const { data: voice } = await supabase
      .from('voices')
      .select('tts_provider, model')
      .eq('id', assistant.voice_id)
      .single();
    if (voice) {
      ttsProvider = voice.tts_provider || 'elevenlabs';
      ttsModel = voice.model || '';
    }
  }

  const ttsKey = resolveTtsProviderKey(ttsProvider, ttsModel);
  const llmModel = assistant?.llm_model || 'gpt-4o-mini';

  return computeRatePerMinute({ llmModel, ttsProvider: ttsKey });
}

module.exports = {
  computeRatePerMinute,
  computeCallCost,
  resolveTtsProviderKey,
  getRateForAssistant,
  formatRateDisplay,
  STT_RATES,
  LLM_RATES_PER_TOKEN,
  TTS_RATES_PER_CHAR,
  MARGIN,
};
