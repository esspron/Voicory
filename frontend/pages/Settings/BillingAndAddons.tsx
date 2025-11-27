import React, { useState, useEffect } from 'react';
import { CreditCard, Check, AlertCircle, Download, Plus, Info, Edit2, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getUserProfile } from '../../services/callyyService';
import { getUsageSummary, getCreditTransactions, CreditTransaction, UsageSummary } from '../../services/billingService';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from '../../types';

const BillingAndAddons: React.FC = () => {
    const [hipaaEnabled, setHipaaEnabled] = useState(false);
    const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
    const [dataRetentionEnabled, setDataRetentionEnabled] = useState(false);
    
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
                const [profile, summary, txns] = await Promise.all([
                    getUserProfile(),
                    getUsageSummary(30),
                    getCreditTransactions(20)
                ]);
                setUserProfile(profile);
                setUsageSummary(summary);
                setTransactions(txns);
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
    const creditsBalance = userProfile?.creditsBalance || 0;
    const planType = userProfile?.planType || 'PAYG';
    const billingEmail = userProfile?.organizationEmail || user?.email || 'No email';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl space-y-10 mb-20">
            {/* Top Section: Balance & Chart */}
            <div>
                <h1 className="text-2xl font-bold text-textMain mb-6 flex items-center gap-2">
                    Billing & Add-ons
                </h1>
                
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-textMain">{planType}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-xs text-textMuted flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Current plan
                        </span>
                    </div>
                    <p className="text-sm text-textMuted mb-4">Credit Balance:</p>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-primary text-2xl font-bold">₹</span>
                        <span className="text-4xl font-bold text-textMain">{creditsBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors">
                            Buy More Credits
                        </button>
                        <button className="px-4 py-2 bg-surface border border-border text-textMain font-semibold rounded-lg text-sm hover:bg-surfaceHover transition-colors">
                            Apply Coupon
                        </button>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-textMain">Usage Costs</h3>
                            <p className="text-sm text-textMuted">Total LLM and AI costs incurred</p>
                        </div>
                        <div className="text-right">
                             <span className="text-2xl font-bold text-primary">₹{totalCost.toFixed(2)}</span>
                             <span className="text-sm text-textMuted ml-1">spent</span>
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
                                <YAxis 
                                    stroke="#6B7280" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(val) => `₹${val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1B1E23', border: '1px solid #2D3139', borderRadius: '8px' }}
                                    itemStyle={{ color: '#EBEBEB' }}
                                    formatter={(value: number) => [`₹${value.toFixed(4)}`, 'Cost']}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Area type="monotone" dataKey="cost" stroke="#2EC7B7" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
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
                    <div className="bg-surface border-2 border-primary/30 rounded-xl p-6 relative flex flex-col">
                        <h4 className="text-sm text-textMuted font-medium mb-1">Usage Based</h4>
                        <h3 className="text-2xl font-bold text-textMain mb-6">Pay as you go</h3>

                        <div className="space-y-4 mb-8 flex-1">
                            <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                                <span className="text-textMuted">Bundled minutes:</span>
                                <span className="text-textMain">-</span>
                            </div>
                            <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                                <span className="text-textMuted">Bundled minutes overage cost:</span>
                                <span className="text-textMain">-</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-textMuted">Concurrency included:</span>
                                <span className="text-textMain">10</span>
                            </div>
                        </div>
                        
                        <div className="text-center mt-auto pt-4">
                            <span className="text-primary font-medium text-sm">Current Plan</span>
                        </div>
                    </div>

                    {/* Enterprise Card */}
                    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col">
                         <h4 className="text-sm text-textMuted font-medium mb-1">Enterprise</h4>
                         <div className="flex items-end gap-2 mb-6">
                            <h3 className="text-2xl font-bold text-textMain">Custom</h3>
                            <span className="text-sm text-textMuted mb-1">/annual contract</span>
                         </div>

                         <div className="space-y-4 mb-8 flex-1">
                            <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                                <span className="text-textMuted">Bundled minutes:</span>
                                <span className="text-textMain">Starting at 600,000/year</span>
                            </div>
                            <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                                <span className="text-textMuted">Bundled minutes overage cost:</span>
                                <span className="text-textMain">Custom</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-textMuted">Concurrency included:</span>
                                <span className="text-textMain">Custom</span>
                            </div>
                        </div>

                        <button className="w-full bg-primary text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-primaryHover transition-colors mt-auto">
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
                                 <span className="text-sm text-textMuted">+ ₹1000/mo</span>
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
                             <span className="text-sm text-textMuted whitespace-nowrap min-w-[80px] text-right">+ ₹10/mo each</span>
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
                             <span className="text-sm text-textMuted">+ ₹1000/mo</span>
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
                                    <Edit2 size={14} />
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
                                        <Edit2 size={14} />
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
                    <div className="flex justify-between items-center p-6 border-b border-border">
                        <h3 className="text-lg font-semibold text-textMain">Credit Transaction History</h3>
                        <button className="flex items-center gap-2 text-xs font-medium text-textMain border border-border hover:bg-surfaceHover px-3 py-1.5 rounded-lg transition-colors">
                            <Download size={14} />
                            Download Monthly Statement
                        </button>
                    </div>
                    <div className="p-6">
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
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        tx.transactionType === 'purchase' ? 'bg-green-500/20 text-green-400' :
                                                        tx.transactionType === 'usage' ? 'bg-orange-500/20 text-orange-400' :
                                                        tx.transactionType === 'refund' ? 'bg-blue-500/20 text-blue-400' :
                                                        tx.transactionType === 'bonus' ? 'bg-purple-500/20 text-purple-400' :
                                                        'bg-primary/20 text-primary'
                                                    }`}>
                                                        {tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-textMain max-w-xs truncate">
                                                    {tx.description}
                                                </td>
                                                <td className={`py-3 px-2 text-right font-medium ${
                                                    tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {tx.amount >= 0 ? '+' : ''}₹{tx.amount.toFixed(4)}
                                                </td>
                                                <td className="py-3 px-2 text-right text-textMain">
                                                    ₹{tx.balanceAfter.toFixed(2)}
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

                {/* Usage by Model */}
                {usageSummary && usageSummary.byModel.length > 0 && (
                    <div className="bg-surface border border-border rounded-xl">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-semibold text-textMain">Usage by Model</h3>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Provider</th>
                                            <th className="text-left py-3 px-2 text-textMuted font-medium">Model</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Requests</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Tokens</th>
                                            <th className="text-right py-3 px-2 text-textMuted font-medium">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usageSummary.byModel.map((item, idx) => (
                                            <tr key={idx} className="border-b border-border/50 hover:bg-background/30">
                                                <td className="py-3 px-2 text-textMuted capitalize">{item.provider}</td>
                                                <td className="py-3 px-2 text-textMain font-mono text-xs">{item.model}</td>
                                                <td className="py-3 px-2 text-right text-textMain">{item.count.toLocaleString()}</td>
                                                <td className="py-3 px-2 text-right text-textMain">{item.tokens.toLocaleString()}</td>
                                                <td className="py-3 px-2 text-right text-primary font-medium">₹{item.cost.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
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
                        <p className="text-xs text-textMuted mb-4">Add-ons are charged to your Callyy credits on the first day of each month.</p>
                         <div className="text-center py-8 text-textMuted text-sm">
                             No data available
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingAndAddons;
