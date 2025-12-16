import { DownloadSimple, Funnel, Play, DotsThree, PhoneCall, CheckCircle, XCircle, Clock, Waveform, ArrowsClockwise, Sparkle } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';

import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { getCallLogs } from '../services/voicoryService';
import type { CallLog } from '../types';

const CallLogs: React.FC = () => {
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const logs = await getCallLogs();
                setCallLogs(logs);
            } catch (error) {
                console.error('Error loading call logs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle size={14} weight="fill" className="text-emerald-500" />;
            case 'failed':
                return <XCircle size={14} weight="fill" className="text-red-500" />;
            default:
                return <Clock size={14} weight="fill" className="text-blue-400" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'failed':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            default:
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        }
    };

    // Skeleton loader for table rows
    const SkeletonRow = () => (
        <div className="grid grid-cols-12 gap-4 p-4 items-center animate-pulse">
            <div className="col-span-1">
                <div className="h-6 w-20 bg-surfaceHover rounded-full"></div>
            </div>
            <div className="col-span-3">
                <div className="h-4 w-32 bg-surfaceHover rounded"></div>
            </div>
            <div className="col-span-2">
                <div className="h-4 w-28 bg-surfaceHover rounded"></div>
            </div>
            <div className="col-span-2">
                <div className="h-4 w-24 bg-surfaceHover rounded"></div>
            </div>
            <div className="col-span-1">
                <div className="h-4 w-12 bg-surfaceHover rounded"></div>
            </div>
            <div className="col-span-1">
                <div className="h-4 w-14 bg-surfaceHover rounded"></div>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
                <div className="h-8 w-8 bg-surfaceHover rounded-lg"></div>
                <div className="h-8 w-8 bg-surfaceHover rounded-lg"></div>
            </div>
        </div>
    );

    return (
        <FadeIn className="p-8 max-w-7xl mx-auto relative">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                            <PhoneCall size={20} className="text-primary" weight="duotone" />
                        </div>
                        <h1 className="text-2xl font-bold text-textMain">Call Logs</h1>
                    </div>
                    <p className="text-textMuted text-sm mt-1 ml-[52px]">Detailed history of all inbound and outbound calls.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="glass" className="gap-2">
                        <Funnel size={16} weight="duotone" />
                        Filters
                    </Button>
                    <Button variant="glass" className="gap-2">
                        <DownloadSimple size={16} weight="duotone" />
                        Export CSV
                    </Button>
                    <Button
                        variant="glass"
                        size="icon"
                        onClick={() => window.location.reload()}
                    >
                        <ArrowsClockwise size={16} weight="bold" />
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/5 relative">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-semibold text-textMuted uppercase tracking-wider bg-background/50">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-3">Assistant</div>
                    <div className="col-span-2">Phone Number</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-1">Duration</div>
                    <div className="col-span-1">Cost</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border">
                    {loading ? (
                        <>
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </>
                    ) : callLogs.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                <PhoneCall size={40} className="text-primary" weight="duotone" />
                            </div>
                            <h3 className="text-xl font-semibold text-textMain mb-2">No call logs yet</h3>
                            <p className="text-sm text-textMuted mb-6 max-w-sm mx-auto">
                                Call logs will appear here once you start making calls with your AI assistants
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-primary">
                                <Sparkle size={14} weight="fill" />
                                <span>Ready to receive calls</span>
                            </div>
                        </div>
                    ) : (
                        callLogs.map(log => (
                            <div key={log.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-surfaceHover/50 transition-all duration-200 text-sm group">
                                <div className="col-span-1">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${getStatusStyle(log.status)}`}>
                                        {getStatusIcon(log.status)}
                                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center border border-primary/10">
                                            <Waveform size={14} className="text-primary" weight="bold" />
                                        </div>
                                        <span className="font-medium text-textMain">{log.assistantName}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 text-textMuted font-mono text-xs">
                                    {log.phoneNumber}
                                </div>
                                <div className="col-span-2 text-textMuted">
                                    {log.date}
                                </div>
                                <div className="col-span-1 text-textMain font-medium">
                                    {log.duration}
                                </div>
                                <div className="col-span-1">
                                    <span className="text-textMain font-medium">${log.cost.toFixed(2)}</span>
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Play Recording"
                                    >
                                        <Play size={16} weight="fill" />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm">
                                        <DotsThree size={18} weight="bold" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer with stats */}
                {!loading && callLogs.length > 0 && (
                    <div className="p-4 border-t border-border bg-background/30 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-6">
                            <span className="text-textMuted">
                                Showing <span className="text-textMain font-medium">{callLogs.length}</span> calls
                            </span>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                                    <span className="text-textMuted">{callLogs.filter(l => l.status === 'completed').length} completed</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <XCircle size={12} weight="fill" className="text-red-500" />
                                    <span className="text-textMuted">{callLogs.filter(l => l.status === 'failed').length} failed</span>
                                </span>
                            </div>
                        </div>
                        <div className="text-textMuted text-xs">
                            Total cost: <span className="text-textMain font-medium">${callLogs.reduce((acc, l) => acc + l.cost, 0).toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>
        </FadeIn>
    );
};

export default CallLogs;