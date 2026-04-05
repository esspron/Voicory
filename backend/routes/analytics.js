'use strict';

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { getDailyPnL, getMonthlyPnL } = require('../services/costTracking');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/analytics/pnl?period=daily&date=YYYY-MM-DD
// GET /api/analytics/pnl?period=monthly&month=YYYY-MM
router.get('/pnl', async (req, res) => {
  try {
    const { period = 'daily', date, month } = req.query;
    let result;
    if (period === 'monthly') {
      result = await getMonthlyPnL(month || new Date().toISOString().slice(0, 7));
    } else {
      result = await getDailyPnL(date || new Date().toISOString().slice(0, 10));
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/cost-breakdown?userId=<uuid>&limit=50
router.get('/cost-breakdown', async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('call_costs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10));
    if (error) throw new Error(error.message);
    const totals = data.reduce((acc, row) => {
      acc.totalCalls++;
      acc.totalCost    += parseFloat(row.total_cost_usd || 0);
      acc.totalRevenue += (row.credits_charged || 0) * 0.01;
      acc.totalMargin  += parseFloat(row.margin_usd || 0);
      return acc;
    }, { totalCalls: 0, totalCost: 0, totalRevenue: 0, totalMargin: 0 });
    res.json({ success: true, data: { userId, totals, calls: data } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/model-usage
router.get('/model-usage', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('call_costs')
      .select('model, total_cost_usd, input_tokens, output_tokens');
    if (error) throw new Error(error.message);
    const breakdown = {};
    for (const row of data) {
      const m = row.model || 'unknown';
      if (!breakdown[m]) breakdown[m] = { calls: 0, totalCost: 0, inputTokens: 0, outputTokens: 0 };
      breakdown[m].calls++;
      breakdown[m].totalCost    += parseFloat(row.total_cost_usd || 0);
      breakdown[m].inputTokens  += row.input_tokens || 0;
      breakdown[m].outputTokens += row.output_tokens || 0;
    }
    res.json({ success: true, data: breakdown });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/dashboard?days=7
// Returns aggregated dashboard stats: calls, duration, cost, assistants, recent calls
// Auth: Bearer token required (Supabase JWT)
const { verifySupabaseAuth: verifyDashAuth } = require('../lib/auth');
router.get('/dashboard', verifyDashAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const days = Math.min(parseInt(req.query.days || '7', 10), 90);
    const supabase = getSupabase();
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const prevStartDate = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch call logs for current & previous period (for trend comparison)
    const [{ data: currentCalls, error: err1 }, { data: prevCalls, error: err2 }, { data: assistants, error: err3 }] = await Promise.all([
      supabase.from('call_logs').select('id, duration, cost, status, assistant_name, assistant_id, phone_number, created_at, recording_url, call_sid')
        .eq('user_id', userId).gte('created_at', startDate).order('created_at', { ascending: false }),
      supabase.from('call_logs').select('id, duration, cost, status')
        .eq('user_id', userId).gte('created_at', prevStartDate).lt('created_at', startDate),
      supabase.from('assistants').select('id, name, is_active').eq('user_id', userId).eq('is_active', true),
    ]);

    if (err1) throw new Error(err1.message);
    if (err2) throw new Error(err2.message);

    const curr = currentCalls || [];
    const prev = prevCalls || [];

    // Helper: parse "Xm Ys" duration string to seconds
    const parseDuration = (d) => {
      if (!d) return 0;
      const m = d.match(/(\d+)m\s*(\d+)s/);
      if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
      const sOnly = d.match(/(\d+)s/);
      if (sOnly) return parseInt(sOnly[1]);
      const mOnly = d.match(/(\d+)m/);
      if (mOnly) return parseInt(mOnly[1]) * 60;
      // also handle "MM:SS" format
      const colonFmt = d.match(/^(\d+):(\d+)$/);
      if (colonFmt) return parseInt(colonFmt[1]) * 60 + parseInt(colonFmt[2]);
      return 0;
    };

    const totalCalls = curr.length;
    const prevTotalCalls = prev.length;

    const totalCostCents = curr.reduce((s, c) => s + (Number(c.cost) || 0), 0);
    const prevCostCents = prev.reduce((s, c) => s + (Number(c.cost) || 0), 0);

    const completedCalls = curr.filter(c => c.status === 'completed');
    const totalDurationSec = completedCalls.reduce((s, c) => s + parseDuration(c.duration), 0);
    const avgDurationSec = completedCalls.length > 0 ? Math.round(totalDurationSec / completedCalls.length) : 0;
    const avgDurationFormatted = `${Math.floor(avgDurationSec / 60)}m ${avgDurationSec % 60}s`;

    const prevCompleted = prev.filter(c => c.status === 'completed');
    const prevDurationSec = prevCompleted.length > 0
      ? Math.round(prevCompleted.reduce((s, c) => s + parseDuration(c.duration), 0) / prevCompleted.length) : 0;

    const pctChange = (curr, prev) => prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : null;

    const successRate = totalCalls > 0 ? Math.round((completedCalls.length / totalCalls) * 100) : 0;

    // Top performing assistant by call count
    const assistantCallCounts = {};
    curr.forEach(c => {
      if (c.assistant_name) {
        assistantCallCounts[c.assistant_name] = (assistantCallCounts[c.assistant_name] || 0) + 1;
      }
    });
    const topAssistant = Object.entries(assistantCallCounts).sort((a, b) => b[1] - a[1])[0] || null;

    // Chart data: calls and cost per day for last N days
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayCalls = curr.filter(c => c.created_at.slice(0, 10) === dateStr);
      chartData.push({
        name: days <= 7 ? dayName : dateStr.slice(5),
        calls: dayCalls.length,
        cost: dayCalls.reduce((s, c) => s + (Number(c.cost) || 0), 0),
        date: dateStr,
      });
    }

    // Recent calls (last 5)
    const recentCalls = curr.slice(0, 5).map(c => ({
      id: c.id,
      assistantName: c.assistant_name || 'Unknown',
      phoneNumber: c.phone_number || '',
      duration: c.duration || '0:00',
      cost: Number(c.cost) || 0,
      status: c.status || 'completed',
      date: c.created_at,
      recordingUrl: c.recording_url || null,
      callSid: c.call_sid || null,
    }));

    res.json({
      success: true,
      data: {
        totalCalls,
        totalCallsChange: pctChange(totalCalls, prevTotalCalls),
        totalCallsTrend: totalCalls >= prevTotalCalls ? 'up' : 'down',
        avgDuration: avgDurationFormatted,
        avgDurationSec,
        avgDurationChange: pctChange(avgDurationSec, prevDurationSec),
        avgDurationTrend: avgDurationSec >= prevDurationSec ? 'up' : 'down',
        totalCost: totalCostCents,
        totalCostChange: pctChange(totalCostCents, prevCostCents),
        totalCostTrend: totalCostCents >= prevCostCents ? 'up' : 'down',
        successRate,
        activeAssistants: (assistants || []).length,
        topAssistant: topAssistant ? { name: topAssistant[0], calls: topAssistant[1] } : null,
        recentCalls,
        chartData,
        periodDays: days,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

// GET /api/analytics/monthly-report?month=YYYY-MM
// Returns a CSV of all credit transactions + call costs for the given month
// Auth: Bearer token required (Supabase JWT)
const { verifySupabaseAuth } = require('../lib/auth');

router.get('/monthly-report', verifySupabaseAuth, async (req, res) => {
  try {
    const { month } = req.query;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Validate / default month
    const reportMonth = month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : new Date().toISOString().slice(0, 7);

    const startDate = `${reportMonth}-01T00:00:00.000Z`;
    const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString();

    const supabase = getSupabase();

    // Fetch credit transactions for the month
    const { data: txns, error: txErr } = await supabase
      .from('credit_transactions')
      .select('created_at, transaction_type, description, amount, balance_after')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: true });

    if (txErr) throw new Error(txErr.message);

    // Fetch call costs for the month
    const { data: costs, error: costErr } = await supabase
      .from('call_costs')
      .select('created_at, model, input_tokens, output_tokens, total_cost_usd, margin_usd')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: true });

    if (costErr) throw new Error(costErr.message);

    // Build CSV
    const rows = [];
    rows.push('date,type,description,amount_usd,balance_after_usd,model,input_tokens,output_tokens,cost_usd,margin_usd');

    for (const tx of (txns || [])) {
      const date = new Date(tx.created_at).toISOString().slice(0, 10);
      const desc = `"${(tx.description || '').replace(/"/g, '""')}"`;
      rows.push([date, tx.transaction_type, desc, tx.amount, tx.balance_after, '', '', '', '', ''].join(','));
    }

    for (const c of (costs || [])) {
      const date = new Date(c.created_at).toISOString().slice(0, 10);
      const desc = `"Call cost - ${(c.model || 'unknown').replace(/"/g, '""')}"`;
      rows.push([date, 'usage', desc, -Math.abs(c.total_cost_usd || 0), '', c.model || '', c.input_tokens || 0, c.output_tokens || 0, c.total_cost_usd || 0, c.margin_usd || 0].join(','));
    }

    const csv = rows.join('\n');

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="voicory-report-${reportMonth}.csv"`,
    });
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
