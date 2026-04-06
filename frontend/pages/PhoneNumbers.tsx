import { Plus, Phone, Globe, Trash, Gear, Sparkle, CircleNotch, PhoneCall, ArrowsClockwise, Copy, CheckCircle, Warning, Eye, EyeSlash } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';

import PhoneNumberModal from '../components/PhoneNumberModal';
import PhoneNumberConfigModal from '../components/PhoneNumberConfigModal';
import { FadeIn } from '../components/ui/FadeIn';
import { getPhoneNumbers, deletePhoneNumber } from '../services/voicoryService';
import type { PhoneNumber } from '../types';
import { API } from '../lib/constants';

// ─── Exotel Types ────────────────────────────────────────────────────────────

interface ExotelNumber {
    id: string;
    user_id: string;
    phone_number: string;
    label?: string;
    account_sid: string;
    subdomain: string;
    assistant_id?: string;
    is_active: boolean;
    created_at: string;
}

interface ExotelImportForm {
    accountSid: string;
    apiKey: string;
    apiToken: string;
    subdomain: string;
    virtualNumber: string;
    label: string;
}

// ─── Exotel Import Modal ──────────────────────────────────────────────────────

const ExotelImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (num: ExotelNumber) => void;
    userId: string;
}> = ({ isOpen, onClose, onSuccess, userId }) => {
    const [form, setForm] = useState<ExotelImportForm>({
        accountSid: '',
        apiKey: '',
        apiToken: '',
        subdomain: 'ccm-api.in.exotel.com',
        virtualNumber: '',
        label: '',
    });
    const [showToken, setShowToken] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [importing, setImporting] = useState(false);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedNumber, setImportedNumber] = useState<ExotelNumber | null>(null);
    const [copied, setCopied] = useState(false);

    const getAuthHeaders = () => {
        const session = localStorage.getItem('supabase_session') || sessionStorage.getItem('supabase_session');
        let token = '';
        if (session) {
            try { token = JSON.parse(session).access_token || ''; } catch { /* ignore */ }
        }
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
    };

    const handleVerify = async () => {
        setError(null);
        setVerified(false);
        setVerifying(true);
        try {
            const res = await fetch(`${API.BACKEND_URL}/api/exotel/verify-import`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    accountSid: form.accountSid,
                    apiKey: form.apiKey,
                    apiToken: form.apiToken,
                    subdomain: form.subdomain,
                    virtualNumber: form.virtualNumber,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');
            setVerified(true);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleImport = async () => {
        setError(null);
        setImporting(true);
        try {
            const res = await fetch(`${API.BACKEND_URL}/api/exotel/import-number`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    accountSid: form.accountSid,
                    apiKey: form.apiKey,
                    apiToken: form.apiToken,
                    subdomain: form.subdomain,
                    virtualNumber: form.virtualNumber,
                    label: form.label || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import failed');
            setImportedNumber(data.phoneNumber || data);
            onSuccess(data.phoneNumber || data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const webhookUrl = `${API.BACKEND_URL}/api/webhooks/exotel/${userId}/voice`;

    const handleCopy = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setForm({ accountSid: '', apiKey: '', apiToken: '', subdomain: 'ccm-api.in.exotel.com', virtualNumber: '', label: '' });
        setVerified(false);
        setError(null);
        setImportedNumber(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-bold text-textMain mb-5 flex items-center gap-2">
                    <span className="text-orange-400">🇮🇳</span> Import Exotel Number
                </h2>

                {importedNumber ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                            <CheckCircle size={24} weight="fill" className="text-green-400 shrink-0" />
                            <div>
                                <p className="font-semibold text-green-400">Number imported!</p>
                                <p className="text-sm text-textMuted">{importedNumber.phone_number}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                            <p className="text-sm text-textMuted mb-2">Set your Exotel ExoPhone passthru URL to:</p>
                            <div className="flex items-center gap-2 bg-background rounded-lg p-2 border border-border">
                                <code className="text-xs text-orange-400 flex-1 break-all">{webhookUrl}</code>
                                <button onClick={handleCopy} className="shrink-0 text-textMuted hover:text-orange-400 transition-colors">
                                    {copied ? <CheckCircle size={16} weight="fill" className="text-green-400" /> : <Copy size={16} weight="duotone" />}
                                </button>
                            </div>
                        </div>
                        <button onClick={handleClose} className="w-full py-2.5 bg-primary text-black font-semibold rounded-xl">Done</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                                <Warning size={16} weight="fill" className="shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-textMuted mb-1.5 block">Account SID *</label>
                            <input
                                type="text"
                                value={form.accountSid}
                                onChange={e => setForm(f => ({ ...f, accountSid: e.target.value }))}
                                placeholder="EXxxx..."
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-orange-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-textMuted mb-1.5 block">API Key *</label>
                            <input
                                type="text"
                                value={form.apiKey}
                                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                                placeholder="Your Exotel API Key"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-orange-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-textMuted mb-1.5 block">API Token *</label>
                            <div className="relative">
                                <input
                                    type={showToken ? 'text' : 'password'}
                                    value={form.apiToken}
                                    onChange={e => setForm(f => ({ ...f, apiToken: e.target.value }))}
                                    placeholder="Your Exotel API Token"
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-orange-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain"
                                >
                                    {showToken ? <EyeSlash size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-textMuted mb-1.5 block">Subdomain</label>
                            <input
                                type="text"
                                value={form.subdomain}
                                onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-orange-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-textMuted mb-1.5 block">Virtual Number (ExoPhone) *</label>
                            <input
                                type="text"
                                value={form.virtualNumber}
                                onChange={e => setForm(f => ({ ...f, virtualNumber: e.target.value }))}
                                placeholder="+91XXXXXXXXXX"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-orange-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-textMuted mb-1.5 block">Label (optional)</label>
                            <input
                                type="text"
                                value={form.label}
                                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                placeholder="e.g. Support Line"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-orange-400"
                            />
                        </div>
                        {verified && (
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <CheckCircle size={16} weight="fill" />
                                Credentials verified!
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleVerify}
                                disabled={verifying || !form.accountSid || !form.apiKey || !form.apiToken || !form.virtualNumber}
                                className="flex-1 py-2.5 bg-surface border border-orange-400/50 text-orange-400 font-medium rounded-xl text-sm hover:bg-orange-400/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {verifying && <CircleNotch size={14} weight="bold" className="animate-spin" />}
                                {verifying ? 'Verifying...' : 'Verify'}
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || !form.accountSid || !form.apiKey || !form.apiToken || !form.virtualNumber}
                                className="flex-1 py-2.5 bg-orange-500 text-white font-semibold rounded-xl text-sm hover:bg-orange-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {importing && <CircleNotch size={14} weight="bold" className="animate-spin" />}
                                {importing ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                        <button onClick={handleClose} className="w-full py-2 text-sm text-textMuted hover:text-textMain transition-colors">Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Exotel Number Card ───────────────────────────────────────────────────────

const ExotelNumberCard: React.FC<{
    num: ExotelNumber;
    userId: string;
    assistants: { id: string; name: string }[];
    onDelete: (id: string) => void;
    onAssign: (id: string, assistantId: string | null) => void;
    deletingId: string | null;
}> = ({ num, userId, assistants, onDelete, onAssign, deletingId }) => {
    const [copied, setCopied] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const webhookUrl = `${API.BACKEND_URL}/api/webhooks/exotel/${userId}/voice`;

    const handleCopy = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAssignChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value || null;
        setAssigning(true);
        await onAssign(num.id, val);
        setAssigning(false);
    };

    return (
        <div className="group relative bg-surface/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-400/5 transition-all duration-300">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform duration-300">
                        <Phone size={22} weight="duotone" />
                    </div>
                    <div className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-gradient-to-r from-orange-500/20 to-orange-400/10 text-orange-400 border-orange-500/30">
                        Exotel
                    </div>
                </div>

                <h3 className="text-xl font-mono text-textMain mb-1 break-all group-hover:text-orange-400 transition-colors">{num.phone_number}</h3>
                <p className="text-sm text-textMuted mb-4">{num.label || 'No label'}</p>

                <div className="pt-4 border-t border-border/50 space-y-3">
                    {/* Assign to Assistant */}
                    <div>
                        <label className="text-xs text-textMuted mb-1 block">Assigned Assistant</label>
                        <div className="relative">
                            <select
                                value={num.assistant_id || ''}
                                onChange={handleAssignChange}
                                disabled={assigning}
                                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-orange-400 appearance-none disabled:opacity-50"
                            >
                                <option value="">Unassigned</option>
                                {assistants.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            {assigning && <CircleNotch size={12} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-orange-400" />}
                        </div>
                    </div>

                    {/* Webhook URL */}
                    <div>
                        <label className="text-xs text-textMuted mb-1 block">Passthru Webhook URL</label>
                        <div className="flex items-center gap-2 bg-background rounded-lg px-2 py-1.5 border border-border">
                            <code className="text-xs text-orange-400 flex-1 truncate">{webhookUrl}</code>
                            <button onClick={handleCopy} className="shrink-0 text-textMuted hover:text-orange-400 transition-colors">
                                {copied ? <CheckCircle size={14} weight="fill" className="text-green-400" /> : <Copy size={14} weight="duotone" />}
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1 flex-1 text-xs text-textMuted">
                            <Globe size={13} weight="duotone" />
                            <span>Inbound <span className={num.is_active ? 'text-green-400' : 'text-red-400'}>{num.is_active ? 'Active' : 'Inactive'}</span></span>
                        </div>
                        <button
                            onClick={() => onDelete(num.id)}
                            disabled={deletingId === num.id}
                            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                            {deletingId === num.id ? (
                                <CircleNotch size={12} weight="bold" className="animate-spin" />
                            ) : (
                                <Trash size={12} weight="duotone" />
                            )}
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'twilio' | 'exotel';

const PhoneNumbers: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('twilio');

    // Twilio state
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [configuringPhoneNumber, setConfiguringPhoneNumber] = useState<PhoneNumber | null>(null);

    // Exotel state
    const [exotelNumbers, setExotelNumbers] = useState<ExotelNumber[]>([]);
    const [exotelLoading, setExotelLoading] = useState(false);
    const [exotelImportOpen, setExotelImportOpen] = useState(false);
    const [exotelDeletingId, setExotelDeletingId] = useState<string | null>(null);
    const [assistants, setAssistants] = useState<{ id: string; name: string }[]>([]);
    const [userId, setUserId] = useState('');

    useEffect(() => {
        fetchData();
        loadUserAndAssistants();
    }, []);

    useEffect(() => {
        if (activeTab === 'exotel' && exotelNumbers.length === 0 && !exotelLoading) {
            fetchExotelNumbers();
        }
    }, [activeTab]);

    const getAuthHeaders = () => {
        const session = localStorage.getItem('supabase_session') || sessionStorage.getItem('supabase_session');
        let token = '';
        if (session) {
            try { token = JSON.parse(session).access_token || ''; } catch { /* ignore */ }
        }
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
    };

    const loadUserAndAssistants = async () => {
        try {
            // Try to get user session for userId
            const session = localStorage.getItem('supabase_session') || sessionStorage.getItem('supabase_session');
            if (session) {
                try {
                    const parsed = JSON.parse(session);
                    const uid = parsed.user?.id || '';
                    setUserId(uid);
                } catch { /* ignore */ }
            }
            // Fetch assistants for assign dropdown
            const res = await fetch(`${API.BACKEND_URL}/api/assistants`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.assistants || []);
                setAssistants(list.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
            }
        } catch { /* non-critical */ }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getPhoneNumbers();
            setPhoneNumbers(data);
        } catch (error) {
            console.error('Error loading phone numbers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExotelNumbers = async () => {
        setExotelLoading(true);
        try {
            const res = await fetch(`${API.BACKEND_URL}/api/exotel/phone-numbers`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setExotelNumbers(Array.isArray(data) ? data : (data.phoneNumbers || []));
            }
        } catch (e) {
            console.error('Error loading Exotel numbers:', e);
        } finally {
            setExotelLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this phone number?')) return;
        try {
            setDeletingId(id);
            const success = await deletePhoneNumber(id);
            if (success) {
                setPhoneNumbers(prev => prev.filter(num => num.id !== id));
            } else {
                alert('Failed to delete phone number');
            }
        } catch (error) {
            console.error('Error deleting phone number:', error);
            alert('Error deleting phone number');
        } finally {
            setDeletingId(null);
        }
    };

    const handleExotelDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Exotel number?')) return;
        try {
            setExotelDeletingId(id);
            const res = await fetch(`${API.BACKEND_URL}/api/exotel/phone-numbers/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setExotelNumbers(prev => prev.filter(n => n.id !== id));
            } else {
                alert('Failed to delete Exotel number');
            }
        } catch {
            alert('Error deleting Exotel number');
        } finally {
            setExotelDeletingId(null);
        }
    };

    const handleExotelAssign = async (id: string, assistantId: string | null) => {
        try {
            const res = await fetch(`${API.BACKEND_URL}/api/exotel/phone-numbers/${id}/assign`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ assistantId }),
            });
            if (res.ok) {
                setExotelNumbers(prev => prev.map(n => n.id === id ? { ...n, assistant_id: assistantId || undefined } : n));
            }
        } catch { /* non-critical */ }
    };

    const handleModalSuccess = (newPhoneNumber: PhoneNumber) => {
        setPhoneNumbers(prev => [newPhoneNumber, ...prev]);
    };

    const handleConfigureSuccess = (updatedPhoneNumber: PhoneNumber) => {
        setPhoneNumbers(prev => prev.map(num =>
            num.id === updatedPhoneNumber.id ? updatedPhoneNumber : num
        ));
    };

    const handleExotelImportSuccess = (num: ExotelNumber) => {
        setExotelNumbers(prev => [num, ...prev]);
    };

    const getProviderBadgeColor = (provider: PhoneNumber['provider']) => {
        switch (provider) {
            case 'Callyy':
            case 'CallyySIP':
                return 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30';
            case 'Twilio':
                return 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-400 border-red-500/30';
            case 'Vonage':
                return 'bg-gradient-to-r from-blue-500/20 to-blue-500/10 text-blue-400 border-blue-500/30';
            case 'Telnyx':
                return 'bg-gradient-to-r from-purple-500/20 to-purple-500/10 text-purple-400 border-purple-500/30';
            case 'BYOSIP':
                return 'bg-gradient-to-r from-green-500/20 to-green-500/10 text-green-400 border-green-500/30';
            default:
                return 'bg-background border-border text-textMuted';
        }
    };

    const SkeletonCard = () => (
        <div className="bg-surface/50 border border-border/50 rounded-xl p-5 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-surfaceHover" />
                <div className="w-16 h-5 rounded bg-surfaceHover" />
            </div>
            <div className="h-6 bg-surfaceHover rounded w-3/4 mb-2" />
            <div className="h-4 bg-surfaceHover rounded w-1/2 mb-6" />
            <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="h-4 bg-surfaceHover rounded w-2/3" />
                <div className="flex gap-2">
                    <div className="flex-1 h-8 bg-surfaceHover rounded" />
                    <div className="w-20 h-8 bg-surfaceHover rounded" />
                </div>
            </div>
        </div>
    );

    return (
        <FadeIn className="p-8 max-w-7xl mx-auto relative min-h-screen">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-textMain flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <PhoneCall size={20} weight="duotone" className="text-primary" />
                            </div>
                            Phone Numbers
                        </h1>
                        <p className="text-textMuted text-sm mt-2 ml-13">Connect assistants to inbound and outbound lines.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={activeTab === 'twilio' ? fetchData : fetchExotelNumbers}
                            disabled={activeTab === 'twilio' ? loading : exotelLoading}
                            className="p-2.5 bg-surface/80 backdrop-blur-sm border border-border/50 text-textMuted rounded-xl hover:text-primary hover:border-primary/50 transition-all duration-300 disabled:opacity-50"
                            title="Refresh"
                        >
                            <ArrowsClockwise size={18} weight="bold" className={(activeTab === 'twilio' ? loading : exotelLoading) ? 'animate-spin' : ''} />
                        </button>
                        {activeTab === 'twilio' ? (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all duration-300"
                            >
                                <Plus size={18} weight="bold" />
                                Add Phone Number
                            </button>
                        ) : (
                            <button
                                onClick={() => setExotelImportOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] transition-all duration-300"
                            >
                                <Plus size={18} weight="bold" />
                                Import Exotel Number
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 p-1 bg-surface/50 border border-border/50 rounded-xl w-fit mb-6">
                    <button
                        onClick={() => setActiveTab('twilio')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeTab === 'twilio'
                                ? 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-400 border border-red-500/30'
                                : 'text-textMuted hover:text-textMain'
                        }`}
                    >
                        📞 Twilio
                    </button>
                    <button
                        onClick={() => setActiveTab('exotel')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeTab === 'exotel'
                                ? 'bg-gradient-to-r from-orange-500/20 to-orange-400/10 text-orange-400 border border-orange-500/30'
                                : 'text-textMuted hover:text-textMain'
                        }`}
                    >
                        🇮🇳 Exotel
                    </button>
                </div>

                {/* ── TWILIO TAB ── */}
                {activeTab === 'twilio' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : phoneNumbers.length === 0 ? (
                            <div className="col-span-full">
                                <div className="relative bg-surface/30 backdrop-blur-xl border border-border/50 rounded-2xl p-12 text-center overflow-hidden">
                                    <div className="absolute top-4 right-4 text-primary/20"><Sparkle size={24} weight="fill" /></div>
                                    <div className="absolute bottom-4 left-4 text-primary/20"><Sparkle size={16} weight="fill" /></div>
                                    <div className="relative">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center">
                                            <Phone size={40} weight="duotone" className="text-primary" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-textMain mb-2">No phone numbers yet</h3>
                                        <p className="text-sm text-textMuted mb-6 max-w-md mx-auto">
                                            Add a phone number to start receiving and making calls with your AI assistants.
                                        </p>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all duration-300"
                                        >
                                            <Plus size={18} weight="bold" />
                                            Add Your First Phone Number
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {phoneNumbers.map(num => (
                                    <div
                                        key={num.id}
                                        className="group relative bg-surface/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                                    >
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                        <div className="relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                                    <Phone size={22} weight="duotone" />
                                                </div>
                                                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getProviderBadgeColor(num.provider)}`}>
                                                    {num.provider}
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-mono text-textMain mb-1 break-all group-hover:text-primary transition-colors">{num.number}</h3>
                                            <p className="text-sm text-textMuted mb-6">{num.label || 'No label'}</p>
                                            <div className="pt-4 border-t border-border/50 space-y-3">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2 text-textMuted">
                                                        <Globe size={14} weight="duotone" />
                                                        <span>Inbound {num.inboundEnabled ? (
                                                            <span className="text-green-400">Enabled</span>
                                                        ) : (
                                                            <span className="text-red-400">Disabled</span>
                                                        )}</span>
                                                    </div>
                                                    {num.smsEnabled && (
                                                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium">SMS</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setConfiguringPhoneNumber(num)}
                                                        className="flex-1 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200"
                                                    >
                                                        <Gear size={14} weight="duotone" />
                                                        Configure
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(num.id)}
                                                        disabled={deletingId === num.id}
                                                        className="px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {deletingId === num.id ? (
                                                            <CircleNotch size={14} weight="bold" className="animate-spin" />
                                                        ) : (
                                                            <Trash size={14} weight="duotone" />
                                                        )}
                                                        {deletingId === num.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add New Card */}
                                <div
                                    onClick={() => setIsModalOpen(true)}
                                    className="group border-2 border-dashed border-border/50 rounded-xl p-5 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-surface/30 transition-all duration-300 cursor-pointer min-h-[200px]"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-surfaceHover flex items-center justify-center text-textMuted mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 group-hover:scale-110">
                                        <Plus size={28} weight="bold" />
                                    </div>
                                    <h3 className="font-semibold text-textMain group-hover:text-primary transition-colors">Add New Number</h3>
                                    <p className="text-xs text-textMuted mt-2 max-w-[200px]">
                                        Get a free Voicory number or import from Twilio, Vonage, Telnyx, or your own SIP trunk.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── EXOTEL TAB ── */}
                {activeTab === 'exotel' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exotelLoading ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : exotelNumbers.length === 0 ? (
                            <div className="col-span-full">
                                <div className="relative bg-surface/30 backdrop-blur-xl border border-border/50 rounded-2xl p-12 text-center overflow-hidden">
                                    <div className="absolute top-4 right-4 text-orange-400/20"><Sparkle size={24} weight="fill" /></div>
                                    <div className="absolute bottom-4 left-4 text-orange-400/20"><Sparkle size={16} weight="fill" /></div>
                                    <div className="relative">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-400/5 flex items-center justify-center">
                                            <Phone size={40} weight="duotone" className="text-orange-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-textMain mb-2">No Exotel numbers yet</h3>
                                        <p className="text-sm text-textMuted mb-6 max-w-md mx-auto">
                                            Import your Exotel ExoPhone to start handling inbound calls with AI assistants.
                                        </p>
                                        <button
                                            onClick={() => setExotelImportOpen(true)}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] transition-all duration-300"
                                        >
                                            <Plus size={18} weight="bold" />
                                            Import Exotel Number
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {exotelNumbers.map(num => (
                                    <ExotelNumberCard
                                        key={num.id}
                                        num={num}
                                        userId={userId}
                                        assistants={assistants}
                                        onDelete={handleExotelDelete}
                                        onAssign={handleExotelAssign}
                                        deletingId={exotelDeletingId}
                                    />
                                ))}
                                {/* Import More Card */}
                                <div
                                    onClick={() => setExotelImportOpen(true)}
                                    className="group border-2 border-dashed border-orange-500/30 rounded-xl p-5 flex flex-col items-center justify-center text-center hover:border-orange-500/60 hover:bg-orange-500/5 transition-all duration-300 cursor-pointer min-h-[200px]"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400/60 mb-4 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-all duration-300 group-hover:scale-110">
                                        <Plus size={28} weight="bold" />
                                    </div>
                                    <h3 className="font-semibold text-textMain group-hover:text-orange-400 transition-colors">Import Another Number</h3>
                                    <p className="text-xs text-textMuted mt-2 max-w-[200px]">
                                        Import another Exotel ExoPhone number.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <PhoneNumberModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
            />

            {configuringPhoneNumber && (
                <PhoneNumberConfigModal
                    isOpen={true}
                    phoneNumber={configuringPhoneNumber}
                    onClose={() => setConfiguringPhoneNumber(null)}
                    onSuccess={handleConfigureSuccess}
                />
            )}

            <ExotelImportModal
                isOpen={exotelImportOpen}
                onClose={() => setExotelImportOpen(false)}
                onSuccess={handleExotelImportSuccess}
                userId={userId}
            />
        </FadeIn>
    );
};

export default PhoneNumbers;
