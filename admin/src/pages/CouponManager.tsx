import React, { useState, useEffect } from 'react';
import { 
    Ticket, 
    Plus, 
    MagnifyingGlass, 
    Copy, 
    Check, 
    Trash, 
    ToggleLeft, 
    ToggleRight,
    Users,
    Lightning,
    CalendarBlank,
    CurrencyDollar,
    ArrowsClockwise,
    Export,
    Sparkle,
    Gift
} from '@phosphor-icons/react';
import { BACKEND_URL } from '../services/supabase';

interface Coupon {
    id: string;
    code: string;
    coupon_type: 'discount' | 'signup_bonus' | 'referral' | 'promo';
    credit_amount: number;
    discount_percent: number;
    discount_amount: number;
    max_discount: number | null;
    min_purchase: number | null;
    max_uses: number | null;
    current_uses: number;
    valid_until: string;
    new_user_only: boolean;
    auto_apply_on_signup: boolean;
    is_active: boolean;
    description: string | null;
    created_at: string;
}

const CouponManager: React.FC = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Create single coupon form state
    const [createForm, setCreateForm] = useState({
        code: '',
        couponType: 'promo',
        creditAmount: 500,
        discountPercent: 0,
        maxUses: 100,
        validDays: 90,
        newUserOnly: false,
        description: ''
    });

    // Bulk generation form state
    const [bulkForm, setBulkForm] = useState({
        count: 10,
        creditAmount: 500,
        prefix: 'PROMO',
        validDays: 90,
        newUserOnly: false,
        maxUsesPerCoupon: 1,
        description: ''
    });

    const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/api/coupons`);
            const data = await response.json();
            
            if (response.ok) {
                setCoupons(data.coupons || []);
            } else {
                setError(data.error || 'Failed to fetch coupons');
            }
        } catch (err) {
            console.error('Fetch coupons error:', err);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const createCoupon = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/coupons/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: createForm.code,
                    couponType: createForm.couponType,
                    creditAmount: createForm.creditAmount,
                    discountPercent: createForm.discountPercent,
                    maxUses: createForm.maxUses,
                    validDays: createForm.validDays,
                    newUserOnly: createForm.newUserOnly,
                    description: createForm.description,
                    creatorId: 'admin' // Admin creator
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                setSuccess(`Coupon ${data.code} created successfully!`);
                setShowCreateModal(false);
                setCreateForm({
                    code: '',
                    couponType: 'promo',
                    creditAmount: 500,
                    discountPercent: 0,
                    maxUses: 100,
                    validDays: 90,
                    newUserOnly: false,
                    description: ''
                });
                fetchCoupons();
            } else {
                setError(data.error || 'Failed to create coupon');
            }
        } catch (err) {
            console.error('Create coupon error:', err);
            setError('Failed to connect to server');
        }
    };

    const generateBulkCoupons = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/coupons/generate-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creatorId: 'admin',
                    count: bulkForm.count,
                    creditAmount: bulkForm.creditAmount,
                    prefix: bulkForm.prefix,
                    validDays: bulkForm.validDays,
                    newUserOnly: bulkForm.newUserOnly,
                    maxUsesPerCoupon: bulkForm.maxUsesPerCoupon,
                    description: bulkForm.description
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                setGeneratedCodes(data.codes || []);
                setSuccess(`Generated ${data.count} coupon codes!`);
                fetchCoupons();
            } else {
                setError(data.error || 'Failed to generate coupons');
            }
        } catch (err) {
            console.error('Bulk generate error:', err);
            setError('Failed to connect to server');
        }
    };

    const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/coupons/${couponId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });

            if (response.ok) {
                fetchCoupons();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update coupon');
            }
        } catch (err) {
            console.error('Toggle status error:', err);
            setError('Failed to connect to server');
        }
    };

    const deleteCoupon = async (couponId: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/coupons/${couponId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setSuccess('Coupon deleted successfully');
                fetchCoupons();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to delete coupon');
            }
        } catch (err) {
            console.error('Delete coupon error:', err);
            setError('Failed to connect to server');
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const copyAllCodes = () => {
        navigator.clipboard.writeText(generatedCodes.join('\n'));
        setSuccess('All codes copied to clipboard!');
    };

    const exportCodes = () => {
        const blob = new Blob([generatedCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coupons_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredCoupons = coupons.filter(coupon => {
        const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            coupon.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || coupon.coupon_type === filterType;
        return matchesSearch && matchesType;
    });

    const getCouponTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            'signup_bonus': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            'promo': 'bg-primary/20 text-primary border-primary/30',
            'referral': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
            'discount': 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        };
        return styles[type] || styles['promo'];
    };

    // Clear messages after delay
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                        <Ticket size={28} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Coupon Manager</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Create and manage promotional codes & signup bonuses
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-4 py-2.5 bg-surface border border-white/10 text-textMain rounded-xl hover:bg-surfaceHover transition-all duration-200 flex items-center gap-2 text-sm font-medium"
                    >
                        <Lightning size={18} weight="bold" />
                        Bulk Generate
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                    >
                        <Plus size={18} weight="bold" />
                        Create Coupon
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                    {success}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-primary/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Total Coupons</p>
                        <p className="text-2xl font-bold text-textMain">{coupons.length}</p>
                    </div>
                </div>
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Active</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            {coupons.filter(c => c.is_active).length}
                        </p>
                    </div>
                </div>
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-violet-500/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Total Redemptions</p>
                        <p className="text-2xl font-bold text-violet-400">
                            {coupons.reduce((sum, c) => sum + c.current_uses, 0)}
                        </p>
                    </div>
                </div>
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Credits Given</p>
                        <p className="text-2xl font-bold text-amber-400">
                            ${coupons.reduce((sum, c) => sum + (c.credit_amount * c.current_uses), 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search coupons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm"
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'signup_bonus', 'promo', 'referral', 'discount'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                filterType === type
                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                    : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {type === 'all' ? 'All' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>

                <button
                    onClick={fetchCoupons}
                    className="p-2.5 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <ArrowsClockwise size={18} />
                </button>
            </div>

            {/* Coupons Table */}
            <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Code</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Type</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Value</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Usage</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Valid Until</th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Status</th>
                                <th className="text-right px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            <span className="text-textMuted">Loading coupons...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                                <Ticket size={32} weight="duotone" className="text-primary/50" />
                                            </div>
                                            <p className="text-textMuted">No coupons found</p>
                                            <button
                                                onClick={() => setShowCreateModal(true)}
                                                className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors"
                                            >
                                                Create your first coupon
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <code className="px-2.5 py-1 bg-surface rounded-lg text-sm font-mono text-textMain border border-white/10">
                                                    {coupon.code}
                                                </code>
                                                <button
                                                    onClick={() => copyCode(coupon.code)}
                                                    className="p-1.5 text-textMuted hover:text-primary transition-colors"
                                                    title="Copy code"
                                                >
                                                    {copiedCode === coupon.code ? (
                                                        <Check size={14} weight="bold" className="text-emerald-400" />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                            </div>
                                            {coupon.description && (
                                                <p className="text-xs text-textMuted mt-1 max-w-[200px] truncate">
                                                    {coupon.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCouponTypeBadge(coupon.coupon_type)}`}>
                                                {coupon.coupon_type === 'signup_bonus' && <Gift size={12} weight="fill" />}
                                                {coupon.coupon_type.replace('_', ' ')}
                                            </span>
                                            {coupon.new_user_only && (
                                                <span className="ml-2 text-[10px] text-amber-400/80">New users only</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {coupon.credit_amount > 0 ? (
                                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                                    <CurrencyDollar size={14} />
                                                    {coupon.credit_amount.toLocaleString()}
                                                </span>
                                            ) : coupon.discount_percent > 0 ? (
                                                <span className="text-amber-400 font-medium">
                                                    {coupon.discount_percent}% off
                                                </span>
                                            ) : (
                                                <span className="text-textMuted">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-textMuted" />
                                                <span className="text-textMain font-medium">{coupon.current_uses}</span>
                                                <span className="text-textMuted">/ {coupon.max_uses || '∞'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <CalendarBlank size={14} className="text-textMuted" />
                                                <span className={`text-sm ${new Date(coupon.valid_until) < new Date() ? 'text-red-400' : 'text-textMain'}`}>
                                                    {new Date(coupon.valid_until).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                                    coupon.is_active 
                                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                        : 'bg-surface text-textMuted hover:bg-white/10'
                                                }`}
                                            >
                                                {coupon.is_active ? (
                                                    <>
                                                        <ToggleRight size={16} weight="fill" />
                                                        Active
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft size={16} />
                                                        Inactive
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteCoupon(coupon.id)}
                                                className="p-2 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete coupon"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Single Coupon Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl" />
                        
                        <div className="relative p-6 border-b border-white/5">
                            <h2 className="text-xl font-semibold text-textMain">Create Coupon</h2>
                            <p className="text-textMuted text-sm mt-1">Create a new promotional code</p>
                        </div>

                        <div className="relative p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">Coupon Code</label>
                                <input
                                    type="text"
                                    value={createForm.code}
                                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g., SUMMER50"
                                    className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 font-mono uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Type</label>
                                    <select
                                        value={createForm.couponType}
                                        onChange={(e) => setCreateForm({ ...createForm, couponType: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                    >
                                        <option value="promo">Promo</option>
                                        <option value="signup_bonus">Signup Bonus</option>
                                        <option value="referral">Referral</option>
                                        <option value="discount">Discount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Credits ($)</label>
                                    <input
                                        type="number"
                                        value={createForm.creditAmount}
                                        onChange={(e) => setCreateForm({ ...createForm, creditAmount: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Max Uses</label>
                                    <input
                                        type="number"
                                        value={createForm.maxUses}
                                        onChange={(e) => setCreateForm({ ...createForm, maxUses: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Valid Days</label>
                                    <input
                                        type="number"
                                        value={createForm.validDays}
                                        onChange={(e) => setCreateForm({ ...createForm, validDays: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">Description</label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="e.g., Summer sale promotion"
                                    className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50"
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={createForm.newUserOnly}
                                    onChange={(e) => setCreateForm({ ...createForm, newUserOnly: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/20 bg-surface text-primary focus:ring-primary/50"
                                />
                                <span className="text-sm text-textMain">New users only</span>
                            </label>
                        </div>

                        <div className="relative p-6 border-t border-white/5 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2.5 text-textMuted hover:text-textMain transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createCoupon}
                                disabled={!createForm.code}
                                className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                Create Coupon
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Generate Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/10 blur-3xl" />
                        
                        <div className="relative p-6 border-b border-white/5">
                            <h2 className="text-xl font-semibold text-textMain flex items-center gap-2">
                                <Lightning size={22} weight="duotone" className="text-violet-400" />
                                Bulk Generate Coupons
                            </h2>
                            <p className="text-textMuted text-sm mt-1">Create multiple promo codes at once</p>
                        </div>

                        <div className="relative p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Number of Codes</label>
                                    <input
                                        type="number"
                                        value={bulkForm.count}
                                        onChange={(e) => setBulkForm({ ...bulkForm, count: Math.min(100, Number(e.target.value)) })}
                                        max={100}
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                    />
                                    <p className="text-xs text-textMuted mt-1">Max 100 per batch</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Prefix</label>
                                    <input
                                        type="text"
                                        value={bulkForm.prefix}
                                        onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })}
                                        placeholder="PROMO"
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50 uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Credits per Code ($)</label>
                                    <input
                                        type="number"
                                        value={bulkForm.creditAmount}
                                        onChange={(e) => setBulkForm({ ...bulkForm, creditAmount: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Max Uses per Code</label>
                                    <input
                                        type="number"
                                        value={bulkForm.maxUsesPerCoupon}
                                        onChange={(e) => setBulkForm({ ...bulkForm, maxUsesPerCoupon: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">Valid Days</label>
                                <input
                                    type="number"
                                    value={bulkForm.validDays}
                                    onChange={(e) => setBulkForm({ ...bulkForm, validDays: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">Description (optional)</label>
                                <input
                                    type="text"
                                    value={bulkForm.description}
                                    onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
                                    placeholder="e.g., Marketing campaign Q4"
                                    className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50"
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bulkForm.newUserOnly}
                                    onChange={(e) => setBulkForm({ ...bulkForm, newUserOnly: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/20 bg-surface text-primary focus:ring-primary/50"
                                />
                                <span className="text-sm text-textMain">New users only</span>
                            </label>

                            {/* Generated Codes Display */}
                            {generatedCodes.length > 0 && (
                                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                                            <Sparkle size={16} weight="fill" />
                                            Generated {generatedCodes.length} Codes
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={copyAllCodes}
                                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                                            >
                                                <Copy size={12} />
                                                Copy All
                                            </button>
                                            <button
                                                onClick={exportCodes}
                                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                                            >
                                                <Export size={12} />
                                                Export
                                            </button>
                                        </div>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                                        {generatedCodes.map((code, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-surface/50 rounded-lg">
                                                <code className="text-sm font-mono text-textMain">{code}</code>
                                                <button
                                                    onClick={() => copyCode(code)}
                                                    className="p-1 text-textMuted hover:text-primary transition-colors"
                                                >
                                                    {copiedCode === code ? (
                                                        <Check size={12} className="text-emerald-400" />
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative p-6 border-t border-white/5 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowBulkModal(false);
                                    setGeneratedCodes([]);
                                }}
                                className="px-4 py-2.5 text-textMuted hover:text-textMain transition-colors text-sm font-medium"
                            >
                                Close
                            </button>
                            <button
                                onClick={generateBulkCoupons}
                                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-violet-500/80 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200 text-sm flex items-center gap-2"
                            >
                                <Lightning size={18} weight="bold" />
                                Generate {bulkForm.count} Codes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponManager;
