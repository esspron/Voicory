import React, { useState, useEffect } from 'react';
import {
    Lightning,
    Phone,
    Microphone,
    SpeakerHigh,
    Brain,
    CurrencyDollar,
    Clock,
    ArrowsClockwise,
    Export,
    CalendarBlank,
    TrendUp,
    ChartPie,
    ChartLine
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { StatsCard, DataTable, SimpleBarChart, DonutChart, Badge, Button, Tabs } from '../components/ui';
import type { UsageLog, UsageMetrics } from '../types/admin.types';

const UsageAnalytics: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
    const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
    const [usageByType, setUsageByType] = useState<{ label: string; value: number; color?: string }[]>([]);
    const [usageByDay, setUsageByDay] = useState<{ label: string; value: number }[]>([]);
    const [usageByProvider, setUsageByProvider] = useState<{ label: string; value: number; color?: string }[]>([]);
    const [page, setPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [filterType, setFilterType] = useState<string>('all');

    const limit = 20;

    useEffect(() => {
        fetchUsageData();
    }, []);

    useEffect(() => {
        fetchUsageLogs();
    }, [page, filterType]);

    const fetchUsageData = async () => {
        try {
            setLoading(true);

            // Fetch all usage logs
            const { data: allLogs, error } = await supabase
                .from('usage_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Calculate metrics
            const llmLogs = allLogs?.filter(l => l.usage_type === 'llm') || [];
            const ttsLogs = allLogs?.filter(l => l.usage_type === 'tts') || [];
            const sttLogs = allLogs?.filter(l => l.usage_type === 'stt') || [];
            const callLogs = allLogs?.filter(l => l.usage_type === 'call') || [];

            const llmCost = llmLogs.reduce((sum, l) => sum + (Number(l.cost_usd) || 0), 0);
            const ttsCost = ttsLogs.reduce((sum, l) => sum + (Number(l.cost_usd) || 0), 0);
            const sttCost = sttLogs.reduce((sum, l) => sum + (Number(l.cost_usd) || 0), 0);
            const callCost = callLogs.reduce((sum, l) => sum + (Number(l.cost_usd) || 0), 0);
            const totalCost = llmCost + ttsCost + sttCost + callCost;

            const totalTokens = llmLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
            const totalCallMinutes = callLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / 60;

            setMetrics({
                totalCalls: callLogs.length,
                totalCallMinutes: Math.round(totalCallMinutes),
                totalMessages: 0,
                totalTokens,
                totalCost,
                llmCost,
                ttsCost,
                sttCost,
                callCost,
            });

            // Usage by type
            setUsageByType([
                { label: 'LLM', value: llmCost, color: '#14b8a6' },
                { label: 'TTS', value: ttsCost, color: '#8b5cf6' },
                { label: 'STT', value: sttCost, color: '#f59e0b' },
                { label: 'Calls', value: callCost, color: '#3b82f6' },
            ]);

            // Usage by provider
            const providerCosts: { [key: string]: number } = {};
            allLogs?.forEach(l => {
                const provider = l.provider || 'Unknown';
                providerCosts[provider] = (providerCosts[provider] || 0) + (Number(l.cost_usd) || 0);
            });

            const providerColors: { [key: string]: string } = {
                'openai': '#10b981',
                'anthropic': '#f59e0b',
                'elevenlabs': '#8b5cf6',
                'deepgram': '#3b82f6',
                'groq': '#ef4444',
            };

            setUsageByProvider(
                Object.entries(providerCosts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([provider, cost]) => ({
                        label: provider.charAt(0).toUpperCase() + provider.slice(1),
                        value: cost,
                        color: providerColors[provider.toLowerCase()] || '#6b7280',
                    }))
            );

            // Daily usage for chart (last 14 days)
            const dailyData: { [key: string]: number } = {};
            for (let i = 13; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = date.toISOString().split('T')[0];
                dailyData[key] = 0;
            }

            allLogs?.forEach(l => {
                const date = new Date(l.created_at).toISOString().split('T')[0];
                if (dailyData[date] !== undefined) {
                    dailyData[date] += Number(l.cost_usd) || 0;
                }
            });

            setUsageByDay(Object.entries(dailyData).map(([date, cost]) => ({
                label: new Date(date).toLocaleDateString('en', { day: 'numeric', month: 'short' }),
                value: cost,
            })));

        } catch (error) {
            console.error('Error fetching usage data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsageLogs = async () => {
        try {
            let query = supabase
                .from('usage_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (filterType !== 'all') {
                query = query.eq('usage_type', filterType);
            }

            const { data, count, error } = await query
                .range((page - 1) * limit, page * limit - 1);

            if (error) throw error;

            setUsageLogs(data?.map(l => ({
                id: l.id,
                user_id: l.user_id,
                assistant_id: l.assistant_id,
                usage_type: l.usage_type,
                provider: l.provider,
                model: l.model,
                input_tokens: l.input_tokens,
                output_tokens: l.output_tokens,
                total_tokens: l.total_tokens,
                duration_seconds: l.duration_seconds,
                cost_usd: Number(l.cost_usd) || 0,
                created_at: l.created_at,
            })) || []);

            setTotalLogs(count || 0);
        } catch (error) {
            console.error('Error fetching usage logs:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'llm': return <Brain size={16} className="text-primary" />;
            case 'tts': return <SpeakerHigh size={16} className="text-violet-400" />;
            case 'stt': return <Microphone size={16} className="text-amber-400" />;
            case 'call': return <Phone size={16} className="text-blue-400" />;
            default: return <Lightning size={16} className="text-textMuted" />;
        }
    };

    const getTypeBadge = (type: string) => {
        const variants: Record<string, 'primary' | 'warning' | 'success' | 'info' | 'default'> = {
            llm: 'primary',
            tts: 'success',
            stt: 'warning',
            call: 'info',
        };
        return (
            <Badge variant={variants[type] || 'default'} icon={getTypeIcon(type)}>
                {type.toUpperCase()}
            </Badge>
        );
    };

    const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const exportLogs = () => {
        const csv = [
            ['Date', 'Type', 'Provider', 'Model', 'Tokens', 'Duration', 'Cost'].join(','),
            ...usageLogs.map(l => [
                new Date(l.created_at).toISOString(),
                l.usage_type,
                l.provider,
                l.model,
                l.total_tokens || '',
                l.duration_seconds || '',
                l.cost_usd
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const usageColumns = [
        {
            key: 'created_at',
            header: 'Date',
            sortable: true,
            render: (value: string) => (
                <div className="flex items-center gap-2">
                    <CalendarBlank size={14} className="text-textMuted" />
                    <span className="text-textMain text-sm">
                        {new Date(value).toLocaleDateString()}
                    </span>
                    <span className="text-textMuted text-xs">
                        {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            ),
        },
        {
            key: 'usage_type',
            header: 'Type',
            sortable: true,
            render: (value: string) => getTypeBadge(value),
        },
        {
            key: 'provider',
            header: 'Provider',
            sortable: true,
            render: (value: string) => (
                <span className="text-textMain capitalize">{value}</span>
            ),
        },
        {
            key: 'model',
            header: 'Model',
            render: (value: string) => (
                <code className="text-xs text-textMuted bg-white/5 px-2 py-1 rounded">
                    {value || '-'}
                </code>
            ),
        },
        {
            key: 'total_tokens',
            header: 'Tokens',
            sortable: true,
            render: (value: number, row: UsageLog) => (
                <div>
                    {value ? (
                        <div>
                            <span className="text-textMain">{value.toLocaleString()}</span>
                            {row.input_tokens && row.output_tokens && (
                                <span className="text-textMuted text-xs block">
                                    {row.input_tokens.toLocaleString()} in / {row.output_tokens.toLocaleString()} out
                                </span>
                            )}
                        </div>
                    ) : row.duration_seconds ? (
                        <span className="text-textMain">{Math.round(row.duration_seconds)}s</span>
                    ) : (
                        '-'
                    )}
                </div>
            ),
        },
        {
            key: 'cost_usd',
            header: 'Cost',
            sortable: true,
            render: (value: number) => (
                <span className="font-semibold text-amber-400">
                    {formatCurrency(value)}
                </span>
            ),
        },
    ];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <ChartPie size={18} /> },
        { id: 'logs', label: 'Usage Logs', icon: <Lightning size={18} />, count: totalLogs },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center border border-white/10">
                        <Lightning size={28} weight="duotone" className="text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Usage Analytics</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Track API usage, costs, and service consumption
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" icon={<Export size={18} />} onClick={exportLogs}>
                        Export
                    </Button>
                    <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={fetchUsageData}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'overview' && (
                <>
                    {/* Primary Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <StatsCard
                            title="Total Cost"
                            value={formatCurrency(metrics?.totalCost || 0)}
                            icon={<CurrencyDollar size={20} weight="bold" />}
                            color="amber"
                            loading={loading}
                        />
                        <StatsCard
                            title="Total Tokens"
                            value={(metrics?.totalTokens || 0).toLocaleString()}
                            icon={<Brain size={20} weight="bold" />}
                            color="primary"
                            loading={loading}
                        />
                        <StatsCard
                            title="Call Minutes"
                            value={`${(metrics?.totalCallMinutes || 0).toLocaleString()} min`}
                            icon={<Phone size={20} weight="bold" />}
                            color="blue"
                            loading={loading}
                        />
                        <StatsCard
                            title="Total Calls"
                            value={(metrics?.totalCalls || 0).toLocaleString()}
                            icon={<Clock size={20} weight="bold" />}
                            color="violet"
                            loading={loading}
                        />
                    </div>

                    {/* Service-wise Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-20 h-20 bg-primary/10 blur-2xl" />
                            <div className="relative flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <Brain size={20} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-textMuted">LLM Cost</p>
                                    <p className="text-lg font-bold text-primary">{formatCurrency(metrics?.llmCost || 0)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-20 h-20 bg-violet-500/10 blur-2xl" />
                            <div className="relative flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                    <SpeakerHigh size={20} className="text-violet-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-textMuted">TTS Cost</p>
                                    <p className="text-lg font-bold text-violet-400">{formatCurrency(metrics?.ttsCost || 0)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 blur-2xl" />
                            <div className="relative flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                    <Microphone size={20} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-textMuted">STT Cost</p>
                                    <p className="text-lg font-bold text-amber-400">{formatCurrency(metrics?.sttCost || 0)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-500/10 blur-2xl" />
                            <div className="relative flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <Phone size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-textMuted">Call Cost</p>
                                    <p className="text-lg font-bold text-blue-400">{formatCurrency(metrics?.callCost || 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Usage Trend */}
                        <div className="col-span-2 bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 blur-3xl" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-textMain">Usage Trend</h3>
                                        <p className="text-sm text-textMuted">Daily cost over last 14 days</p>
                                    </div>
                                </div>
                                <SimpleBarChart
                                    data={usageByDay}
                                    height={240}
                                    valueFormatter={formatCurrency}
                                    barColor="bg-amber-500"
                                />
                            </div>
                        </div>

                        {/* Usage by Type */}
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl" />
                            <div className="relative">
                                <h3 className="text-lg font-semibold text-textMain mb-2">By Service</h3>
                                <p className="text-sm text-textMuted mb-6">Cost breakdown</p>
                                <DonutChart
                                    data={usageByType}
                                    size={150}
                                    strokeWidth={22}
                                    totalLabel="Total"
                                    valueFormatter={formatCurrency}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Provider Breakdown */}
                    <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                        <h3 className="font-semibold text-textMain mb-4">Cost by Provider</h3>
                        <div className="grid grid-cols-5 gap-4">
                            {usageByProvider.map((provider, idx) => (
                                <div key={idx} className="p-4 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: provider.color }} />
                                        <span className="text-sm text-textMain font-medium">{provider.label}</span>
                                    </div>
                                    <p className="text-lg font-bold text-textMain">{formatCurrency(provider.value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'logs' && (
                <>
                    {/* Filter */}
                    <div className="flex items-center gap-3">
                        {['all', 'llm', 'tts', 'stt', 'call'].map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    setFilterType(type);
                                    setPage(1);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                    filterType === type
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {type !== 'all' && getTypeIcon(type)}
                                {type === 'all' ? 'All' : type.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Usage Logs Table */}
                    <DataTable
                        columns={usageColumns}
                        data={usageLogs}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            page,
                            limit,
                            total: totalLogs,
                            onPageChange: setPage,
                        }}
                        onRefresh={fetchUsageLogs}
                        onExport={exportLogs}
                        emptyMessage="No usage logs found"
                        emptyIcon={<Lightning size={32} className="text-textMuted/50" />}
                    />
                </>
            )}
        </div>
    );
};

export default UsageAnalytics;
