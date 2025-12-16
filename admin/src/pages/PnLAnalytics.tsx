import React, { useState, useEffect, useCallback } from 'react';
import {
    ChartLineUp,
    ChartPieSlice,
    TrendUp,
    TrendDown,
    Receipt,
    Lightning,
    Wallet,
    ArrowsClockwise,
    CaretDown,
    Warning,
    CheckCircle,
    CurrencyDollar,
    Buildings,
    CreditCard,
    Phone,
    Microphone,
    Brain,
    SpeakerHigh,
    Plus,
    PencilSimple,
    Trash,
    CalendarBlank,
    CloudArrowDown
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';

interface MonthlyFinancial {
    month: string;
    gross_revenue: number;
    refunds: number;
    net_revenue: number;
    llm_costs: number;
    tts_costs: number;
    stt_costs: number;
    telephony_costs: number;
    total_cogs: number;
    gross_profit: number;
    gross_margin_percent: number;
    infrastructure_costs: number;
    payment_gateway_fees: number;
    other_opex: number;
    total_opex: number;
    operating_profit: number;
    operating_margin_percent: number;
    total_users: number;
    new_users: number;
    paying_users: number;
    arpu: number;
    arppu: number;
}

interface ProviderCost {
    id: string;
    provider: string;
    cost_type: string;
    category: string;
    amount: number;
    period_start: string;
    period_end: string;
    description: string;
    invoice_id: string;
}

const PnLAnalytics: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().substring(0, 7)
    );
    const [monthlyData, setMonthlyData] = useState<MonthlyFinancial | null>(null);
    const [historicalData, setHistoricalData] = useState<MonthlyFinancial[]>([]);
    const [providerCosts, setProviderCosts] = useState<ProviderCost[]>([]);
    const [showAddCost, setShowAddCost] = useState(false);
    const [realTimeMetrics, setRealTimeMetrics] = useState({
        todayRevenue: 0,
        todayCosts: 0,
        mtdRevenue: 0,
        mtdCosts: 0,
        runRate: 0,
    });

    // New cost form
    const [newCost, setNewCost] = useState({
        provider: '',
        cost_type: 'subscription',
        category: 'infrastructure',
        amount: '',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        description: '',
        invoice_id: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const monthStart = `${selectedMonth}-01`;
            
            // Fetch or calculate monthly financials
            const { data: monthly } = await supabase
                .from('monthly_financials')
                .select('*')
                .eq('month', monthStart)
                .single();

            if (monthly) {
                setMonthlyData(monthly);
            } else {
                // Calculate on the fly
                await calculateLiveFinancials(monthStart);
            }

            // Fetch historical data (last 6 months)
            const { data: historical } = await supabase
                .from('monthly_financials')
                .select('*')
                .order('month', { ascending: false })
                .limit(6);

            setHistoricalData(historical || []);

            // Fetch provider costs
            const { data: costs } = await supabase
                .from('provider_costs')
                .select('*')
                .order('period_start', { ascending: false })
                .limit(20);

            setProviderCosts(costs || []);

            // Calculate real-time metrics
            await calculateRealTimeMetrics();

        } catch (error) {
            console.error('Error fetching P&L data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    const calculateLiveFinancials = async (monthStart: string) => {
        // Calculate month end as first day of next month
        const [year, month] = monthStart.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const monthEndStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        console.log('📊 P&L Query Range:', { monthStart, monthEndStr });

        // Revenue
        const { data: purchases } = await supabase
            .from('credit_transactions')
            .select('amount')
            .eq('transaction_type', 'purchase')
            .gte('created_at', monthStart)
            .lt('created_at', monthEndStr);

        const grossRevenue = purchases?.reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0) || 0;

        // Costs from usage - use database aggregation to avoid 1000 row limit
        const { data: usageAggregates, error: usageError } = await supabase
            .rpc('get_usage_costs_by_type', {
                start_date: monthStart,
                end_date: monthEndStr
            });

        console.log('📊 Usage Aggregates:', { usageAggregates, usageError });

        let llmCosts = 0, ttsCosts = 0, sttCosts = 0, telephonyCosts = 0;
        
        if (usageAggregates && !usageError) {
            usageAggregates.forEach((row: { usage_type: string; total_provider_cost: number }) => {
                const cost = Number(row.total_provider_cost) || 0;
                switch (row.usage_type) {
                    case 'llm': llmCosts = cost; break;
                    case 'tts': ttsCosts = cost; break;
                    case 'stt': sttCosts = cost; break;
                    case 'call': telephonyCosts = cost; break;
                }
            });
        }
        
        console.log('💰 Calculated COGS:', { llmCosts, ttsCosts, sttCosts, telephonyCosts, total: llmCosts + ttsCosts + sttCosts + telephonyCosts });

        const totalCogs = llmCosts + ttsCosts + sttCosts + telephonyCosts;
        const grossProfit = grossRevenue - totalCogs;

        // Users
        const { count: totalUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', monthEndStr);

        const { count: newUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', monthStart)
            .lt('created_at', monthEndStr);

        setMonthlyData({
            month: monthStart,
            gross_revenue: grossRevenue,
            refunds: 0,
            net_revenue: grossRevenue,
            llm_costs: llmCosts,
            tts_costs: ttsCosts,
            stt_costs: sttCosts,
            telephony_costs: telephonyCosts,
            total_cogs: totalCogs,
            gross_profit: grossProfit,
            gross_margin_percent: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
            infrastructure_costs: 0,
            payment_gateway_fees: 0,
            other_opex: 0,
            total_opex: 0,
            operating_profit: grossProfit,
            operating_margin_percent: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
            total_users: totalUsers || 0,
            new_users: newUsers || 0,
            paying_users: 0,
            arpu: totalUsers ? grossRevenue / totalUsers : 0,
            arppu: 0,
        });
    };

    const calculateRealTimeMetrics = async () => {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = `${today.substring(0, 7)}-01`;

        // Today's revenue
        const { data: todayPurchases } = await supabase
            .from('credit_transactions')
            .select('amount')
            .eq('transaction_type', 'purchase')
            .gte('created_at', today);

        const todayRevenue = todayPurchases?.reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0) || 0;

        // Today's costs - use actual provider_cost_usd if available
        const { data: todayUsage } = await supabase
            .from('usage_logs')
            .select('cost_usd, provider_cost_usd')
            .gte('created_at', today);

        const todayCosts = todayUsage?.reduce((sum, u) => {
            // Use actual provider cost if available, otherwise estimate
            const providerCost = Number(u.provider_cost_usd) || Number(u.cost_usd) * 0.55;
            return sum + providerCost;
        }, 0) || 0;

        // MTD revenue
        const { data: mtdPurchases } = await supabase
            .from('credit_transactions')
            .select('amount')
            .eq('transaction_type', 'purchase')
            .gte('created_at', monthStart);

        const mtdRevenue = mtdPurchases?.reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0) || 0;

        // MTD costs - use actual provider_cost_usd if available
        const { data: mtdUsage } = await supabase
            .from('usage_logs')
            .select('cost_usd, provider_cost_usd')
            .gte('created_at', monthStart);

        const mtdCosts = mtdUsage?.reduce((sum, u) => {
            // Use actual provider cost if available, otherwise estimate
            const providerCost = Number(u.provider_cost_usd) || Number(u.cost_usd) * 0.55;
            return sum + providerCost;
        }, 0) || 0;

        // Run rate (projected monthly based on MTD)
        const dayOfMonth = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const runRate = (mtdRevenue / dayOfMonth) * daysInMonth;

        setRealTimeMetrics({
            todayRevenue,
            todayCosts,
            mtdRevenue,
            mtdCosts,
            runRate,
        });
    };

    const addProviderCost = async () => {
        try {
            const { error } = await supabase.from('provider_costs').insert({
                provider: newCost.provider,
                cost_type: newCost.cost_type,
                category: newCost.category,
                amount: parseFloat(newCost.amount),
                period_start: newCost.period_start,
                period_end: newCost.period_end,
                description: newCost.description,
                invoice_id: newCost.invoice_id,
            });

            if (error) throw error;

            setShowAddCost(false);
            setNewCost({
                provider: '',
                cost_type: 'subscription',
                category: 'infrastructure',
                amount: '',
                period_start: new Date().toISOString().split('T')[0],
                period_end: new Date().toISOString().split('T')[0],
                description: '',
                invoice_id: '',
            });
            fetchData();
        } catch (error) {
            console.error('Error adding cost:', error);
        }
    };

    const deleteProviderCost = async (id: string) => {
        if (!confirm('Delete this cost entry?')) return;
        try {
            await supabase.from('provider_costs').delete().eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error deleting cost:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const formatPercent = (value: number) => `${value.toFixed(1)}%`;

    // Generate month options (last 12 months)
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().substring(0, 7);
    });

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'llm': return <Brain size={16} className="text-violet-400" />;
            case 'tts': return <SpeakerHigh size={16} className="text-emerald-400" />;
            case 'stt': return <Microphone size={16} className="text-amber-400" />;
            case 'telephony': return <Phone size={16} className="text-blue-400" />;
            case 'infrastructure': return <Buildings size={16} className="text-slate-400" />;
            case 'payment_gateway': return <CreditCard size={16} className="text-rose-400" />;
            default: return <Receipt size={16} className="text-textMuted" />;
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
                        <ChartLineUp size={28} weight="duotone" className="text-emerald-400" />
                        P&L Analytics
                    </h1>
                    <p className="text-textMuted text-sm mt-1">
                        End-to-end profitability analysis • Track real costs & margins
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 bg-surface border border-white/10 rounded-xl text-textMain text-sm"
                    >
                        {monthOptions.map(month => (
                            <option key={month} value={month}>
                                {new Date(month + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                        <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Real-time Pulse */}
            <div className="grid grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <TrendUp size={16} weight="bold" />
                        <span className="text-xs font-medium">Today's Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(realTimeMetrics.todayRevenue)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <Lightning size={16} weight="bold" />
                        <span className="text-xs font-medium">Today's Costs</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(realTimeMetrics.todayCosts)}</p>
                </div>
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Wallet size={16} weight="bold" />
                        <span className="text-xs font-medium">MTD Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(realTimeMetrics.mtdRevenue)}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-rose-400 mb-2">
                        <Receipt size={16} weight="bold" />
                        <span className="text-xs font-medium">MTD Costs</span>
                    </div>
                    <p className="text-2xl font-bold text-rose-400">{formatCurrency(realTimeMetrics.mtdCosts)}</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-violet-400 mb-2">
                        <ChartLineUp size={16} weight="bold" />
                        <span className="text-xs font-medium">Monthly Run Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-violet-400">{formatCurrency(realTimeMetrics.runRate)}</p>
                </div>
            </div>

            {/* Main P&L Statement */}
            <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-semibold text-textMain flex items-center gap-2">
                        <Receipt size={18} className="text-emerald-400" />
                        Profit & Loss Statement
                    </h2>
                    <span className="text-xs text-textMuted">
                        {new Date(selectedMonth + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                
                {loading ? (
                    <div className="p-8 text-center text-textMuted">Loading...</div>
                ) : monthlyData ? (
                    <div className="divide-y divide-white/5">
                        {/* Revenue Section */}
                        <div className="p-4 bg-emerald-500/5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-emerald-400">REVENUE</span>
                            </div>
                            <div className="space-y-2 ml-4">
                                <div className="flex justify-between">
                                    <span className="text-textMuted">Gross Revenue (Purchases)</span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.gross_revenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-textMuted">Less: Refunds</span>
                                    <span className="text-rose-400">({formatCurrency(monthlyData.refunds)})</span>
                                </div>
                                <div className="flex justify-between border-t border-white/10 pt-2">
                                    <span className="font-medium text-textMain">Net Revenue</span>
                                    <span className="font-bold text-emerald-400">{formatCurrency(monthlyData.net_revenue)}</span>
                                </div>
                            </div>
                        </div>

                        {/* COGS Section */}
                        <div className="p-4 bg-amber-500/5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-amber-400">COST OF GOODS SOLD (COGS)</span>
                            </div>
                            <div className="space-y-2 ml-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted flex items-center gap-2">
                                        <Brain size={14} className="text-violet-400" /> LLM Costs (OpenAI, etc.)
                                    </span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.llm_costs)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted flex items-center gap-2">
                                        <SpeakerHigh size={14} className="text-emerald-400" /> TTS Costs (ElevenLabs)
                                    </span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.tts_costs)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted flex items-center gap-2">
                                        <Microphone size={14} className="text-amber-400" /> STT Costs (Deepgram)
                                    </span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.stt_costs)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted flex items-center gap-2">
                                        <Phone size={14} className="text-blue-400" /> Telephony (Twilio)
                                    </span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.telephony_costs)}</span>
                                </div>
                                <div className="flex justify-between border-t border-white/10 pt-2">
                                    <span className="font-medium text-textMain">Total COGS</span>
                                    <span className="font-bold text-amber-400">({formatCurrency(monthlyData.total_cogs)})</span>
                                </div>
                            </div>
                        </div>

                        {/* Gross Profit */}
                        <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="font-semibold text-primary">GROSS PROFIT</span>
                                    <span className="text-xs text-textMuted ml-2">
                                        ({formatPercent(monthlyData.gross_margin_percent)} margin)
                                    </span>
                                </div>
                                <span className={`text-2xl font-bold ${monthlyData.gross_profit >= 0 ? 'text-primary' : 'text-rose-400'}`}>
                                    {formatCurrency(monthlyData.gross_profit)}
                                </span>
                            </div>
                        </div>

                        {/* Operating Expenses */}
                        <div className="p-4 bg-rose-500/5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-rose-400">OPERATING EXPENSES</span>
                            </div>
                            <div className="space-y-2 ml-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted flex items-center gap-2">
                                        <Buildings size={14} className="text-slate-400" /> Infrastructure (Railway, Supabase, Redis)
                                    </span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.infrastructure_costs)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted flex items-center gap-2">
                                        <CreditCard size={14} className="text-rose-400" /> Payment Gateway Fees
                                    </span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.payment_gateway_fees)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted flex items-center gap-2">
                                        <Receipt size={14} className="text-textMuted" /> Other OpEx
                                    </span>
                                    <span className="text-textMain">{formatCurrency(monthlyData.other_opex)}</span>
                                </div>
                                <div className="flex justify-between border-t border-white/10 pt-2">
                                    <span className="font-medium text-textMain">Total OpEx</span>
                                    <span className="font-bold text-rose-400">({formatCurrency(monthlyData.total_opex)})</span>
                                </div>
                            </div>
                        </div>

                        {/* Operating Profit */}
                        <div className={`p-4 ${monthlyData.operating_profit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="font-semibold text-textMain text-lg">NET OPERATING PROFIT</span>
                                    <span className="text-xs text-textMuted ml-2">
                                        ({formatPercent(monthlyData.operating_margin_percent)} margin)
                                    </span>
                                </div>
                                <span className={`text-3xl font-bold ${monthlyData.operating_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatCurrency(monthlyData.operating_profit)}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                {monthlyData.operating_profit >= 0 ? (
                                    <CheckCircle size={16} weight="fill" className="text-emerald-400" />
                                ) : (
                                    <Warning size={16} weight="fill" className="text-rose-400" />
                                )}
                                <span className={`text-sm ${monthlyData.operating_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {monthlyData.operating_profit >= 0 ? 'Profitable Month' : 'Loss-making Month'}
                                </span>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="p-4 bg-white/5">
                            <div className="grid grid-cols-5 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-textMain">{monthlyData.total_users}</p>
                                    <p className="text-xs text-textMuted">Total Users</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-400">+{monthlyData.new_users}</p>
                                    <p className="text-xs text-textMuted">New Users</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-primary">{monthlyData.paying_users}</p>
                                    <p className="text-xs text-textMuted">Paying Users</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-violet-400">{formatCurrency(monthlyData.arpu)}</p>
                                    <p className="text-xs text-textMuted">ARPU</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(monthlyData.arppu)}</p>
                                    <p className="text-xs text-textMuted">ARPPU</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-textMuted">No data for this month</div>
                )}
            </div>

            {/* Provider Costs Management */}
            <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-semibold text-textMain flex items-center gap-2">
                        <CurrencyDollar size={18} className="text-amber-400" />
                        Provider Costs (Your Expenses)
                    </h2>
                    <button
                        onClick={() => setShowAddCost(true)}
                        className="px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors flex items-center gap-1"
                    >
                        <Plus size={14} /> Add Cost
                    </button>
                </div>

                {/* Add Cost Form */}
                {showAddCost && (
                    <div className="p-4 bg-primary/5 border-b border-primary/20">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Provider (e.g., Railway)"
                                value={newCost.provider}
                                onChange={(e) => setNewCost({ ...newCost, provider: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            />
                            <select
                                value={newCost.category}
                                onChange={(e) => setNewCost({ ...newCost, category: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            >
                                <option value="infrastructure">Infrastructure</option>
                                <option value="llm">LLM</option>
                                <option value="tts">TTS</option>
                                <option value="stt">STT</option>
                                <option value="telephony">Telephony</option>
                                <option value="payment_gateway">Payment Gateway</option>
                                <option value="other">Other</option>
                            </select>
                            <select
                                value={newCost.cost_type}
                                onChange={(e) => setNewCost({ ...newCost, cost_type: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            >
                                <option value="subscription">Subscription</option>
                                <option value="usage">Usage-based</option>
                                <option value="one_time">One-time</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Amount ($)"
                                value={newCost.amount}
                                onChange={(e) => setNewCost({ ...newCost, amount: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <input
                                type="date"
                                value={newCost.period_start}
                                onChange={(e) => setNewCost({ ...newCost, period_start: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            />
                            <input
                                type="date"
                                value={newCost.period_end}
                                onChange={(e) => setNewCost({ ...newCost, period_end: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Description"
                                value={newCost.description}
                                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Invoice ID (optional)"
                                value={newCost.invoice_id}
                                onChange={(e) => setNewCost({ ...newCost, invoice_id: e.target.value })}
                                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAddCost(false)}
                                className="px-4 py-2 text-textMuted hover:text-textMain text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addProviderCost}
                                disabled={!newCost.provider || !newCost.amount}
                                className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                            >
                                Add Cost
                            </button>
                        </div>
                    </div>
                )}

                {/* Costs List */}
                <div className="divide-y divide-white/5">
                    {providerCosts.length === 0 ? (
                        <div className="p-8 text-center text-textMuted">
                            <Buildings size={32} className="mx-auto mb-2 opacity-30" />
                            <p>No provider costs recorded</p>
                            <p className="text-xs">Add your monthly infrastructure & API costs for accurate P&L</p>
                        </div>
                    ) : (
                        providerCosts.map(cost => (
                            <div key={cost.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02]">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    {getCategoryIcon(cost.category)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-textMain">{cost.provider}</span>
                                        <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-textMuted capitalize">
                                            {cost.cost_type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-textMuted">
                                        {cost.description || cost.category} • {cost.period_start} to {cost.period_end}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-amber-400">{formatCurrency(cost.amount)}</p>
                                    {cost.invoice_id && (
                                        <p className="text-xs text-textMuted">#{cost.invoice_id}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => deleteProviderCost(cost.id)}
                                    className="p-2 text-textMuted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                    <Trash size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Historical Trend */}
            {historicalData.length > 0 && (
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="font-semibold text-textMain flex items-center gap-2">
                            <ChartPieSlice size={18} className="text-violet-400" />
                            Historical P&L Trend
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 text-xs text-textMuted">
                                    <th className="px-4 py-3 text-left">Month</th>
                                    <th className="px-4 py-3 text-right">Revenue</th>
                                    <th className="px-4 py-3 text-right">COGS</th>
                                    <th className="px-4 py-3 text-right">Gross Profit</th>
                                    <th className="px-4 py-3 text-right">Margin</th>
                                    <th className="px-4 py-3 text-right">OpEx</th>
                                    <th className="px-4 py-3 text-right">Net Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {historicalData.map(row => (
                                    <tr key={row.month} className="hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 text-sm text-textMain">
                                            {new Date(row.month).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-emerald-400">
                                            {formatCurrency(row.net_revenue)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-amber-400">
                                            {formatCurrency(row.total_cogs)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-primary">
                                            {formatCurrency(row.gross_profit)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-textMuted">
                                            {formatPercent(row.gross_margin_percent)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-rose-400">
                                            {formatCurrency(row.total_opex)}
                                        </td>
                                        <td className={`px-4 py-3 text-sm text-right font-semibold ${row.operating_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {formatCurrency(row.operating_profit)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Margin Breakdown Alert */}
            <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <Warning size={24} weight="fill" className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-textMain mb-1">Margin Estimation Note</h3>
                        <p className="text-sm text-textMuted">
                            Provider costs are currently estimated using default margins (LLM: 40%, TTS: 50%, STT: 60%, Telephony: 30%). 
                            For accurate P&L, add your actual provider invoices above. The system will then calculate real margins 
                            based on your actual costs vs. what you charge users.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PnLAnalytics;
