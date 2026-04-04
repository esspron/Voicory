import { X, CircleNotch, Phone, Check, Copy, Robot, CaretDown, Link, ArrowSquareOut, PhoneCall } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../contexts/AuthContext';
import { API } from '../lib/constants';
import { useClipboard } from '../hooks';
import { getAssistants, updatePhoneNumber } from '../services/voicoryService';
import { authFetch } from '../lib/api';
import type { PhoneNumber, Assistant } from '../types';

interface PhoneNumberConfigModalProps {
    isOpen: boolean;
    phoneNumber: PhoneNumber;
    onClose: () => void;
    onSuccess: (phoneNumber: PhoneNumber) => void;
}

// Server region options for webhook URL
const SERVER_REGIONS = [
    { id: 'INDIA', label: 'India (Asia South)', flag: '🇮🇳', url: API.BACKEND_URLS.INDIA },
    { id: 'USA', label: 'USA (US Central)', flag: '🇺🇸', url: API.BACKEND_URLS.USA },
    { id: 'EUROPE', label: 'Europe (EU West)', flag: '🇪🇺', url: API.BACKEND_URLS.EUROPE },
] as const;

type ServerRegion = 'INDIA' | 'USA' | 'EUROPE';

const PhoneNumberConfigModal: React.FC<PhoneNumberConfigModalProps> = ({ 
    isOpen, 
    phoneNumber, 
    onClose, 
    onSuccess 
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Server region selection for webhook
    const [serverRegion, setServerRegion] = useState<ServerRegion>('INDIA');
    
    // Config state
    const [inboundEnabled, setInboundEnabled] = useState(phoneNumber.inboundEnabled ?? true);
    const [outboundEnabled, setOutboundEnabled] = useState(phoneNumber.outboundEnabled ?? true);
    const [smsEnabled, setSmsEnabled] = useState(phoneNumber.smsEnabled ?? false);
    const [label, setLabel] = useState(phoneNumber.label || '');
    
    // Assistant selection
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [selectedAssistantId, setSelectedAssistantId] = useState<string>(phoneNumber.assistantId || '');
    
    // Clipboard hook
    const { copy, copied } = useClipboard();

    // Test call state
    const [testCallNumber, setTestCallNumber] = useState('');
    const [testCallLoading, setTestCallLoading] = useState(false);
    const [testCallResult, setTestCallResult] = useState<{ success: boolean; message: string } | null>(null);

    // Generate user-specific webhook URL using selected server region
    const getWebhookUrl = () => {
        const regionUrl = SERVER_REGIONS.find(r => r.id === serverRegion)?.url || API.BACKEND_URLS.INDIA;
        return user?.id ? `${regionUrl}/api/webhooks/twilio/${user.id}/voice` : '';
    };
    const webhookUrl = getWebhookUrl();

    // Load assistants when modal opens
    useEffect(() => {
        if (isOpen) {
            loadAssistants();
        }
    }, [isOpen]);

    const loadAssistants = async () => {
        try {
            const data = await getAssistants();
            setAssistants(data.filter(a => a.status === 'active'));
        } catch (err) {
            console.error('Error loading assistants:', err);
        }
    };

    const handleTestCall = async () => {
        if (!testCallNumber.trim()) {
            setTestCallResult({ success: false, message: 'Please enter a phone number' });
            return;
        }

        // Format number - ensure it starts with +
        let formattedNumber = testCallNumber.trim();
        if (!formattedNumber.startsWith('+')) {
            formattedNumber = '+' + formattedNumber;
        }

        setTestCallLoading(true);
        setTestCallResult(null);

        try {
            const response = await authFetch('/api/twilio/test-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumberId: phoneNumber.id,
                    toNumber: formattedNumber
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate test call');
            }

            setTestCallResult({ 
                success: true, 
                message: `Call initiated! Your phone (${formattedNumber}) should ring shortly.` 
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to make test call';
            setTestCallResult({ success: false, message: errorMessage });
        } finally {
            setTestCallLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);

        try {
            const success = await updatePhoneNumber(phoneNumber.id, {
                label: label || phoneNumber.label,
                inboundEnabled,
                outboundEnabled,
                smsEnabled,
                assistantId: selectedAssistantId || undefined
            });

            if (success) {
                onSuccess({
                    ...phoneNumber,
                    label,
                    inboundEnabled,
                    outboundEnabled,
                    smsEnabled,
                    assistantId: selectedAssistantId || undefined
                });
                onClose();
            } else {
                setError('Failed to save changes. Please try again.');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-surface/95 backdrop-blur-xl border border-border/50 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border/50">
                    <h2 className="text-xl font-bold text-textMain flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Phone size={16} weight="duotone" className="text-primary" />
                        </div>
                        Configure {phoneNumber.number}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-all duration-200"
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Label
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Sales Line, Support, etc."
                            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Inbound/Outbound Toggles */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-surface/50 border border-border rounded-xl">
                            <div>
                                <h4 className="text-sm font-medium text-textMain">Inbound Calls</h4>
                                <p className="text-xs text-textMuted">Allow incoming calls to be handled by AI</p>
                            </div>
                            <button
                                onClick={() => setInboundEnabled(!inboundEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    inboundEnabled ? 'bg-primary' : 'bg-surfaceHover'
                                }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                    inboundEnabled ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-surface/50 border border-border rounded-xl">
                            <div>
                                <h4 className="text-sm font-medium text-textMain">Outbound Calls</h4>
                                <p className="text-xs text-textMuted">Allow AI to make calls from this number</p>
                            </div>
                            <button
                                onClick={() => setOutboundEnabled(!outboundEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    outboundEnabled ? 'bg-primary' : 'bg-surfaceHover'
                                }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                    outboundEnabled ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-surface/50 border border-border rounded-xl">
                            <div>
                                <h4 className="text-sm font-medium text-textMain">SMS</h4>
                                <p className="text-xs text-textMuted">Enable SMS messaging on this number</p>
                            </div>
                            <button
                                onClick={() => setSmsEnabled(!smsEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    smsEnabled ? 'bg-primary' : 'bg-surfaceHover'
                                }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                    smsEnabled ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </div>

                    {/* Assistant Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Robot size={18} weight="bold" className="text-primary" />
                            <h4 className="text-sm font-semibold text-textMain">AI Assistant</h4>
                        </div>
                        <p className="text-xs text-textMuted">
                            Select an AI assistant to handle calls on this number.
                        </p>
                        
                        {assistants.length > 0 ? (
                            <div className="relative">
                                <select
                                    value={selectedAssistantId}
                                    onChange={(e) => setSelectedAssistantId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                                >
                                    <option value="">No assistant (manual handling)</option>
                                    {assistants.map((assistant) => (
                                        <option key={assistant.id} value={assistant.id}>
                                            {assistant.name}
                                        </option>
                                    ))}
                                </select>
                                <CaretDown size={16} weight="bold" className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                            </div>
                        ) : (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                <p className="text-sm text-yellow-400">
                                    No active assistants found. Create an assistant first.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Test Call Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <PhoneCall size={18} weight="bold" className="text-primary" />
                            <h4 className="text-sm font-semibold text-textMain">Test Outbound Call</h4>
                        </div>
                        <p className="text-xs text-textMuted">
                            Make a test call to verify your agent is working. Enter your phone number to receive a test call.
                        </p>
                        
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                value={testCallNumber}
                                onChange={(e) => setTestCallNumber(e.target.value)}
                                placeholder="+1234567890"
                                className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                                onClick={handleTestCall}
                                disabled={testCallLoading || !outboundEnabled}
                                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title={!outboundEnabled ? 'Enable outbound calls first' : 'Make test call'}
                            >
                                {testCallLoading ? (
                                    <CircleNotch size={18} weight="bold" className="animate-spin" />
                                ) : (
                                    <PhoneCall size={18} weight="bold" />
                                )}
                                Call
                            </button>
                        </div>

                        {!outboundEnabled && (
                            <p className="text-xs text-yellow-400">
                                ⚠️ Enable "Outbound Calls" above to use this feature.
                            </p>
                        )}

                        {testCallResult && (
                            <div className={`p-3 rounded-xl text-sm ${
                                testCallResult.success 
                                    ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                            }`}>
                                {testCallResult.message}
                            </div>
                        )}
                    </div>

                    {/* Webhook URL - For Reference */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Link size={18} weight="bold" className="text-primary" />
                            <h4 className="text-sm font-semibold text-textMain">Webhook URL</h4>
                        </div>
                        
                        {/* Server Region Selector */}
                        <div className="grid grid-cols-3 gap-1.5">
                            {SERVER_REGIONS.map((region) => (
                                <button
                                    key={region.id}
                                    onClick={() => setServerRegion(region.id as ServerRegion)}
                                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                                        serverRegion === region.id
                                            ? 'bg-primary/10 border-primary/30 text-textMain font-medium'
                                            : 'bg-background border-border text-textMuted hover:border-primary/20'
                                    }`}
                                >
                                    <span>{region.flag}</span>
                                    <span>{region.id}</span>
                                </button>
                            ))}
                        </div>

                        <div className="p-3 bg-surface/50 border border-border rounded-xl">
                            <p className="text-[10px] text-textMuted mb-2">
                                Paste this URL in your Twilio Console → Phone Number → "A Call Comes In" → Webhook
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-[10px] font-mono text-primary break-all bg-black/30 px-2 py-1.5 rounded">
                                    {webhookUrl}
                                </code>
                                <button
                                    onClick={() => copy(webhookUrl)}
                                    className="p-1.5 text-textMuted hover:text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                                    title="Copy webhook URL"
                                >
                                    {copied ? (
                                        <Check size={14} weight="bold" className="text-green-400" />
                                    ) : (
                                        <Copy size={14} weight="bold" />
                                    )}
                                </button>
                            </div>
                            <a 
                                href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                                Open Twilio Console <ArrowSquareOut size={10} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-border/50 bg-surface/30">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-surface border border-border text-textMain rounded-xl hover:bg-surfaceHover transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <CircleNotch size={18} weight="bold" className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PhoneNumberConfigModal;
