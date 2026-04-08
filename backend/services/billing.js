'use strict';
/**
 * billing.js — Central billing service for ALL Voicory channels
 * (test chat, WhatsApp, Twilio, LiveKit)
 *
 * Pricing (with 40% Voicory margin applied in Supabase RPC):
 *   gpt-4o:      input $2.50/1M, output $10/1M
 *   gpt-4o-mini: input $0.15/1M, output $0.60/1M
 *   1 credit = $0.01
 *
 * All credit deductions are atomic (row-level lock in Postgres).
 */

const { createClient } = require('@supabase/supabase-js');
const PRICING = require('../config/pricing');

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
      // Fail open — don't block user if DB is temporarily unavailable
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
 * Deduct voice call cost (Twilio telephony + Whisper + estimated TTS).
 * Called at call END via status callback.
 *
 * @param {string} userId
 * @param {{
 *   durationMinutes,
 *   ttsCharacters,   // optional: actual chars sent to TTS engine (from call_logs.tts_characters)
 *   sttMinutes,      // optional: actual STT minutes (from call_logs.stt_seconds / 60)
 *   channel,
 *   callSid,
 *   twilioAccountSid,
 *   callLogId
 * }} params
 * @returns {{ success, cost_usd, credits_deducted, new_balance }}
 */
async function deductVoiceCost(userId, {
  durationMinutes = 0,
  ttsCharacters   = null,   // null → fall back to duration-based estimate
  sttMinutes      = null,   // null → fall back to duration-based estimate
  channel = 'twilio',
  callSid = null,
  twilioAccountSid = null,
  callLogId = null,
} = {}) {
  try {
    const supabase = getSupabase();

    // Cost breakdown (from pricing.js)
    const twilioCostPerMin   = PRICING.twilio.perMinuteInbound;         // $0.0085
    const whisperCostPerMin  = PRICING.openai['whisper-1'].perMinute;   // $0.006
    const ttsPerChar         = PRICING.openai['tts-1'].perCharacter;

    // Use actual TTS character count when available; fall back to 500 chars/min estimate
    const effectiveTtsChars  = (ttsCharacters !== null && ttsCharacters >= 0)
      ? ttsCharacters
      : (500 * durationMinutes);
    const ttsCost            = ttsPerChar * effectiveTtsChars;

    // Use actual STT minutes when available; fall back to call duration
    const effectiveSttMins   = (sttMinutes !== null && sttMinutes >= 0)
      ? sttMinutes
      : durationMinutes;
    const sttCost            = whisperCostPerMin * effectiveSttMins;

    const twilioCost         = twilioCostPerMin * durationMinutes;
    const providerCostTotal  = twilioCost + sttCost + ttsCost;

    const MARGIN_MULTIPLIER   = PRICING.voicory.marginMultiplier ?? 4.0; // charge 4x provider cost
    const totalCostUsd       = parseFloat((providerCostTotal * MARGIN_MULTIPLIER).toFixed(6));
    const creditsToDeduct    = parseFloat((totalCostUsd / 0.01).toFixed(4)); // 1 credit = $0.01

    const usingActualMetrics = ttsCharacters !== null || sttMinutes !== null;
    console.log(`[billing] voice cost calc | dur=${durationMinutes.toFixed(2)}min ttsChars=${effectiveTtsChars}(${usingActualMetrics ? 'actual' : 'est'}) sttMin=${effectiveSttMins.toFixed(2)}(${sttMinutes !== null ? 'actual' : 'est'})`);

    if (totalCostUsd <= 0) {
      return { success: true, cost_usd: 0, credits_deducted: 0, new_balance: null };
    }

    // Check balance first
    const { balance: currentBalance, hasCredits } = await checkBalance(userId);
    if (!hasCredits) {
      console.warn(`[billing] deductVoiceCost: zero balance for user=${userId}`);
      return { success: false, reason: 'insufficient_credits', new_balance: 0 };
    }

    // Deduct via deduct_credits RPC
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id:       userId,
      p_amount:        creditsToDeduct,
      p_transaction_type: 'usage',
      p_reference_type: callLogId ? 'call_log' : 'call_sid',
      p_reference_id:  callLogId || null,
      p_description:   `Voice call: ${durationMinutes.toFixed(2)} min | ${channel} | ${callSid || ''}`,
      p_metadata:      JSON.stringify({
        channel,
        call_sid:         callSid,
        twilio_account_sid: twilioAccountSid,
        duration_minutes: durationMinutes,
        cost_usd:         totalCostUsd,
        provider_cost_usd: providerCostTotal,
        margin_usd:       totalCostUsd - providerCostTotal,
        breakdown: {
          twilio:  parseFloat(twilioCost.toFixed(6)),
          stt:     parseFloat(sttCost.toFixed(6)),
          tts:     parseFloat(ttsCost.toFixed(6)),
          tts_characters_actual: ttsCharacters !== null ? effectiveTtsChars : null,
          stt_minutes_actual:    sttMinutes    !== null ? effectiveSttMins  : null,
        }
      }),
    });

    if (error) {
      console.error('[billing] deductVoiceCost RPC error:', error.message);
      return { success: false, reason: 'rpc_error', error: error.message };
    }

    // Also insert into call_costs for P&L dashboard
    if (callLogId) {
      await supabase.from('call_costs').insert({
        user_id:          userId,
        call_log_id:      callLogId,
        llm_cost:         0,
        tts_cost:         parseFloat(ttsCost.toFixed(6)),
        telephony_cost:   parseFloat((twilioCost + sttCost).toFixed(6)),
        total_cost:       totalCostUsd,
        credits_deducted: Math.round(creditsToDeduct),
        breakdown:        {
          channel,
          call_sid:              callSid,
          duration_minutes:      durationMinutes,
          twilio_cost:           parseFloat(twilioCost.toFixed(6)),
          stt_cost:              parseFloat(sttCost.toFixed(6)),
          tts_cost:              parseFloat(ttsCost.toFixed(6)),
          tts_characters_actual: ttsCharacters !== null ? effectiveTtsChars : null,
          stt_minutes_actual:    sttMinutes    !== null ? effectiveSttMins  : null,
          provider_cost_usd:     providerCostTotal,
          margin_usd:            totalCostUsd - providerCostTotal,
          total_cost_usd:        totalCostUsd,
          credits_charged:       creditsToDeduct,
        }
      }).catch(e => console.error('[billing] call_costs insert error:', e.message));
    }

    const newBalance = data?.balance_after ?? (currentBalance - creditsToDeduct);
    console.log(`[billing] voice | user=${userId} dur=${durationMinutes.toFixed(2)}min ttsChars=${effectiveTtsChars} sttMin=${effectiveSttMins.toFixed(2)} cost=$${totalCostUsd} credits=${creditsToDeduct} balance=${newBalance}`);

    return {
      success:          data?.success !== false,
      cost_usd:         totalCostUsd,
      credits_deducted: creditsToDeduct,
      new_balance:      newBalance,
    };
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
