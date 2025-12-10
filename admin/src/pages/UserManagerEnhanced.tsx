import React, { useState, useEffect } from 'react';
import { 
    Users, 
    MagnifyingGlass, 
    ArrowsClockwise,
    CurrencyDollar,
    EnvelopeSimple,
    CalendarBlank,
    CaretDown,
    CaretUp,
    Eye,
    PencilSimple,
    Prohibit,
    CreditCard,
    Export,
    Plus,
    Minus,
    Robot,
    Phone,
    ChatsCircle,
    Warning,
    CheckCircle,
    X,
    ArrowRight
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, Modal, Badge, Button, Input, Select, Avatar, Tabs, StatsCard } from '../components/ui';
import type { AdminUser } from '../types/admin.types';

const UserManagerEnhanced: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    
    // Modals
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [showUserDetail, setShowUserDetail] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditAmount, setCreditAmount] = useState<number>(0);
    const [creditNote, setCreditNote] = useState('');
    const [creditAction, setCreditAction] = useState<'add' | 'deduct'>('add');

    const limit = 20;

    useEffect(() => {
        fetchUsers();
    }, [page, filterPlan, filterStatus, searchQuery]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch user profiles with related data
            let query = supabase
                .from('user_profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (filterPlan !== 'all') {
                query = query.eq('plan_type', filterPlan);
            }

            if (searchQuery) {
                query = query.or(`organization_email.ilike.%${searchQuery}%,organization_name.ilike.%${searchQuery}%`);
            }

            const { data: profiles, count, error: profileError } = await query
                .range((page - 1) * limit, page * limit - 1);

            if (profileError) throw profileError;

            // Fetch assistants count per user
            const userIds = profiles?.map(p => p.user_id) || [];
            const { data: assistantsData } = await supabase
                .from('assistants')
                .select('user_id')
                .in('user_id', userIds);

            const assistantCounts = new Map<string, number>();
            assistantsData?.forEach(a => {
                const count = assistantCounts.get(a.user_id) || 0;
                assistantCounts.set(a.user_id, count + 1);
            });

            // Fetch phone numbers count per user
            const { data: phoneData } = await supabase
                .from('phone_numbers')
                .select('user_id')
                .in('user_id', userIds);

            const phoneCounts = new Map<string, number>();
            phoneData?.forEach(p => {
                const count = phoneCounts.get(p.user_id) || 0;
                phoneCounts.set(p.user_id, count + 1);
            });

            // Fetch usage stats per user
            const { data: usageData } = await supabase
                .from('usage_logs')
                .select('user_id, cost_inr')
                .in('user_id', userIds);

            const usageTotals = new Map<string, number>();
            usageData?.forEach(u => {
                const total = usageTotals.get(u.user_id) || 0;
                usageTotals.set(u.user_id, total + (Number(u.cost_inr) || 0));
            });

            const enrichedUsers: AdminUser[] = profiles?.map(p => ({
                id: p.user_id,
                email: p.organization_email || 'Unknown',
                created_at: p.created_at,
                last_sign_in_at: null,
                organization_name: p.organization_name,
                plan_type: p.plan_type || 'PAYG',
                credits_balance: Number(p.credits_balance) || 0,
                total_spent: usageTotals.get(p.user_id) || 0,
                total_calls: 0,
                total_messages: 0,
                assistants_count: assistantCounts.get(p.user_id) || 0,
                phone_numbers_count: phoneCounts.get(p.user_id) || 0,
                status: 'active',
                country: p.country,
                currency: p.currency,
            })) || [];

            setUsers(enrichedUsers);
            setTotalUsers(count || 0);
        } catch (err) {
            console.error('Fetch users error:', err);
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreditAdjustment = async () => {
        if (!selectedUser || creditAmount <= 0) return;

        try {
            const finalAmount = creditAction === 'add' ? creditAmount : -creditAmount;
            
            // Update user balance
            const { data: currentProfile } = await supabase
                .from('user_profiles')
                .select('credits_balance')
                .eq('user_id', selectedUser.id)
                .single();

            const currentBalance = Number(currentProfile?.credits_balance) || 0;
            const newBalance = currentBalance + finalAmount;

            if (newBalance < 0) {
                setError('Cannot deduct more than current balance');
                return;
            }

            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ credits_balance: newBalance })
                .eq('user_id', selectedUser.id);

            if (updateError) throw updateError;

            // Log the transaction
            await supabase.from('credit_transactions').insert({
                user_id: selectedUser.id,
                transaction_type: creditAction === 'add' ? 'bonus' : 'usage',
                amount: finalAmount,
                balance_before: currentBalance,
                balance_after: newBalance,
                description: creditNote || `Admin ${creditAction}: $${creditAmount}`,
            });

            setSuccess(`Successfully ${creditAction === 'add' ? 'added' : 'deducted'} $${creditAmount} ${creditAction === 'add' ? 'to' : 'from'} ${selectedUser.email}`);
            setShowCreditModal(false);
            setCreditAmount(0);
            setCreditNote('');
            fetchUsers();
        } catch (err) {
            console.error('Credit adjustment error:', err);
            setError('Failed to adjust credits');
        }
    };

    const exportUsers = () => {
        const csv = [
            ['Email', 'Organization', 'Plan', 'Balance', 'Total Spent', 'Assistants', 'Phone Numbers', 'Country', 'Created At'].join(','),
            ...users.map(u => [
                u.email,
                u.organization_name || '',
                u.plan_type,
                u.credits_balance,
                u.total_spent,
                u.assistants_count,
                u.phone_numbers_count,
                u.country || '',
                u.created_at
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getPlanBadge = (plan: string) => {
        const variants: Record<string, 'default' | 'success' | 'warning' | 'primary' | 'info'> = {
            'PAYG': 'default',
            'Starter': 'info',
            'Pro': 'primary',
            'Enterprise': 'success',
        };
        return <Badge variant={variants[plan] || 'default'}>{plan}</Badge>;
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

    const columns = [
        {
            key: 'email',
            header: 'User',
            sortable: true,
            render: (value: string, row: AdminUser) => (
                <div className="flex items-center gap-3">
                    <Avatar email={row.email} name={row.organization_name} size="md" />
                    <div>
                        <p className="font-medium text-textMain">{row.organization_name || row.email}</p>
                        <p className="text-xs text-textMuted">{row.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'plan_type',
            header: 'Plan',
            sortable: true,
            render: (value: string) => getPlanBadge(value),
        },
        {
            key: 'credits_balance',
            header: 'Balance',
            sortable: true,
            render: (value: number) => (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CurrencyDollar size={14} />
                    {value.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'total_spent',
            header: 'Total Spent',
            sortable: true,
            render: (value: number) => (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <CurrencyDollar size={14} />
                    {value.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'assistants_count',
            header: 'Assistants',
            sortable: true,
            render: (value: number) => (
                <span className="flex items-center gap-1 text-textMain">
                    <Robot size={14} className="text-textMuted" />
                    {value}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: 'Joined',
            sortable: true,
            render: (value: string) => (
                <span className="text-textMuted text-sm">
                    {new Date(value).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            width: '120px',
            render: (_: any, row: AdminUser) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(row);
                            setShowUserDetail(true);
                        }}
                        className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="View Details"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(row);
                            setShowCreditModal(true);
                        }}
                        className="p-2 text-textMuted hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                        title="Adjust Credits"
                    >
                        <CreditCard size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center border border-white/10">
                        <Users size={28} weight="duotone" className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">User Manager</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Manage all {totalUsers.toLocaleString()} registered users
                        </p>
                    </div>
                </div>
                <Button icon={<Export size={18} />} variant="secondary" onClick={exportUsers}>
                    Export CSV
                </Button>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <Warning size={18} />
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Users"
                    value={totalUsers.toLocaleString()}
                    icon={<Users size={20} weight="bold" />}
                    color="violet"
                />
                <StatsCard
                    title="Total Balance"
                    value={`$${users.reduce((sum, u) => sum + u.credits_balance, 0).toLocaleString()}`}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="emerald"
                />
                <StatsCard
                    title="Total Spent"
                    value={`$${users.reduce((sum, u) => sum + u.total_spent, 0).toLocaleString()}`}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="amber"
                />
                <StatsCard
                    title="Avg Balance"
                    value={`$${users.length ? Math.round(users.reduce((sum, u) => sum + u.credits_balance, 0) / users.length).toLocaleString() : 0}`}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="primary"
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search by email or organization..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 text-sm"
                    />
                </div>

                <Select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Plans' },
                        { value: 'PAYG', label: 'PAYG' },
                        { value: 'Starter', label: 'Starter' },
                        { value: 'Pro', label: 'Pro' },
                        { value: 'Enterprise', label: 'Enterprise' },
                    ]}
                />

                <button
                    onClick={fetchUsers}
                    className="p-2.5 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Users Table */}
            <DataTable
                columns={columns}
                data={users}
                loading={loading}
                rowKey="id"
                pagination={{
                    page,
                    limit,
                    total: totalUsers,
                    onPageChange: setPage,
                }}
                emptyMessage="No users found"
                emptyIcon={<Users size={32} className="text-textMuted/50" />}
            />

            {/* User Detail Modal */}
            <Modal
                isOpen={showUserDetail}
                onClose={() => setShowUserDetail(false)}
                title={selectedUser?.organization_name || selectedUser?.email || 'User Details'}
                subtitle={selectedUser?.email}
                icon={<Users size={24} className="text-violet-400" />}
                glowColor="violet"
                size="lg"
            >
                {selectedUser && (
                    <div className="space-y-6">
                        {/* User Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">User ID</p>
                                <p className="text-sm font-mono text-textMain">{selectedUser.id}</p>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Plan</p>
                                {getPlanBadge(selectedUser.plan_type)}
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Credits Balance</p>
                                <p className="text-lg font-semibold text-emerald-400">${selectedUser.credits_balance.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Total Spent</p>
                                <p className="text-lg font-semibold text-amber-400">${selectedUser.total_spent.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Country</p>
                                <p className="text-sm text-textMain">{selectedUser.country || 'Not set'}</p>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Joined</p>
                                <p className="text-sm text-textMain">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                                <Robot size={24} className="text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedUser.assistants_count}</p>
                                <p className="text-xs text-textMuted">Assistants</p>
                            </div>
                            <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20 text-center">
                                <Phone size={24} className="text-violet-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedUser.phone_numbers_count}</p>
                                <p className="text-xs text-textMuted">Phone Numbers</p>
                            </div>
                            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                                <ChatsCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedUser.total_messages}</p>
                                <p className="text-xs text-textMuted">Messages</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="primary"
                                icon={<CreditCard size={18} />}
                                onClick={() => {
                                    setShowUserDetail(false);
                                    setShowCreditModal(true);
                                }}
                            >
                                Adjust Credits
                            </Button>
                            <Button variant="secondary" icon={<Eye size={18} />}>
                                View Activity
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Credit Adjustment Modal */}
            <Modal
                isOpen={showCreditModal}
                onClose={() => {
                    setShowCreditModal(false);
                    setCreditAmount(0);
                    setCreditNote('');
                }}
                title="Adjust Credits"
                subtitle={selectedUser?.email}
                icon={<CreditCard size={24} className="text-emerald-400" />}
                glowColor="emerald"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowCreditModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={creditAction === 'add' ? 'primary' : 'danger'}
                            onClick={handleCreditAdjustment}
                            disabled={creditAmount <= 0}
                            icon={creditAction === 'add' ? <Plus size={18} /> : <Minus size={18} />}
                        >
                            {creditAction === 'add' ? 'Add Credits' : 'Deduct Credits'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-surface rounded-xl border border-white/10">
                        <p className="text-sm text-textMuted mb-1">Current Balance</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            ${(selectedUser?.credits_balance || 0).toLocaleString()}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setCreditAction('add')}
                            className={`flex-1 p-3 rounded-xl border transition-all ${
                                creditAction === 'add'
                                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                    : 'bg-surface border-white/10 text-textMuted hover:border-white/20'
                            }`}
                        >
                            <Plus size={20} className="mx-auto mb-1" />
                            <p className="text-sm font-medium">Add</p>
                        </button>
                        <button
                            onClick={() => setCreditAction('deduct')}
                            className={`flex-1 p-3 rounded-xl border transition-all ${
                                creditAction === 'deduct'
                                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                                    : 'bg-surface border-white/10 text-textMuted hover:border-white/20'
                            }`}
                        >
                            <Minus size={20} className="mx-auto mb-1" />
                            <p className="text-sm font-medium">Deduct</p>
                        </button>
                    </div>

                    <Input
                        label="Amount ($)"
                        type="number"
                        value={creditAmount || ''}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        placeholder="Enter amount"
                        icon={<CurrencyDollar size={18} />}
                    />

                    <Input
                        label="Note (optional)"
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        placeholder="Reason for adjustment"
                    />

                    {creditAmount > 0 && (
                        <div className="p-4 bg-white/5 rounded-xl">
                            <p className="text-sm text-textMuted">New Balance</p>
                            <p className={`text-xl font-bold ${creditAction === 'add' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ${((selectedUser?.credits_balance || 0) + (creditAction === 'add' ? creditAmount : -creditAmount)).toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default UserManagerEnhanced;
