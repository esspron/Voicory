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

module.exports = router;
