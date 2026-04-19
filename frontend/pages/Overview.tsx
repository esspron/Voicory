import {
    TrendUp,
    TrendDown,
    Phone,
    Clock,
    CurrencyDollar,
    ChatCircleDots,
    ArrowRight,
    Sparkle,
    Robot,
    CheckCircle,
    ArrowClockwise,
} from '@phosphor-icons/react';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import OnboardingChecklist from '../components/onboarding/OnboardingChecklist';
import Select, { type SelectOption } from '../components/ui/Select';
import { supabase } from '../services/supabase';
import { useCurrency } from '../contexts/CurrencyContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardData {
    totalCalls: number;
    totalCallsChange: string | null;
    totalCallsTrend: 'up' | 'down';
    avgDuration: string;
    avgDurationChange: string | null;
    avgDurationTrend: 'up' | 'down';
    totalCost: number;
    totalCostChange: string | null;
    totalCostTrend: 'up' | 'down';
    successRate: number;
    activeAssistants: number;
    topAssistant: { name: string; calls: number } | null;
    recentCalls: RecentCall[];
    chartData: ChartPoint[];
    periodDays: number;
}

interface RecentCall {
    id: string;
    assistantName: string;
    phoneNumber: string;
    duration: string;
    cost: number;
    status: string;
    date: string;
    recordingUrl?: string | null;
    callSid?: string | null;
}

interface ChartPoint {
    name: string;
    calls: number;
    cost: number;
    date: string;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded ${className}`} />
);

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
const StatCard = ({ title, value, change, icon: Icon, trend, gradient, loading }: any) => (
    <div className="group relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 lg:p-6 overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 min-w-0">
        <div className={`absolute -top-12 -right-12 w-32 h-32 ${gradient} blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-0.5 ${gradient} opacity-50 rounded-full`} />

        <div className="relative flex justify-between items-start gap-2">
            <div className="space-y-1 min-w-0">
                <p className="text-[10px] lg:text-xs font-medium text-textMuted uppercase tracking-wider truncate">{title}</p>
                {loading ? (
                    <Skeleton className="h-8 w-20" />
                ) : (
                    <h3 className="text-2xl lg:text-3xl font-bold text-textMain tracking-tight truncate">{value}</h3>
                )}
            </div>
            <div className={`p-2.5 lg:p-3 ${gradient} rounded-xl shadow-lg flex-shrink-0`}>
                <Icon size={20} weight="fill" className="text-white" />
            </div>
        </div>

        {change && !loading && (
            <div className="mt-4 flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${trend === 'up'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                    }`}>
                    {trend === 'up' ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
                    {change}
                </div>
                <span className="text-textMuted/60 text-xs">vs previous period</span>
            </div>
        )}
    </div>
);

// ---------------------------------------------------------------------------
// CallItem
// ---------------------------------------------------------------------------
const CallItem = ({ log, formatAmount }: { log: RecentCall; formatAmount: (n: number) => string }) => (
    <div className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/5 transition-all duration-200 cursor-pointer">
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.status === 'completed'
                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20'
                    : 'bg-gradient-to-br from-red-500/20 to-red-600/20'
                    }`}>
                    <Phone size={18} weight="fill" className={log.status === 'completed' ? 'text-emerald-400' : 'text-red-400'} />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${log.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-textMain group-hover:text-white transition-colors">{log.assistantName}</p>
                <p className="text-xs text-textMuted/70">{log.phoneNumber}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-sm font-semibold text-textMain font-mono">{formatAmount(log.cost)}</p>
            <p className="text-xs text-textMuted/70">{log.duration}</p>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const Overview: React.FC = () => {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState<SelectOption>({ value: '7d', label: 'Last 7 Days' });
    const [dashData, setDashData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const { formatAmount, isIndia } = useCurrency();

    const formatUSD = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

    const fetchDashboard = useCallback(async (days: number, isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            const apiBase = (await import('../lib/constants')).API.BACKEND_URL;
            const res = await fetch(`${apiBase}/api/analytics/dashboard?days=${days}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to load dashboard');
            setDashData(json.data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchDashboard(7);
    }, []);

    // Re-fetch when time range changes
    useEffect(() => {
        const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[timeRange.value] || 7;
        fetchDashboard(days);
    }, [timeRange]);

    const handleRefresh = () => {
        const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[timeRange.value] || 7;
        fetchDashboard(days, true);
    };

    const d = dashData;

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold text-textMain tracking-tight">Dashboard</h1>
                        <Sparkle size={24} weight="fill" className="text-primary" />
                    </div>
                    <p className="text-textMuted text-sm">Overview of your voice AI performance</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Refresh button */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        title="Refresh data"
                        className="p-2 rounded-lg text-textMuted hover:text-textMain hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-200 disabled:opacity-40"
                    >
                        <ArrowClockwise
                            size={18}
                            weight="bold"
                            className={refreshing ? 'animate-spin' : ''}
                        />
                    </button>
                    <Select
                        value={timeRange}
                        onChange={setTimeRange}
                        options={[
                            { value: '7d', label: 'Last 7 Days' },
                            { value: '30d', label: 'Last 30 Days' },
                            { value: '90d', label: 'Last 90 Days' },
                        ]}
                        className="w-48"
                    />
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-center gap-3">
                    <span className="flex-1">{error}</span>
                    <button onClick={handleRefresh} className="text-xs underline hover:text-red-300">Retry</button>
                </div>
            )}

            {/* Onboarding checklist — visible until all 4 steps complete */}
            <FadeIn delay={0.05}>
                <OnboardingChecklist />
            </FadeIn>

            {/* Metrics Grid — 5 cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <FadeIn delay={0.1}>
                    <StatCard
                        title="Total Calls"
                        value={d ? d.totalCalls.toLocaleString() : '—'}
                        change={d?.totalCallsChange ? `${Math.abs(parseFloat(d.totalCallsChange))}%` : null}
                        trend={d?.totalCallsTrend ?? 'up'}
                        icon={Phone}
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        loading={loading}
                    />
                </FadeIn>
                <FadeIn delay={0.15}>
                    <StatCard
                        title="Avg Duration"
                        value={d ? d.avgDuration : '—'}
                        change={d?.avgDurationChange ? `${Math.abs(parseFloat(d.avgDurationChange))}%` : null}
                        trend={d?.avgDurationTrend ?? 'up'}
                        icon={Clock}
                        gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                        loading={loading}
                    />
                </FadeIn>
                <FadeIn delay={0.2}>
                    <StatCard
                        title="Total Cost"
                        value={d ? formatAmount(d.totalCost / 100) : '—'}
                        change={d?.totalCostChange ? `${Math.abs(parseFloat(d.totalCostChange))}%` : null}
                        trend={d?.totalCostTrend ?? 'up'}
                        icon={CurrencyDollar}
                        gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                        loading={loading}
                    />
                </FadeIn>
                <FadeIn delay={0.25}>
                    <StatCard
                        title="Success Rate"
                        value={d ? `${d.successRate}%` : '—'}
                        change={null}
                        trend="up"
                        icon={CheckCircle}
                        gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
                        loading={loading}
                    />
                </FadeIn>
                <FadeIn delay={0.3}>
                    <StatCard
                        title="Active Assistants"
                        value={d ? d.activeAssistants.toLocaleString() : '—'}
                        change={null}
                        trend="up"
                        icon={Robot}
                        gradient="bg-gradient-to-br from-pink-500 to-rose-600"
                        loading={loading}
                    />
                </FadeIn>
            </div>

            {/* Top Performing Assistant */}
            {!loading && d?.topAssistant && (
                <FadeIn delay={0.35}>
                    <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                            <Sparkle size={20} weight="fill" className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-textMuted uppercase tracking-wider">Top Performing Assistant</p>
                            <p className="text-lg font-bold text-textMain mt-0.5">{d.topAssistant.name}</p>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-2xl font-bold text-textMain">{d.topAssistant.calls}</p>
                            <p className="text-xs text-textMuted">calls this period</p>
                        </div>
                        <Button
                            variant="outline"
                            className="ml-4 gap-2 text-sm"
                            onClick={() => navigate('/assistants')}
                        >
                            Manage
                            <ArrowRight size={14} weight="bold" />
                        </Button>
                    </div>
                </FadeIn>
            )}

            {/* Charts Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-textMain">Usage Trends</h3>
                                <p className="text-xs text-textMuted mt-0.5">
                                    {timeRange.label} activity
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#2EC7B7] to-[#06B6D4]" />
                                    <span className="text-xs text-textMuted">Calls</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA]" />
                                    <span className="text-xs text-textMuted">Cost</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <span className="text-xs font-medium text-primary">Live</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            {loading ? (
                                <div className="h-full flex flex-col gap-2">
                                    <Skeleton className="flex-1 rounded-xl" />
                                    <div className="flex gap-2">
                                        {[...Array(7)].map((_, i) => (
                                            <Skeleton key={i} className="flex-1 h-4" />
                                        ))}
                                    </div>
                                </div>
                            ) : !d || d.chartData.every(p => p.calls === 0) ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                                        <Phone size={32} weight="duotone" className="text-primary/50" />
                                    </div>
                                    <p className="text-textMuted text-sm font-medium">No call data yet</p>
                                    <p className="text-textMuted/60 text-xs mt-1">Chart will populate with call activity</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={d.chartData}>
                                        <defs>
                                            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2EC7B7" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#2EC7B7" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#2EC7B7" />
                                                <stop offset="100%" stopColor="#06B6D4" />
                                            </linearGradient>
                                            <linearGradient id="strokeCostGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#8B5CF6" />
                                                <stop offset="100%" stopColor="#A78BFA" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(27,30,35,0.95)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                                            }}
                                            itemStyle={{ color: '#EBEBEB' }}
                                            labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                                        />
                                        <Area type="monotone" dataKey="calls" name="Calls" stroke="url(#strokeGradient)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCalls)" />
                                        <Area type="monotone" dataKey="cost" name="Cost" stroke="url(#strokeCostGradient)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCost)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-lg font-semibold text-textMain">Recent Calls</h3>
                                <p className="text-xs text-textMuted mt-0.5">Latest activity</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3">
                                        <Skeleton className="w-10 h-10 rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-12 ml-auto" />
                                            <Skeleton className="h-3 w-8 ml-auto" />
                                        </div>
                                    </div>
                                ))
                            ) : !d || d.recentCalls.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center mx-auto mb-4">
                                        <Phone size={28} weight="duotone" className="text-textMuted/30" />
                                    </div>
                                    <p className="text-textMuted text-sm font-medium">No calls yet</p>
                                    <p className="text-textMuted/50 text-xs mt-1">Recent calls will appear here</p>
                                </div>
                            ) : (
                                d.recentCalls.map((log) => (
                                    <CallItem key={log.id} log={log} formatAmount={formatAmount} />
                                ))
                            )}
                        </div>

                        {!loading && d && d.recentCalls.length > 0 && (
                            <Button
                                variant="outline"
                                className="w-full mt-5 gap-2 group"
                                onClick={() => navigate('/logs')}
                            >
                                View All Logs
                                <ArrowRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <FadeIn delay={0.4}>
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-textMain mb-4">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            className="gap-2 text-sm"
                            onClick={() => navigate('/assistants')}
                        >
                            <Robot size={16} weight="bold" />
                            New Assistant
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 text-sm"
                            onClick={() => navigate('/campaigns/new')}
                        >
                            <ChatCircleDots size={16} weight="bold" />
                            New Campaign
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 text-sm"
                            onClick={() => navigate('/logs')}
                        >
                            <Phone size={16} weight="bold" />
                            View Call Logs
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 text-sm"
                            onClick={() => navigate('/settings/billing')}
                        >
                            <CurrencyDollar size={16} weight="bold" />
                            Billing
                        </Button>
                    </div>
                </div>
            </FadeIn>
        </div>
    );
};

export default Overview;
