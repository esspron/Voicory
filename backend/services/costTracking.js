'use strict';

/**
 * LLM Cost Tracking + P&L Service
 * Pricing last verified: April 2026
 */

const { createClient } = require('@supabase/supabase-js');

const MODEL_PRICING = {
  'gpt-4o':        { input: 0.0000025,   output: 0.000010   },
  'gpt-4o-mini':   { input: 0.00000015,  output: 0.0000006  },
  'gpt-4-turbo':   { input: 0.00001,     output: 0.00003    },
  'gpt-3.5-turbo': { input: 0.0000005,   output: 0.0000015  },
  'whisper-1':     { perMinute: 0.006 },
};

const ELEVENLABS_PRICING = {
  starter:  { perCharacter: 0.000030 },
  creator:  { perCharacter: 0.000024 },
  pro:      { perCharacter: 0.000018 },
  default:  { perCharacter: 0.000030 },
};

const LIVEKIT_PRICING = {
  perParticipantMinute: 0.001,
};

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Calculate cost of a single call.
 * @param {Object} callData
 * @returns {{ llmCost, whisperCost, ttsCost, livekitCost, totalCost, creditsValueUsd, margin, marginPercent }}
 */
function calculateCallCost(callData) {
  const {
    model = 'gpt-4o',
    inputTokens = 0,
    outputTokens = 0,
    audioMinutes = 0,
    ttsCharacters = 0,
    elevenlabsPlan = 'default',
    livekitMinutes = 0,
    creditsCharged = 0,
  } = callData;

  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];
  let llmCost = 0;
  if (pricing.perMinute) {
    llmCost = audioMinutes * pricing.perMinute;
  } else {
    llmCost = (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }

  const whisperCost = audioMinutes * MODEL_PRICING['whisper-1'].perMinute;
  const ttsPricing = ELEVENLABS_PRICING[elevenlabsPlan] || ELEVENLABS_PRICING.default;
  const ttsCost = ttsCharacters * ttsPricing.perCharacter;
  const livekitCost = livekitMinutes * LIVEKIT_PRICING.perParticipantMinute;
  const totalCost = llmCost + whisperCost + ttsCost + livekitCost;
  const creditsValueUsd = creditsCharged * 0.01;
  const margin = creditsValueUsd - totalCost;

  return {
    llmCost:         parseFloat(llmCost.toFixed(6)),
    whisperCost:     parseFloat(whisperCost.toFixed(6)),
    ttsCost:         parseFloat(ttsCost.toFixed(6)),
    livekitCost:     parseFloat(livekitCost.toFixed(6)),
    totalCost:       parseFloat(totalCost.toFixed(6)),
    creditsValueUsd: parseFloat(creditsValueUsd.toFixed(6)),
    margin:          parseFloat(margin.toFixed(6)),
    marginPercent:   creditsValueUsd > 0
      ? parseFloat(((margin / creditsValueUsd) * 100).toFixed(2))
      : null,
  };
}

function calculateMargin(userId, callData) {
  return { userId, ...calculateCallCost(callData) };
}

async function logCostToSupabase(userId, callId, costData) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('call_costs')
      .insert({
        user_id:          userId,
        call_id:          callId,
        model:            costData.model || 'gpt-4o',
        input_tokens:     costData.inputTokens || 0,
        output_tokens:    costData.outputTokens || 0,
        llm_cost_usd:     costData.llmCost,
        tts_cost_usd:     costData.ttsCost,
        livekit_cost_usd: costData.livekitCost,
        total_cost_usd:   costData.totalCost,
        credits_charged:  costData.creditsCharged || 0,
        margin_usd:       costData.margin,
      })
      .select()
      .single();
    if (error) { console.error('[costTracking] Supabase insert error:', error.message); return null; }
    return data;
  } catch (err) {
    console.error('[costTracking] logCostToSupabase error:', err.message);
    return null;
  }
}

function aggregatePnL(rows, period, label) {
  const summary = {
    period, label,
    totalCalls: rows.length,
    totalRevenue: 0, totalCost: 0, totalMargin: 0,
    llmCost: 0, ttsCost: 0, livekitCost: 0,
    marginPercent: null, modelBreakdown: {},
  };
  for (const row of rows) {
    const revenue = (row.credits_charged || 0) * 0.01;
    summary.totalRevenue  += revenue;
    summary.totalCost     += parseFloat(row.total_cost_usd || 0);
    summary.totalMargin   += parseFloat(row.margin_usd || 0);
    summary.llmCost       += parseFloat(row.llm_cost_usd || 0);
    summary.ttsCost       += parseFloat(row.tts_cost_usd || 0);
    summary.livekitCost   += parseFloat(row.livekit_cost_usd || 0);
    const m = row.model || 'unknown';
    if (!summary.modelBreakdown[m]) summary.modelBreakdown[m] = { calls: 0, cost: 0 };
    summary.modelBreakdown[m].calls++;
    summary.modelBreakdown[m].cost += parseFloat(row.total_cost_usd || 0);
  }
  for (const k of ['totalRevenue','totalCost','totalMargin','llmCost','ttsCost','livekitCost']) {
    summary[k] = parseFloat(summary[k].toFixed(6));
  }
  summary.marginPercent = summary.totalRevenue > 0
    ? parseFloat(((summary.totalMargin / summary.totalRevenue) * 100).toFixed(2))
    : null;
  return summary;
}

async function getDailyPnL(date) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('call_costs')
    .select('total_cost_usd, credits_charged, margin_usd, model, llm_cost_usd, tts_cost_usd, livekit_cost_usd')
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lte('created_at', `${date}T23:59:59.999Z`);
  if (error) throw new Error(`getDailyPnL failed: ${error.message}`);
  return aggregatePnL(data, 'daily', date);
}

async function getMonthlyPnL(month) {
  const supabase = getSupabase();
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1).toISOString();
  const end   = new Date(year, mon, 0, 23, 59, 59, 999).toISOString();
  const { data, error } = await supabase
    .from('call_costs')
    .select('total_cost_usd, credits_charged, margin_usd, model, llm_cost_usd, tts_cost_usd, livekit_cost_usd')
    .gte('created_at', start)
    .lte('created_at', end);
  if (error) throw new Error(`getMonthlyPnL failed: ${error.message}`);
  return aggregatePnL(data, 'monthly', month);
}

module.exports = {
  MODEL_PRICING, ELEVENLABS_PRICING, LIVEKIT_PRICING,
  calculateCallCost, calculateMargin,
  logCostToSupabase, getDailyPnL, getMonthlyPnL,
};
