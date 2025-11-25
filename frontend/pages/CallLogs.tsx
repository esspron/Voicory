import React, { useState, useEffect } from 'react';
import { Download, Filter, PlayCircle, MoreHorizontal, PhoneCall } from 'lucide-react';
import { getCallLogs } from '../services/callyyService';
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

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">Call Logs</h1>
                    <p className="text-textMuted text-sm mt-1">Detailed history of all inbound and outbound calls.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain hover:bg-surfaceHover transition-colors">
                        <Filter size={16} />
                        Filters
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain hover:bg-surfaceHover transition-colors">
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
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
                        <div className="p-12 text-center text-textMuted">
                            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                            Loading call logs...
                        </div>
                    ) : callLogs.length === 0 ? (
                        <div className="p-12 text-center">
                            <PhoneCall size={48} className="mx-auto mb-4 text-textMuted opacity-50" />
                            <h3 className="text-lg font-semibold text-textMain mb-2">No call logs yet</h3>
                            <p className="text-sm text-textMuted">Call logs will appear here once you start making calls</p>
                        </div>
                    ) : (
                        callLogs.map(log => (
                            <div key={log.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-surfaceHover transition-colors text-sm">
                                <div className="col-span-1">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                        log.status === 'completed' 
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                        : log.status === 'failed'
                                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                    </div>
                                </div>
                                <div className="col-span-3 font-medium text-textMain">
                                    {log.assistantName}
                                </div>
                                <div className="col-span-2 text-textMuted font-mono text-xs">
                                    {log.phoneNumber}
                                </div>
                                <div className="col-span-2 text-textMuted">
                                    {log.date}
                                </div>
                                <div className="col-span-1 text-textMain">
                                    {log.duration}
                                </div>
                                <div className="col-span-1 text-textMain">
                                    ₹{log.cost.toFixed(2)}
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-2">
                                    <button className="p-1.5 hover:bg-background rounded text-textMuted hover:text-primary transition-colors" title="Play Recording">
                                        <PlayCircle size={18} />
                                    </button>
                                    <button className="p-1.5 hover:bg-background rounded text-textMuted hover:text-textMain transition-colors">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallLogs;