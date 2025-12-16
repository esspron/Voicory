import { MagnifyingGlass, Plus, CaretRight } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';

import { getCallLogs } from '../../services/voicoryService';
import { CallLog } from '../../types';

const AnalysisTab: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const logs = await getCallLogs();
                setCallLogs(logs);
            } catch (error) {
                console.error('Error fetching call logs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/20 text-emerald-400';
            case 'failed': return 'bg-red-500/20 text-red-400';
            case 'ongoing': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <div className="p-6 overflow-y-auto h-full">
            {/* Header */}
            <h2 className="text-2xl font-semibold text-textMain mb-6">Analysis</h2>

            {/* Search */}
            <div className="relative mb-4">
                <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} weight="bold" />
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {['Date After', 'Date Before', 'Call status', 'Duration'].map((filter) => (
                    <button
                        key={filter}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-white/10 rounded-xl text-sm text-textMuted hover:text-textMain hover:border-primary/30 transition-all"
                    >
                        <Plus size={14} weight="bold" />
                        {filter}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/5 text-sm font-medium text-textMuted">
                    <div>Date</div>
                    <div>Assistant</div>
                    <div>Duration</div>
                    <div>Status</div>
                    <div className="text-right">Cost</div>
                </div>

                {/* Table Body */}
                {loading ? (
                    <div className="p-8 text-center text-textMuted">Loading call logs...</div>
                ) : callLogs.length === 0 ? (
                    <div className="p-8 text-center text-textMuted">No conversations found</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {callLogs.map((log) => (
                            <div key={log.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <CaretRight size={16} weight="bold" className="text-textMuted" />
                                    <span className="text-sm text-textMain">{log.date}</span>
                                </div>
                                <div className="text-sm text-textMain">{log.assistantName}</div>
                                <div className="text-sm text-textMain font-mono">{log.duration}</div>
                                <div>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(log.status)}`}>
                                        {log.status === 'completed' ? 'Successful' : log.status === 'failed' ? 'Failed' : 'Ongoing'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm text-textMain font-mono">${log.cost.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


export default AnalysisTab;
