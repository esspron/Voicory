import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Plus, Trash2 } from 'lucide-react';
import { getApiKeys } from '../services/callyyService';
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

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">API Keys</h1>
                    <p className="text-textMuted text-sm mt-1">Manage your public and private keys for API access.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors">
                    <Plus size={18} />
                    Create New Key
                </button>
            </div>

            {/* Private Keys Section */}
            <div className="space-y-8">
                <section>
                    <h2 className="text-lg font-semibold text-textMain mb-4">Private API Keys</h2>
                    <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        <div className="divide-y divide-border">
                            {loading ? (
                                <div className="text-center py-8 text-textMuted">Loading...</div>
                            ) : apiKeys.filter(k => k.type === 'private').length === 0 ? (
                                <div className="text-center py-8 text-textMuted text-sm">No private keys yet</div>
                            ) : apiKeys.filter(k => k.type === 'private').map(key => (
                                <div key={key.id} className="p-5 flex items-center justify-between hover:bg-surfaceHover transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-medium text-textMain">{key.label}</span>
                                            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
                                                Server-side
                                            </span>
                                        </div>
                                        <div className="font-mono text-sm text-textMuted flex items-center gap-2">
                                            {visibleKeys[key.id] ? key.key : '•'.repeat(24) + key.key.slice(-4)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => toggleVisibility(key.id)}
                                            className="p-2 hover:bg-background rounded text-textMuted hover:text-textMain transition-colors"
                                        >
                                            {visibleKeys[key.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => copyToClipboard(key.key)}
                                            className="p-2 hover:bg-background rounded text-textMuted hover:text-textMain transition-colors"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button className="p-2 hover:bg-background rounded text-textMuted hover:text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-textMuted mt-2 px-1">
                        Never expose private keys in client-side code. Use these only in your backend.
                    </p>
                </section>

                {/* Public Keys Section */}
                <section>
                    <h2 className="text-lg font-semibold text-textMain mb-4">Public API Keys</h2>
                    <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        <div className="divide-y divide-border">
                            {loading ? (
                                <div className="text-center py-8 text-textMuted">Loading...</div>
                            ) : apiKeys.filter(k => k.type === 'public').length === 0 ? (
                                <div className="text-center py-8 text-textMuted text-sm">No public keys yet</div>
                            ) : apiKeys.filter(k => k.type === 'public').map(key => (
                                <div key={key.id} className="p-5 flex items-center justify-between hover:bg-surfaceHover transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-medium text-textMain">{key.label}</span>
                                            <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">
                                                Client-side
                                            </span>
                                        </div>
                                        <div className="font-mono text-sm text-textMuted flex items-center gap-2">
                                            {key.key}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => copyToClipboard(key.key)}
                                            className="p-2 hover:bg-background rounded text-textMuted hover:text-textMain transition-colors"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button className="p-2 hover:bg-background rounded text-textMuted hover:text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-textMuted mt-2 px-1">
                        Public keys can be safely used in your frontend (e.g., with the Callyy Web SDK).
                    </p>
                </section>
            </div>
        </div>
    );
};

export default ApiKeys;