import { CreditCard, Check, Warning, DownloadSimple, Plus, Info, PencilSimple, CircleNotch, Cpu, ChatCircle, Lightning, Ticket, CaretDown } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import ApplyCouponModal from '../../components/billing/ApplyCouponModal';
import BuyCreditsModal from '../../components/billing/BuyCreditsModal';
import { useAuth } from '../../contexts/AuthContext';
import { getUsageSummary, getCreditTransactions, checkBalance, CreditTransaction, UsageSummary } from '../../services/billingService';
import { 
    Coupon, 
    PaymentResult, 
    getBillingStatus, 
    BillingStatus,
    initializePaddle
} from '../../services/paddleService';
import { getUserProfile } from '../../services/voicoryService';
import { UserProfile } from '../../types';

// Provider logo/icon mapping
const providerIcons: Record<string, { name: string; color: string; bgColor: string }> = {
    'openai': { name: 'OpenAI', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
    'anthropic': { name: 'Anthropic', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    'groq': { name: 'Groq', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    'together': { name: 'Together AI', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    'elevenlabs': { name: 'ElevenLabs', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
    'deepgram': { name: 'Deepgram', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

// Model display names
const modelDisplayNames: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
    'claude-3-opus': 'Claude 3 Opus',
    'claude-3-haiku': 'Claude 3 Haiku',
    'llama-3.1-70b': 'Llama 3.1 70B',
    'llama-3.1-8b': 'Llama 3.1 8B',
    'mixtral-8x7b': 'Mixtral 8x7B',
};

// Format USD amount
const formatUSD = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
};

// Simple formatAmount function (USD only)
const formatAmount = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
};

// Currency symbol (USD only)
const currencySymbol = '$';

const BillingAndAddons: React.FC = () => {
    const [hipaaEnabled, setHipaaEnabled] = useState(false);
    const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
    const [dataRetentionEnabled, setDataRetentionEnabled] = useState(false);
    const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);

    // Modal State
    const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    // Coupon from ApplyCouponModal to be used in BuyCreditsModal (currently stored but not passed through)
    const [, setAppliedCoupon] = useState<Coupon | null>(null);

    // Billing State
    const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);

    // Real data state
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                // Initialize Paddle for checkout
                await initializePaddle();
                
                const [profile, summary, txns, billingStatusResult] = await Promise.all([
                    getUserProfile(),
                    getUsageSummary(30),
                    getCreditTransactions(20),
                    getBillingStatus()
                ]);
                setUserProfile(profile);
                setUsageSummary(summary);
                setTransactions(txns);
                setBillingStatus(billingStatusResult);
                if (profile) {
                    setHipaaEnabled(profile.hipaaEnabled);
                }
            } catch (error) {
                console.error('Error fetching billing data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // Prepare chart data from usage summary
    const usageData = React.useMemo(() => {
        if (!usageSummary?.byDay?.length) {
            // Generate empty data for last 30 days
            return Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (29 - i));
                return {
                    day: date.toISOString().split('T')[0],
                    cost: 0
                };
            });
        }
        return usageSummary.byDay.map(d => ({
            day: d.date,
            cost: d.cost
        }));
    }, [usageSummary]);

    const totalCost = usageSummary?.totalCost || 0;
    const creditsBalance = billingStatus?.creditsBalance ?? userProfile?.creditsBalance ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const billingEmail = userProfile?.organizationEmail || user?.email || 'No email';

    // Handle payment success
    const handlePaymentSuccess = async (_result: PaymentResult) => {
        // Refresh balance and transactions
        const [balanceResult, txns] = await Promise.all([
            checkBalance(0),
            getCreditTransactions(20)
        ]);
        if (userProfile) {
            setUserProfile({ ...userProfile, creditsBalance: balanceResult.balance });
        }
        setTransactions(txns);
        // Also refresh billing status
        const newStatus = await getBillingStatus();
        setBillingStatus(newStatus);
    };

    // Handle coupon apply (for discount coupons)
    const handleCouponApply = (coupon: Coupon) => {
        setAppliedCoupon(coupon);
        setShowCouponModal(false);
        setShowBuyCreditsModal(true);
    };

    // Handle credits redeemed from promo coupons
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleCreditsRedeemed = async (_amount: number) => {
        // Refresh balance and transactions
        const [balanceResult, txns] = await Promise.all([
            checkBalance(0),
            getCreditTransactions(20)
        ]);
        if (userProfile) {
            setUserProfile({ ...userProfile, creditsBalance: balanceResult.balance });
        }
        setTransactions(txns);
        setShowCouponModal(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <CircleNotch size={32} weight="bold" className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl space-y-10 mb-20">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-white/10">
                        <CreditCard size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Billing & Add-ons</h1>
                        <p className="text-sm text-textMuted">Manage your credits</p>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-primary/10 via-surface/80 to-violet-500/5 border border-primary/20 rounded-2xl p-8 mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        {/* Prepaid Credits Content */}
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <h2 className="text-2xl font-bold text-textMain">Pay As You Go</h2>
                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Active
                                </span>
                            </div>
                            <p className="text-sm text-textMuted mb-1">Credit Balance</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-textMain">{formatUSD(creditsBalance)}</span>
                            </div>
                            <p className="text-xs text-textMuted mt-1">Buy credits, use anytime. No monthly commitment.</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={() => setShowBuyCreditsModal(true)}
                                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5"
                                    >
                                        <Plus size={18} weight="bold" />
                                        Add Funds
                                    </button>
                                    <button 
                                        onClick={() => setShowCouponModal(true)}
                                        className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-textMain font-medium rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
                                    >
                                        <Ticket size={18} weight="bold" />
                                        Apply Coupon
                                    </button>
                                </div>
                    </div>
                </div>

                {/* Usage Chart */}
                <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Lightning size={20} weight="fill" className="text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-textMain">Usage Costs</h3>
                                <p className="text-xs text-textMuted">Total LLM and AI costs incurred</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary">{formatUSD(totalCost)}</span>
                            <p className="text-xs text-textMuted mt-1">spent this period</p>
                        </div>
                    </div>

                    <div className="flex justify-end mb-4">
                        <div className="bg-background rounded-lg p-1 flex gap-1">
                            <button className="px-3 py-1 text-xs font-medium rounded bg-surface text-textMain shadow-sm">Daily</button>
                            <button className="px-3 py-1 text-xs font-medium rounded text-textMuted hover:text-textMain">Weekly</button>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={usageData}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2EC7B7" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#2EC7B7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D3139" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    stroke="#6B7280"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val, index) => index % 5 === 0 ? val : ''}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${currencySymbol}${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1B1E23', border: '1px solid #2D3139', borderRadius: '8px' }}
                                    itemStyle={{ color: '#EBEBEB' }}
                                    formatter={(value: number) => [formatAmount(value), 'Cost']}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Area type="monotone" dataKey="cost" stroke="#2EC7B7" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost Breakdown by Component */}
                {usageSummary && usageSummary.byModel.length > 0 && (
                    <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 mt-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                                <Cpu size={20} weight="duotone" className="text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-textMain">Cost Breakdown</h3>
                                <p className="text-xs text-textMuted">Usage by model and provider</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {usageSummary.byModel.map((item, idx) => {
                                const providerInfo = providerIcons[item.provider] || { name: item.provider, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
                                const modelName = modelDisplayNames[item.model] || item.model;

                                return (
                                    <div key={idx} className="bg-background/50 border border-white/[0.04] rounded-xl p-4 hover:border-primary/30 hover:bg-white/[0.02] transition-all">
                                        {/* Provider Badge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${providerInfo.bgColor} ${providerInfo.color}`}>
                                                {providerInfo.name}
                                            </span>
                                            <span className="text-xs text-textMuted flex items-center gap-1">
                                                <ChatCircle size={12} weight="fill" />
                                                {item.count} {item.count === 1 ? 'request' : 'requests'}
                                            </span>
                                        </div>

                                        {/* Model Name */}
                                        <h4 className="text-sm font-semibold text-textMain mb-2">{modelName}</h4>

                                        {/* Stats */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-textMuted">Tokens Used</span>
                                                <span className="text-textMain font-medium">{item.tokens.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-textMuted">Cost</span>
                                                <span className="text-primary font-bold text-sm">{formatAmount(item.cost)}</span>
                                            </div>
                                        </div>

                                        {/* Cost per 1K tokens */}
                                        <div className="mt-3 pt-3 border-t border-white/5">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-textMuted">Avg. cost/1K tokens</span>
                                                <span className="text-textMuted">
                                                    {item.tokens > 0 ? formatAmount((item.cost / item.tokens) * 1000) : `${currencySymbol}0.00`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Summary */}
                        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                                <div>
                                    <span className="text-xs text-textMuted block">Total Requests</span>
                                    <span className="text-lg font-bold text-textMain">
                                        {usageSummary.byModel.reduce((sum, m) => sum + m.count, 0).toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-textMuted block">Total Tokens</span>
                                    <span className="text-lg font-bold text-textMain">
                                        {usageSummary.totalTokens.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-textMuted block">Total LLM Cost</span>
                                <span className="text-2xl font-bold text-primary">{formatAmount(totalCost)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Plans Section */}
            <div>
                <h3 className="text-xl font-semibold text-textMain mb-2">Billing Plans</h3>
                <p className="text-sm text-textMuted mb-6">
                    Choose how you want to pay. <span className="font-medium text-textMain">Prepaid</span> - buy credits upfront. <span className="font-medium text-textMain">Monthly Usage</span> - pay at the end of each month for what you used.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Prepaid Credits Card */}
                    <div className={`bg-surface rounded-xl p-6 relative flex flex-col ${billingMode === 'prepaid' ? 'border-2 border-primary/30' : 'border border-border'}`}>
                        {billingMode === 'prepaid' && (
                            <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-black text-xs font-semibold rounded-full">
                                Current Plan
                            </div>
                        )}
                        <h4 className="text-sm text-textMuted font-medium mb-1">Prepaid</h4>
                        <h3 className="text-2xl font-bold text-textMain mb-2">Pay as you go</h3>
                        <p className="text-xs text-textMuted mb-6">Buy credits upfront, use anytime</p>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">No monthly commitment</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">Credits never expire</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">Pay only what you need</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">10 concurrent calls</span>
                            </div>
                        </div>

                        {billingMode !== 'prepaid' && (
                            <button 
                                onClick={() => handleBillingModeSwitch('prepaid')}
                                disabled={isSwitchingMode}
                                className="w-full bg-surface border border-white/10 text-textMain font-semibold py-2.5 rounded-lg text-sm hover:bg-surfaceHover transition-colors mt-auto"
                            >
                                Switch to Prepaid
                            </button>
                        )}
                    </div>

                    {/* Monthly Usage Card */}
                    <div className={`bg-surface rounded-xl p-6 relative flex flex-col ${billingMode === 'postpaid' ? 'border-2 border-primary/30' : 'border border-border'}`}>
                        {billingMode === 'postpaid' && (
                            <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-black text-xs font-semibold rounded-full">
                                Current Plan
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm text-textMuted font-medium">Monthly Usage</h4>
                            <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-semibold rounded">POPULAR</span>
                        </div>
                        <h3 className="text-2xl font-bold text-textMain mb-2">Use now, pay later</h3>
                        <p className="text-xs text-textMuted mb-6">Billed at the end of each month</p>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">No upfront payment</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">Pay only for actual usage</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">Detailed usage breakdown</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">10 concurrent calls</span>
                            </div>
                        </div>

                        {billingMode !== 'postpaid' && (
                            <button 
                                onClick={() => handleBillingModeSwitch('postpaid')}
                                disabled={isSwitchingMode}
                                className="w-full bg-primary text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-primaryHover transition-colors mt-auto flex items-center justify-center gap-2"
                            >
                                {isSwitchingMode ? (
                                    <CircleNotch size={16} className="animate-spin" />
                                ) : (
                                    'Switch to Monthly'
                                )}
                            </button>
                        )}
                    </div>

                    {/* Enterprise Card */}
                    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col">
                        <h4 className="text-sm text-textMuted font-medium mb-1">Enterprise</h4>
                        <div className="flex items-end gap-2 mb-2">
                            <h3 className="text-2xl font-bold text-textMain">Custom</h3>
                        </div>
                        <p className="text-xs text-textMuted mb-6">Annual contract with volume discounts</p>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">600,000+ mins/year</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">Custom pricing</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">Dedicated support</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check size={16} weight="bold" className="text-emerald-400" />
                                <span className="text-textMain">Unlimited concurrency</span>
                            </div>
                        </div>

                        <button className="w-full bg-surface border border-white/10 text-textMain font-semibold py-2.5 rounded-lg text-sm hover:bg-surfaceHover transition-colors mt-auto">
                            Contact Sales
                        </button>
                    </div>
                </div>
            </div>

            {/* Add-ons Section */}
            <div>
                <h3 className="text-xl font-semibold text-textMain mb-1">Add-ons</h3>
                <p className="text-sm text-textMuted mb-6">Configure add-ons and supercharge your experience</p>

                <div className="bg-surface border border-border rounded-xl divide-y divide-border">
                    {/* HIPAA Compliance */}
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-textMain">Enable HIPAA Compliance</span>
                                    <Info size={14} className="text-textMuted cursor-help" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs text-textMuted">Bills monthly</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-textMuted">+ {formatAmount(1000)}/mo</span>
                                <button
                                    onClick={() => setHipaaEnabled(!hipaaEnabled)}
                                    className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${hipaaEnabled ? 'bg-primary' : 'bg-surfaceHover border border-border'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm ${hipaaEnabled ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Show inputs only if enabled or always visible based on design preference */}
                        <div className="space-y-3 bg-background/50 p-4 rounded-lg border border-border/50">
                            <input
                                type="text"
                                placeholder="Recipient Name"
                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-textMain outline-none focus:border-primary placeholder:text-gray-600"
                            />
                            <input
                                type="text"
                                placeholder="Recipient Organization"
                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-textMain outline-none focus:border-primary placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    {/* Reserved Concurrency */}
                    <div className="p-6 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-textMain">Reserved Concurrency (Call Lines)</span>
                                <Info size={14} className="text-textMuted" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-xs text-textMuted">Bills monthly</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <input
                                    type="number"
                                    className="w-24 bg-background border border-border rounded px-3 py-1.5 text-right text-sm text-textMain outline-none focus:border-primary"
                                    defaultValue={0}
                                />
                            </div>
                            <span className="text-sm text-textMuted whitespace-nowrap min-w-[80px] text-right">+ {formatAmount(10)}/mo each</span>
                        </div>
                    </div>

                    {/* Data Retention */}
                    <div className="p-6 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-textMain">60-day Call and Chat Data Retention</span>
                                <Info size={14} className="text-textMuted" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-xs text-textMuted">Bills monthly</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-textMuted">+ {formatAmount(1000)}/mo</span>
                            <button
                                onClick={() => setDataRetentionEnabled(!dataRetentionEnabled)}
                                className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${dataRetentionEnabled ? 'bg-primary' : 'bg-surfaceHover border border-border'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm ${dataRetentionEnabled ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Method & Auto Reload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold text-textMain">Payment Method</h3>
                        <p className="text-sm text-textMuted mt-1">Enter your card details</p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-medium text-textMuted block mb-2">Billing Email</label>
                            <div className="bg-surface border border-border rounded-lg px-4 py-2.5 flex items-center justify-between group hover:border-gray-600 transition-colors">
                                <span className="text-sm text-textMain">{billingEmail}</span>
                                <button className="text-textMuted hover:text-textMain p-1 rounded hover:bg-background">
                                    <PencilSimple size={14} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-textMuted block mb-2">Payment Method</label>
                            <div className="bg-surface border border-border rounded-lg px-4 py-2.5 flex items-center justify-between group hover:border-gray-600 transition-colors">
                                <div className="flex items-center gap-3">
                                    <CreditCard size={16} className="text-textMuted" />
                                    <span className="text-sm text-textMain font-mono">Card number</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/30">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span className="text-xs text-emerald-400 font-medium">link</span>
                                        <span className="text-xs text-white bg-blue-600 px-1 rounded ml-1">VISA</span>
                                        <span className="text-[10px] text-textMuted ml-0.5">••••</span>
                                    </div>
                                    <button className="text-textMuted hover:text-textMain p-1 rounded hover:bg-background">
                                        <PencilSimple size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-semibold text-textMain">Auto Reload</h3>
                        </div>
                        <button
                            onClick={() => setAutoReloadEnabled(!autoReloadEnabled)}
                            className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${autoReloadEnabled ? 'bg-primary' : 'bg-surfaceHover border border-border'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm ${autoReloadEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className={`space-y-5 transition-opacity duration-200 ${autoReloadEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div>
                            <label className="text-xs font-medium text-textMuted block mb-2">Amount to reload</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-textMuted text-sm">$</span>
                                <input
                                    type="number"
                                    defaultValue={10}
                                    className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-textMain outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-textMuted block mb-2">When threshold reaches</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-textMuted text-sm">$</span>
                                <input
                                    type="number"
                                    defaultValue={10}
                                    className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-textMain outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Tables */}
            <div className="space-y-8 pt-8">
                <div className="bg-surface border border-border rounded-xl">
                    <button
                        onClick={() => setIsTransactionHistoryOpen(!isTransactionHistoryOpen)}
                        className="flex justify-between items-center w-full p-6 border-b border-border hover:bg-surfaceHover/30 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <CaretDown
                                size={18}
                                weight="bold"
                                className={`text-textMuted transition-transform duration-200 ${isTransactionHistoryOpen ? 'rotate-0' : '-rotate-90'}`}
                            />
                            <h3 className="text-lg font-semibold text-textMain">Credit Transaction History</h3>
                        </div>
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 text-xs font-medium text-textMain border border-border hover:bg-surfaceHover px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <DownloadSimple size={14} />
                            Download Monthly Statement
                        </div>
                    </button>
                    {isTransactionHistoryOpen && <div className="p-6">
                        <p className="text-xs text-textMuted mb-4">Recent credit transactions including purchases and usage.</p>
                        {transactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Date</th>
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Type</th>
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Description</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Amount</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="border-b border-border/50 hover:bg-background/30">
                                                <td className="py-3 px-2 text-textMuted">
                                                    {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.transactionType === 'purchase' ? 'bg-green-500/20 text-green-400' :
                                                        tx.transactionType === 'usage' ? 'bg-orange-500/20 text-orange-400' :
                                                            tx.transactionType === 'refund' ? 'bg-blue-500/20 text-blue-400' :
                                                                tx.transactionType === 'bonus' ? 'bg-purple-500/20 text-purple-400' :
                                                                    'bg-primary/20 text-primary'
                                                        }`}>
                                                        {tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-textMain max-w-xs">
                                                    {/* Parse description to show component info */}
                                                    {tx.description.includes('LLM usage:') ? (
                                                        <div className="flex items-center gap-2">
                                                            <Cpu size={14} className="text-primary flex-shrink-0" />
                                                            <div className="truncate">
                                                                <span className="text-textMain">{tx.description.replace('LLM usage: ', '')}</span>
                                                            </div>
                                                        </div>
                                                    ) : tx.description.includes('TTS') ? (
                                                        <div className="flex items-center gap-2">
                                                            <SpeakerHigh size={14} className="text-pink-400 flex-shrink-0" />
                                                            <span className="truncate">{tx.description}</span>
                                                        </div>
                                                    ) : tx.description.includes('STT') ? (
                                                        <div className="flex items-center gap-2">
                                                            <Microphone size={14} className="text-cyan-400 flex-shrink-0" />
                                                            <span className="truncate">{tx.description}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="truncate">{tx.description}</span>
                                                    )}
                                                </td>
                                                <td className={`py-3 px-2 text-right font-medium ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {tx.amount >= 0 ? '+' : ''}{formatAmount(Math.abs(tx.amount))}
                                                </td>
                                                <td className="py-3 px-2 text-right text-textMain">
                                                    {formatAmount(tx.balanceAfter)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-textMuted text-sm">
                                No transactions yet
                            </div>
                        )}
                    </div>}
                </div>

                {/* Usage by Model - Detailed Table */}
                {usageSummary && usageSummary.byModel.length > 0 && (
                    <div className="bg-surface border border-border rounded-xl">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-semibold text-textMain">Detailed Usage Log</h3>
                            <p className="text-xs text-textMuted mt-1">Breakdown of all AI component costs</p>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Component</th>
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Provider</th>
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Model</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Requests</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Tokens</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usageSummary.byModel.map((item, idx) => {
                                            const providerInfo = providerIcons[item.provider] || { name: item.provider, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
                                            const modelName = modelDisplayNames[item.model] || item.model;

                                            return (
                                                <tr key={idx} className="border-b border-border/50 hover:bg-background/30">
                                                    <td className="py-3 px-2">
                                                        <div className="flex items-center gap-2">
                                                            <Cpu size={14} className="text-primary" />
                                                            <span className="text-textMain">LLM</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${providerInfo.bgColor} ${providerInfo.color}`}>
                                                            {providerInfo.name}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 text-textMain font-medium">{modelName}</td>
                                                    <td className="py-3 px-2 text-right text-textMain">{item.count.toLocaleString()}</td>
                                                    <td className="py-3 px-2 text-right text-textMain">{item.tokens.toLocaleString()}</td>
                                                    <td className="py-3 px-2 text-right text-primary font-bold">{formatUSD(item.cost)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-background/50">
                                            <td colSpan={4} className="py-3 px-2 text-right text-textMuted font-medium">Total</td>
                                            <td className="py-3 px-2 text-right text-textMain font-bold">{usageSummary.totalTokens.toLocaleString()}</td>
                                            <td className="py-3 px-2 text-right text-primary font-bold text-base">{formatUSD(totalCost)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-surface border border-border rounded-xl">
                    <div className="p-6 border-b border-border">
                        <h3 className="text-lg font-semibold text-textMain">Add-Ons History</h3>
                    </div>
                    <div className="p-6">
                        <p className="text-xs text-textMuted mb-4">Add-ons are charged to your Voicory credits on the first day of each month.</p>
                        <div className="text-center py-8 text-textMuted text-sm">
                            No data available
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <BuyCreditsModal
                isOpen={showBuyCreditsModal}
                onClose={() => {
                    setShowBuyCreditsModal(false);
                    setAppliedCoupon(null);
                }}
                onSuccess={handlePaymentSuccess}
                currentBalance={creditsBalance}
            />

            <ApplyCouponModal
                isOpen={showCouponModal}
                onClose={() => setShowCouponModal(false)}
                onApply={handleCouponApply}
                onCreditsRedeemed={handleCreditsRedeemed}
            />
        </div>
    );
};

export default BillingAndAddons;
