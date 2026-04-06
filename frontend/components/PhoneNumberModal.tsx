import { X, CircleNotch, Phone, ArrowSquareOut, Check, Copy, Robot, CaretDown, Link } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../contexts/AuthContext';
import { API } from '../lib/constants';
import { useClipboard } from '../hooks';
import { importTwilioNumberDirect, getAssistants, updatePhoneNumber } from '../services/voicoryService';
import type { PhoneNumber, Assistant } from '../types';

interface PhoneNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (phoneNumber: PhoneNumber) => void;
}

// Single backend — no region selection needed
const BACKEND_URL = API.BACKEND_URL;

const PhoneNumberModal: React.FC<PhoneNumberModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'import' | 'success'>('import');
    const [importedPhoneNumber, setImportedPhoneNumber] = useState<PhoneNumber | null>(null);
    
    // Twilio form fields - credentials needed for verification + outbound calls
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
    const [twilioAccountSid, setTwilioAccountSid] = useState('');
    const [twilioAuthToken, setTwilioAuthToken] = useState('');
    const [label, setLabel] = useState('');
    
    // Assistant selection
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
    const [assigningAssistant, setAssigningAssistant] = useState(false);
    const [assistantAssigned, setAssistantAssigned] = useState(false);
    
    // Clipboard hook
    const { copy, copied } = useClipboard();

    // Generate user-specific webhook URL (single backend)
    const getWebhookUrl = () => {
        return user?.id ? `${BACKEND_URL}/api/webhooks/twilio/${user.id}/voice` : '';
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

    const resetForm = () => {
        setTwilioPhoneNumber('');
        setTwilioAccountSid('');
        setTwilioAuthToken('');
        setLabel('');
        setError(null);
        setStep('import');
        setImportedPhoneNumber(null);
        setSelectedAssistantId('');
        setAssistantAssigned(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // ============================================
    // TWILIO IMPORT WITH VERIFICATION
    // Verifies ownership + stores credentials for outbound
    // User configures webhook URL manually
    // ============================================

    const handleTwilioImport = async () => {
        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            setError('Please enter Account SID, Auth Token, and Phone Number');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await importTwilioNumberDirect({
                accountSid: twilioAccountSid,
                authToken: twilioAuthToken,
                phoneNumber: twilioPhoneNumber,
                label: label || 'Twilio Number'
            });

            if (result.success && result.phoneNumber) {
                setImportedPhoneNumber(result.phoneNumber);
                setStep('success');
                onSuccess(result.phoneNumber);
            } else {
                setError(result.error || 'Failed to import phone number');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to import phone number';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // ASSIGN ASSISTANT TO PHONE NUMBER
    // ============================================

    const handleAssignAssistant = async () => {
        if (!selectedAssistantId || !importedPhoneNumber) return;

        setAssigningAssistant(true);
        setError(null);

        try {
            const success = await updatePhoneNumber(importedPhoneNumber.id, {
                assistantId: selectedAssistantId
            });

            if (success) {
                setAssistantAssigned(true);
                // Update local state
                setImportedPhoneNumber({
                    ...importedPhoneNumber,
                    assistantId: selectedAssistantId
                });
            } else {
                setError('Failed to assign assistant. Please try again.');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to assign assistant';
            setError(errorMessage);
        } finally {
            setAssigningAssistant(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-surface/95 backdrop-blur-xl border border-border/50 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border/50">
                    <h2 className="text-xl font-bold text-textMain flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center">
                            <Phone size={16} weight="duotone" className="text-red-400" />
                        </div>
                        {step === 'import' ? 'Import Twilio Number' : 'Phone Number Imported!'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-all duration-200"
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Import Form */}
                    {step === 'import' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                        <Phone size={16} weight="fill" className="text-red-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-textMain mb-1">Import from Twilio</h4>
                                        <p className="text-xs text-textMuted">
                                            Enter your credentials to verify ownership and enable outbound calls. You'll configure the webhook URL manually in Twilio Console.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Show user's unique webhook URL */}
                            {webhookUrl && (
                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Link size={14} weight="bold" className="text-primary" />
                                        <span className="text-xs font-medium text-textMain">Your Webhook URL</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-[10px] font-mono text-textMuted break-all bg-surface/50 px-2 py-1 rounded">
                                            {webhookUrl}
                                        </code>
                                        <button
                                            onClick={() => copy(webhookUrl)}
                                            className="p-1.5 text-textMuted hover:text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                                            title="Copy webhook URL"
                                        >
                                            {copied ? (
                                                <Check size={12} weight="bold" className="text-green-400" />
                                            ) : (
                                                <Copy size={12} weight="bold" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={twilioPhoneNumber}
                                    onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                                    placeholder="+1234567890"
                                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                />
                                <p className="text-xs text-textMuted mt-1.5">
                                    Enter the phone number you own in Twilio (E.164 format)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Account SID
                                </label>
                                <input
                                    type="text"
                                    value={twilioAccountSid}
                                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                />
                                <p className="text-xs text-textMuted mt-1.5">
                                    Find this in your{' '}
                                    <a 
                                        href="https://console.twilio.com" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        Twilio Console <ArrowSquareOut size={12} />
                                    </a>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Auth Token
                                </label>
                                <input
                                    type="password"
                                    value={twilioAuthToken}
                                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                                    placeholder="Your Twilio Auth Token"
                                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Label (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="My Twilio Number"
                                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleTwilioImport}
                                disabled={loading || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <CircleNotch size={18} weight="bold" className="animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    'Import Phone Number'
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step 2: Success - Webhook URL & Assistant Assignment */}
                    {step === 'success' && importedPhoneNumber && (
                        <div className="space-y-6">
                            {/* Success Message */}
                            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                                    <Check size={24} weight="bold" className="text-green-400" />
                                </div>
                                <h4 className="text-lg font-medium text-textMain mb-1">Phone Number Verified!</h4>
                                <p className="text-sm text-textMuted">
                                    <span className="font-mono text-primary">{importedPhoneNumber.number}</span> ownership confirmed.
                                </p>
                            </div>

                            {/* IMPORTANT: Webhook URL Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Link size={18} weight="bold" className="text-yellow-400" />
                                    <h4 className="text-sm font-semibold text-textMain">Configure Webhook in Twilio</h4>
                                </div>
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                    <p className="text-xs text-textMuted mb-3">
                                        <strong className="text-yellow-400">Important:</strong> Copy this webhook URL and paste it in your Twilio Console under the phone number settings → "A Call Comes In" → Webhook URL
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-[11px] font-mono text-yellow-300 break-all bg-black/30 px-3 py-2 rounded-lg">
                                            {webhookUrl}
                                        </code>
                                        <button
                                            onClick={() => copy(webhookUrl)}
                                            className="px-3 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
                                            title="Copy webhook URL"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check size={14} weight="bold" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} weight="bold" />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <a 
                                        href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        Open Twilio Phone Numbers Console <ArrowSquareOut size={12} />
                                    </a>
                                </div>
                            </div>

                            {/* Assistant Assignment Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Robot size={18} weight="bold" className="text-primary" />
                                    <h4 className="text-sm font-semibold text-textMain">Connect AI Assistant</h4>
                                </div>
                                <p className="text-xs text-textMuted">
                                    Select an AI assistant to handle incoming calls to this number. The assistant will answer and respond to callers automatically.
                                </p>
                                
                                {assistantAssigned ? (
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                <Check size={16} weight="bold" className="text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-textMain">Assistant Connected!</p>
                                                <p className="text-xs text-textMuted">
                                                    {assistants.find(a => a.id === selectedAssistantId)?.name || 'Assistant'} will now handle calls to this number.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {assistants.length > 0 ? (
                                            <>
                                                <div className="relative">
                                                    <select
                                                        value={selectedAssistantId}
                                                        onChange={(e) => setSelectedAssistantId(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Select an assistant...</option>
                                                        {assistants.map((assistant) => (
                                                            <option key={assistant.id} value={assistant.id}>
                                                                {assistant.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <CaretDown size={16} weight="bold" className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                                                </div>
                                                <button
                                                    onClick={handleAssignAssistant}
                                                    disabled={!selectedAssistantId || assigningAssistant}
                                                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {assigningAssistant ? (
                                                        <>
                                                            <CircleNotch size={18} weight="bold" className="animate-spin" />
                                                            Connecting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Robot size={18} weight="bold" />
                                                            Connect Assistant
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                                <p className="text-sm text-yellow-400">
                                                    No active assistants found. Create an assistant first to handle calls on this number.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'success' && (
                    <div className="flex justify-end gap-3 p-6 border-t border-border/50 bg-surface/30">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PhoneNumberModal;
