import { useState, useMemo } from 'react';
import { 
    MagnifyingGlass,
    CaretDown,
    CaretUp,
    CaretUpDown,
    Phone,
    User,
    CheckCircle,
    XCircle,
    Clock,
    Warning,
    DotsThree
} from '@phosphor-icons/react';
import type { CampaignLead } from '../../types';
import { Badge } from '../ui/Badge';

interface LeadTableProps {
    leads: CampaignLead[];
    onLeadSelect: (lead: CampaignLead) => void;
    onBulkAction?: (action: string, leadIds: string[]) => void;
    selectedLeads?: string[];
    onSelectionChange?: (leadIds: string[]) => void;
    isLoading?: boolean;
}

type SortField = 'name' | 'phone' | 'status' | 'attempts' | 'lastCall';
type SortDirection = 'asc' | 'desc';

export function LeadTable({
    leads,
    onLeadSelect,
    onBulkAction,
    selectedLeads = [],
    onSelectionChange,
    isLoading = false
}: LeadTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Filter and sort leads
    const filteredLeads = useMemo(() => {
        return leads
            .filter(lead => {
                // Search filter
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = !searchTerm || 
                    (lead.firstName?.toLowerCase() || '').includes(searchLower) ||
                    (lead.lastName?.toLowerCase() || '').includes(searchLower) ||
                    lead.phoneNumber.includes(searchTerm) ||
                    (lead.email?.toLowerCase() || '').includes(searchLower) ||
                    (lead.company?.toLowerCase() || '').includes(searchLower);

                // Status filter
                const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                let comparison = 0;
                
                switch (sortField) {
                    case 'name':
                        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
                        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
                        comparison = nameA.localeCompare(nameB);
                        break;
                    case 'phone':
                        comparison = a.phoneNumber.localeCompare(b.phoneNumber);
                        break;
                    case 'status':
                        comparison = a.status.localeCompare(b.status);
                        break;
                    case 'attempts':
                        comparison = a.callAttempts - b.callAttempts;
                        break;
                    case 'lastCall':
                        const dateA = a.lastCallAt ? new Date(a.lastCallAt).getTime() : 0;
                        const dateB = b.lastCallAt ? new Date(b.lastCallAt).getTime() : 0;
                        comparison = dateA - dateB;
                        break;
                }
                
                return sortDirection === 'asc' ? comparison : -comparison;
            });
    }, [leads, searchTerm, statusFilter, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = () => {
        if (!onSelectionChange) return;
        
        if (selectedLeads.length === filteredLeads.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(filteredLeads.map(l => l.id));
        }
    };

    const handleSelectLead = (leadId: string) => {
        if (!onSelectionChange) return;
        
        if (selectedLeads.includes(leadId)) {
            onSelectionChange(selectedLeads.filter(id => id !== leadId));
        } else {
            onSelectionChange([...selectedLeads, leadId]);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle size={16} className="text-green-400" weight="fill" />;
            case 'calling':
                return <Phone size={16} className="text-primary animate-pulse" weight="fill" />;
            case 'pending':
                return <Clock size={16} className="text-textMuted" />;
            case 'callback':
                return <Clock size={16} className="text-yellow-400" />;
            case 'dnc':
                return <XCircle size={16} className="text-red-400" weight="fill" />;
            case 'failed':
                return <Warning size={16} className="text-red-400" />;
            default:
                return <Clock size={16} className="text-textMuted" />;
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'calling': return 'primary';
            case 'callback': return 'warning';
            case 'dnc': 
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <CaretUpDown size={14} className="text-textMuted" />;
        }
        return sortDirection === 'asc' 
            ? <CaretUp size={14} className="text-primary" /> 
            : <CaretDown size={14} className="text-primary" />;
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search leads..."
                        className="w-full pl-10 pr-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="calling">Calling</option>
                        <option value="completed">Completed</option>
                        <option value="callback">Callback</option>
                        <option value="failed">Failed</option>
                        <option value="dnc">DNC</option>
                    </select>

                    {/* Bulk Actions */}
                    {selectedLeads.length > 0 && onBulkAction && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-textMuted">{selectedLeads.length} selected</span>
                            <button
                                onClick={() => onBulkAction('skip', selectedLeads)}
                                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-textMuted hover:text-textMain transition-colors"
                            >
                                Skip
                            </button>
                            <button
                                onClick={() => onBulkAction('priority', selectedLeads)}
                                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-textMuted hover:text-textMain transition-colors"
                            >
                                Prioritize
                            </button>
                            <button
                                onClick={() => onBulkAction('dnc', selectedLeads)}
                                className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                            >
                                Add to DNC
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {onSelectionChange && (
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/20"
                                        />
                                    </th>
                                )}
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Name
                                        <SortIcon field="name" />
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('phone')}
                                >
                                    <div className="flex items-center gap-1">
                                        Phone
                                        <SortIcon field="phone" />
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center gap-1">
                                        Status
                                        <SortIcon field="status" />
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('attempts')}
                                >
                                    <div className="flex items-center gap-1">
                                        Attempts
                                        <SortIcon field="attempts" />
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider cursor-pointer hover:text-textMain"
                                    onClick={() => handleSort('lastCall')}
                                >
                                    <div className="flex items-center gap-1">
                                        Last Call
                                        <SortIcon field="lastCall" />
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                // Loading skeleton
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {onSelectionChange && <td className="px-4 py-3"><div className="h-4 w-4 bg-white/5 rounded" /></td>}
                                        <td className="px-4 py-3"><div className="h-4 w-32 bg-white/5 rounded" /></td>
                                        <td className="px-4 py-3"><div className="h-4 w-24 bg-white/5 rounded" /></td>
                                        <td className="px-4 py-3"><div className="h-6 w-16 bg-white/5 rounded-full" /></td>
                                        <td className="px-4 py-3"><div className="h-4 w-8 bg-white/5 rounded" /></td>
                                        <td className="px-4 py-3"><div className="h-4 w-24 bg-white/5 rounded" /></td>
                                        <td className="px-4 py-3"><div className="h-8 w-8 bg-white/5 rounded" /></td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={onSelectionChange ? 7 : 6}
                                        className="px-4 py-12 text-center text-textMuted"
                                    >
                                        <User size={48} className="mx-auto mb-4 opacity-30" />
                                        <p className="font-medium">No leads found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr 
                                        key={lead.id}
                                        className="hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => onLeadSelect(lead)}
                                    >
                                        {onSelectionChange && (
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.includes(lead.id)}
                                                    onChange={() => handleSelectLead(lead.id)}
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/20"
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-textMain">
                                                    {lead.firstName || lead.lastName 
                                                        ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
                                                        : 'Unknown'
                                                    }
                                                </p>
                                                {lead.company && (
                                                    <p className="text-xs text-textMuted">{lead.company}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-textMain">
                                            {lead.phoneNumber}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={getStatusBadgeVariant(lead.status) as 'default'}>
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(lead.status)}
                                                    {lead.status}
                                                </span>
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-textMain">
                                            {lead.callAttempts}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-textMuted">
                                            {lead.lastCallAt 
                                                ? new Date(lead.lastCallAt).toLocaleDateString()
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <button className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors">
                                                <DotsThree size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-textMuted">
                Showing {filteredLeads.length} of {leads.length} leads
            </div>
        </div>
    );
}

export default LeadTable;
