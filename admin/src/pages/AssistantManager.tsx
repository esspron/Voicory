import React, { useState, useEffect } from 'react';
import {
    Robot,
    MagnifyingGlass,
    ArrowsClockwise,
    Eye,
    Phone,
    ChatsCircle,
    CurrencyDollar,
    Brain,
    SpeakerHigh,
    CalendarBlank,
    Export,
    ToggleRight,
    ToggleLeft,
    User
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Modal, Avatar } from '../components/ui';
import type { AdminAssistant } from '../types/admin.types';

const AssistantManager: React.FC = () => {
    const [assistants, setAssistants] = useState<AdminAssistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalAssistants, setTotalAssistants] = useState(0);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedAssistant, setSelectedAssistant] = useState<AdminAssistant | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const limit = 20;

    useEffect(() => {
        fetchAssistants();
    }, [page, filterStatus, searchQuery]);

    const fetchAssistants = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('assistants')
                .select(`
                    *,
                    user_profiles!assistants_user_id_fkey(organization_email, organization_name),
                    voices(name)
                `, { count: 'exact' })
                .order('created_at', { ascending: false });

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            if (searchQuery) {
                query = query.ilike('name', `%${searchQuery}%`);
            }

            const { data, count, error } = await query
                .range((page - 1) * limit, page * limit - 1);

            if (error) throw error;

            // Fetch usage stats per assistant
            const assistantIds = data?.map(a => a.id) || [];
            const { data: usageData } = await supabase
                .from('usage_logs')
                .select('assistant_id, cost_inr')
                .in('assistant_id', assistantIds);

            const usageTotals = new Map<string, number>();
            usageData?.forEach(u => {
                const total = usageTotals.get(u.assistant_id) || 0;
                usageTotals.set(u.assistant_id, total + (Number(u.cost_inr) || 0));
            });

            const enrichedAssistants: AdminAssistant[] = data?.map(a => ({
                id: a.id,
                user_id: a.user_id,
                user_email: a.user_profiles?.organization_email || 'Unknown',
                name: a.name,
                model: a.model,
                llm_provider: a.llm_provider || 'openai',
                llm_model: a.llm_model || 'gpt-4o',
                status: a.status || 'active',
                total_calls: 0,
                total_messages: 0,
                total_cost: usageTotals.get(a.id) || 0,
                created_at: a.created_at,
                updated_at: a.updated_at,
            })) || [];

            setAssistants(enrichedAssistants);
            setTotalAssistants(count || 0);
        } catch (error) {
            console.error('Error fetching assistants:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'default'> = {
            active: 'success',
            inactive: 'default',
            draft: 'warning',
        };
        return (
            <Badge variant={variants[status] || 'default'}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const exportAssistants = () => {
        const csv = [
            ['Name', 'User Email', 'LLM Provider', 'Model', 'Status', 'Total Cost', 'Created At'].join(','),
            ...assistants.map(a => [
                `"${a.name}"`,
                a.user_email,
                a.llm_provider,
                a.llm_model,
                a.status,
                a.total_cost,
                a.created_at
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assistants_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const columns = [
        {
            key: 'name',
            header: 'Assistant',
            sortable: true,
            render: (value: string, row: AdminAssistant) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Robot size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-textMain">{value}</p>
                        <p className="text-xs text-textMuted">{row.user_email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'llm_provider',
            header: 'Provider',
            sortable: true,
            render: (value: string, row: AdminAssistant) => (
                <div>
                    <span className="text-textMain capitalize">{value}</span>
                    <p className="text-xs text-textMuted">{row.llm_model}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value: string) => getStatusBadge(value),
        },
        {
            key: 'total_cost',
            header: 'Total Cost',
            sortable: true,
            render: (value: number) => (
                <span className="text-amber-400 font-medium">
                    ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
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
        {
            key: 'actions',
            header: 'Actions',
            width: '80px',
            render: (_: any, row: AdminAssistant) => (
                <button
                    onClick={() => {
                        setSelectedAssistant(row);
                        setShowDetail(true);
                    }}
                    className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="View Details"
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                        <Robot size={28} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Assistant Manager</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Manage all {totalAssistants.toLocaleString()} assistants across users
                        </p>
                    </div>
                </div>
                <Button icon={<Export size={18} />} variant="secondary" onClick={exportAssistants}>
                    Export CSV
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Assistants"
                    value={totalAssistants.toLocaleString()}
                    icon={<Robot size={20} weight="bold" />}
                    color="primary"
                    loading={loading}
                />
                <StatsCard
                    title="Active"
                    value={assistants.filter(a => a.status === 'active').length.toString()}
                    icon={<ToggleRight size={20} weight="bold" />}
                    color="emerald"
                    loading={loading}
                />
                <StatsCard
                    title="Total Usage Cost"
                    value={`$${assistants.reduce((sum, a) => sum + a.total_cost, 0).toLocaleString()}`}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="amber"
                    loading={loading}
                />
                <StatsCard
                    title="Draft"
                    value={assistants.filter(a => a.status === 'draft').length.toString()}
                    icon={<ToggleLeft size={20} weight="bold" />}
                    color="violet"
                    loading={loading}
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search assistants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 text-sm"
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'active', 'inactive', 'draft'].map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setFilterStatus(status);
                                setPage(1);
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                filterStatus === status
                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                    : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                <button
                    onClick={fetchAssistants}
                    className="p-2.5 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={assistants}
                loading={loading}
                rowKey="id"
                pagination={{
                    page,
                    limit,
                    total: totalAssistants,
                    onPageChange: setPage,
                }}
                emptyMessage="No assistants found"
                emptyIcon={<Robot size={32} className="text-textMuted/50" />}
            />

            {/* Detail Modal */}
            <Modal
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                title={selectedAssistant?.name || 'Assistant Details'}
                subtitle={selectedAssistant?.user_email}
                icon={<Robot size={24} className="text-primary" />}
                size="lg"
            >
                {selectedAssistant && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Assistant ID</p>
                                <p className="text-sm font-mono text-textMain">{selectedAssistant.id}</p>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Status</p>
                                {getStatusBadge(selectedAssistant.status)}
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">LLM Provider</p>
                                <p className="text-sm text-textMain capitalize">{selectedAssistant.llm_provider}</p>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Model</p>
                                <code className="text-sm text-primary">{selectedAssistant.llm_model}</code>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Total Cost</p>
                                <p className="text-lg font-semibold text-amber-400">
                                    ${selectedAssistant.total_cost.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Created</p>
                                <p className="text-sm text-textMain">
                                    {new Date(selectedAssistant.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={16} className="text-textMuted" />
                                <p className="text-xs text-textMuted">Owner</p>
                            </div>
                            <p className="text-sm text-textMain">{selectedAssistant.user_email}</p>
                            <p className="text-xs text-textMuted font-mono mt-1">{selectedAssistant.user_id}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AssistantManager;
