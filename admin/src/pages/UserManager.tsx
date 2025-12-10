import React, { useState, useEffect } from 'react';
import { 
    Users, 
    MagnifyingGlass, 
    ArrowsClockwise,
    CurrencyDollar,
    EnvelopeSimple,
    CalendarBlank,
    CaretDown,
    CaretUp
} from '@phosphor-icons/react';
import { supabase, BACKEND_URL } from '../services/supabase';

interface User {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    balance?: number;
    total_spent?: number;
    assistants_count?: number;
}

const UserManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'created_at' | 'balance' | 'email'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch users with their billing info
            const { data: billingData, error: billingError } = await supabase
                .from('user_billing')
                .select('*');

            if (billingError) {
                console.error('Error fetching billing data:', billingError);
            }

            // Create a map of user balances
            const balanceMap = new Map<string, { balance: number; total_spent: number }>();
            billingData?.forEach(b => {
                balanceMap.set(b.user_id, {
                    balance: b.balance || 0,
                    total_spent: b.total_spent || 0
                });
            });

            // Fetch basic user info (this requires admin access or we use billing data user_ids)
            const userIds = billingData?.map(b => b.user_id) || [];
            
            // For now, create user entries from billing data
            const usersFromBilling: User[] = billingData?.map(b => ({
                id: b.user_id,
                email: b.email || 'Unknown',
                created_at: b.created_at,
                last_sign_in_at: null,
                balance: b.balance || 0,
                total_spent: b.total_spent || 0,
                assistants_count: 0
            })) || [];

            // Fetch assistants count per user
            const { data: assistantsData } = await supabase
                .from('assistants')
                .select('user_id');

            const assistantCounts = new Map<string, number>();
            assistantsData?.forEach(a => {
                const count = assistantCounts.get(a.user_id) || 0;
                assistantCounts.set(a.user_id, count + 1);
            });

            // Merge counts
            usersFromBilling.forEach(user => {
                user.assistants_count = assistantCounts.get(user.id) || 0;
            });

            setUsers(usersFromBilling);
        } catch (err) {
            console.error('Fetch users error:', err);
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column: 'created_at' | 'balance' | 'email') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const filteredUsers = users
        .filter(user => 
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'email':
                    comparison = a.email.localeCompare(b.email);
                    break;
                case 'balance':
                    comparison = (a.balance || 0) - (b.balance || 0);
                    break;
                case 'created_at':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return null;
        return sortOrder === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />;
    };

    const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
    const totalSpent = users.reduce((sum, u) => sum + (u.total_spent || 0), 0);

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
                            View and manage all registered users
                        </p>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-violet-500/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Total Users</p>
                        <p className="text-2xl font-bold text-textMain">{users.length}</p>
                    </div>
                </div>
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Total Balance</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            ${totalBalance.toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Total Spent</p>
                        <p className="text-2xl font-bold text-amber-400">
                            ${totalSpent.toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-primary/10 blur-2xl" />
                    <div className="relative">
                        <p className="text-textMuted text-xs font-medium mb-1">Avg Balance</p>
                        <p className="text-2xl font-bold text-primary">
                            ${users.length ? Math.round(totalBalance / users.length).toLocaleString() : 0}
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
                        placeholder="Search users by email or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm"
                    />
                </div>

                <button
                    onClick={fetchUsers}
                    className="p-2.5 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <ArrowsClockwise size={18} />
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th 
                                    className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('email')}
                                >
                                    <span className="flex items-center gap-1">
                                        Email <SortIcon column="email" />
                                    </span>
                                </th>
                                <th 
                                    className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('balance')}
                                >
                                    <span className="flex items-center gap-1">
                                        Balance <SortIcon column="balance" />
                                    </span>
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">
                                    Total Spent
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">
                                    Assistants
                                </th>
                                <th 
                                    className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('created_at')}
                                >
                                    <span className="flex items-center gap-1">
                                        Joined <SortIcon column="created_at" />
                                    </span>
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">
                                    User ID
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            <span className="text-textMuted">Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                                                <Users size={32} weight="duotone" className="text-violet-400/50" />
                                            </div>
                                            <p className="text-textMuted">No users found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <EnvelopeSimple size={16} className="text-textMuted" />
                                                <span className="text-textMain font-medium">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                                <CurrencyDollar size={14} />
                                                {(user.balance || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1 text-amber-400 font-medium">
                                                <CurrencyDollar size={14} />
                                                {(user.total_spent || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-textMain">{user.assistants_count || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <CalendarBlank size={14} className="text-textMuted" />
                                                <span className="text-textMain text-sm">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs text-textMuted font-mono">
                                                {user.id.slice(0, 8)}...
                                            </code>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManager;
