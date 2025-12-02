import React, { useState, useEffect } from 'react';
import { Eye, EyeSlash, Copy, Plus, Trash, Key, ShieldCheck, Globe, CircleNotch, Sparkle } from '@phosphor-icons/react';
import { getApiKeys } from '../services/voicoryService';
import { Button } from '../components/ui/Button';
import type { ApiKey } from '../types';

const ApiKeys: React.FC = () => {
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getApiKeys();
                setApiKeys(data);
            } catch (error) {
                console.error('Error loading API keys:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleVisibility = (id: string) => {
        setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // In a real app, show a toast here
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <div className="p-5 flex items-center justify-between animate-pulse">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-4 w-32 bg-surfaceHover rounded"></div>
                    <div className="h-5 w-20 bg-surfaceHover rounded-full"></div>
                </div>
                <div className="h-3 w-64 bg-surfaceHover rounded"></div>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-surfaceHover rounded"></div>
                <div className="h-8 w-8 bg-surfaceHover rounded"></div>
                <div className="h-8 w-8 bg-surfaceHover rounded"></div>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto relative">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                            <Key size={20} className="text-primary" weight="duotone" />
                        </div>
                        <h1 className="text-2xl font-bold text-textMain">API Keys</h1>
                    </div>
                    <p className="text-textMuted text-sm mt-1 ml-[52px]">Manage your public and private keys for API access.</p>
                </div>
                <Button className="gap-2">
                    <Plus size={18} weight="bold" />
                    Create New Key
                </Button>
            </div>

            {/* Private Keys Section */}
            <div className="space-y-8 relative">
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck size={20} className="text-purple-400" weight="duotone" />
                        <h2 className="text-lg font-semibold text-textMain">Private API Keys</h2>
                    </div>
                    <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/5">
                        <div className="divide-y divide-border">
                            {loading ? (
                                <>
                                    <SkeletonRow />
                                    <SkeletonRow />
                                </>
                            ) : apiKeys.filter(k => k.type === 'private').length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <ShieldCheck size={32} className="text-purple-400" weight="duotone" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-textMain mb-2">No private keys yet</h3>
                                    <p className="text-sm text-textMuted">Create a private key for server-side API access</p>
                                </div>
                            ) : apiKeys.filter(k => k.type === 'private').map(key => (
                                <div key={key.id} className="p-5 flex items-center justify-between hover:bg-surfaceHover/50 transition-all duration-200 group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-medium text-textMain">{key.label}</span>
                                            <span className="text-xs bg-gradient-to-r from-purple-500/20 to-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-medium">
                                                Server-side
                                            </span>
                                        </div>
                                        <div className="font-mono text-sm text-textMuted flex items-center gap-2">
                                            {visibleKeys[key.id] ? key.key : '•'.repeat(24) + key.key.slice(-4)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => toggleVisibility(key.id)}
                                        >
                                            {visibleKeys[key.id] ? <EyeSlash size={18} /> : <Eye size={18} />}
                                        </Button>
                                        <Button 
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => copyToClipboard(key.key)}
                                        >
                                            <Copy size={18} />
                                        </Button>
                                        <Button variant="ghost-destructive" size="icon-sm">
                                            <Trash size={18} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-textMuted mt-3 px-1 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-purple-400" />
                        Never expose private keys in client-side code. Use these only in your backend.
                    </p>
                </section>

                {/* Public Keys Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Globe size={20} className="text-emerald-400" weight="duotone" />
                        <h2 className="text-lg font-semibold text-textMain">Public API Keys</h2>
                    </div>
                    <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/5">
                        <div className="divide-y divide-border">
                            {loading ? (
                                <>
                                    <SkeletonRow />
                                </>
                            ) : apiKeys.filter(k => k.type === 'public').length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Globe size={32} className="text-emerald-400" weight="duotone" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-textMain mb-2">No public keys yet</h3>
                                    <p className="text-sm text-textMuted">Create a public key for client-side SDK access</p>
                                </div>
                            ) : apiKeys.filter(k => k.type === 'public').map(key => (
                                <div key={key.id} className="p-5 flex items-center justify-between hover:bg-surfaceHover/50 transition-all duration-200 group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-medium text-textMain">{key.label}</span>
                                            <span className="text-xs bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                                                Client-side
                                            </span>
                                        </div>
                                        <div className="font-mono text-sm text-textMuted flex items-center gap-2">
                                            {key.key}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => copyToClipboard(key.key)}
                                        >
                                            <Copy size={18} />
                                        </Button>
                                        <Button variant="ghost-destructive" size="icon-sm">
                                            <Trash size={18} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-textMuted mt-3 px-1 flex items-center gap-2">
                        <Globe size={14} className="text-emerald-400" />
                        Public keys can be safely used in your frontend (e.g., with the Callyy Web SDK).
                    </p>
                </section>
            </div>
        </div>
    );
};

export default ApiKeys;