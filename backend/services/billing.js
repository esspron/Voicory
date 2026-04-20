'use strict';
/**
 * billing.js — Central billing service for ALL Voicory channels
 * (test chat, WhatsApp, Twilio, LiveKit)
 *
 * Pricing is DB-driven via service_pricing + llm_pricing tables.
 * Cache: Redis 5-min TTL. Fallback: hardcoded safety values.
 * 1 credit = $1 USD. All deductions are atomic via Supabase RPC.
 */

const { createClient } = require('@supabase/supabase-js');
const rateEngine = require('./voiceRateEngine');

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
 * Check user's credit balance.
 * Uses SELECT FOR UPDATE inside the RPC for race-condition safety.
 * @param {string} userId
 * @returns {{ balance: number, hasCredits: boolean }}
 */
async function checkBalance(userId) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('check_user_balance', { p_user_id: userId });
    if (error) {
      console.error('[billing] checkBalance RPC error:', error.message);
      // Fail closed — don't give away free service if DB is down
      return { balance: 0, hasCredits: false };
    }
    const balance = parseFloat(data?.balance ?? 0);
    return { balance, hasCredits: balance > 0 };
  } catch (err) {
    console.error('[billing] checkBalance exception:', err.message);
    return { balance: 0, hasCredits: false };
  }
}

/**
 * Deduct cost for a single LLM message (all text channels).
 * Calls the log_llm_usage RPC which does:
 *   - Pre-flight balance check
 *   - Cost calculation (with 40% margin)
 *   - Atomic deduction
 *   - Inserts credit_transactions + call_costs rows
 *
 * @param {string} userId
 * @param {{ model, inputTokens, outputTokens, assistantId, channel, callLogId, conversationId }} params
 * @returns {{ success, cost_usd, credits_deducted, new_balance, reason }}
 */
async function deductMessageCost(userId, {
  model = 'gpt-4o-mini',
  inputTokens = 0,
  outputTokens = 0,
  assistantId = null,
  channel = 'unknown',
  callLogId = null,
  conversationId = null,
} = {}) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('log_llm_usage', {
      p_user_id:         userId,
      p_assistant_id:    assistantId,
      p_provider:        'openai',
      p_model:           model,
      p_input_tokens:    inputTokens,
      p_output_tokens:   outputTokens,
      p_call_log_id:     callLogId,
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error('[billing] deductMessageCost RPC error:', error.message);
      return { success: false, reason: 'rpc_error', error: error.message };
    }

    if (!data?.success) {
      console.warn(`[billing] deductMessageCost failed: ${data?.reason} | user=${userId} balance=${data?.balance}`);
    } else {
      console.log(`[billing] ${channel} | user=${userId} model=${model} in=${inputTokens} out=${outputTokens} cost=$${data.cost_usd} credits=${data.credits_deducted} balance=${data.new_balance}`);
    }

    return {
      success:          data?.success === true,
      cost_usd:         data?.cost_usd ?? 0,
      credits_deducted: data?.credits_deducted ?? 0,
      new_balance:      data?.new_balance ?? 0,
      reason:           data?.reason ?? null,
    };
  } catch (err) {
    console.error('[billing] deductMessageCost exception:', err.message);
    return { success: false, reason: 'exception', error: err.message };
  }
}

/**
 * Deduct voice call cost — DB-driven pricing via voiceRateEngine.
 * Rates loaded from service_pricing + llm_pricing tables (Redis cached 5min).
 *
 * @param {string} userId
 * @param {{
 *   durationMinutes,
 *   durationSeconds,     // preferred: exact seconds (more accurate than minutes)
 *   ttsProvider,         // resolved provider key: 'openai'|'openai_hd'|'elevenlabs'|'elevenlabs_ml'|'google'
 *   llmModel,            // e.g. 'gpt-4o-mini'
 *   sttProvider,         // e.g. 'whisper-1'
 *   actualTtsChars,      // optional: actual chars sent to TTS
 *   actualInputTokens,   // optional: actual LLM input tokens
 *   actualOutputTokens,  // optional: actual LLM output tokens
 *   channel, callSid, twilioAccountSid, callLogId
 * }} params
 */
async function deductVoiceCost(userId, {
  durationMinutes  = 0,
  durationSeconds  = null,
  ttsProvider      = 'elevenlabs',
  llmModel         = 'gpt-4o-mini',
  sttProvider      = 'whisper-1',
  actualTtsChars   = null,
  actualInputTokens  = null,
  actualOutputTokens = null,
  channel          = 'livekit',
  callSid          = null,
  twilioAccountSid = null,
  callLogId        = null,
} = {}) {
  try {
    const supabase = getSupabase();

    // Use seconds if available for precision, else convert minutes
    const seconds = durationSeconds !== null ? durationSeconds : durationMinutes * 60;

    // Load DB pricing (cached in Redis if available)
    const { redis } = require('../config');
    const pricing = await rateEngine.loadPricing(supabase, redis);

    // Compute exact cost from DB rates
    const result = rateEngine.computeCallCost(pricing, {
      durationSeconds:   seconds,
      llmModel,
      ttsProvider,
      sttProvider,
      actualTtsChars,
      actualInputTokens,
      actualOutputTokens,
    });

    const totalCostUsd    = result.totalCostUsd;
    const creditsToDeduct = totalCostUsd; // 1 credit = $1 USD
    const durationMins    = result.durationMinutes;

    console.log(`[billing] voice | user=${userId} tts=${ttsProvider} llm=${llmModel} dur=${durationMins.toFixed(2)}min rate=$${result.ratePerMin.toFixed(4)}/min total=$${totalCostUsd} source=${result.breakdown.pricing_source}`);

    if (totalCostUsd <= 0) {
      return { success: true, cost_usd: 0, credits_deducted: 0, new_balance: null };
    }

    // Check balance
    const { balance: currentBalance, hasCredits } = await checkBalance(userId);
    if (!hasCredits) {
      console.warn(`[billing] deductVoiceCost: zero balance for user=${userId}`);
      return { success: false, reason: 'insufficient_credits', new_balance: 0 };
    }

    // Atomic deduct via RPC
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id:           userId,
      p_amount:            creditsToDeduct,
      p_transaction_type:  'usage',
      p_reference_type:    callLogId ? 'call_log' : 'call_sid',
      p_reference_id:      callLogId || null,
      p_description:       `Voice call: ${durationMins.toFixed(2)}min | ${channel} | ${ttsProvider} TTS | ${llmModel}`,
      p_metadata:          JSON.stringify({
        channel,
        call_sid:          callSid,
        twilio_account_sid: twilioAccountSid,
        duration_minutes:  durationMins,
        tts_provider:      ttsProvider,
        llm_model:         llmModel,
        rate_per_minute:   result.ratePerMin,
        cost_usd:          totalCostUsd,
        pricing_source:    result.breakdown.pricing_source,
        breakdown:         result.breakdown,
      }),
    });

    if (error) {
      console.error('[billing] deductVoiceCost RPC error:', error.message);
      return { success: false, reason: 'rpc_error', error: error.message };
    }

    // Insert into call_costs for P&L dashboard
    if (callLogId) {
      await supabase.from('call_costs').insert({
        user_id:          userId,
        call_log_id:      callLogId,
        llm_cost:         parseFloat(result.breakdown.llm_cost.toFixed(6)),
        tts_cost:         parseFloat(result.breakdown.tts_cost.toFixed(6)),
        telephony_cost:   parseFloat((result.breakdown.stt_cost + result.breakdown.infra_cost).toFixed(6)),
        total_cost:       totalCostUsd,
        credits_deducted: creditsToDeduct,
        breakdown: {
          channel, call_sid: callSid, duration_minutes: durationMins,
          tts_provider: ttsProvider, llm_model: llmModel,
          rate_per_min: result.ratePerMin,
          pricing_source: result.breakdown.pricing_source,
        }
      }).catch(e => console.error('[billing] call_costs insert error:', e.message));
    }

    const newBalance = data?.balance_after ?? (currentBalance - creditsToDeduct);
    return { success: data?.success !== false, cost_usd: totalCostUsd, credits_deducted: creditsToDeduct, new_balance: newBalance };

  } catch (err) {
    console.error('[billing] deductVoiceCost exception:', err.message);
    return { success: false, reason: 'exception', error: err.message };
  }
}

/**
 * Get usage summary for a user (last N days).
 * @param {string} userId
 * @param {number} days
 * @returns {{ totalCost, totalCredits, byDay, byChannel, byModel }}
 */
async function getUsageSummary(userId, days = 30) {
  try {
    const supabase = getSupabase();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [txResult, costResult] = await Promise.all([
      supabase
        .from('credit_transactions')
        .select('amount, created_at, metadata, transaction_type')
        .eq('user_id', userId)
        .eq('transaction_type', 'usage')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),

      supabase
        .from('call_costs')
        .select('total_cost, credits_deducted, created_at, breakdown')
        .eq('user_id', userId)
        .gte('created_at', since),
    ]);

    const transactions = txResult.data || [];
    const callCosts    = costResult.data || [];

    const totalCredits = transactions.reduce((s, t) => s + Math.abs(parseFloat(t.amount || 0)), 0);
    const totalCost    = callCosts.reduce((s, c) => s + parseFloat(c.total_cost || 0), 0);

    // Group by day
    const dayMap = {};
    for (const t of transactions) {
      const day = t.created_at.slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { date: day, credits_used: 0, cost: 0 };
      dayMap[day].credits_used += Math.abs(parseFloat(t.amount || 0));
    }
    for (const c of callCosts) {
      const day = c.created_at.slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { date: day, credits_used: 0, cost: 0 };
      dayMap[day].cost += parseFloat(c.total_cost || 0);
    }
    const byDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    // Group by channel
    const byChannel = {};
    for (const t of transactions) {
      const ch = t.metadata?.channel || 'unknown';
      if (!byChannel[ch]) byChannel[ch] = { credits: 0, cost: 0 };
      byChannel[ch].credits += Math.abs(parseFloat(t.amount || 0));
    }

    // Group by model
    const byModel = {};
    for (const t of transactions) {
      const m = t.metadata?.model || 'unknown';
      if (!byModel[m]) byModel[m] = { credits: 0, cost: 0 };
      byModel[m].credits += Math.abs(parseFloat(t.amount || 0));
      byModel[m].cost    += parseFloat(t.metadata?.cost_usd || 0);
    }

    return { totalCost, totalCredits, byDay, byChannel, byModel };
  } catch (err) {
    console.error('[billing] getUsageSummary exception:', err.message);
    return { totalCost: 0, totalCredits: 0, byDay: [], byChannel: {}, byModel: {} };
  }
}

module.exports = { checkBalance, deductMessageCost, deductVoiceCost, getUsageSummary };
