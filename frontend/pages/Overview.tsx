import {
    TrendUp,
    TrendDown,
    Phone,
    Clock,
    CurrencyDollar,
    ChatCircleDots,
    ArrowRight,
    Sparkle
} from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import Select, { type SelectOption } from '../components/ui/Select';
import WelcomeBonusBanner from '../components/WelcomeBonusBanner';
import { getUsageSummary } from '../services/billingService';
import { supabase } from '../services/supabase';
import { getCallLogs } from '../services/voicoryService';
import type { CallLog } from '../types';

// 🎬 DEMO MODE - Set to true for impressive screenshot data
const DEMO_MODE = false;

// Demo data for screenshots
const DEMO_STATS = {
    totalCost: 10247,
    totalMessages: 8429,
    totalCalls: 148,
    avgDuration: '4m 32s',
    costChange: '+18.5%',
    messagesChange: '+32.4%',
    callsChange: '+24.7%',
    durationChange: '+8.2%'
};

const DEMO_CHART_DATA = [
    { name: 'Mon', calls: 142, messages: 856, cost: 1420 },
    { name: 'Tue', calls: 168, messages: 1124, cost: 1680 },
    { name: 'Wed', calls: 195, messages: 1342, cost: 1950 },
    { name: 'Thu', calls: 221, messages: 1567, cost: 2210 },
    { name: 'Fri', calls: 247, messages: 1823, cost: 2470 },
    { name: 'Sat', calls: 156, messages: 987, cost: 1560 },
    { name: 'Sun', calls: 118, messages: 730, cost: 1180 }
];

const DEMO_CALL_LOGS: CallLog[] = [
    {
        id: '1',
        date: new Date().toISOString(),
        phoneNumber: '+91 98765 43210',
        duration: '5m 24s',
        status: 'completed',
        cost: 81,
        assistantId: '1',
        assistantName: 'Sales Assistant',
        recording: ''
    },
    {
        id: '2',
        date: new Date(Date.now() - 3600000).toISOString(),
        phoneNumber: '+91 87654 32109',
        duration: '3m 18s',
        status: 'completed',
        cost: 49.50,
        assistantId: '2',
        assistantName: 'Support Bot',
        recording: ''
    },
    {
        id: '3',
        date: new Date(Date.now() - 7200000).toISOString(),
        phoneNumber: '+91 76543 21098',
        duration: '7m 45s',
        status: 'completed',
        cost: 116.25,
        assistantId: '1',
        assistantName: 'Sales Assistant',
        recording: ''
    },
    {
        id: '4',
        date: new Date(Date.now() - 10800000).toISOString(),
        phoneNumber: '+91 65432 10987',
        duration: '2m 12s',
        status: 'completed',
        cost: 33,
        assistantId: '3',
        assistantName: 'Booking Agent',
        recording: ''
    }
];

// Helper function to get message counts by day from usage_logs
// This includes ALL message types: test chat, WhatsApp, SMS, etc.
const getMessagesByDay = async (days: number = 7): Promise<Map<string, number>> => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Get from usage_logs where usage_type is 'llm' (chat messages)
        // This includes test chat, WhatsApp processWithAI, and any future messaging
        const { data, error } = await supabase
            .from('usage_logs')
            .select('created_at, usage_type')
            .eq('usage_type', 'llm')
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const byDayMap = new Map<string, number>();
        (data || []).forEach((log: any) => {
            const day = new Date(log.created_at).toDateString();
            byDayMap.set(day, (byDayMap.get(day) || 0) + 1);
        });
        
        return byDayMap;
    } catch (error) {
        console.error('Error fetching messages by day:', error);
        return new Map();
    }
};

// Skeleton loader component
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded ${className}`} />
);

// Premium stat card with glassmorphism and gradient icon
const StatCard = ({ title, value, change, icon: Icon, trend, gradient, loading }: any) => (
    <div className="group relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5">
        {/* Ambient glow on hover */}
        <div className={`absolute -top-12 -right-12 w-32 h-32 ${gradient} blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />

        {/* Top accent line */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-0.5 ${gradient} opacity-50 rounded-full`} />

        <div className="relative flex justify-between items-start">
            <div className="space-y-1">
                <p className="text-xs font-medium text-textMuted uppercase tracking-wider">{title}</p>
                {loading ? (
                    <Skeleton className="h-8 w-24" />
                ) : (
                    <h3 className="text-3xl font-bold text-textMain tracking-tight">{value}</h3>
                )}
            </div>
            <div className={`p-3 ${gradient} rounded-xl shadow-lg`}>
                <Icon size={22} weight="fill" className="text-white" />
            </div>
        </div>

        {change && !loading && (
            <div className="mt-4 flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${trend === 'up'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                    }`}>
                    {trend === 'up'
                        ? <TrendUp size={14} weight="bold" />
                        : <TrendDown size={14} weight="bold" />
                    }
                    {change}
                </div>
                <span className="text-textMuted/60 text-xs">vs last week</span>
            </div>
        )}
    </div>
);

// Recent call item with premium styling
const CallItem = ({ log }: { log: CallLog }) => (
    <div className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/5 transition-all duration-200 cursor-pointer">
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.status === 'completed'
                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20'
                    : 'bg-gradient-to-br from-red-500/20 to-red-600/20'
                    }`}>
                    <Phone size={18} weight="fill" className={log.status === 'completed' ? 'text-emerald-400' : 'text-red-400'} />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${log.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
            </div>
            <div>
                <p className="text-sm font-medium text-textMain group-hover:text-white transition-colors">{log.assistantName}</p>
                <p className="text-xs text-textMuted/70">{log.phoneNumber}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-sm font-semibold text-textMain font-mono">₹{log.cost}</p>
            <p className="text-xs text-textMuted/70">{log.duration}</p>
        </div>
    </div>
);

const Overview: React.FC = () => {
    const [timeRange, setTimeRange] = useState<SelectOption>({ value: '7d', label: 'Last 7 Days' });
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Format USD amount
    const formatUSD = (amount: number): string => `$${amount.toFixed(2)}`;

    // Usage metrics from billing
    const [totalLLMCost, setTotalLLMCost] = useState(0);
    const [totalMessages, setTotalMessages] = useState(0);
    const [totalTokens, setTotalTokens] = useState(0);
    const [messagesByDay, setMessagesByDay] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        // 🎬 DEMO MODE - Use demo data for screenshots
        if (DEMO_MODE) {
            setCallLogs(DEMO_CALL_LOGS);
            setTotalLLMCost(DEMO_STATS.totalCost);
            setTotalMessages(DEMO_STATS.totalMessages);
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                console.log('Fetching call logs...');
                const [logs, usageSummary, msgsByDay] = await Promise.all([
                    getCallLogs(),
                    getUsageSummary(7), // Last 7 days
                    getMessagesByDay(7)
                ]);
                console.log('Fetched logs:', logs);
                console.log('Usage summary:', usageSummary);
                console.log('Messages by day:', msgsByDay);
                setCallLogs(logs);
                setMessagesByDay(msgsByDay);

                // Set usage metrics
                setTotalLLMCost(usageSummary.totalCost || 0);
                setTotalMessages(usageSummary.byModel.reduce((sum, m) => sum + m.count, 0));
                setTotalTokens(usageSummary.totalTokens || 0);

                setError(null);
            } catch (err) {
                console.error('Error loading call logs:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Calculate metrics from real data with week-over-week comparison
    const now = new Date();
    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Current week (last 7 days)
    const currentWeekLogs = callLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= last7DaysStart;
    });

    // Previous week (8-14 days ago)
    const previousWeekLogs = callLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= last14DaysStart && logDate < last7DaysStart;
    });

    // Current week metrics
    const totalCost = currentWeekLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalCalls = currentWeekLogs.length;
    const avgDuration = currentWeekLogs.length > 0
        ? Math.round(currentWeekLogs.reduce((sum, log) => {
            const [mins, secs] = log.duration.split('m ');
            return sum + parseInt(mins) * 60 + parseInt(secs);
        }, 0) / currentWeekLogs.length)
        : 0;
    const avgDurationFormatted = `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`;

    // Previous week metrics
    const prevTotalCost = previousWeekLogs.reduce((sum, log) => sum + log.cost, 0);
    const prevTotalCalls = previousWeekLogs.length;
    const prevAvgDuration = previousWeekLogs.length > 0
        ? Math.round(previousWeekLogs.reduce((sum, log) => {
            const [mins, secs] = log.duration.split('m ');
            return sum + parseInt(mins) * 60 + parseInt(secs);
        }, 0) / previousWeekLogs.length)
        : 0;

    // Calculate percentage changes
    const costChange = prevTotalCost > 0
        ? (((totalCost - prevTotalCost) / prevTotalCost) * 100).toFixed(1)
        : null;
    const callsChange = prevTotalCalls > 0
        ? (((totalCalls - prevTotalCalls) / prevTotalCalls) * 100).toFixed(1)
        : null;
    const durationChange = prevAvgDuration > 0
        ? (((avgDuration - prevAvgDuration) / prevAvgDuration) * 100).toFixed(1)
        : null;

    // Determine trends
    const costTrend = costChange ? (parseFloat(costChange) >= 0 ? 'up' : 'down') : 'up';
    const callsTrend = callsChange ? (parseFloat(callsChange) >= 0 ? 'up' : 'down') : 'up';
    const durationTrend = durationChange ? (parseFloat(durationChange) >= 0 ? 'up' : 'down') : 'up';

    // Generate chart data from real call logs and messages (last 7 days)
    const chartData = React.useMemo(() => {
        // 🎬 DEMO MODE - Use impressive demo chart data
        if (DEMO_MODE) {
            return DEMO_CHART_DATA;
        }

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date();
        const last7Days = days.map((name, index) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - index));
            return { name, calls: 0, messages: 0, cost: 0, date: date.toDateString() };
        });

        // Add call data
        currentWeekLogs.forEach(log => {
            const logDate = new Date(log.date).toDateString();
            const dayData = last7Days.find(d => d.date === logDate);
            if (dayData) {
                dayData.calls += 1;
                dayData.cost += log.cost;
            }
        });

        // Add message data
        messagesByDay.forEach((count, dateStr) => {
            const dayData = last7Days.find(d => d.date === dateStr);
            if (dayData) {
                dayData.messages = count;
            }
        });

        return last7Days;
    }, [currentWeekLogs, messagesByDay]);

    // 🎬 DEMO MODE - Override display values for screenshots
    const displayStats = DEMO_MODE ? {
        totalCost: DEMO_STATS.totalCost,
        totalMessages: DEMO_STATS.totalMessages,
        totalCalls: DEMO_STATS.totalCalls,
        avgDuration: DEMO_STATS.avgDuration,
        costChange: DEMO_STATS.costChange,
        messagesChange: DEMO_STATS.messagesChange,
        callsChange: DEMO_STATS.callsChange,
        durationChange: DEMO_STATS.durationChange,
        costTrend: 'up' as const,
        callsTrend: 'up' as const,
        durationTrend: 'up' as const
    } : {
        totalCost: totalLLMCost,
        totalMessages,
        totalCalls,
        avgDuration: avgDurationFormatted,
        costChange: costChange ? `${Math.abs(parseFloat(costChange))}%` : null,
        messagesChange: null,
        callsChange: callsChange ? `${Math.abs(parseFloat(callsChange))}%` : null,
        durationChange: durationChange ? `${Math.abs(parseFloat(durationChange))}%` : null,
        costTrend,
        callsTrend,
        durationTrend
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Welcome Bonus Banner for new users */}
            <WelcomeBonusBanner />

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
                    <div className="flex items-center gap-3">
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
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <FadeIn delay={0.1}>
                    <StatCard
                        title="Total Cost"
                        value={formatUSD(displayStats.totalCost)}
                        change={displayStats.costChange}
                        trend={displayStats.costTrend}
                        icon={CurrencyDollar}
                        gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                        loading={loading}
                    />
                </FadeIn>
                <FadeIn delay={0.2}>
                    <StatCard
                        title="Total Messages"
                        value={displayStats.totalMessages.toLocaleString()}
                        change={displayStats.messagesChange}
                        trend="up"
                        icon={ChatCircleDots}
                        gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
                        loading={loading}
                    />
                </FadeIn>
                <FadeIn delay={0.3}>
                    <StatCard
                        title="Total Calls"
                        value={displayStats.totalCalls.toLocaleString()}
                        change={displayStats.callsChange}
                        trend={displayStats.callsTrend}
                        icon={Phone}
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        loading={loading}
                    />
                </FadeIn>
                <FadeIn delay={0.4}>
                    <StatCard
                        title="Avg Duration"
                        value={displayStats.avgDuration}
                        change={displayStats.durationChange}
                        trend={displayStats.durationTrend}
                        icon={Clock}
                        gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                        loading={loading}
                    />
                </FadeIn>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-textMain">Usage Trends</h3>
                                <p className="text-xs text-textMuted mt-0.5">Last 7 days activity</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Legend */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#2EC7B7] to-[#06B6D4]" />
                                        <span className="text-xs text-textMuted">Calls</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA]" />
                                        <span className="text-xs text-textMuted">Messages</span>
                                    </div>
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
                                    <React.Fragment key="chart-main">
                                        <Skeleton className="flex-1 rounded-xl" />
                                    </React.Fragment>
                                    <div className="flex gap-2">
                                        {[...Array(7)].map((_, i) => (
                                            <React.Fragment key={i}>
                                                <Skeleton className="flex-1 h-4" />
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ) : callLogs.length === 0 && messagesByDay.size === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                                        <Phone size={32} weight="duotone" className="text-primary/50" />
                                    </div>
                                    <p className="text-textMuted text-sm font-medium">No call data yet</p>
                                    <p className="text-textMuted/60 text-xs mt-1">Chart will populate with call activity</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2EC7B7" stopOpacity={0.4} />
                                                <stop offset="50%" stopColor="#2EC7B7" stopOpacity={0.1} />
                                                <stop offset="100%" stopColor="#2EC7B7" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                                <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.1} />
                                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#2EC7B7" />
                                                <stop offset="100%" stopColor="#06B6D4" />
                                            </linearGradient>
                                            <linearGradient id="strokeGradientMessages" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#8B5CF6" />
                                                <stop offset="100%" stopColor="#A78BFA" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dx={-10}
                                        />
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
                                        <Area
                                            type="monotone"
                                            dataKey="calls"
                                            name="Calls"
                                            stroke="url(#strokeGradient)"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorCalls)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="messages"
                                            name="Messages"
                                            stroke="url(#strokeGradientMessages)"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorMessages)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden">
                    {/* Ambient glow */}
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
                            ) : callLogs.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center mx-auto mb-4">
                                        <Phone size={28} weight="duotone" className="text-textMuted/30" />
                                    </div>
                                    <p className="text-textMuted text-sm font-medium">No calls yet</p>
                                    <p className="text-textMuted/50 text-xs mt-1">Recent calls will appear here</p>
                                </div>
                            ) : (
                                callLogs.slice(0, 4).map((log) => (
                                    <React.Fragment key={log.id}>
                                        <CallItem log={log} />
                                    </React.Fragment>
                                ))
                            )}
                        </div>

                        {!loading && callLogs.length > 0 && (
                            <Button variant="outline" className="w-full mt-5 gap-2 group">
                                View All Logs
                                <ArrowRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;
