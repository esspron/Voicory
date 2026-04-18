import { supabase } from '../lib/supabase';
import { DashboardStats } from '../types';

const USD_TO_INR = 84;

export interface CreditHealth {
  balanceUsd: number;
  balanceInr: number;
  /** Average daily spend in INR over last 7 days */
  dailyBurnInr: number;
  /** Estimated days remaining at current burn rate; Infinity if no spend */
  daysRemaining: number;
  /** 'healthy' >14d | 'watch' 7-14d | 'low' 2-7d | 'critical' <2d */
  urgency: 'healthy' | 'watch' | 'low' | 'critical';
  /** Spend in INR: last 7 days */
  weekSpendInr: number;
  /** Spend in INR: prior 7 days (for trend comparison) */
  priorWeekSpendInr: number;
  /** +/- percentage change week-over-week, null if no prior data */
  weekOverWeekPct: number | null;
}

export interface AgentPerformance {
  assistantId: string;
  assistantName: string;
  totalCalls: number;
  completedCalls: number;
  successRate: number;
  avgDurationSec: number;
  totalCostInr: number;
}

export interface DashboardData {
  stats: DashboardStats;
  creditHealth: CreditHealth;
  agentPerformance: AgentPerformance[];
  /** Daily call counts for last 7 days [{ date, count }] */
  dailyActivity: { date: string; count: number }[];
  /** Time-of-day greeting */
  greeting: string;
  /** Number of assistants the user has created (from assistants table) */
  assistantCount: number;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
}

function getUrgency(daysRemaining: number): CreditHealth['urgency'] {
  if (daysRemaining > 14) return 'healthy';
  if (daysRemaining > 7) return 'watch';
  if (daysRemaining > 2) return 'low';
  return 'critical';
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

  // Parallel fetch everything we need
  const [profileRes, weekCallsRes, priorWeekCallsRes, assistantsCountRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('credits_balance')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('call_logs')
      .select('id, assistant_id, duration_seconds, cost, status, created_at, assistant:assistant_id(name)')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true }),
    supabase
      .from('call_logs')
      .select('cost')
      .eq('user_id', userId)
      .gte('created_at', fourteenDaysAgo)
      .lt('created_at', sevenDaysAgo),
    supabase
      .from('assistants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const balanceUsd = profileRes.data?.credits_balance ?? 0;
  const weekCalls = weekCallsRes.data ?? [];
  const priorWeekCalls = priorWeekCallsRes.data ?? [];
  const assistantCount = assistantsCountRes.count ?? 0;

  // ── Basic Stats ──
  const totalCalls = weekCalls.length;
  const completed = weekCalls.filter((c: any) => c.status === 'completed');
  const avgDuration = totalCalls > 0
    ? weekCalls.reduce((s: number, c: any) => s + (c.duration_seconds ?? 0), 0) / totalCalls
    : 0;
  const totalCostUsd = weekCalls.reduce((s: number, c: any) => s + (c.cost ?? 0), 0);
  const successRate = totalCalls > 0 ? (completed.length / totalCalls) * 100 : 0;

  const stats: DashboardStats = {
    totalCalls,
    avgDuration,
    totalCost: totalCostUsd * USD_TO_INR,
    successRate,
    creditsBalance: balanceUsd * USD_TO_INR,
  };

  // ── Credit Health ──
  const weekSpendUsd = totalCostUsd;
  const priorWeekSpendUsd = priorWeekCalls.reduce((s: number, c: any) => s + (c.cost ?? 0), 0);
  const dailyBurnUsd = weekSpendUsd / 7;
  const daysRemaining = dailyBurnUsd > 0 ? balanceUsd / dailyBurnUsd : Infinity;

  const weekSpendInr = weekSpendUsd * USD_TO_INR;
  const priorWeekSpendInr = priorWeekSpendUsd * USD_TO_INR;
  const weekOverWeekPct = priorWeekSpendUsd > 0
    ? ((weekSpendUsd - priorWeekSpendUsd) / priorWeekSpendUsd) * 100
    : null;

  const creditHealth: CreditHealth = {
    balanceUsd,
    balanceInr: balanceUsd * USD_TO_INR,
    dailyBurnInr: dailyBurnUsd * USD_TO_INR,
    daysRemaining: Math.min(daysRemaining, 999),
    urgency: getUrgency(daysRemaining),
    weekSpendInr,
    priorWeekSpendInr,
    weekOverWeekPct,
  };

  // ── Agent Performance ──
  const agentMap = new Map<string, { name: string; calls: any[] }>();
  for (const call of weekCalls) {
    const aId = (call as any).assistant_id ?? 'unknown';
    const aName = (call as any).assistant?.name ?? 'Unknown Agent';
    if (!agentMap.has(aId)) agentMap.set(aId, { name: aName, calls: [] });
    agentMap.get(aId)!.calls.push(call);
  }

  const agentPerformance: AgentPerformance[] = Array.from(agentMap.entries())
    .map(([id, { name, calls }]) => {
      const comp = calls.filter((c: any) => c.status === 'completed');
      return {
        assistantId: id,
        assistantName: name,
        totalCalls: calls.length,
        completedCalls: comp.length,
        successRate: calls.length > 0 ? (comp.length / calls.length) * 100 : 0,
        avgDurationSec: calls.length > 0
          ? calls.reduce((s: number, c: any) => s + (c.duration_seconds ?? 0), 0) / calls.length
          : 0,
        totalCostInr: calls.reduce((s: number, c: any) => s + (c.cost ?? 0), 0) * USD_TO_INR,
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);

  // ── Daily Activity (7-day sparkline data) ──
  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  for (const call of weekCalls) {
    const key = (call as any).created_at?.slice(0, 10);
    if (key && dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const dailyActivity = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  return {
    stats,
    creditHealth,
    agentPerformance,
    dailyActivity,
    greeting: getGreeting(),
    assistantCount,
  };
}

// Keep old export for backward compatibility
export async function getDashboardStats(userId: string, days: number = 7): Promise<DashboardStats> {
  const data = await getDashboardData(userId);
  return data.stats;
}

export async function getUsageSummary(userId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('call_logs')
    .select('created_at, cost, duration_seconds, status')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
