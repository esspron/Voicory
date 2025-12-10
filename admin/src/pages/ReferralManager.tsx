import React, { useState, useEffect } from 'react';
import {
    UsersThree,
    Gift,
    CurrencyDollar,
    ArrowsClockwise,
    Export,
    Copy,
    CheckCircle,
    Clock,
    Users,
    TrendUp,
    MagnifyingGlass,
    CalendarBlank
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Tabs, Avatar } from '../components/ui';
import type { ReferralCode, ReferralReward } from '../types/admin.types';

const ReferralManager: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('codes');
    const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
    const [referralRewards, setReferralRewards] = useState<ReferralReward[]>([]);
    const [totalCodes, setTotalCodes] = useState(0);
    const [totalRewards, setTotalRewards] = useState(0);
    const [totalRewardAmount, setTotalRewardAmount] = useState(0);
    const [page, setPage] = useState(1);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const limit = 20;

    useEffect(() => {
        fetchReferralData();
    }, [activeTab, page]);

    const fetchReferralData = async () => {
        try {
            setLoading(true);

            if (activeTab === 'codes') {
                // Fetch referral codes with user info
                const { data, count, error } = await supabase
                    .from('referral_codes')
                    .select(`
                        *,
                        user_profiles!referral_codes_user_id_fkey(organization_email)
                    `, { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range((page - 1) * limit, page * limit - 1);

                if (error) throw error;

                // Get referral counts per code
                const { data: rewardsData } = await supabase
                    .from('referral_rewards')
                    .select('referrer_id, reward_amount, status');

                const referralStats = new Map<string, { count: number; rewards: number }>();
                rewardsData?.forEach(r => {
                    const stats = referralStats.get(r.referrer_id) || { count: 0, rewards: 0 };
                    stats.count += 1;
                    if (r.status === 'completed') {
                        stats.rewards += Number(r.reward_amount) || 0;
                    }
                    referralStats.set(r.referrer_id, stats);
                });

                setReferralCodes(data?.map(c => ({
                    id: c.id,
                    user_id: c.user_id,
                    user_email: c.user_profiles?.organization_email || 'Unknown',
                    code: c.code,
                    custom_code: c.custom_code,
                    is_active: c.is_active,
                    total_referrals: referralStats.get(c.user_id)?.count || 0,
                    total_rewards: referralStats.get(c.user_id)?.rewards || 0,
                    created_at: c.created_at,
                })) || []);

                setTotalCodes(count || 0);
            } else {
                // Fetch referral rewards
                const { data, count, error } = await supabase
                    .from('referral_rewards')
                    .select(`
                        *,
                        referrer:user_profiles!referral_rewards_referrer_id_fkey(organization_email),
                        referred:user_profiles!referral_rewards_referred_id_fkey(organization_email)
                    `, { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range((page - 1) * limit, page * limit - 1);

                if (error) throw error;

                setReferralRewards(data?.map(r => ({
                    id: r.id,
                    referrer_id: r.referrer_id,
                    referrer_email: r.referrer?.organization_email || 'Unknown',
                    referred_id: r.referred_id,
                    referred_email: r.referred?.organization_email || 'Unknown',
                    reward_amount: Number(r.reward_amount) || 0,
                    reward_type: r.reward_type || 'credits',
                    status: r.status || 'pending',
                    qualifying_purchase_amount: Number(r.qualifying_purchase_amount),
                    completed_at: r.completed_at,
                    created_at: r.created_at,
                })) || []);

                setTotalRewards(count || 0);
            }

            // Fetch overall stats
            const { count: codesCount } = await supabase
                .from('referral_codes')
                .select('*', { count: 'exact', head: true });

            const { data: allRewards } = await supabase
                .from('referral_rewards')
                .select('reward_amount, status');

            const completedRewards = allRewards?.filter(r => r.status === 'completed') || [];
            const totalAmount = completedRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

            setTotalCodes(codesCount || 0);
            setTotalRewardAmount(totalAmount);

        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
            completed: 'success',
            pending: 'warning',
            cancelled: 'error',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const codeColumns = [
        {
            key: 'user_email',
            header: 'User',
            sortable: true,
            render: (value: string) => (
                <div className="flex items-center gap-3">
                    <Avatar email={value} size="md" />
                    <span className="text-textMain">{value}</span>
                </div>
            ),
        },
        {
            key: 'code',
            header: 'Code',
            render: (value: string, row: ReferralCode) => (
                <div className="flex items-center gap-2">
                    <code className="text-primary bg-primary/10 px-2 py-1 rounded font-mono">
                        {row.custom_code || value}
                    </code>
                    <button
                        onClick={() => copyCode(row.custom_code || value)}
                        className="p-1.5 text-textMuted hover:text-primary transition-colors"
                    >
                        {copiedCode === (row.custom_code || value) ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                        ) : (
                            <Copy size={16} />
                        )}
                    </button>
                </div>
            ),
        },
        {
            key: 'total_referrals',
            header: 'Referrals',
            sortable: true,
            render: (value: number) => (
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-violet-400" />
                    <span className="text-textMain font-medium">{value}</span>
                </div>
            ),
        },
        {
            key: 'total_rewards',
            header: 'Total Earned',
            sortable: true,
            render: (value: number) => (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CurrencyDollar size={14} />
                    {value.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (value: boolean) => (
                <Badge variant={value ? 'success' : 'default'}>
                    {value ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            sortable: true,
            render: (value: string) => (
                <span className="text-textMuted text-sm">
                    {new Date(value).toLocaleDateString()}
                </span>
            ),
        },
    ];

    const rewardColumns = [
        {
            key: 'referrer_email',
            header: 'Referrer',
            render: (value: string) => (
                <div className="flex items-center gap-3">
                    <Avatar email={value} size="sm" />
                    <span className="text-textMain text-sm">{value}</span>
                </div>
            ),
        },
        {
            key: 'referred_email',
            header: 'Referred User',
            render: (value: string) => (
                <div className="flex items-center gap-3">
                    <Avatar email={value} size="sm" />
                    <span className="text-textMain text-sm">{value}</span>
                </div>
            ),
        },
        {
            key: 'reward_amount',
            header: 'Reward',
            sortable: true,
            render: (value: number, row: ReferralReward) => (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CurrencyDollar size={14} />
                    {value.toLocaleString()}
                    <span className="text-textMuted text-xs">({row.reward_type})</span>
                </span>
            ),
        },
        {
            key: 'qualifying_purchase_amount',
            header: 'Qualifying Purchase',
            render: (value: number) => (
                value ? (
                    <span className="text-textMain">${value.toLocaleString()}</span>
                ) : (
                    <span className="text-textMuted">-</span>
                )
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value: string) => getStatusBadge(value),
        },
        {
            key: 'created_at',
            header: 'Date',
            sortable: true,
            render: (value: string) => (
                <span className="text-textMuted text-sm">
                    {new Date(value).toLocaleDateString()}
                </span>
            ),
        },
    ];

    const tabs = [
        { id: 'codes', label: 'Referral Codes', icon: <UsersThree size={18} /> },
        { id: 'rewards', label: 'Rewards', icon: <Gift size={18} />, count: totalRewards },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center border border-white/10">
                        <UsersThree size={28} weight="duotone" className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Referral Manager</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Track referral codes and rewards
                        </p>
                    </div>
                </div>
                <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={fetchReferralData}>
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Codes"
                    value={totalCodes.toLocaleString()}
                    icon={<UsersThree size={20} weight="bold" />}
                    color="violet"
                    loading={loading}
                />
                <StatsCard
                    title="Total Referrals"
                    value={referralCodes.reduce((sum, c) => sum + c.total_referrals, 0).toLocaleString()}
                    icon={<Users size={20} weight="bold" />}
                    color="blue"
                    loading={loading}
                />
                <StatsCard
                    title="Rewards Paid"
                    value={`$${totalRewardAmount.toLocaleString()}`}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="emerald"
                    loading={loading}
                />
                <StatsCard
                    title="Avg Reward"
                    value={`$${Math.round(totalRewardAmount / (totalRewards || 1)).toLocaleString()}`}
                    icon={<Gift size={20} weight="bold" />}
                    color="amber"
                    loading={loading}
                />
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setPage(1); }} />

            {/* Content */}
            {activeTab === 'codes' ? (
                <DataTable
                    columns={codeColumns}
                    data={referralCodes}
                    loading={loading}
                    rowKey="id"
                    searchable
                    searchPlaceholder="Search by email..."
                    pagination={{
                        page,
                        limit,
                        total: totalCodes,
                        onPageChange: setPage,
                    }}
                    emptyMessage="No referral codes found"
                    emptyIcon={<UsersThree size={32} className="text-textMuted/50" />}
                />
            ) : (
                <DataTable
                    columns={rewardColumns}
                    data={referralRewards}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        page,
                        limit,
                        total: totalRewards,
                        onPageChange: setPage,
                    }}
                    emptyMessage="No referral rewards found"
                    emptyIcon={<Gift size={32} className="text-textMuted/50" />}
                />
            )}
        </div>
    );
};

export default ReferralManager;
