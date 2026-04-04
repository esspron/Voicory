import {
    DownloadSimple, Funnel, Play, DotsThree, PhoneCall,
    CheckCircle, XCircle, Clock, Waveform, ArrowsClockwise, Sparkle,
    X, Article, MagnifyingGlass, Pause, CaretDown
} from '@phosphor-icons/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { getCallLogs, exportCallLogsCSV } from '../services/voicoryService';
import type { CallLog } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';

async function getAuthHeader(): Promise<Record<string, string>> {
    try {
        // Supabase session token
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
            const sb = createClient(supabaseUrl, supabaseAnonKey);
            const { data: { session } } = await sb.auth.getSession();
            if (session?.access_token) {
                return { Authorization: `Bearer ${session.access_token}` };
            }
        }
    } catch (_) { /* no-op */ }
    return {};
}

// Client-side CSV fallback
function generateCSV(logs: CallLog[]): void {
    const headers = ['Date', 'Phone', 'Direction', 'Duration', 'Status', 'Cost ($)', 'Transcript Summary'];
    const escape = (v: string | number | null | undefined) => {
        if (v == null) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
        return s;
    };
    const rows = logs.map(l => [
        escape(l.startedAt ? new Date(l.startedAt).toISOString() : l.date),
        escape(l.phoneNumber),
        escape(l.direction || 'inbound'),
        escape(l.duration),
        escape(l.status),
        escape(l.cost?.toFixed(4)),
        escape(l.transcript?.replace(/\r?\n/g, ' ').slice(0, 200) || ''),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Transcript Modal ────────────────────────────────────────────────────────

const TranscriptModal: React.FC<{ log: CallLog; onClose: () => void }> = ({ log, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Article size={16} className="text-primary" weight="duotone" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-textMain">Call Transcript</h2>
                            <p className="text-xs text-textMuted">{log.phoneNumber} · {log.date}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surfaceHover transition-colors text-textMuted hover:text-textMain"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Transcript Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {log.transcript ? (
                        <pre className="text-sm text-textMain whitespace-pre-wrap font-mono leading-relaxed">
                            {log.transcript}
                        </pre>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-textMuted">
                            <Article size={40} weight="duotone" className="mb-3 opacity-40" />
                            <p className="text-sm">No transcript available for this call.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Audio Player ─────────────────────────────────────────────────────────

const AudioPlayerBar: React.FC<{ src: string; callId: string; onClose: () => void }> = ({ src, callId, onClose }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => setDuration(audio.duration);
        const onEnded = () => setPlaying(false);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);
        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) { audio.pause(); setPlaying(false); }
        else { audio.play(); setPlaying(true); }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[340px]">
            <audio ref={audioRef} src={src} preload="metadata" />
            <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center bg-primary rounded-xl hover:bg-primary/90 transition-colors flex-shrink-0"
            >
                {playing
                    ? <Pause size={18} weight="fill" className="text-white" />
                    : <Play size={18} weight="fill" className="text-white" />
                }
            </button>
            <div className="flex-1">
                <div className="text-xs text-textMuted mb-1.5 truncate">Recording · {callId.slice(0, 8)}…</div>
                <div className="relative h-1.5 bg-surfaceHover rounded-full cursor-pointer" onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    if (audioRef.current) audioRef.current.currentTime = ratio * duration;
                }}>
                    <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-textMuted mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
            <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surfaceHover text-textMuted hover:text-textMain transition-colors flex-shrink-0"
            >
                <X size={14} />
            </button>
        </div>
    );
};

// ─── Filter Panel ─────────────────────────────────────────────────────────

const FilterPanel: React.FC<{
    search: string;
    statusFilter: string;
    onSearchChange: (v: string) => void;
    onStatusChange: (v: string) => void;
    onClose: () => void;
}> = ({ search, statusFilter, onSearchChange, onStatusChange, onClose }) => (
    <div className="bg-surface/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-xl mb-4">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-textMain">Filter Calls</h3>
            <button onClick={onClose} className="text-textMuted hover:text-textMain">
                <X size={14} />
            </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-textMuted mb-1.5 block">Search phone / assistant</label>
                <div className="relative">
                    <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="e.g. +1 555..."
                        className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs text-textMuted mb-1.5 block">Status</label>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={e => onStatusChange(e.target.value)}
                        className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 pr-8 text-sm text-textMain focus:outline-none focus:border-primary/50"
                    >
                        <option value="">All statuses</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="ongoing">Ongoing</option>
                    </select>
                    <CaretDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                </div>
            </div>
        </div>
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const CallLogs: React.FC = () => {
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Modals / player
    const [transcriptLog, setTranscriptLog] = useState<CallLog | null>(null);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [audioCallId, setAudioCallId] = useState<string | null>(null);
    const [loadingRecording, setLoadingRecording] = useState<string | null>(null);

    // Row action menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const logs = await getCallLogs();
            setCallLogs(logs);
        } catch (error) {
            console.error('Error loading call logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Filtered logs
    const filteredLogs = callLogs.filter(log => {
        const matchSearch = !search || (
            (log.phoneNumber || '').toLowerCase().includes(search.toLowerCase()) ||
            (log.assistantName || '').toLowerCase().includes(search.toLowerCase())
        );
        const matchStatus = !statusFilter || log.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // ── Export CSV ──────────────────────────────────────────────────────────
    const handleExportCSV = async () => {
        setExporting(true);
        try {
            await exportCallLogsCSV();
        } catch (_) {
            // Fallback to client-side CSV from current data
            generateCSV(filteredLogs);
        } finally {
            setExporting(false);
        }
    };

    // ── Play Recording ──────────────────────────────────────────────────────
    const handlePlayRecording = async (log: CallLog) => {
        setLoadingRecording(log.id);
        try {
            const headers = await getAuthHeader();
            const url = `${API_BASE}/api/calls/${log.id}/recording`;

            // Check if the endpoint responds (if no backend, fall back to recording_url)
            const resp = await fetch(url, { headers, method: 'HEAD' }).catch(() => null);
            if (resp && resp.ok) {
                // Use the proxied URL (will stream with auth)
                setAudioSrc(url + `?t=${Date.now()}`); // bust cache for new calls
                setAudioCallId(log.id);
            } else if (log.recordingUrl) {
                // Fallback: open direct recording URL in new tab
                window.open(log.recordingUrl, '_blank');
            } else {
                alert('No recording available for this call.');
            }
        } catch (err) {
            console.error('Failed to load recording:', err);
            if (log.recordingUrl) {
                window.open(log.recordingUrl, '_blank');
            } else {
                alert('Recording unavailable.');
            }
        } finally {
            setLoadingRecording(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} weight="fill" className="text-emerald-500" />;
            case 'failed': return <XCircle size={14} weight="fill" className="text-red-500" />;
            default: return <Clock size={14} weight="fill" className="text-blue-400" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        }
    };

    const SkeletonRow = () => (
        <div className="grid grid-cols-12 gap-4 p-4 items-center animate-pulse">
            <div className="col-span-1"><div className="h-6 w-20 bg-surfaceHover rounded-full" /></div>
            <div className="col-span-3"><div className="h-4 w-32 bg-surfaceHover rounded" /></div>
            <div className="col-span-2"><div className="h-4 w-28 bg-surfaceHover rounded" /></div>
            <div className="col-span-2"><div className="h-4 w-24 bg-surfaceHover rounded" /></div>
            <div className="col-span-1"><div className="h-4 w-12 bg-surfaceHover rounded" /></div>
            <div className="col-span-1"><div className="h-4 w-14 bg-surfaceHover rounded" /></div>
            <div className="col-span-2 flex justify-end gap-2">
                <div className="h-8 w-8 bg-surfaceHover rounded-lg" />
                <div className="h-8 w-8 bg-surfaceHover rounded-lg" />
            </div>
        </div>
    );

    return (
        <FadeIn className="p-8 max-w-7xl mx-auto relative">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                            <PhoneCall size={20} className="text-primary" weight="duotone" />
                        </div>
                        <h1 className="text-2xl font-bold text-textMain">Call Logs</h1>
                    </div>
                    <p className="text-textMuted text-sm mt-1 ml-[52px]">
                        Detailed history of all inbound and outbound calls.
                        {(search || statusFilter) && (
                            <span className="ml-2 text-primary font-medium">
                                ({filteredLogs.length} of {callLogs.length} shown)
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="glass"
                        className="gap-2"
                        onClick={() => setShowFilters(f => !f)}
                    >
                        <Funnel size={16} weight={showFilters ? 'fill' : 'duotone'} />
                        Filters
                        {(search || statusFilter) && (
                            <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                    </Button>
                    <Button
                        variant="glass"
                        className="gap-2"
                        onClick={handleExportCSV}
                        disabled={exporting || filteredLogs.length === 0}
                    >
                        <DownloadSimple size={16} weight="duotone" />
                        {exporting ? 'Exporting…' : 'Export CSV'}
                    </Button>
                    <Button variant="glass" size="icon" onClick={fetchData}>
                        <ArrowsClockwise size={16} weight="bold" className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <FilterPanel
                    search={search}
                    statusFilter={statusFilter}
                    onSearchChange={setSearch}
                    onStatusChange={setStatusFilter}
                    onClose={() => setShowFilters(false)}
                />
            )}

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
                        <>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                <PhoneCall size={40} className="text-primary" weight="duotone" />
                            </div>
                            <h3 className="text-xl font-semibold text-textMain mb-2">
                                {callLogs.length === 0 ? 'No call logs yet' : 'No matching calls'}
                            </h3>
                            <p className="text-sm text-textMuted mb-6 max-w-sm mx-auto">
                                {callLogs.length === 0
                                    ? 'Call logs will appear here once you start making calls with your AI assistants'
                                    : 'Try adjusting your filters to see more results.'}
                            </p>
                            {callLogs.length === 0 && (
                                <div className="flex items-center justify-center gap-2 text-xs text-primary">
                                    <Sparkle size={14} weight="fill" />
                                    <span>Ready to receive calls</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <div
                                key={log.id}
                                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-surfaceHover/50 transition-all duration-200 text-sm group relative"
                                onClick={() => openMenuId === log.id && setOpenMenuId(null)}
                            >
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
                                    <span className="text-textMain font-medium">${log.cost?.toFixed(2)}</span>
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-1">
                                    {/* Play Recording */}
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Play Recording"
                                        onClick={e => { e.stopPropagation(); handlePlayRecording(log); }}
                                        disabled={loadingRecording === log.id}
                                    >
                                        {loadingRecording === log.id
                                            ? <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
                                            : <Play size={16} weight="fill" />
                                        }
                                    </Button>

                                    {/* More actions dropdown */}
                                    <div className="relative">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            title="More actions"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setOpenMenuId(prev => prev === log.id ? null : log.id);
                                            }}
                                        >
                                            <DotsThree size={18} weight="bold" />
                                        </Button>
                                        {openMenuId === log.id && (
                                            <div
                                                className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-xl z-20 w-44 py-1 text-sm"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <button
                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surfaceHover text-textMain transition-colors"
                                                    onClick={() => { setTranscriptLog(log); setOpenMenuId(null); }}
                                                >
                                                    <Article size={14} weight="duotone" className="text-primary" />
                                                    View Transcript
                                                </button>
                                                <button
                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surfaceHover text-textMain transition-colors"
                                                    onClick={() => { handlePlayRecording(log); setOpenMenuId(null); }}
                                                >
                                                    <Play size={14} weight="fill" className="text-primary" />
                                                    Play Recording
                                                </button>
                                                <div className="border-t border-border my-1" />
                                                <button
                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surfaceHover text-textMain transition-colors"
                                                    onClick={() => { generateCSV([log]); setOpenMenuId(null); }}
                                                >
                                                    <DownloadSimple size={14} weight="duotone" className="text-primary" />
                                                    Export This Call
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                                Showing <span className="text-textMain font-medium">{filteredLogs.length}</span> calls
                            </span>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                                    <span className="text-textMuted">
                                        {filteredLogs.filter(l => l.status === 'completed').length} completed
                                    </span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <XCircle size={12} weight="fill" className="text-red-500" />
                                    <span className="text-textMuted">
                                        {filteredLogs.filter(l => l.status === 'failed').length} failed
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="text-textMuted text-xs">
                            Total cost: <span className="text-textMain font-medium">
                                ${filteredLogs.reduce((acc, l) => acc + (l.cost || 0), 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Transcript Modal */}
            {transcriptLog && (
                <TranscriptModal log={transcriptLog} onClose={() => setTranscriptLog(null)} />
            )}

            {/* Audio Player Bar */}
            {audioSrc && audioCallId && (
                <AudioPlayerBar
                    src={audioSrc}
                    callId={audioCallId}
                    onClose={() => { setAudioSrc(null); setAudioCallId(null); }}
                />
            )}
        </FadeIn>
    );
};

export default CallLogs;
