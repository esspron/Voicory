import React, { useState, useEffect } from 'react';
import {
    Gift,
    Link,
    Copy,
    Check,
    Users,
    CurrencyDollar,
    Clock,
    ChartLineUp,
    ShareNetwork,
    PencilSimple,
    X,
    Warning,
    ArrowSquareOut,
    Trophy,
    Sparkle,
    ShieldCheck,
    CurrencyInr
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import {
    getOrCreateReferralCode,
    getReferralStats,
    getReferralHistory,
    updateCustomReferralCode,
    removeCustomReferralCode,
    generateReferralUrl,
    copyReferralLink,
    ReferralCode,
    ReferralStats,
    ReferralHistoryItem,
    MINIMUM_REFERRAL_PURCHASE
} from '../../services/referralService';

const ReferralProgram: React.FC = () => {
    const { user } = useAuth();
    const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isEditingCode, setIsEditingCode] = useState(false);
    const [customCodeInput, setCustomCodeInput] = useState('');
    const [customCodeError, setCustomCodeError] = useState('');
    const [savingCode, setSavingCode] = useState(false);

    // Reward tiers configuration
    const rewardTiers = [
        { referrals: 1, reward: '₹100', description: 'First successful referral' },
        { referrals: 5, reward: '₹600', description: '5 successful referrals (₹100 + bonus)' },
        { referrals: 10, reward: '₹1,500', description: '10 successful referrals (₹100 + bonus)' },
        { referrals: 25, reward: '₹4,000', description: '25 successful referrals (₹100 + bonus)' },
    ];

    useEffect(() => {
        loadReferralData();
    }, []);

    const loadReferralData = async () => {
        setLoading(true);
        try {
            // Load all data in parallel
            const [codeData, statsData, historyData] = await Promise.all([
                getOrCreateReferralCode(),
                getReferralStats(),
                getReferralHistory()
            ]);

            setReferralCode(codeData);
            setStats(statsData);
            setHistory(historyData);
        } catch (error) {
            console.error('Error loading referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!referralCode) return;

        const success = await copyReferralLink(referralCode.code, stats?.customCode);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSaveCustomCode = async () => {
        if (!customCodeInput.trim()) {
            setCustomCodeError('Please enter a custom code');
            return;
        }

        setSavingCode(true);
        setCustomCodeError('');

        try {
            await updateCustomReferralCode(customCodeInput);
            await loadReferralData();
            setIsEditingCode(false);
            setCustomCodeInput('');
        } catch (error: any) {
            setCustomCodeError(error.message || 'Failed to update custom code');
        } finally {
            setSavingCode(false);
        }
    };

    const handleRemoveCustomCode = async () => {
        setSavingCode(true);
        try {
            await removeCustomReferralCode();
            await loadReferralData();
            setIsEditingCode(false);
        } catch (error) {
            console.error('Error removing custom code:', error);
        } finally {
            setSavingCode(false);
        }
    };

    const getStatusBadge = (status: ReferralHistoryItem['status']) => {
        switch (status) {
            case 'completed':
                return <Badge variant="success" size="pill">Completed</Badge>;
            case 'pending':
                return <Badge variant="warning" size="pill">Pending</Badge>;
            case 'expired':
                return <Badge variant="default" size="pill">Expired</Badge>;
            case 'cancelled':
                return <Badge variant="error" size="pill">Cancelled</Badge>;
            default:
                return null;
        }
    };

    const referralUrl = referralCode
        ? generateReferralUrl(referralCode.code, stats?.customCode)
        : '';

    const activeCode = stats?.customCode || referralCode?.code || '';

    if (loading) {
        return (
            <div className="max-w-5xl space-y-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-64 bg-surface rounded" />
                    <div className="h-48 bg-surface rounded-xl" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-surface rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-8 mb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-white/10">
                    <Gift size={24} weight="duotone" className="text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-textMain">Referral Program</h1>
                    <p className="text-sm text-textMuted">
                        Invite friends and earn rewards for each successful referral
                    </p>
                </div>
            </div>

            {/* Hero Card - Referral Link */}
            <div className="bg-gradient-to-br from-primary/15 via-surface/80 to-violet-500/5 border border-primary/20 rounded-2xl p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkle size={20} weight="fill" className="text-primary" />
                            <span className="text-primary font-semibold text-sm">Your Unique Referral Link</span>
                        </div>
                        <p className="text-textMuted text-sm mb-4">
                            Share this link with friends. When they sign up and top up ₹{MINIMUM_REFERRAL_PURCHASE} or more, you both earn ₹100 in credits!
                        </p>

                        {/* Referral Link Display */}
                        <div className="bg-background/50 border border-white/10 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-3">
                                <Link size={18} weight="bold" className="text-textMuted flex-shrink-0" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-textMain font-mono text-sm truncate">
                                        {referralUrl}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${copied
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-gradient-to-r from-primary to-primary/80 text-black hover:shadow-lg hover:shadow-primary/25'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check size={16} weight="bold" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} weight="bold" />
                                            Copy Link
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Referral Code */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-textMuted text-sm">Your Code:</span>
                                <span className="bg-surface px-3 py-1.5 rounded-lg font-mono text-primary font-bold text-lg tracking-wider">
                                    {activeCode}
                                </span>
                            </div>

                            {!isEditingCode ? (
                                <button
                                    onClick={() => {
                                        setIsEditingCode(true);
                                        setCustomCodeInput(stats?.customCode || '');
                                    }}
                                    className="flex items-center gap-1.5 text-sm text-textMuted hover:text-primary transition-colors"
                                >
                                    <PencilSimple size={14} weight="bold" />
                                    {stats?.customCode ? 'Edit Custom Code' : 'Create Custom Code'}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <input
                                        type="text"
                                        value={customCodeInput}
                                        onChange={(e) => {
                                            setCustomCodeInput(e.target.value.toUpperCase());
                                            setCustomCodeError('');
                                        }}
                                        placeholder="MYCODE123"
                                        maxLength={20}
                                        className="bg-background/50 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-mono text-textMain w-36 outline-none focus:border-primary/50 uppercase"
                                    />
                                    <button
                                        onClick={handleSaveCustomCode}
                                        disabled={savingCode}
                                        className="px-3 py-1.5 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primaryHover disabled:opacity-50 transition-colors"
                                    >
                                        {savingCode ? 'Saving...' : 'Save'}
                                    </button>
                                    {stats?.customCode && (
                                        <button
                                            onClick={handleRemoveCustomCode}
                                            disabled={savingCode}
                                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setIsEditingCode(false);
                                            setCustomCodeError('');
                                        }}
                                        className="p-1.5 text-textMuted hover:text-textMain transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        {customCodeError && (
                            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                <Warning size={12} weight="fill" />
                                {customCodeError}
                            </p>
                        )}
                    </div>

                    {/* Share Buttons */}
                    <div className="lg:border-l lg:border-border/50 lg:pl-6 flex flex-col gap-3">
                        <span className="text-textMuted text-xs font-medium uppercase tracking-wider">Share via</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join%20Callyy%20with%20my%20referral%20link%20and%20get%20free%20credits!&url=${encodeURIComponent(referralUrl)}`, '_blank')}
                                className="p-3 bg-surface hover:bg-surfaceHover rounded-xl transition-colors group"
                                title="Share on Twitter/X"
                            >
                                <svg className="w-5 h-5 text-textMuted group-hover:text-textMain" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`, '_blank')}
                                className="p-3 bg-surface hover:bg-surfaceHover rounded-xl transition-colors group"
                                title="Share on LinkedIn"
                            >
                                <svg className="w-5 h-5 text-textMuted group-hover:text-textMain" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => window.open(`https://wa.me/?text=Join%20Callyy%20with%20my%20referral%20link%20and%20get%20free%20credits!%20${encodeURIComponent(referralUrl)}`, '_blank')}
                                className="p-3 bg-surface hover:bg-surfaceHover rounded-xl transition-colors group"
                                title="Share on WhatsApp"
                            >
                                <svg className="w-5 h-5 text-textMuted group-hover:text-textMain" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => window.open(`mailto:?subject=Join%20Callyy%20-%20AI%20Voice%20Agents&body=Hey!%20I've%20been%20using%20Callyy%20for%20AI%20voice%20agents%20and%20thought%20you%27d%20like%20it%20too.%20Use%20my%20referral%20link%20to%20sign%20up%20and%20we%20both%20get%20credits!%0A%0A${encodeURIComponent(referralUrl)}`, '_blank')}
                                className="p-3 bg-surface hover:bg-surfaceHover rounded-xl transition-colors group"
                                title="Share via Email"
                            >
                                <svg className="w-5 h-5 text-textMuted group-hover:text-textMain" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users size={20} className="text-primary" />
                        </div>
                        <span className="text-textMuted text-sm">Total Referrals</span>
                    </div>
                    <p className="text-3xl font-bold text-textMain">{stats?.totalReferrals || 0}</p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Check size={20} className="text-emerald-400" />
                        </div>
                        <span className="text-textMuted text-sm">Completed</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{stats?.completedReferrals || 0}</p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <Clock size={20} className="text-yellow-400" />
                        </div>
                        <span className="text-textMuted text-sm">Pending</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-400">{stats?.pendingReferrals || 0}</p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <CurrencyDollar size={20} className="text-primary" />
                        </div>
                        <span className="text-textMuted text-sm">Total Earned</span>
                    </div>
                    <p className="text-3xl font-bold text-primary">₹{stats?.totalRewardsEarned || 0}</p>
                </div>
            </div>

            {/* How It Works */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-textMain mb-6 flex items-center gap-2">
                    <ChartLineUp size={20} weight="fill" className="text-primary" />
                    How It Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShareNetwork size={24} weight="duotone" className="text-primary" />
                        </div>
                        <h4 className="font-semibold text-textMain mb-2">1. Share Your Link</h4>
                        <p className="text-textMuted text-sm">
                            Copy your unique referral link and share it with friends, colleagues, or on social media.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={24} className="text-primary" />
                        </div>
                        <h4 className="font-semibold text-textMain mb-2">2. Friend Signs Up</h4>
                        <p className="text-textMuted text-sm">
                            When someone clicks your link and creates an account, they're linked to your referral code.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CurrencyInr size={24} weight="duotone" className="text-primary" />
                        </div>
                        <h4 className="font-semibold text-textMain mb-2">3. ₹{MINIMUM_REFERRAL_PURCHASE} Top-up</h4>
                        <p className="text-textMuted text-sm">
                            Your friend tops up their account with at least ₹{MINIMUM_REFERRAL_PURCHASE} to activate the referral.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Gift size={24} className="text-primary" />
                        </div>
                        <h4 className="font-semibold text-textMain mb-2">4. Both Earn Rewards</h4>
                        <p className="text-textMuted text-sm">
                            Once they top up, you both receive ₹100 in credits automatically!
                        </p>
                    </div>
                </div>

                {/* Fraud Prevention Notice */}
                <div className="mt-6 p-4 bg-background border border-border rounded-lg flex items-start gap-3">
                    <ShieldCheck size={20} className="text-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-textMain">Why ₹{MINIMUM_REFERRAL_PURCHASE} minimum?</p>
                        <p className="text-xs text-textMuted mt-1">
                            To ensure fair use and prevent abuse, referral rewards are activated only after a minimum top-up of ₹{MINIMUM_REFERRAL_PURCHASE}.
                            This ensures both parties are genuine users who will benefit from the platform.
                        </p>
                    </div>
                </div>
            </div>

            {/* Reward Tiers */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-textMain mb-6 flex items-center gap-2">
                    <Trophy size={20} weight="fill" className="text-primary" />
                    Reward Milestones
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rewardTiers.map((tier, index) => {
                        const isAchieved = (stats?.completedReferrals || 0) >= tier.referrals;
                        const isNext = !isAchieved && (index === 0 || (stats?.completedReferrals || 0) >= rewardTiers[index - 1].referrals);

                        return (
                            <div
                                key={tier.referrals}
                                className={`relative p-4 rounded-xl border transition-all ${isAchieved
                                        ? 'bg-primary/10 border-primary/30'
                                        : isNext
                                            ? 'bg-surface border-primary/50 ring-1 ring-primary/30'
                                            : 'bg-background border-border'
                                    }`}
                            >
                                {isAchieved && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                        <Check size={14} className="text-black" />
                                    </div>
                                )}
                                <div className="text-center">
                                    <p className={`text-2xl font-bold mb-1 ${isAchieved ? 'text-primary' : 'text-textMain'}`}>
                                        {tier.reward}
                                    </p>
                                    <p className="text-sm font-medium text-textMuted mb-2">
                                        {tier.referrals} {tier.referrals === 1 ? 'Referral' : 'Referrals'}
                                    </p>
                                    <p className="text-xs text-textMuted">
                                        {tier.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-textMuted mt-4 text-center">
                    * Bonus rewards are cumulative with per-referral rewards
                </p>
            </div>

            {/* Referral History */}
            <div className="bg-surface border border-border rounded-xl">
                <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-semibold text-textMain">Referral History</h3>
                    <p className="text-sm text-textMuted mt-1">Track the status of all your referrals</p>
                </div>

                {history.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users size={48} className="mx-auto text-textMuted/30 mb-4" />
                        <p className="text-textMuted mb-2">No referrals yet</p>
                        <p className="text-sm text-textMuted/70">
                            Share your referral link to start earning rewards!
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left text-xs font-medium text-textMuted uppercase tracking-wider px-6 py-3">
                                        Referred User
                                    </th>
                                    <th className="text-left text-xs font-medium text-textMuted uppercase tracking-wider px-6 py-3">
                                        Status
                                    </th>
                                    <th className="text-left text-xs font-medium text-textMuted uppercase tracking-wider px-6 py-3">
                                        Reward
                                    </th>
                                    <th className="text-left text-xs font-medium text-textMuted uppercase tracking-wider px-6 py-3">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-surfaceHover transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-textMain text-sm">{item.referredEmail}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-medium ${item.status === 'completed' ? 'text-primary' : 'text-textMuted'}`}>
                                                ₹{item.rewardAmount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-textMuted text-sm">
                                                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Terms */}
            <div className="bg-background border border-border rounded-xl p-6">
                <h4 className="text-sm font-semibold text-textMain mb-3">Referral Program Terms</h4>
                <ul className="text-xs text-textMuted space-y-2 list-disc list-inside">
                    <li><strong>Minimum top-up requirement:</strong> Referral rewards are credited only after the referred user tops up at least ₹{MINIMUM_REFERRAL_PURCHASE}.</li>
                    <li>Both the referrer and the referred user receive ₹100 in credits upon successful referral completion.</li>
                    <li>Referral links are valid for 30 days from the time the referred user first clicks the link.</li>
                    <li>Self-referrals or fraudulent referrals will result in account suspension and forfeiture of rewards.</li>
                    <li>Credits cannot be withdrawn as cash and must be used for Callyy services.</li>
                    <li>Multiple accounts from the same device/IP are subject to fraud review.</li>
                    <li>Callyy reserves the right to modify or terminate the referral program at any time.</li>
                </ul>
            </div>
        </div>
    );
};

export default ReferralProgram;
