import { Eye, EyeSlash, Copy, Plus, Trash, Key, ShieldCheck, Globe, X, Check, Warning } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getApiKeys, createApiKey, deleteApiKey } from '../services/voicoryService';
import type { ApiKey } from '../types';

// Create Key Modal Component
const CreateKeyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreated: (key: ApiKey) => void;
}> = ({ isOpen, onClose, onCreated }) => {
    const [label, setLabel] = useState('');
    const [type, setType] = useState<'public' | 'private'>('public');
    const [creating, setCreating] = useState(false);
    const [newKey, setNewKey] = useState<ApiKey | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!label.trim()) {
            setError('Please enter a label for the key');
            return;
        }

        setCreating(true);
        setError(null);

        try {
            const key = await createApiKey({ label: label.trim(), type });
            setNewKey(key);
            onCreated(key);
        } catch (err: any) {
            setError(err.message || 'Failed to create API key');
        } finally {
            setCreating(false);
        }
    };

    const copyKey = () => {
        if (newKey) {
            navigator.clipboard.writeText(newKey.key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setLabel('');
        setType('public');
        setNewKey(null);
        setCopied(false);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                            <Key size={20} className="text-primary" weight="duotone" />
                        </div>
                        <h2 className="text-lg font-semibold text-textMain">
                            {newKey ? 'API Key Created' : 'Create API Key'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X size={20} className="text-textMuted" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {newKey ? (
                        /* Success State - Show the key */
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Check size={20} className="text-emerald-500 mt-0.5" weight="bold" />
                                    <div>
                                        <p className="font-medium text-emerald-500">Key created successfully!</p>
                                        <p className="text-sm text-emerald-400/80 mt-1">
                                            Make sure to copy your API key now. You won't be able to see it again!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-2">Your API Key</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 p-3 bg-black/30 border border-white/10 rounded-xl font-mono text-sm text-textMain break-all">
                                        {newKey.key}
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={copyKey}
                                        className="shrink-0"
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Warning size={20} className="text-amber-500 mt-0.5" weight="bold" />
                                    <div>
                                        <p className="font-medium text-amber-500">Important</p>
                                        <p className="text-sm text-amber-400/80 mt-1">
                                            {type === 'private' 
                                                ? 'This is a private key. Never expose it in client-side code or public repositories.'
                                                : 'This is a public key. It can be used in client-side code but should not be shared unnecessarily.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Create Form */
                        <div className="space-y-5">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Key Label
                                </label>
                                <Input
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="e.g., Production Server, Development, Widget"
                                    autoFocus
                                />
                                <p className="text-xs text-textMuted mt-2">
                                    A descriptive name to help you identify this key later.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-3">
                                    Key Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('public')}
                                        className={`p-4 rounded-xl border transition-all text-left ${
                                            type === 'public'
                                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Globe 
                                                size={20} 
                                                className={type === 'public' ? 'text-emerald-400' : 'text-textMuted'}
                                                weight="duotone"
                                            />
                                            <span className={`font-medium ${type === 'public' ? 'text-emerald-400' : 'text-textMain'}`}>
                                                Public
                                            </span>
                                        </div>
                                        <p className="text-xs text-textMuted">
                                            For client-side use (web widgets, SDKs)
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setType('private')}
                                        className={`p-4 rounded-xl border transition-all text-left ${
                                            type === 'private'
                                                ? 'border-purple-500/50 bg-purple-500/10'
                                                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <ShieldCheck 
                                                size={20} 
                                                className={type === 'private' ? 'text-purple-400' : 'text-textMuted'}
                                                weight="duotone"
                                            />
                                            <span className={`font-medium ${type === 'private' ? 'text-purple-400' : 'text-textMain'}`}>
                                                Private
                                            </span>
                                        </div>
                                        <p className="text-xs text-textMuted">
                                            For server-side use only (backend APIs)
                                        </p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-white/10 bg-black/20">
                    {newKey ? (
                        <Button onClick={handleClose}>
                            Done
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} loading={creating}>
                                <Key size={18} weight="bold" />
                                Create Key
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
    isOpen: boolean;
    keyLabel: string;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}> = ({ isOpen, keyLabel, onClose, onConfirm, deleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md mx-4 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6">
                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Trash size={24} className="text-red-400" weight="duotone" />
                    </div>
                    <h3 className="text-lg font-semibold text-textMain text-center mb-2">
                        Delete API Key?
                    </h3>
                    <p className="text-sm text-textMuted text-center mb-6">
                        Are you sure you want to delete <span className="text-textMain font-medium">"{keyLabel}"</span>? 
                        This action cannot be undone and any applications using this key will stop working.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={onConfirm} 
                            loading={deleting}
                            className="flex-1"
                        >
                            Delete Key
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ApiKeys: React.FC = () => {
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; key: ApiKey | null }>({
        isOpen: false,
        key: null,
    });
    const [deleting, setDeleting] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

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

    const copyToClipboard = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = async () => {
        if (!deleteModal.key) return;
        
        setDeleting(true);
        try {
            await deleteApiKey(deleteModal.key.id);
            setApiKeys(prev => prev.filter(k => k.id !== deleteModal.key?.id));
            setDeleteModal({ isOpen: false, key: null });
        } catch (error) {
            console.error('Error deleting API key:', error);
        } finally {
            setDeleting(false);
        }
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
                <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
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
                                    <p className="text-sm text-textMuted mb-4">Create a private key for server-side API access</p>
                                    <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                                        <Plus size={16} />
                                        Create Private Key
                                    </Button>
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
                                            title={visibleKeys[key.id] ? 'Hide key' : 'Show key'}
                                        >
                                            {visibleKeys[key.id] ? <EyeSlash size={18} /> : <Eye size={18} />}
                                        </Button>
                                        <Button 
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => copyToClipboard(key.id, key.key)}
                                            title="Copy to clipboard"
                                        >
                                            {copiedId === key.id ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                        </Button>
                                        <Button 
                                            variant="ghost-destructive" 
                                            size="icon-sm"
                                            onClick={() => setDeleteModal({ isOpen: true, key })}
                                            title="Delete key"
                                        >
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
                                    <p className="text-sm text-textMuted mb-4">Create a public key for client-side SDK access</p>
                                    <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                                        <Plus size={16} />
                                        Create Public Key
                                    </Button>
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
                                            onClick={() => copyToClipboard(key.id, key.key)}
                                            title="Copy to clipboard"
                                        >
                                            {copiedId === key.id ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                        </Button>
                                        <Button 
                                            variant="ghost-destructive" 
                                            size="icon-sm"
                                            onClick={() => setDeleteModal({ isOpen: true, key })}
                                            title="Delete key"
                                        >
                                            <Trash size={18} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-textMuted mt-3 px-1 flex items-center gap-2">
                        <Globe size={14} className="text-emerald-400" />
                        Public keys can be safely used in your frontend (e.g., with the Voicory Widget or Web SDK).
                    </p>
                </section>
            </div>

            {/* Create Key Modal */}
            <CreateKeyModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={(key) => setApiKeys(prev => [key, ...prev])}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                keyLabel={deleteModal.key?.label || ''}
                onClose={() => setDeleteModal({ isOpen: false, key: null })}
                onConfirm={handleDelete}
                deleting={deleting}
            />
        </div>
    );
};

export default ApiKeys;