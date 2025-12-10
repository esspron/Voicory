import React, { useState, useEffect } from 'react';
import {
    CurrencyDollar,
    TrendUp,
    TrendDown,
    ArrowsClockwise,
    CalendarBlank,
    Export,
    CreditCard,
    Lightning,
    Sparkle,
    ArrowUUpLeft,
    Users,
    Funnel,
    ChartLine,
    ChartBar
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { StatsCard, DataTable, SimpleLineChart, SimpleBarChart, DonutChart, Badge, Button, Tabs } from '../components/ui';
import type { Transaction, PaymentTransaction, RevenueMetrics, DailyRevenue } from '../types/admin.types';

const RevenueAnalytics: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [payments, setPayments] = useState<PaymentTransaction[]>([]);
    const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
    const [revenueByDay, setRevenueByDay] = useState<DailyRevenue[]>([]);
    const [transactionsByType, setTransactionsByType] = useState<{ label: string; value: number; color?: string }[]>([]);
    const [page, setPage] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const [filterType, setFilterType] = useState<string>('all');
    const [dateRange, setDateRange] = useState<string>('30days');

    const limit = 20;

    useEffect(() => {
        fetchRevenueData();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [page, filterType]);

    const fetchRevenueData = async () => {
        try {
            setLoading(true);

            // Fetch all credit transactions
            const { data: allTransactions } = await supabase
                .from('credit_transactions')
                .select('*')
                .order('created_at', { ascending: false });

            // Calculate metrics
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(thisWeekStart.getDate() - 7);
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            const purchases = allTransactions?.filter(t => t.transaction_type === 'purchase') || [];

            const todayRevenue = purchases
                .filter(t => new Date(t.created_at) >= today)
                .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            const yesterdayRevenue = purchases
                .filter(t => {
                    const d = new Date(t.created_at);
                    return d >= yesterday && d < today;
                })
                .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            const thisWeekRevenue = purchases
                .filter(t => new Date(t.created_at) >= thisWeekStart)
                .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            const lastWeekRevenue = purchases
                .filter(t => {
                    const d = new Date(t.created_at);
                    return d >= lastWeekStart && d < thisWeekStart;
                })
                .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            const thisMonthRevenue = purchases
                .filter(t => new Date(t.created_at) >= thisMonthStart)
                .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            const lastMonthRevenue = purchases
                .filter(t => {
                    const d = new Date(t.created_at);
                    return d >= lastMonthStart && d <= lastMonthEnd;
                })
                .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            const totalRevenue = purchases.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            setMetrics({
                today: todayRevenue,
                yesterday: yesterdayRevenue,
                thisWeek: thisWeekRevenue,
                lastWeek: lastWeekRevenue,
                thisMonth: thisMonthRevenue,
                lastMonth: lastMonthRevenue,
                totalRevenue,
                averageTransactionValue: purchases.length ? totalRevenue / purchases.length : 0,
            });

            // Calculate transactions by type
            const typeStats = {
                purchase: 0,
                usage: 0,
                bonus: 0,
                refund: 0,
                referral: 0,
            };

            allTransactions?.forEach(t => {
                const type = t.transaction_type as keyof typeof typeStats;
                if (typeStats[type] !== undefined) {
                    typeStats[type] += Math.abs(Number(t.amount));
                }
            });

            setTransactionsByType([
                { label: 'Purchases', value: typeStats.purchase, color: '#10b981' },
                { label: 'Usage', value: typeStats.usage, color: '#f59e0b' },
                { label: 'Bonuses', value: typeStats.bonus, color: '#8b5cf6' },
                { label: 'Referrals', value: typeStats.referral, color: '#3b82f6' },
                { label: 'Refunds', value: typeStats.refund, color: '#ef4444' },
            ]);

            // Daily revenue for chart (last 14 days)
            const dailyData: { [key: string]: number } = {};
            for (let i = 13; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = date.toISOString().split('T')[0];
                dailyData[key] = 0;
            }

            purchases.forEach(t => {
                const date = new Date(t.created_at).toISOString().split('T')[0];
                if (dailyData[date] !== undefined) {
                    dailyData[date] += Math.abs(Number(t.amount));
                }
            });

            setRevenueByDay(Object.entries(dailyData).map(([date, amount]) => ({
                date,
                amount,
                transactions: 0,
            })));

        } catch (error) {
            console.error('Error fetching revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            let query = supabase
                .from('credit_transactions')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (filterType !== 'all') {
                query = query.eq('transaction_type', filterType);
            }

            const { data, count, error } = await query
                .range((page - 1) * limit, page * limit - 1);

            if (error) throw error;

            setTransactions(data?.map(t => ({
                id: t.id,
                user_id: t.user_id,
                user_email: '',
                transaction_type: t.transaction_type,
                amount: Number(t.amount),
                balance_before: Number(t.balance_before),
                balance_after: Number(t.balance_after),
                description: t.description || '',
                reference_type: t.reference_type,
                reference_id: t.reference_id,
                created_at: t.created_at,
            })) || []);

            setTotalTransactions(count || 0);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'purchase': return <CreditCard size={16} className="text-emerald-400" />;
            case 'usage': return <Lightning size={16} className="text-amber-400" />;
            case 'bonus': return <Sparkle size={16} className="text-violet-400" />;
            case 'refund': return <ArrowUUpLeft size={16} className="text-rose-400" />;
            case 'referral': return <Users size={16} className="text-blue-400" />;
            default: return <CurrencyDollar size={16} className="text-textMuted" />;
        }
    };

    const getTypeBadge = (type: string) => {
        const variants: Record<string, 'success' | 'warning' | 'primary' | 'error' | 'info' | 'default'> = {
            purchase: 'success',
            usage: 'warning',
            bonus: 'primary',
            refund: 'error',
            referral: 'info',
        };
        return (
            <Badge variant={variants[type] || 'default'} icon={getTypeIcon(type)}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
        );
    };

    const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

    const exportTransactions = () => {
        const csv = [
            ['Date', 'Type', 'Amount', 'Balance Before', 'Balance After', 'Description'].join(','),
            ...transactions.map(t => [
                new Date(t.created_at).toISOString(),
                t.transaction_type,
                t.amount,
                t.balance_before,
                t.balance_after,
                `"${t.description || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const transactionColumns = [
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
            key: 'transaction_type',
            header: 'Type',
            sortable: true,
            render: (value: string) => getTypeBadge(value),
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            render: (value: number) => (
                <span className={`font-semibold flex items-center gap-1 ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <CurrencyDollar size={14} />
                    {value >= 0 ? '+' : ''}{value.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'balance_before',
            header: 'Before',
            render: (value: number) => (
                <span className="text-textMuted">${value.toLocaleString()}</span>
            ),
        },
        {
            key: 'balance_after',
            header: 'After',
            render: (value: number) => (
                <span className="text-textMain font-medium">${value.toLocaleString()}</span>
            ),
        },
        {
            key: 'description',
            header: 'Description',
            render: (value: string) => (
                <span className="text-textMuted text-sm truncate max-w-[200px] block">
                    {value || '-'}
                </span>
            ),
        },
    ];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <ChartLine size={18} /> },
        { id: 'transactions', label: 'Transactions', icon: <CurrencyDollar size={18} />, count: totalTransactions },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-white/10">
                        <CurrencyDollar size={28} weight="duotone" className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Revenue Analytics</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Track revenue, transactions, and financial metrics
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" icon={<Export size={18} />} onClick={exportTransactions}>
                        Export
                    </Button>
                    <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={fetchRevenueData}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'overview' && (
                <>
                    {/* Primary Revenue Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <StatsCard
                            title="Total Revenue"
                            value={formatCurrency(metrics?.totalRevenue || 0)}
                            icon={<CurrencyDollar size={20} weight="bold" />}
                            color="emerald"
                            loading={loading}
                        />
                        <StatsCard
                            title="This Month"
                            value={formatCurrency(metrics?.thisMonth || 0)}
                            icon={<CalendarBlank size={20} weight="bold" />}
                            color="primary"
                            trend={metrics?.lastMonth ? {
                                value: Math.round(((metrics.thisMonth - metrics.lastMonth) / metrics.lastMonth) * 100),
                                label: 'vs last month'
                            } : undefined}
                            loading={loading}
                        />
                        <StatsCard
                            title="Today"
                            value={formatCurrency(metrics?.today || 0)}
                            icon={<TrendUp size={20} weight="bold" />}
                            color="violet"
                            trend={metrics?.yesterday ? {
                                value: Math.round(((metrics.today - metrics.yesterday) / (metrics.yesterday || 1)) * 100),
                                label: 'vs yesterday'
                            } : undefined}
                            loading={loading}
                        />
                        <StatsCard
                            title="Avg Transaction"
                            value={formatCurrency(Math.round(metrics?.averageTransactionValue || 0))}
                            icon={<ChartBar size={20} weight="bold" />}
                            color="amber"
                            loading={loading}
                        />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Revenue Trend */}
                        <div className="col-span-2 bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-3xl" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-textMain">Revenue Trend</h3>
                                        <p className="text-sm text-textMuted">Last 14 days</p>
                                    </div>
                                </div>
                                <SimpleBarChart
                                    data={revenueByDay.map(d => ({
                                        label: new Date(d.date).toLocaleDateString('en', { day: 'numeric', month: 'short' }),
                                        value: d.amount,
                                    }))}
                                    height={240}
                                    valueFormatter={formatCurrency}
                                    barColor="bg-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Transaction Types Breakdown */}
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl" />
                            <div className="relative">
                                <h3 className="text-lg font-semibold text-textMain mb-2">By Type</h3>
                                <p className="text-sm text-textMuted mb-6">Transaction breakdown</p>
                                <DonutChart
                                    data={transactionsByType}
                                    size={150}
                                    strokeWidth={22}
                                    totalLabel="Total"
                                    valueFormatter={formatCurrency}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Comparison Cards */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                            <h3 className="font-semibold text-textMain mb-4">Weekly Comparison</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-xs text-textMuted mb-1">This Week</p>
                                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics?.thisWeek || 0)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-xs text-textMuted mb-1">Last Week</p>
                                    <p className="text-2xl font-bold text-textMain">{formatCurrency(metrics?.lastWeek || 0)}</p>
                                </div>
                            </div>
                            {metrics?.lastWeek && (
                                <div className="mt-4 flex items-center gap-2">
                                    {metrics.thisWeek >= metrics.lastWeek ? (
                                        <TrendUp size={20} className="text-emerald-400" />
                                    ) : (
                                        <TrendDown size={20} className="text-rose-400" />
                                    )}
                                    <span className={metrics.thisWeek >= metrics.lastWeek ? 'text-emerald-400' : 'text-rose-400'}>
                                        {Math.abs(Math.round(((metrics.thisWeek - metrics.lastWeek) / metrics.lastWeek) * 100))}%
                                    </span>
                                    <span className="text-textMuted text-sm">
                                        {metrics.thisWeek >= metrics.lastWeek ? 'increase' : 'decrease'} from last week
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                            <h3 className="font-semibold text-textMain mb-4">Monthly Comparison</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-xs text-textMuted mb-1">This Month</p>
                                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics?.thisMonth || 0)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-xs text-textMuted mb-1">Last Month</p>
                                    <p className="text-2xl font-bold text-textMain">{formatCurrency(metrics?.lastMonth || 0)}</p>
                                </div>
                            </div>
                            {metrics?.lastMonth && (
                                <div className="mt-4 flex items-center gap-2">
                                    {metrics.thisMonth >= metrics.lastMonth ? (
                                        <TrendUp size={20} className="text-emerald-400" />
                                    ) : (
                                        <TrendDown size={20} className="text-rose-400" />
                                    )}
                                    <span className={metrics.thisMonth >= metrics.lastMonth ? 'text-emerald-400' : 'text-rose-400'}>
                                        {Math.abs(Math.round(((metrics.thisMonth - metrics.lastMonth) / metrics.lastMonth) * 100))}%
                                    </span>
                                    <span className="text-textMuted text-sm">
                                        {metrics.thisMonth >= metrics.lastMonth ? 'increase' : 'decrease'} from last month
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'transactions' && (
                <>
                    {/* Filter */}
                    <div className="flex items-center gap-3">
                        {['all', 'purchase', 'usage', 'bonus', 'refund', 'referral'].map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    setFilterType(type);
                                    setPage(1);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    filterType === type
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Transactions Table */}
                    <DataTable
                        columns={transactionColumns}
                        data={transactions}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            page,
                            limit,
                            total: totalTransactions,
                            onPageChange: setPage,
                        }}
                        onRefresh={fetchTransactions}
                        onExport={exportTransactions}
                        emptyMessage="No transactions found"
                        emptyIcon={<CurrencyDollar size={32} className="text-textMuted/50" />}
                    />
                </>
            )}
        </div>
    );
};

export default RevenueAnalytics;
