import { CreditCard, Check, Warning, DownloadSimple, Plus, Info, PencilSimple, Lightning, CurrencyDollar, ArrowClockwise, Receipt, CaretRight, Ticket } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import ApplyCouponModal from '../components/billing/ApplyCouponModal';
import BuyCreditsModal from '../components/billing/BuyCreditsModal';
import { Button } from '../components/ui/Button';
import { 
    getUsageSummary, 
    getCreditTransactions, 
    checkBalance,
    CreditTransaction,
    UsageSummary
} from '../services/billingService';
import { 
    getPaymentHistory, 
    PaymentHistory, 
    getAutoReloadSettings, 
    updateAutoReloadSettings,
    AutoReloadSettings,
    PaymentResult,
    Coupon
} from '../services/paymentService';

const Billing: React.FC = () => {
    // UI State
    const [hipaaEnabled, setHipaaEnabled] = useState(false);
    const [dataRetentionEnabled, setDataRetentionEnabled] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly'>('daily');
    
    // Modal State
    const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    
    // Data State
    const [balance, setBalance] = useState(0);
    const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
    const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [autoReloadSettings, setAutoReloadSettings] = useState<AutoReloadSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [balanceResult, usage, transactions, payments, reloadSettings] = await Promise.all([
                    checkBalance(0),
                    getUsageSummary(30),
                    getCreditTransactions(20),
                    getPaymentHistory(20),
                    getAutoReloadSettings()
                ]);
                
                setBalance(balanceResult.balance);
                setUsageSummary(usage);
                setCreditTransactions(transactions);
                setPaymentHistory(payments);
                setAutoReloadSettings(reloadSettings);
            } catch (error) {
                console.error('Error fetching billing data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Generate usage chart data — use real data from API or generate last-30-days fallback
    const usageData = usageSummary?.byDay?.length 
        ? usageSummary.byDay.map(d => ({
            day: d.date,
            credits: d.credits_used || 0,
            cost: d.cost || 0
        }))
        : Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return { day: d.toISOString().slice(0, 10), credits: 0, cost: 0 };
        });

    // Handle payment success
    const handlePaymentSuccess = (result: PaymentResult) => {
        if (result.newBalance !== undefined) {
            setBalance(result.newBalance);
        }
        getPaymentHistory(20).then(setPaymentHistory);
        getCreditTransactions(20).then(setCreditTransactions);
    };

    // Handle coupon apply (for discount coupons on purchases)
    const handleCouponApply = (coupon: Coupon) => {
        setAppliedCoupon(coupon);
        setShowBuyCreditsModal(true);
    };

    // Handle direct credits redemption from promo coupons
    const handleCreditsRedeemed = async (amount: number) => {
        // Refresh balance and transactions after credits are added
        const [balanceResult, transactions] = await Promise.all([
            checkBalance(0),
            getCreditTransactions(20)
        ]);
        setBalance(balanceResult.balance);
        setCreditTransactions(transactions);
        setShowCouponModal(false);
    };

    // Handle auto reload toggle
    const handleAutoReloadToggle = async (enabled: boolean) => {
        const newSettings = { ...autoReloadSettings, enabled };
        setAutoReloadSettings(newSettings as AutoReloadSettings);
        await updateAutoReloadSettings({ enabled });
    };

    // Handle auto reload settings change
    const handleAutoReloadChange = async (field: 'reloadAmount' | 'threshold', value: number) => {
        const newSettings = { ...autoReloadSettings, [field]: value };
        setAutoReloadSettings(newSettings as AutoReloadSettings);
        await updateAutoReloadSettings({ [field]: value });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 mb-20">
            {/* Top Section: Balance & Chart */}
            <div>
                <h1 className="text-2xl font-bold text-textMain mb-6 flex items-center gap-2">
                    <CreditCard className="text-textMuted" size={24} weight="duotone" />
                    Billing
                </h1>
                
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-textMain">PAYG</h2>
                        <span className="px-2 py-0.5 rounded-full bg-surface border border-white/10 text-xs text-textMuted flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Current plan
                        </span>
                    </div>
                    <p className="text-sm text-textMuted mb-4">Credit Balance:</p>
                    <div className="flex items-center gap-2 mb-6">
                        <CurrencyDollar size={28} weight="bold" className="text-primary" />
                        <span className="text-4xl font-bold text-textMain">
                            {isLoading ? '...' : balance.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowBuyCreditsModal(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <Lightning size={18} weight="fill" />
                            Buy More Credits
                        </button>
                        <button 
                            onClick={() => setShowCouponModal(true)}
                            className="px-4 py-2.5 bg-surface border border-white/10 text-textMain font-semibold rounded-xl text-sm hover:bg-surfaceHover transition-colors flex items-center gap-2"
                        >
                            <Ticket size={18} weight="bold" />
                            Apply Coupon
                        </button>
                    </div>
                    
                    {/* Applied Coupon Indicator */}
                    {appliedCoupon && (
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl inline-flex items-center gap-2">
                            <Ticket size={16} weight="fill" className="text-emerald-400" />
                            <span className="text-sm text-emerald-400">
                                Coupon <span className="font-mono font-bold">{appliedCoupon.code}</span> applied - {appliedCoupon.discountPercent}% off
                            </span>
                            <button 
                                onClick={() => setAppliedCoupon(null)}
                                className="ml-2 text-xs text-textMuted hover:text-textMain"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>

                {/* Usage Chart */}
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none" />
                    
                    <div className="relative flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-textMain">Usage</h3>
                            <p className="text-sm text-textMuted">Minutes used over the last 30 days</p>
                        </div>
                        <div className="text-right">
                             <span className="text-2xl font-bold text-textMain">
                                {usageSummary?.totalMinutes?.toFixed(0) || 0}
                             </span>
                             <span className="text-sm text-textMuted ml-1">Mins</span>
                        </div>
                    </div>

                    <div className="flex justify-end mb-4">
                         <div className="bg-background/50 backdrop-blur-sm rounded-xl p-1 flex gap-1 border border-white/5">
                             <button 
                                onClick={() => setChartPeriod('daily')}
                                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    chartPeriod === 'daily' 
                                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5' 
                                        : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                                }`}
                             >
                                Daily
                             </button>
                             <button 
                                onClick={() => setChartPeriod('weekly')}
                                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    chartPeriod === 'weekly' 
                                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5' 
                                        : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                                }`}
                             >
                                Weekly
                             </button>
                         </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={usageData}>
                                <defs>
                                    <linearGradient id="colorMins" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2EC7B7" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#2EC7B7" stopOpacity={0}/>
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
                                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1B1E23', border: '1px solid #2D3139', borderRadius: '8px' }}
                                    itemStyle={{ color: '#EBEBEB' }}
                                />
                                <Area type="monotone" dataKey="mins" stroke="#2EC7B7" strokeWidth={2} fillOpacity={1} fill="url(#colorMins)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Plans Section */}
            <div>
                <h3 className="text-xl font-semibold text-textMain mb-2">Plans</h3>
                <p className="text-sm text-textMuted mb-6">
                    Select a plan for your organization. <span className="font-medium text-textMain">Bundled minutes</span> include the cost of every provider used during a call (LLM, TTS, STT, etc.). <span className="font-medium text-textMain">Overage cost</span> applies when you exceed your bundled minutes.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Usage Based Card */}
                    <div className="bg-surface/80 backdrop-blur-xl border-2 border-primary/30 rounded-2xl p-6 relative flex flex-col overflow-hidden">
                        {/* Ambient glow */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-3xl pointer-events-none" />
                        
                        <h4 className="text-sm text-textMuted font-medium mb-1">Usage Based</h4>
                        <h3 className="text-2xl font-bold text-textMain mb-6">Pay as you go</h3>

                        <div className="space-y-4 mb-8 flex-1">
                            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                <span className="text-textMuted">Bundled minutes:</span>
                                <span className="text-textMain">-</span>
                            </div>
                            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                <span className="text-textMuted">Bundled minutes overage cost:</span>
                                <span className="text-textMain">-</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-textMuted">Concurrency included:</span>
                                <span className="text-textMain">10</span>
                            </div>
                        </div>
                        
                        <div className="text-center mt-auto pt-4">
                            <span className="text-primary font-medium text-sm flex items-center justify-center gap-2">
                                <Check size={16} weight="bold" />
                                Current Plan
                            </span>
                        </div>
                    </div>

                    {/* Enterprise Card */}
                    <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col">
                         <h4 className="text-sm text-textMuted font-medium mb-1">Enterprise</h4>
                         <div className="flex items-end gap-2 mb-6">
                            <h3 className="text-2xl font-bold text-textMain">Custom</h3>
                            <span className="text-sm text-textMuted mb-1">/annual contract</span>
                         </div>

                         <div className="space-y-4 mb-8 flex-1">
                            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                <span className="text-textMuted">Bundled minutes:</span>
                                <span className="text-textMain">Starting at 600,000/year</span>
                            </div>
                            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                <span className="text-textMuted">Bundled minutes overage cost:</span>
                                <span className="text-textMain">Custom</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-textMuted">Concurrency included:</span>
                                <span className="text-textMain">Custom</span>
                            </div>
                        </div>

                        <Button className="w-full gap-2">
                            Contact Sales
                            <CaretRight size={16} weight="bold" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Add-ons Section */}
            <div>
                <h3 className="text-xl font-semibold text-textMain mb-1">Add-ons</h3>
                <p className="text-sm text-textMuted mb-6">Configure add-ons and supercharge your experience</p>

                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
                     {/* HIPAA Compliance */}
                     <div className="p-6">
                         <div className="flex justify-between items-start mb-4">
                             <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-textMain">Enable HIPAA Compliance</span>
                                    <Info size={14} weight="fill" className="text-textMuted cursor-help" />
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs text-textMuted">Bills monthly</span>
                                 </div>
                             </div>
                             <div className="flex items-center gap-4">
                                 <span className="text-sm text-textMuted">+ $12/mo</span>
                                 <button 
                                    onClick={() => setHipaaEnabled(!hipaaEnabled)}
                                    className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${hipaaEnabled ? 'bg-primary' : 'bg-surfaceHover border border-white/10'}`}
                                 >
                                     <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm ${hipaaEnabled ? 'left-6' : 'left-1'}`} />
                                 </button>
                             </div>
                         </div>
                         
                         {hipaaEnabled && (
                             <div className="space-y-3 bg-background/50 p-4 rounded-xl border border-white/5 mt-4">
                                 <input 
                                    type="text" 
                                    placeholder="Recipient Name" 
                                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary placeholder:text-textMuted/50" 
                                 />
                                 <input 
                                    type="text" 
                                    placeholder="Recipient Organization" 
                                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary placeholder:text-textMuted/50" 
                                 />
                             </div>
                         )}
                     </div>

                     {/* Reserved Concurrency */}
                     <div className="p-6 flex justify-between items-center">
                         <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-textMain">Reserved Concurrency (Call Lines)</span>
                                <Info size={14} weight="fill" className="text-textMuted" />
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
                                    className="w-24 bg-background border border-white/10 rounded-xl px-3 py-2 text-right text-sm text-textMain outline-none focus:border-primary" 
                                    defaultValue={0} 
                                 />
                             </div>
                             <span className="text-sm text-textMuted whitespace-nowrap min-w-[80px] text-right">+ $0.12/mo each</span>
                         </div>
                     </div>

                     {/* Data Retention */}
                     <div className="p-6 flex justify-between items-center">
                         <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-textMain">60-day Call and Chat Data Retention</span>
                                <Info size={14} weight="fill" className="text-textMuted" />
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-xs text-textMuted">Bills monthly</span>
                             </div>
                         </div>
                         <div className="flex items-center gap-4">
                             <span className="text-sm text-textMuted">+ $12/mo</span>
                             <button 
                                onClick={() => setDataRetentionEnabled(!dataRetentionEnabled)}
                                className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${dataRetentionEnabled ? 'bg-primary' : 'bg-surfaceHover border border-white/10'}`}
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
                        <p className="text-sm text-textMuted mt-1">Manage your payment methods</p>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Payment Methods List */}
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                                    <span className="text-xl">🇮🇳</span>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-textMain">Razorpay</div>
                                    <div className="text-xs text-textMuted">UPI, Cards, Net Banking</div>
                                </div>
                            </div>
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg">Default</span>
                        </div>

                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg flex items-center justify-center">
                                    <span className="text-xl">💳</span>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-textMain">Stripe</div>
                                    <div className="text-xs text-textMuted">International Cards</div>
                                </div>
                            </div>
                            <Button variant="link" size="sm">
                                Set as default
                            </Button>
                        </div>

                        <Button variant="outline" className="w-full gap-2 border-dashed">
                            <Plus size={16} weight="bold" />
                            Add Payment Method
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <div>
                             <h3 className="text-xl font-semibold text-textMain flex items-center gap-2">
                                <ArrowClockwise size={20} weight="bold" className="text-textMuted" />
                                Auto Reload
                             </h3>
                             <p className="text-sm text-textMuted mt-1">Automatically add credits when balance is low</p>
                         </div>
                         <button 
                            onClick={() => handleAutoReloadToggle(!autoReloadSettings?.enabled)}
                            className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${autoReloadSettings?.enabled ? 'bg-primary' : 'bg-surfaceHover border border-white/10'}`}
                         >
                             <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm ${autoReloadSettings?.enabled ? 'left-6' : 'left-1'}`} />
                         </button>
                     </div>
                     
                     <div className={`space-y-4 transition-all duration-200 ${autoReloadSettings?.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4">
                            <label className="text-xs font-medium text-textMuted block mb-2">Amount to reload</label>
                            <div className="relative">
                                <CurrencyDollar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                                <input 
                                    type="number" 
                                    value={autoReloadSettings?.reloadAmount || 500}
                                    onChange={(e) => handleAutoReloadChange('reloadAmount', Number(e.target.value))}
                                    className="w-full bg-background border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-textMain outline-none focus:border-primary" 
                                />
                            </div>
                        </div>
                        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4">
                            <label className="text-xs font-medium text-textMuted block mb-2">When balance falls below</label>
                            <div className="relative">
                                <CurrencyDollar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                                <input 
                                    type="number" 
                                    value={autoReloadSettings?.threshold || 100}
                                    onChange={(e) => handleAutoReloadChange('threshold', Number(e.target.value))}
                                    className="w-full bg-background border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-textMain outline-none focus:border-primary" 
                                />
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* History Tables */}
            <div className="space-y-8 pt-8">
                {/* Credit Purchase History */}
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="flex justify-between items-center p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <Receipt size={20} weight="bold" className="text-textMuted" />
                            <h3 className="text-lg font-semibold text-textMain">Credit Purchase History</h3>
                        </div>
                        <Button variant="secondary" size="sm" className="gap-2">
                            <DownloadSimple size={14} weight="bold" />
                            Download Statement
                        </Button>
                    </div>
                    <div className="p-6">
                        {paymentHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left border-b border-white/5">
                                            <th className="pb-3 text-xs font-medium text-textMuted">Date</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted">Credits</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted">Amount</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted">Provider</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {paymentHistory.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-white/[0.02]">
                                                <td className="py-3 text-sm text-textMain">
                                                    {new Date(payment.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 text-sm text-textMain font-medium">
                                                    +{payment.credits.toLocaleString()}
                                                </td>
                                                <td className="py-3 text-sm text-textMain">
                                                    ${payment.amount.toFixed(2)}
                                                </td>
                                                <td className="py-3 text-sm text-textMuted capitalize">
                                                    {payment.provider}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                                        payment.status === 'completed' 
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : payment.status === 'pending'
                                                            ? 'bg-yellow-500/20 text-yellow-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-textMuted text-sm">
                                No purchases yet. Buy credits to get started!
                            </div>
                        )}
                    </div>
                </div>

                {/* Credit Usage History */}
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-semibold text-textMain">Credit Usage History</h3>
                    </div>
                    <div className="p-6">
                        {creditTransactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left border-b border-white/5">
                                            <th className="pb-3 text-xs font-medium text-textMuted">Date</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted">Description</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted">Type</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted text-right">Amount</th>
                                            <th className="pb-3 text-xs font-medium text-textMuted text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {creditTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-white/[0.02]">
                                                <td className="py-3 text-sm text-textMuted">
                                                    {new Date(tx.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 text-sm text-textMain">
                                                    {tx.description}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                                        tx.transactionType === 'purchase' || tx.transactionType === 'bonus' || tx.transactionType === 'referral'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {tx.transactionType}
                                                    </span>
                                                </td>
                                                <td className={`py-3 text-sm font-medium text-right ${
                                                    tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    {tx.amount >= 0 ? '+' : ''}{Math.abs(tx.amount) < 0.01 && tx.amount !== 0 ? tx.amount.toFixed(6) : tx.amount.toFixed(4)} cr
                                                </td>
                                                <td className="py-3 text-sm text-textMuted text-right">
                                                    ${tx.balanceAfter.toFixed(2)}
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
                    </div>
                </div>
            </div>

            {/* Modals */}
            <BuyCreditsModal
                isOpen={showBuyCreditsModal}
                onClose={() => setShowBuyCreditsModal(false)}
                onSuccess={handlePaymentSuccess}
                currentBalance={balance}
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

export default Billing;
