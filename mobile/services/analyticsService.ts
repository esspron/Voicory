import { supabase } from '../lib/supabase';
import { DashboardStats } from '../types';

const USD_TO_INR = 84;

export async function getDashboardStats(
  userId: string,
  days: number = 7
): Promise<DashboardStats> {
  // Try RPC first
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      p_user_id: userId,
      p_days: days,
    });
    if (!error && data) {
      return {
        totalCalls: data.total_calls || 0,
        avgDuration: data.avg_duration || 0,
        totalCost: (data.total_cost || 0) * USD_TO_INR,
        successRate: data.success_rate || 0,
        creditsBalance: (data.credits_balance || 0) * USD_TO_INR,
      };
    }
  } catch (_) {
    // Fall through to manual calculation
  }

  // Manual calculation from call_logs
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: calls } = await supabase
    .from('call_logs')
    .select('duration_seconds, cost, status')
    .eq('user_id', userId)
    .gte('created_at', since);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('credits_balance')
    .eq('user_id', userId)
    .single();

  const callList = calls || [];
  const totalCalls = callList.length;
  const avgDuration =
    totalCalls > 0
      ? callList.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / totalCalls
      : 0;
  const totalCostUsd = callList.reduce((s: number, c: any) => s + (c.cost || 0), 0);
  const completed = callList.filter((c: any) => c.status === 'completed').length;
  const successRate = totalCalls > 0 ? (completed / totalCalls) * 100 : 0;
  const creditsBalance = (profile?.credits_balance || 0) * USD_TO_INR;

  return {
    totalCalls,
    avgDuration,
    totalCost: totalCostUsd * USD_TO_INR,
    successRate,
    creditsBalance,
  };
}

export async function getUsageSummary(userId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('call_logs')
    .select('created_at, cost, duration_seconds, status')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
