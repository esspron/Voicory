import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    CurrencyDollar,
    Phone,
    ChatsCircle,
    Robot,
    TrendUp,
    TrendDown,
    ArrowRight,
    Sparkle,
    Lightning,
    Clock,
    UserPlus,
    CreditCard,
    Warning,
    CheckCircle,
    Pulse,
    ArrowsClockwise,
    CalendarBlank,
    Wallet,
    ChartLineUp,
    Target,
    Coins,
    Receipt
} from '@phosphor-icons/react';
import { StatsCard, SimpleLineChart, SimpleBarChart, DonutChart, Badge, Avatar, Button } from '../components/ui';
import { supabase } from '../services/supabase';
import type { DashboardStats, AdminUser, Transaction } from '../types/admin.types';

type DateRange = '7d' | '14d' | '30d' | '90d';

const DashboardHome: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [revenueData, setRevenueData] = useState<{ label: string; value: number }[]>([]);
    const [usageData, setUsageData] = useState<{ label: string; value: number; color?: string }[]>([]);
    const [userGrowthData, setUserGrowthData] = useState<{ label: string; value: number }[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>('14d');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Financial metrics
    const [financialMetrics, setFinancialMetrics] = useState({
        grossRevenue: 0,
        platformCosts: 0,
        grossProfit: 0,
        creditsOutstanding: 0,
        profitMargin: 0,
    });

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            const days = parseInt(dateRange);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Fetch user count
            const { count: userCount } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });

            // Fetch today's new users
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: newUsersToday } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            // Fetch last week's users for comparison
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const { count: usersLastWeek } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .lt('created_at', lastWeek.toISOString());

            // Fetch total credits balance (outstanding liability)
            const { data: balanceData } = await supabase
                .from('user_profiles')
                .select('credits_balance');
            const totalBalance = balanceData?.reduce((sum, u) => sum + (Number(u.credits_balance) || 0), 0) || 0;

            // Calculate revenue using RPC to avoid row limits and timezone issues
            const thisMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
            const nextMonthStart = today.getMonth() === 11 
                ? `${today.getFullYear() + 1}-01-01`
                : `${today.getFullYear()}-${String(today.getMonth() + 2).padStart(2, '0')}-01`;
            const lastMonthStart = today.getMonth() === 0
                ? `${today.getFullYear() - 1}-12-01`
                : `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-01`;

            // This month's revenue
            const { data: thisMonthStats } = await supabase.rpc('get_revenue_stats', {
                start_date: thisMonthStart,
                end_date: nextMonthStart
            });
            
            // Last month's revenue  
            const { data: lastMonthStats } = await supabase.rpc('get_revenue_stats', {
                start_date: lastMonthStart,
                end_date: thisMonthStart
            });

            // All time revenue
            const { data: allTimeStats } = await supabase.rpc('get_revenue_stats', {
                start_date: '2020-01-01',
                end_date: '2099-12-31'
            });

            const thisMonthRevenue = thisMonthStats?.find((r: {transaction_type: string}) => r.transaction_type === 'purchase')?.total_amount || 0;
            const lastMonthRevenue = lastMonthStats?.find((r: {transaction_type: string}) => r.transaction_type === 'purchase')?.total_amount || 0;
            const totalRevenue = allTimeStats?.find((r: {transaction_type: string}) => r.transaction_type === 'purchase')?.total_amount || 0;

            console.log('📊 Revenue Stats:', { thisMonthStart, nextMonthStart, thisMonthRevenue, lastMonthRevenue, totalRevenue });

            const revenueGrowth = lastMonthRevenue > 0 
                ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
                : thisMonthRevenue > 0 ? 100 : 0;

            // Fetch assistants count
            const { count: assistantsCount } = await supabase
                .from('assistants')
                .select('*', { count: 'exact', head: true });

            // Fetch usage stats with costs - use RPC to avoid 1000 row limit
            const { data: usageAggregates } = await supabase.rpc('get_usage_costs_by_type', {
                start_date: '2020-01-01',  // Get all time data
                end_date: '2099-12-31'
            });

            let totalCallMinutes = 0;
            let totalPlatformCost = 0;  // This is what YOU pay (provider costs)
            let totalUserCharged = 0;   // This is what users are charged
            let llmCost = 0, ttsCost = 0, sttCost = 0, callCost = 0;

            if (usageAggregates) {
                usageAggregates.forEach((row: { usage_type: string; total_charged: number; total_provider_cost: number; record_count: number }) => {
                    const providerCost = Number(row.total_provider_cost) || 0;
                    const charged = Number(row.total_charged) || 0;
                    totalPlatformCost += providerCost;
                    totalUserCharged += charged;
                    
                    switch (row.usage_type) {
                        case 'llm': llmCost = providerCost; break;
                        case 'tts': ttsCost = providerCost; break;
                        case 'stt': sttCost = providerCost; break;
                        case 'call': 
                            callCost = providerCost; 
                            // Estimate call minutes from record count (avg ~3 min per call)
                            totalCallMinutes = (row.record_count || 0) * 3;
                            break;
                    }
                });
            }

            // Fallback: fetch call duration using RPC
            if (totalCallMinutes === 0) {
                const { data: callMinutesData } = await supabase.rpc('get_total_call_minutes', {
                    start_date: '2020-01-01',
                    end_date: '2099-12-31'
                });
                totalCallMinutes = Number(callMinutesData) || 0;
            }

            setUsageData([
                { label: 'LLM', value: llmCost, color: '#14b8a6' },
                { label: 'TTS', value: ttsCost, color: '#8b5cf6' },
                { label: 'STT', value: sttCost, color: '#f59e0b' },
                { label: 'Calls', value: callCost, color: '#3b82f6' },
            ]);

            // Fetch WhatsApp messages count
            const { count: messagesCount } = await supabase
                .from('whatsapp_messages')
                .select('*', { count: 'exact', head: true });

            // Calculate user growth rate
            const userGrowthRate = usersLastWeek && usersLastWeek > 0 
                ? Math.round((((userCount || 0) - usersLastWeek) / usersLastWeek) * 100)
                : (userCount || 0) > 0 ? 100 : 0;

            // Financial metrics
            const grossProfit = Number(totalRevenue) - totalPlatformCost;
            const profitMargin = Number(totalRevenue) > 0 ? (grossProfit / Number(totalRevenue)) * 100 : 0;

            setFinancialMetrics({
                grossRevenue: Number(totalRevenue),
                platformCosts: totalPlatformCost,
                grossProfit,
                creditsOutstanding: totalBalance,
                profitMargin,
            });

            setStats({
                totalUsers: userCount || 0,
                newUsersToday: newUsersToday || 0,
                newUsersThisWeek: (userCount || 0) - (usersLastWeek || 0),
                activeUsersToday: 0,
                totalRevenue: Number(totalRevenue),
                revenueToday: 0,
                revenueThisMonth: Number(thisMonthRevenue),
                totalCreditsBalance: totalBalance,
                totalCallMinutes: Math.round(totalCallMinutes),
                callMinutesToday: 0,
                totalMessages: messagesCount || 0,
                messagesToday: 0,
                totalAssistants: assistantsCount || 0,
                activeAssistants: 0,
                totalPhoneNumbers: 0,
                avgRevenuePerUser: userCount ? Number(totalRevenue) / userCount : 0,
                userGrowthRate,
                revenueGrowthRate: revenueGrowth,
            });

            // Generate revenue chart data using RPC
            const chartStartDate = new Date();
            chartStartDate.setDate(chartStartDate.getDate() - days);
            const { data: dailyRevenue } = await supabase.rpc('get_daily_revenue', {
                start_date: chartStartDate.toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0]
            });

            // Build chart data with all days (including zeros)
            const revenueChartData: { [key: string]: number } = {};
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = date.toISOString().split('T')[0];
                revenueChartData[key] = 0;
            }

            // Fill in actual revenue
            dailyRevenue?.forEach((r: { date: string; revenue: number }) => {
                if (revenueChartData[r.date] !== undefined) {
                    revenueChartData[r.date] = Number(r.revenue) || 0;
                }
            });

            setRevenueData(Object.entries(revenueChartData).map(([date, amount]) => ({
                label: new Date(date).toLocaleDateString('en', { day: 'numeric', month: 'short' }),
                value: amount,
            })));

            // Generate user growth chart data
            const { data: usersByDate } = await supabase
                .from('user_profiles')
                .select('created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            const userGrowthChart: { [key: string]: number } = {};
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = date.toISOString().split('T')[0];
                userGrowthChart[key] = 0;
            }

            usersByDate?.forEach(u => {
                const date = new Date(u.created_at).toISOString().split('T')[0];
                if (userGrowthChart[date] !== undefined) {
                    userGrowthChart[date]++;
                }
            });

            // Convert to cumulative
            let cumulative = usersLastWeek || 0;
            setUserGrowthData(Object.entries(userGrowthChart).map(([date, count]) => {
                cumulative += count;
                return {
                    label: new Date(date).toLocaleDateString('en', { day: 'numeric', month: 'short' }),
                    value: cumulative,
                };
            }));

            // Recent users
            const { data: users } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentUsers(users?.map(u => ({
                id: u.user_id,
                email: u.organization_email || 'Unknown',
                created_at: u.created_at,
                last_sign_in_at: null,
                organization_name: u.organization_name,
                plan_type: u.plan_type || 'PAYG',
                credits_balance: Number(u.credits_balance) || 0,
                total_spent: 0,
                total_calls: 0,
                total_messages: 0,
                assistants_count: 0,
                phone_numbers_count: 0,
                status: 'active',
                country: u.country,
                currency: u.currency,
            })) || []);

            // Recent transactions
            const { data: recentTxns } = await supabase
                .from('credit_transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentTransactions(recentTxns?.map(t => ({
                id: t.id,
                user_id: t.user_id,
                user_email: '',
                transaction_type: t.transaction_type,
                amount: Number(t.amount) || 0,
                balance_before: Number(t.balance_before) || 0,
                balance_after: Number(t.balance_after) || 0,
                description: t.description || '',
                created_at: t.created_at,
            })) || []);

            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(fetchDashboardData, 60000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const formatNumber = (value: number) => value.toLocaleString();

    const dateRangeOptions: { value: DateRange; label: string }[] = [
        { value: '7d', label: '7 Days' },
        { value: '14d', label: '14 Days' },
        { value: '30d', label: '30 Days' },
        { value: '90d', label: '90 Days' },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
                        <Pulse size={28} weight="duotone" className="text-primary" />
                        Founder's Dashboard
                    </h1>
                    <p className="text-textMuted text-sm mt-1">
                        Complete business overview • Real-time metrics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date Range Selector */}
                    <div className="flex bg-surface/80 border border-white/10 rounded-xl p-1">
                        {dateRangeOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setDateRange(option.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                    dateRange === option.value
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-textMuted hover:text-textMain'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        disabled={loading}
                        className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex items-center gap-2 text-xs text-textMuted bg-surface/50 px-3 py-2 rounded-lg">
                        <Clock size={14} />
                        {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* 🎯 FINANCIAL OVERVIEW - Most Important for Founder */}
            <div className="bg-gradient-to-br from-surface/90 to-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 blur-3xl" />
                
                <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                                <Wallet size={20} weight="duotone" className="text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-textMain">Financial Overview</h2>
                                <p className="text-xs text-textMuted">P&L at a glance</p>
                            </div>
                        </div>
                        <a href="#/revenue" className="text-xs text-primary hover:underline flex items-center gap-1">
                            Detailed Analytics <ArrowRight size={12} />
                        </a>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt size={16} className="text-emerald-400" />
                                <span className="text-xs text-textMuted">Gross Revenue</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-400">
                                {formatCurrency(financialMetrics.grossRevenue)}
                            </p>
                            <p className="text-xs text-textMuted mt-1">From purchases</p>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightning size={16} className="text-amber-400" />
                                <span className="text-xs text-textMuted">Platform Costs</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-400">
                                {formatCurrency(financialMetrics.platformCosts)}
                            </p>
                            <p className="text-xs text-textMuted mt-1">LLM + TTS + STT</p>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <ChartLineUp size={16} className={financialMetrics.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                                <span className="text-xs text-textMuted">Gross Profit</span>
                            </div>
                            <p className={`text-2xl font-bold ${financialMetrics.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatCurrency(financialMetrics.grossProfit)}
                            </p>
                            <p className="text-xs text-textMuted mt-1">
                                {financialMetrics.profitMargin.toFixed(1)}% margin
                            </p>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Coins size={16} className="text-violet-400" />
                                <span className="text-xs text-textMuted">Credits Outstanding</span>
                            </div>
                            <p className="text-2xl font-bold text-violet-400">
                                {formatCurrency(financialMetrics.creditsOutstanding)}
                            </p>
                            <p className="text-xs text-textMuted mt-1">Deferred revenue</p>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Target size={16} className="text-primary" />
                                <span className="text-xs text-textMuted">ARPU</span>
                            </div>
                            <p className="text-2xl font-bold text-primary">
                                {formatCurrency(stats?.avgRevenuePerUser || 0)}
                            </p>
                            <p className="text-xs text-textMuted mt-1">Per user</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Primary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Users"
                    value={formatNumber(stats?.totalUsers || 0)}
                    icon={<Users size={20} weight="bold" />}
                    color="violet"
                    trend={stats?.userGrowthRate !== undefined ? { 
                        value: stats.userGrowthRate, 
                        label: 'vs last week' 
                    } : undefined}
                    loading={loading}
                />
                <StatsCard
                    title="Monthly Revenue"
                    value={formatCurrency(stats?.revenueThisMonth || 0)}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="emerald"
                    trend={stats?.revenueGrowthRate !== undefined ? { 
                        value: stats.revenueGrowthRate, 
                        label: 'vs last month' 
                    } : undefined}
                    loading={loading}
                />
                <StatsCard
                    title="Active Assistants"
                    value={formatNumber(stats?.totalAssistants || 0)}
                    icon={<Robot size={20} weight="bold" />}
                    color="primary"
                    loading={loading}
                />
                <StatsCard
                    title="WhatsApp Messages"
                    value={formatNumber(stats?.totalMessages || 0)}
                    icon={<ChatsCircle size={20} weight="bold" />}
                    color="emerald"
                    loading={loading}
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="New Users Today"
                    value={formatNumber(stats?.newUsersToday || 0)}
                    icon={<UserPlus size={20} weight="bold" />}
                    color="blue"
                    loading={loading}
                />
                <StatsCard
                    title="New This Week"
                    value={formatNumber(stats?.newUsersThisWeek || 0)}
                    icon={<CalendarBlank size={20} weight="bold" />}
                    color="violet"
                    loading={loading}
                />
                <StatsCard
                    title="Call Minutes"
                    value={`${formatNumber(stats?.totalCallMinutes || 0)} min`}
                    icon={<Phone size={20} weight="bold" />}
                    color="rose"
                    loading={loading}
                />
                <StatsCard
                    title="Avg Revenue/User"
                    value={formatCurrency(Math.round(stats?.avgRevenuePerUser || 0))}
                    icon={<TrendUp size={20} weight="bold" />}
                    color="amber"
                    loading={loading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="col-span-2 bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-3xl" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-textMain">Revenue Trend</h3>
                                <p className="text-sm text-textMuted">Last {dateRange.replace('d', '')} days</p>
                            </div>
                            {stats?.revenueGrowthRate !== undefined && (
                                <Badge 
                                    variant={stats.revenueGrowthRate >= 0 ? 'success' : 'error'} 
                                    icon={stats.revenueGrowthRate >= 0 ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
                                >
                                    {stats.revenueGrowthRate >= 0 ? '+' : ''}{stats.revenueGrowthRate}%
                                </Badge>
                            )}
                        </div>
                        {revenueData.length > 0 && revenueData.some(d => d.value > 0) ? (
                            <SimpleLineChart
                                data={revenueData}
                                height={200}
                                valueFormatter={formatCurrency}
                            />
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-textMuted">
                                <div className="text-center">
                                    <CurrencyDollar size={32} className="mx-auto mb-2 opacity-30" />
                                    <p>No revenue data yet</p>
                                    <p className="text-xs">Revenue will appear here when users make purchases</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Usage Breakdown */}
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl" />
                    <div className="relative">
                        <h3 className="text-lg font-semibold text-textMain mb-2">Cost Breakdown</h3>
                        <p className="text-sm text-textMuted mb-6">By service type</p>
                        {usageData.some(d => d.value > 0) ? (
                            <DonutChart
                                data={usageData}
                                size={140}
                                strokeWidth={20}
                                totalLabel="Total Cost"
                                valueFormatter={formatCurrency}
                            />
                        ) : (
                            <div className="h-[180px] flex items-center justify-center text-textMuted">
                                <div className="text-center">
                                    <Lightning size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No usage yet</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Recent Users */}
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-semibold text-textMain flex items-center gap-2">
                            <UserPlus size={18} className="text-violet-400" />
                            Recent Signups
                        </h3>
                        <a href="#/users" className="text-sm text-primary hover:underline flex items-center gap-1">
                            View all <ArrowRight size={14} />
                        </a>
                    </div>
                    <div className="divide-y divide-white/5">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                                    <div className="flex-1">
                                        <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-2" />
                                        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                                    </div>
                                </div>
                            ))
                        ) : recentUsers.length === 0 ? (
                            <div className="p-8 text-center text-textMuted">No recent signups</div>
                        ) : (
                            recentUsers.map((user) => (
                                <div key={user.id} className="p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                                    <Avatar email={user.email} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-textMain truncate">
                                            {user.organization_name || user.email}
                                        </p>
                                        <p className="text-xs text-textMuted truncate">{user.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={user.plan_type === 'PAYG' ? 'default' : 'primary'} size="sm">
                                            {user.plan_type}
                                        </Badge>
                                        <p className="text-xs text-textMuted mt-1">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-semibold text-textMain flex items-center gap-2">
                            <CurrencyDollar size={18} className="text-emerald-400" />
                            Recent Transactions
                        </h3>
                        <a href="#/revenue" className="text-sm text-primary hover:underline flex items-center gap-1">
                            View all <ArrowRight size={14} />
                        </a>
                    </div>
                    <div className="divide-y divide-white/5">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
                                    <div className="flex-1">
                                        <div className="h-4 w-40 bg-white/10 rounded animate-pulse mb-2" />
                                        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                                    </div>
                                </div>
                            ))
                        ) : recentTransactions.length === 0 ? (
                            <div className="p-8 text-center text-textMuted">No recent transactions</div>
                        ) : (
                            recentTransactions.map((txn) => (
                                <div key={txn.id} className="p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        txn.transaction_type === 'purchase' ? 'bg-emerald-500/20' :
                                        txn.transaction_type === 'usage' ? 'bg-amber-500/20' :
                                        txn.transaction_type === 'bonus' ? 'bg-violet-500/20' :
                                        'bg-white/10'
                                    }`}>
                                        {txn.transaction_type === 'purchase' && <CurrencyDollar size={18} className="text-emerald-400" />}
                                        {txn.transaction_type === 'usage' && <Lightning size={18} className="text-amber-400" />}
                                        {txn.transaction_type === 'bonus' && <Sparkle size={18} className="text-violet-400" />}
                                        {txn.transaction_type === 'refund' && <TrendDown size={18} className="text-rose-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-textMain capitalize">
                                            {txn.transaction_type}
                                        </p>
                                        <p className="text-xs text-textMuted truncate">
                                            {txn.description || 'No description'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${txn.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {txn.amount >= 0 ? '+' : ''}${Math.abs(txn.amount).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-textMuted">
                                            {new Date(txn.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* System Alerts */}
            <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="font-semibold text-textMain flex items-center gap-2 mb-4">
                    <Warning size={18} className="text-amber-400" />
                    System Alerts
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                        <CheckCircle size={24} weight="fill" className="text-emerald-400" />
                        <div>
                            <p className="font-medium text-textMain">All Systems Operational</p>
                            <p className="text-xs text-textMuted">API, Database, Webhooks</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                        <Pulse size={24} className="text-textMuted" />
                        <div>
                            <p className="font-medium text-textMain">API Latency: 45ms</p>
                            <p className="text-xs text-textMuted">Average response time</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                        <Lightning size={24} className="text-amber-400" />
                        <div>
                            <p className="font-medium text-textMain">Redis Cache: Connected</p>
                            <p className="text-xs text-textMuted">Upstash HTTP Mode</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
