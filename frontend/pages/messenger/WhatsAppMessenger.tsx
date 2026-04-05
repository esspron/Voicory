import {
    WhatsappLogo,
    Phone,
    Plus,
    Gear,
    CheckCircle,
    Warning,
    CircleNotch,
    ArrowSquareOut,
    Copy,
    ArrowsClockwise,
    Robot,
    PhoneCall,
    ChatCircle,
    Clock,
    Shield,
    Lightning,
    CaretRight,
    X,
    Info,
    Key,
    Sparkle,
    Eye,
    EyeSlash,
    GlobeHemisphereWest,
    MagnifyingGlass,
    PaperPlaneRight,
    Paperclip,
    UserCircle,
    BookmarkSimple,
    Check,
    ArrowLeft
} from '@phosphor-icons/react';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { API } from '../../lib/constants';
import { authFetch } from '../../lib/api';

import { FadeIn } from '../../components/ui/FadeIn';
import Select from '../../components/ui/Select';
import { getAssistants } from '../../services/voicoryService';
import {
    getWhatsAppConfigs,
    createWhatsAppConfig,
    updateWhatsAppConfig,
    verifyWhatsAppConnection,
    updateCallingSettings
} from '../../services/whatsappService';
import { WhatsAppConfig, Assistant } from '../../types';

// ============================================
// TYPES
// ============================================
interface Conversation {
    id: string;
    config_id: string;
    wa_id: string;
    phone_number: string;
    profile_name?: string;
    last_message_at?: string;
    conversation_window_open?: boolean;
    lastMessage?: {
        content: { body?: string; caption?: string };
        direction: 'inbound' | 'outbound';
        message_type: string;
        message_timestamp: string;
        status: string;
    } | null;
}

interface WaMessage {
    id: string;
    wa_message_id?: string;
    config_id: string;
    from_number: string;
    to_number: string;
    direction: 'inbound' | 'outbound';
    message_type: string;
    content: { body?: string; caption?: string; templateName?: string; mediaUrl?: string };
    status: string;
    is_from_bot?: boolean;
    message_timestamp: string;
    read_at?: string;
}

interface WaTemplate {
    id: string;
    config_id: string;
    template_name: string;
    language: string;
    category: string;
    status: string;
    components: any[];
}

// ============================================
// MAIN COMPONENT
// ============================================

const WhatsAppMessenger: React.FC = () => {
    const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<WhatsAppConfig | null>(null);
    const [verifying, setVerifying] = useState<string | null>(null);

    // Messenger view
    const [messengerConfig, setMessengerConfig] = useState<WhatsAppConfig | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [configsData, assistantsData] = await Promise.all([
            getWhatsAppConfigs(),
            getAssistants()
        ]);
        setConfigs(configsData);
        setAssistants(assistantsData);
        setLoading(false);
    };

    const handleVerifyConnection = async (configId: string) => {
        setVerifying(configId);
        const result = await verifyWhatsAppConnection(configId);
        if (result.success) {
            await loadData();
        }
        setVerifying(null);
    };

    const handleOpenSettings = (config: WhatsAppConfig) => {
        setSelectedConfig(config);
        setShowSettingsModal(true);
    };

    const getStatusBadge = (status: WhatsAppConfig['status']) => {
        switch (status) {
            case 'connected':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                        <CheckCircle size={12} weight="fill" />
                        Connected
                    </span>
                );
            case 'pending':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">
                        <Clock size={12} weight="fill" />
                        Pending
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full">
                        <Warning size={12} weight="fill" />
                        Error
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-400/10 px-2.5 py-1 rounded-full">
                        <Warning size={12} weight="fill" />
                        Disconnected
                    </span>
                );
        }
    };

    const getQualityBadge = (rating?: string) => {
        switch (rating) {
            case 'GREEN':
                return <span className="text-xs text-green-400">High Quality</span>;
            case 'YELLOW':
                return <span className="text-xs text-yellow-400">Medium Quality</span>;
            case 'RED':
                return <span className="text-xs text-red-400">Low Quality</span>;
            default:
                return null;
        }
    };

    // If messenger panel is open, render full-screen messenger
    if (messengerConfig) {
        return (
            <MessengerPanel
                config={messengerConfig}
                assistants={assistants}
                onBack={() => setMessengerConfig(null)}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <CircleNotch className="animate-spin text-primary" size={32} weight="bold" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto relative min-h-screen">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            </div>

            <FadeIn className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-textMain flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                                <WhatsappLogo size={22} weight="fill" className="text-green-500" />
                            </div>
                            WhatsApp Business
                        </h1>
                        <p className="text-textMuted text-sm mt-2 ml-13">
                            Connect your WhatsApp Business account to enable chatbot and calling features.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="p-2.5 bg-surface/80 backdrop-blur-sm border border-border/50 text-textMuted rounded-xl hover:text-primary hover:border-primary/50 transition-all duration-300 disabled:opacity-50"
                            title="Refresh"
                        >
                            <ArrowsClockwise size={18} weight="bold" className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setShowConnectModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.02] transition-all duration-300"
                        >
                            <Plus size={18} weight="bold" />
                            Connect WhatsApp
                        </button>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="group bg-surface/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-blue-500/30 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Robot className="text-blue-400" size={22} weight="duotone" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-textMain">AI Chatbot</h3>
                                <p className="text-xs text-textMuted">Auto-reply with AI</p>
                            </div>
                        </div>
                        <p className="text-sm text-textMuted">
                            Connect your AI assistant to automatically respond to WhatsApp messages 24/7
                        </p>
                    </div>

                    <div className="group bg-surface/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-purple-500/30 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <PhoneCall className="text-purple-400" size={22} weight="duotone" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-textMain">Voice Calling</h3>
                                <p className="text-xs text-textMuted">VoIP calls via WhatsApp</p>
                            </div>
                        </div>
                        <p className="text-sm text-textMuted">
                            Receive and initiate WhatsApp voice calls with AI assistant support
                        </p>
                    </div>

                    <div className="group bg-surface/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-green-500/30 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <ChatCircle className="text-green-400" size={22} weight="duotone" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-textMain">Rich Messages</h3>
                                <p className="text-xs text-textMuted">Interactive content</p>
                            </div>
                        </div>
                        <p className="text-sm text-textMuted">
                            Send templates, buttons, lists, and media messages to engage customers
                        </p>
                    </div>
                </div>

                {/* Connected Accounts */}
                {configs.length > 0 ? (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-textMain">Connected Accounts</h2>
                        {configs.map((config) => (
                            <div
                                key={config.id}
                                className="group bg-surface/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <WhatsappLogo className="text-green-500" size={28} weight="fill" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-textMain">{config.displayName}</h3>
                                                {getStatusBadge(config.status)}
                                            </div>
                                            <p className="text-sm text-textMuted">{config.displayPhoneNumber}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                {getQualityBadge(config.qualityRating)}
                                                {config.messagingLimit && (
                                                    <span className="text-xs text-textMuted">
                                                        {config.messagingLimit.toLocaleString()} msgs/day
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleVerifyConnection(config.id)}
                                            disabled={verifying === config.id}
                                            className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                                            title="Verify Connection"
                                        >
                                            {verifying === config.id ? (
                                                <CircleNotch size={18} weight="bold" className="animate-spin" />
                                            ) : (
                                                <ArrowsClockwise size={18} weight="bold" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleOpenSettings(config)}
                                            className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                                            title="Settings"
                                        >
                                            <Gear size={18} weight="duotone" />
                                        </button>
                                    </div>
                                </div>

                                {/* Features Status */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${config.chatbotEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        <span className="text-sm text-textMuted">Chatbot</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${config.callingEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        <span className="text-sm text-textMuted">Calling</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${config.callSettings?.inboundCallsEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        <span className="text-sm text-textMuted">Inbound Calls</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${config.callSettings?.outboundCallsEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        <span className="text-sm text-textMuted">Outbound Calls</span>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        onClick={() => handleOpenSettings(config)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all duration-200 text-sm font-medium"
                                    >
                                        <Gear size={16} weight="duotone" />
                                        Configure
                                    </button>
                                    {/* VIEW CHATS — wired to open full messenger panel */}
                                    <button
                                        onClick={() => setMessengerConfig(config)}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500/20 transition-all duration-200 text-sm font-medium"
                                    >
                                        <ChatCircle size={16} weight="duotone" />
                                        View Chats
                                    </button>
                                    {config.callingEnabled && (
                                        <button
                                            className="flex items-center gap-2 px-4 py-2 bg-surfaceHover text-textMain rounded-xl hover:bg-surfaceHover/80 transition-all duration-200 text-sm"
                                        >
                                            <Phone size={16} weight="duotone" />
                                            Call History
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="relative bg-surface/30 backdrop-blur-xl border border-border/50 rounded-2xl p-12 text-center overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-4 right-4 text-green-500/20">
                            <Sparkle size={24} weight="fill" />
                        </div>
                        <div className="absolute bottom-4 left-4 text-green-500/20">
                            <Sparkle size={16} weight="fill" />
                        </div>

                        <div className="relative">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <WhatsappLogo className="text-green-500" size={40} weight="fill" />
                            </div>
                            <h3 className="text-xl font-semibold text-textMain mb-2">
                                Connect Your WhatsApp Business Account
                            </h3>
                            <p className="text-textMuted mb-6 max-w-md mx-auto">
                                Link your WhatsApp Business account to enable AI-powered chatbot responses and voice calling features.
                            </p>
                            <button
                                onClick={() => setShowConnectModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.02] transition-all duration-300"
                            >
                                <Plus size={18} weight="bold" />
                                Connect WhatsApp Business
                            </button>
                        </div>
                    </div>
                )}
            </FadeIn>

            {/* Connect Modal */}
            {showConnectModal && (
                <ConnectWhatsAppModal
                    onClose={() => setShowConnectModal(false)}
                    onSuccess={loadData}
                />
            )}

            {/* Settings Modal */}
            {showSettingsModal && selectedConfig && (
                <WhatsAppSettingsModal
                    config={selectedConfig}
                    assistants={assistants}
                    onClose={() => {
                        setShowSettingsModal(false);
                        setSelectedConfig(null);
                    }}
                    onUpdate={loadData}
                />
            )}
        </div>
    );
};

// ============================================
// MESSENGER PANEL — Full Chat UI
// ============================================

interface MessengerPanelProps {
    config: WhatsAppConfig;
    assistants: Assistant[];
    onBack: () => void;
}

const MessengerPanel: React.FC<MessengerPanelProps> = ({ config, assistants, onBack }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConvs, setFilteredConvs] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<WaMessage[]>([]);
    const [templates, setTemplates] = useState<WaTemplate[]>([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
        loadTemplates();
    }, []);

    // Filter conversations by search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredConvs(conversations);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredConvs(conversations.filter(c =>
                c.profile_name?.toLowerCase().includes(q) ||
                c.phone_number?.toLowerCase().includes(q)
            ));
        }
    }, [searchQuery, conversations]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        setLoadingConvs(true);
        try {
            const resp = await authFetch(`/api/whatsapp/conversations?configId=${config.id}`);
            if (resp.ok) {
                const data = await resp.json();
                setConversations(data.conversations || []);
            } else {
                const err = await resp.json().catch(() => ({}));
                setError(err.error || 'Failed to load conversations');
            }
        } catch (e: any) {
            setError(e.message);
        }
        setLoadingConvs(false);
    };

    const loadTemplates = async () => {
        try {
            const resp = await authFetch(`/api/whatsapp/templates/${config.id}`);
            if (resp.ok) {
                const data = await resp.json();
                setTemplates(data.templates || []);
            }
        } catch (_) {}
    };

    const openConversation = async (conv: Conversation) => {
        setActiveConv(conv);
        setLoadingMsgs(true);
        setMessages([]);
        try {
            const resp = await authFetch(`/api/whatsapp/messages/${config.id}/${conv.wa_id}`);
            if (resp.ok) {
                const data = await resp.json();
                setMessages(data.messages || []);
            }
        } catch (e: any) {
            setError(e.message);
        }
        setLoadingMsgs(false);
    };

    const sendTextMessage = async () => {
        if (!activeConv || !messageText.trim() || sendingMsg) return;
        setSendingMsg(true);
        setError('');
        const text = messageText.trim();
        setMessageText('');
        try {
            const resp = await authFetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    configId: config.id,
                    to: activeConv.wa_id,
                    type: 'text',
                    content: text
                })
            });
            const data = await resp.json();
            if (!resp.ok) {
                setError(data.error || 'Failed to send message');
                setMessageText(text); // restore
            } else {
                // Optimistically append
                setMessages(prev => [...prev, {
                    id: data.message?.id || Date.now().toString(),
                    wa_message_id: data.waMessageId,
                    config_id: config.id,
                    from_number: config.displayPhoneNumber || '',
                    to_number: activeConv.phone_number,
                    direction: 'outbound',
                    message_type: 'text',
                    content: { body: text },
                    status: 'sent',
                    is_from_bot: false,
                    message_timestamp: new Date().toISOString()
                }]);
            }
        } catch (e: any) {
            setError(e.message);
            setMessageText(text);
        }
        setSendingMsg(false);
    };

    const sendTemplate = async (template: WaTemplate) => {
        if (!activeConv || sendingMsg) return;
        setSendingMsg(true);
        setError('');
        setShowTemplates(false);
        try {
            const resp = await authFetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    configId: config.id,
                    to: activeConv.wa_id,
                    type: 'template',
                    templateName: template.template_name,
                    templateLanguage: template.language,
                    templateComponents: []
                })
            });
            const data = await resp.json();
            if (!resp.ok) {
                setError(data.error || 'Failed to send template');
            } else {
                setMessages(prev => [...prev, {
                    id: data.message?.id || Date.now().toString(),
                    wa_message_id: data.waMessageId,
                    config_id: config.id,
                    from_number: config.displayPhoneNumber || '',
                    to_number: activeConv.phone_number,
                    direction: 'outbound',
                    message_type: 'template',
                    content: { templateName: template.template_name },
                    status: 'sent',
                    is_from_bot: false,
                    message_timestamp: new Date().toISOString()
                }]);
            }
        } catch (e: any) {
            setError(e.message);
        }
        setSendingMsg(false);
    };

    const sendMedia = async (_file: File) => {
        if (!activeConv || sendingMsg) return;
        setSendingMsg(true);
        setError('');
        try {
            // Determine media type (not yet used — media needs public URL)
            // let type = 'document';
            // if (file.type.startsWith('image/')) type = 'image';
            // else if (file.type.startsWith('video/')) type = 'video';
            // else if (file.type.startsWith('audio/')) type = 'audio';

            // Upload to get a public URL (use backend upload endpoint if available, otherwise show error)
            // For now, send as document with a note — media requires a publicly accessible URL or WhatsApp Media ID
            setError('Media send requires a public URL or WhatsApp Media ID. Please use the template or text for now, or upload media to WhatsApp separately first.');
        } catch (e: any) {
            setError(e.message);
        }
        setSendingMsg(false);
    };

    const markAsRead = async (msg: WaMessage) => {
        if (!msg.wa_message_id || msg.direction !== 'inbound') return;
        try {
            await authFetch(`/api/whatsapp/mark-read/${config.id}/${msg.wa_message_id}`, {
                method: 'POST'
            });
            setMessages(prev => prev.map(m =>
                m.wa_message_id === msg.wa_message_id ? { ...m, status: 'read' } : m
            ));
        } catch (_) {}
    };

    const assignAssistant = async (assistantId: string) => {
        if (!activeConv) return;
        setShowAssignModal(false);
        try {
            await authFetch(`/api/whatsapp/conversations/${config.id}/${activeConv.wa_id}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assistantId })
            });
        } catch (_) {}
    };

    const formatTime = (ts: string) => {
        try {
            const d = new Date(ts);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const getMessagePreview = (conv: Conversation) => {
        if (!conv.lastMessage) return 'No messages yet';
        const { content, direction, message_type } = conv.lastMessage;
        const prefix = direction === 'outbound' ? 'You: ' : '';
        if (message_type === 'text') return `${prefix}${content.body || ''}`;
        if (message_type === 'template') return `${prefix}📋 Template`;
        if (message_type === 'image') return `${prefix}📷 Image`;
        if (message_type === 'video') return `${prefix}🎥 Video`;
        if (message_type === 'audio') return `${prefix}🎤 Audio`;
        if (message_type === 'document') return `${prefix}📎 Document`;
        return `${prefix}${message_type}`;
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar — Conversations list */}
            <div className="w-80 flex-shrink-0 border-r border-border flex flex-col bg-surface/50">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={onBack}
                            className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-textMain transition-colors"
                            title="Back"
                        >
                            <ArrowLeft size={18} weight="bold" />
                        </button>
                        <div className="flex items-center gap-2 flex-1">
                            <WhatsappLogo size={20} weight="fill" className="text-green-500" />
                            <span className="font-semibold text-textMain text-sm truncate">{config.displayName}</span>
                        </div>
                        <button
                            onClick={loadConversations}
                            className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-primary transition-colors"
                            title="Refresh"
                        >
                            <ArrowsClockwise size={16} weight="bold" className={loadingConvs ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    {/* Search conversations */}
                    <div className="relative">
                        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full pl-9 pr-3 py-2 bg-background border border-border/50 rounded-lg text-sm text-textMain placeholder-textMuted outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Conversations list */}
                <div className="flex-1 overflow-y-auto">
                    {loadingConvs ? (
                        <div className="flex items-center justify-center h-32">
                            <CircleNotch className="animate-spin text-primary" size={24} weight="bold" />
                        </div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="p-6 text-center text-textMuted text-sm">
                            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                        </div>
                    ) : (
                        filteredConvs.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => openConversation(conv)}
                                className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left border-b border-border/30 ${
                                    activeConv?.id === conv.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center flex-shrink-0">
                                    <UserCircle size={22} className="text-green-400" weight="fill" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-textMain text-sm truncate">
                                            {conv.profile_name || conv.phone_number}
                                        </span>
                                        {conv.lastMessage && (
                                            <span className="text-xs text-textMuted flex-shrink-0 ml-2">
                                                {formatTime(conv.lastMessage.message_timestamp)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-textMuted truncate mt-0.5">
                                        {getMessagePreview(conv)}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeConv ? (
                    <>
                        {/* Chat header */}
                        <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-surface/50">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center">
                                <UserCircle size={20} className="text-green-400" weight="fill" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-textMain text-sm">
                                    {activeConv.profile_name || activeConv.phone_number}
                                </h3>
                                <p className="text-xs text-textMuted">{activeConv.phone_number}</p>
                            </div>
                            {/* Assign to assistant */}
                            <button
                                onClick={() => setShowAssignModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs font-medium"
                                title="Assign to AI Assistant"
                            >
                                <Robot size={14} weight="duotone" />
                                Assign AI
                            </button>
                            {/* Mark all as read */}
                            <button
                                onClick={() => {
                                    const unread = messages.filter(m => m.direction === 'inbound' && m.status !== 'read');
                                    unread.forEach(m => markAsRead(m));
                                }}
                                className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Mark all as read"
                            >
                                <Check size={16} weight="bold" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                            {loadingMsgs ? (
                                <div className="flex items-center justify-center h-full">
                                    <CircleNotch className="animate-spin text-primary" size={24} weight="bold" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-textMuted">
                                    <ChatCircle size={40} weight="duotone" className="mb-3 opacity-50" />
                                    <p className="text-sm">No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                                                msg.direction === 'outbound'
                                                    ? 'bg-primary text-black rounded-br-sm'
                                                    : 'bg-surface border border-border/50 text-textMain rounded-bl-sm'
                                            }`}
                                        >
                                            {msg.message_type === 'text' && (
                                                <p className="break-words">{msg.content.body}</p>
                                            )}
                                            {msg.message_type === 'template' && (
                                                <p className="break-words italic">
                                                    📋 Template: {msg.content.templateName || 'sent'}
                                                </p>
                                            )}
                                            {['image', 'video', 'audio', 'document'].includes(msg.message_type) && (
                                                <p className="break-words italic">
                                                    {msg.message_type === 'image' ? '📷' : msg.message_type === 'video' ? '🎥' : msg.message_type === 'audio' ? '🎤' : '📎'}
                                                    {' '}{msg.content.caption || msg.message_type}
                                                </p>
                                            )}
                                            <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                                <span className={`text-xs ${msg.direction === 'outbound' ? 'text-black/60' : 'text-textMuted'}`}>
                                                    {formatTime(msg.message_timestamp)}
                                                </span>
                                                {msg.direction === 'outbound' && (
                                                    <span className="text-xs text-black/60">
                                                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                                {msg.is_from_bot && (
                                                    <Robot size={10} weight="fill" className={msg.direction === 'outbound' ? 'text-black/60' : 'text-textMuted'} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="mx-5 mb-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                                <span className="text-red-400 text-xs">{error}</span>
                                <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-3">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Template picker */}
                        {showTemplates && (
                            <div className="mx-5 mb-2 bg-surface border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                                    <span className="text-xs font-medium text-textMuted">Approved Templates</span>
                                    <button onClick={() => setShowTemplates(false)} className="text-textMuted hover:text-textMain">
                                        <X size={14} />
                                    </button>
                                </div>
                                {templates.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-textMuted">
                                        No approved templates found.{' '}
                                        <button
                                            onClick={async () => {
                                                await authFetch(`/api/whatsapp/templates/${config.id}?sync=true`);
                                                loadTemplates();
                                            }}
                                            className="text-primary hover:underline"
                                        >
                                            Sync from WhatsApp
                                        </button>
                                    </div>
                                ) : (
                                    templates.map(tmpl => (
                                        <button
                                            key={tmpl.id}
                                            onClick={() => sendTemplate(tmpl)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors border-b border-border/30 last:border-0"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-textMain font-medium">{tmpl.template_name}</span>
                                                <span className="text-xs text-textMuted">{tmpl.language}</span>
                                            </div>
                                            <span className="text-xs text-textMuted">{tmpl.category}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Input bar */}
                        <div className="px-5 py-3 border-t border-border bg-surface/50">
                            <div className="flex items-end gap-2">
                                {/* Template button */}
                                <button
                                    onClick={() => { setShowTemplates(!showTemplates); }}
                                    className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                                        showTemplates ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-primary hover:bg-primary/10'
                                    }`}
                                    title="Use template"
                                >
                                    <BookmarkSimple size={20} weight="duotone" />
                                </button>

                                {/* Media/Attachment button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 rounded-xl text-textMuted hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                                    title="Send media (image, document, etc.)"
                                >
                                    <Paperclip size={20} weight="duotone" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xlsx,.csv"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) sendMedia(file);
                                        e.target.value = '';
                                    }}
                                />

                                {/* Text input */}
                                <textarea
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendTextMessage();
                                        }
                                    }}
                                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                                    rows={1}
                                    className="flex-1 px-4 py-2.5 bg-background border border-border/50 rounded-xl text-textMain placeholder-textMuted outline-none focus:border-primary/50 transition-colors text-sm resize-none"
                                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                                />

                                {/* Send button */}
                                <button
                                    onClick={sendTextMessage}
                                    disabled={!messageText.trim() || sendingMsg}
                                    className="p-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
                                    title="Send message"
                                >
                                    {sendingMsg ? (
                                        <CircleNotch size={20} weight="bold" className="animate-spin" />
                                    ) : (
                                        <PaperPlaneRight size={20} weight="fill" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* No conversation selected */
                    <div className="flex-1 flex flex-col items-center justify-center text-textMuted">
                        <WhatsappLogo size={56} weight="fill" className="text-green-500/30 mb-4" />
                        <h3 className="text-lg font-semibold text-textMain mb-1">WhatsApp Messenger</h3>
                        <p className="text-sm text-textMuted">{config.displayPhoneNumber}</p>
                        <p className="text-sm mt-3">Select a conversation from the left panel to start messaging</p>
                    </div>
                )}
            </div>

            {/* Assign Assistant Modal */}
            {showAssignModal && activeConv && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
                    <div className="bg-surface border border-border rounded-xl w-80">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-semibold text-textMain">Assign AI Assistant</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-textMuted hover:text-textMain">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {assistants.length === 0 ? (
                                <p className="text-sm text-textMuted">No assistants available. Create one first.</p>
                            ) : assistants.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => assignAssistant(a.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-white/5 rounded-xl transition-colors text-left"
                                >
                                    <Robot size={18} weight="duotone" className="text-primary" />
                                    <span className="text-sm text-textMain">{a.name}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => assignAssistant('')}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-white/5 rounded-xl transition-colors text-left mt-2"
                            >
                                <X size={18} className="text-textMuted" />
                                <span className="text-sm text-textMuted">Unassign (use config default)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// CONNECT WHATSAPP MODAL
// ============================================

interface ConnectModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const ConnectWhatsAppModal: React.FC<ConnectModalProps> = ({ onClose, onSuccess }) => {
    const [connectionMethod, setConnectionMethod] = useState<'choose' | 'oauth' | 'manual'>('choose');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [oauthStatus, setOauthStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState({
        wabaId: '',
        phoneNumberId: '',
        displayPhoneNumber: '',
        displayName: '',
        accessToken: '',
        appId: '',
        appSecret: ''
    });

    // Facebook SDK Configuration
    const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';
    const FB_CONFIG_ID = import.meta.env.VITE_FACEBOOK_CONFIG_ID || '';

    // Initialize Facebook SDK
    useEffect(() => {
        if (connectionMethod === 'oauth' && FB_APP_ID) {
            loadFacebookSDK();
        }
    }, [connectionMethod]);

    const loadFacebookSDK = () => {
        if ((window as any).FB) return;
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            (window as any).FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v21.0'
            });
        };
        document.body.appendChild(script);
    };

    const handleFacebookLogin = () => {
        setOauthStatus('connecting');
        setError('');
        const FB = (window as any).FB;
        if (!FB) {
            setError('Facebook SDK not loaded. Please try again.');
            setOauthStatus('error');
            return;
        }
        FB.login(
            (response: any) => {
                if (response.authResponse) {
                    handleOAuthSuccess(response.authResponse);
                } else {
                    setError('Facebook login was cancelled or failed.');
                    setOauthStatus('error');
                }
            },
            {
                config_id: FB_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: { setup: {}, featureType: '', sessionInfoVersion: '3' }
            }
        );
    };

    const handleOAuthSuccess = async (authResponse: any) => {
        try {
            const response = await authFetch('/api/whatsapp/oauth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: authResponse.code,
                    accessToken: authResponse.accessToken
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details || 'Failed to complete OAuth');
            }
            const data = await response.json();
            const result = await createWhatsAppConfig({
                wabaId: data.wabaId,
                phoneNumberId: data.phoneNumberId,
                displayPhoneNumber: data.displayPhoneNumber,
                displayName: data.displayName,
                accessToken: data.accessToken,
                appId: FB_APP_ID
            });
            if (result) {
                setOauthStatus('success');
                setTimeout(() => { onSuccess(); onClose(); }, 1500);
            } else {
                throw new Error('Failed to save WhatsApp configuration');
            }
        } catch (err: any) {
            console.error('OAuth error:', err);
            setError(err.message || 'Failed to complete connection');
            setOauthStatus('error');
        }
    };

    const handleManualSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await createWhatsAppConfig(formData);
            if (result) {
                onSuccess();
                onClose();
            } else {
                setError('Failed to connect WhatsApp. Please check your credentials.');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        }
        setLoading(false);
    };

    const resetModal = () => {
        setConnectionMethod('choose');
        setStep(1);
        setError('');
        setOauthStatus('idle');
        setFormData({ wabaId: '', phoneNumberId: '', displayPhoneNumber: '', displayName: '', accessToken: '', appId: '', appSecret: '' });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-surface border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                            <WhatsappLogo className="text-green-500" size={20} weight="fill" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-textMain">Connect WhatsApp Business</h2>
                            <p className="text-xs text-textMuted">
                                {connectionMethod === 'choose' && 'Choose your connection method'}
                                {connectionMethod === 'oauth' && 'Connect with Facebook'}
                                {connectionMethod === 'manual' && `Step ${step} of 2 - Manual Setup`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-textMuted hover:text-textMain"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {connectionMethod === 'choose' && (
                        <div className="space-y-4">
                            <p className="text-sm text-textMuted mb-6">Choose how you want to connect your WhatsApp Business account</p>
                            <button onClick={() => setConnectionMethod('oauth')} className="w-full p-4 bg-background border-2 border-border rounded-xl hover:border-primary/50 transition-all group text-left">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-textMain">Continue with Facebook</h3>
                                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Recommended</span>
                                        </div>
                                        <p className="text-sm text-textMuted mt-1">One-click setup via Facebook Business.</p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-textMuted">
                                            <span className="flex items-center gap-1"><Sparkle size={12} className="text-primary" weight="fill" />Quick setup</span>
                                            <span className="flex items-center gap-1"><Shield size={12} className="text-green-400" />Secure OAuth</span>
                                            <span className="flex items-center gap-1"><Lightning size={12} className="text-yellow-400" weight="fill" />Auto-config</span>
                                        </div>
                                    </div>
                                    <CaretRight size={20} className="text-textMuted group-hover:text-primary transition-colors" weight="bold" />
                                </div>
                            </button>
                            <button onClick={() => setConnectionMethod('manual')} className="w-full p-4 bg-background border-2 border-border rounded-xl hover:border-primary/50 transition-all group text-left">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-surfaceHover rounded-xl flex items-center justify-center shrink-0">
                                        <Key className="text-textMuted" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-textMain">Manual Setup</h3>
                                        <p className="text-sm text-textMuted mt-1">Enter credentials manually. Best for advanced users.</p>
                                    </div>
                                    <CaretRight size={20} className="text-textMuted group-hover:text-primary transition-colors" weight="bold" />
                                </div>
                            </button>
                            <div className="pt-4 border-t border-border">
                                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                    <Info size={14} />Learn more about WhatsApp Business API setup<ArrowSquareOut size={12} />
                                </a>
                            </div>
                        </div>
                    )}

                    {connectionMethod === 'oauth' && (
                        <div className="space-y-6">
                            {oauthStatus === 'idle' && (
                                <>
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                            <div className="text-sm">
                                                <p className="text-blue-400 font-medium">What happens next?</p>
                                                <ul className="text-textMuted mt-2 space-y-1">
                                                    <li>• A Facebook popup will open</li>
                                                    <li>• Log in to your Facebook Business account</li>
                                                    <li>• Select or create a WhatsApp Business Account</li>
                                                    <li>• Choose a phone number to connect</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    {!FB_APP_ID && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <Warning className="text-yellow-400 shrink-0 mt-0.5" size={18} weight="fill" />
                                                <div className="text-sm">
                                                    <p className="text-yellow-400 font-medium">Configuration Required</p>
                                                    <p className="text-textMuted mt-1">Facebook OAuth requires <code className="text-xs bg-background px-1 py-0.5 rounded">VITE_FACEBOOK_APP_ID</code>. Use Manual Setup instead.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <button onClick={handleFacebookLogin} disabled={!FB_APP_ID} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#1877F2] text-white font-semibold rounded-xl hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        Continue with Facebook
                                    </button>
                                </>
                            )}
                            {oauthStatus === 'connecting' && (
                                <div className="text-center py-8">
                                    <CircleNotch className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                                    <h3 className="font-semibold text-textMain">Connecting to Facebook...</h3>
                                    <p className="text-sm text-textMuted mt-1">Complete the setup in the popup window</p>
                                </div>
                            )}
                            {oauthStatus === 'success' && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="font-semibold text-textMain">Connected Successfully!</h3>
                                </div>
                            )}
                            {oauthStatus === 'error' && error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {connectionMethod === 'manual' && (
                        <>
                            {step === 1 && (
                                <div className="space-y-4">
                                    {[
                                        { label: 'WhatsApp Business Account ID', key: 'wabaId', placeholder: 'e.g., 123456789012345' },
                                        { label: 'Phone Number ID', key: 'phoneNumberId', placeholder: 'e.g., 123456789012345' },
                                        { label: 'Display Phone Number', key: 'displayPhoneNumber', placeholder: 'e.g., +1 555-123-4567' },
                                        { label: 'Business Display Name', key: 'displayName', placeholder: 'e.g., My Business' },
                                    ].map(field => (
                                        <div key={field.key}>
                                            <label className="block text-sm font-medium text-textMain mb-2">{field.label}</label>
                                            <input type="text" value={(formData as any)[field.key]} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder-textMuted outline-none focus:border-primary/50 transition-all duration-200" />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">Permanent Access Token</label>
                                        <textarea value={formData.accessToken} onChange={e => setFormData({ ...formData, accessToken: e.target.value })} placeholder="Paste your permanent (System User) access token here" rows={3} className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder-textMuted outline-none focus:border-primary/50 transition-all duration-200 font-mono text-sm" />
                                    </div>
                                </div>
                            )}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">App ID (Optional)</label>
                                        <input type="text" value={formData.appId} onChange={e => setFormData({ ...formData, appId: e.target.value })} placeholder="e.g., 123456789012345" className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder-textMuted outline-none focus:border-primary/50 transition-all duration-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">App Secret (Optional)</label>
                                        <input type="password" value={formData.appSecret || ''} onChange={e => setFormData({ ...formData, appSecret: e.target.value })} placeholder="Your app secret for webhook verification" className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder-textMuted outline-none focus:border-primary/50 transition-all duration-200" />
                                    </div>
                                    {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"><p className="text-red-400 text-sm">{error}</p></div>}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border">
                    {connectionMethod === 'choose' ? (
                        <button onClick={onClose} className="px-4 py-2 text-textMuted hover:text-textMain transition-colors">Cancel</button>
                    ) : connectionMethod === 'oauth' ? (
                        <>
                            <button onClick={resetModal} className="px-4 py-2 text-textMuted hover:text-textMain transition-colors">← Back</button>
                            {oauthStatus === 'error' && (
                                <button onClick={() => setOauthStatus('idle')} className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg transition-colors">Try Again</button>
                            )}
                        </>
                    ) : (
                        <>
                            {step > 1 ? (
                                <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-textMuted hover:text-textMain transition-colors">Back</button>
                            ) : (
                                <button onClick={resetModal} className="px-4 py-2 text-textMuted hover:text-textMain transition-colors">← Back</button>
                            )}
                            {step < 2 ? (
                                <button onClick={() => setStep(step + 1)} disabled={!formData.wabaId || !formData.phoneNumberId || !formData.displayPhoneNumber || !formData.displayName} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    Continue<CaretRight size={16} weight="bold" />
                                </button>
                            ) : (
                                <button onClick={handleManualSubmit} disabled={loading || !formData.accessToken} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {loading ? <><CircleNotch size={16} className="animate-spin" />Connecting...</> : <><CheckCircle size={16} />Connect</>}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ============================================
// WHATSAPP SETTINGS MODAL
// ============================================

interface SettingsModalProps {
    config: WhatsAppConfig;
    assistants: Assistant[];
    onClose: () => void;
    onUpdate: () => void;
}

const SERVER_REGIONS = [
    { id: 'INDIA', label: 'India (Asia South)', flag: '🇮🇳', url: API.BACKEND_URLS.INDIA },
    { id: 'USA', label: 'USA (US Central)', flag: '🇺🇸', url: API.BACKEND_URLS.USA },
    { id: 'EUROPE', label: 'Europe (EU West)', flag: '🇪🇺', url: API.BACKEND_URLS.EUROPE },
] as const;

const WhatsAppSettingsModal: React.FC<SettingsModalProps> = ({ config, assistants, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'chatbot' | 'calling' | 'webhook'>('general');
    const [loading, setLoading] = useState(false);
    const [showVerifyToken, setShowVerifyToken] = useState(false);
    const [serverRegion, setServerRegion] = useState<'INDIA' | 'USA' | 'EUROPE'>('INDIA');
    const [settings, setSettings] = useState({
        chatbotEnabled: config.chatbotEnabled,
        assistantId: config.assistantId || '',
        callingEnabled: config.callingEnabled,
        callSettings: config.callSettings || { inboundCallsEnabled: false, outboundCallsEnabled: false, callbackRequestEnabled: false }
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateWhatsAppConfig(config.id, {
                chatbotEnabled: settings.chatbotEnabled,
                assistantId: settings.assistantId || null,
                callingEnabled: settings.callingEnabled
            });
            if (settings.callingEnabled) {
                await updateCallingSettings(config.id, settings.callSettings);
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
        }
        setLoading(false);
    };

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-surface border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                            <Gear className="text-green-500" size={20} weight="fill" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-textMain">{config.displayName}</h2>
                            <p className="text-xs text-textMuted">{config.displayPhoneNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-textMuted hover:text-textMain"><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-white/5 px-6 py-2">
                    {[
                        { id: 'general', label: 'General', icon: Gear },
                        { id: 'chatbot', label: 'Chatbot', icon: Robot },
                        { id: 'calling', label: 'Calling', icon: PhoneCall },
                        { id: 'webhook', label: 'Webhook', icon: Lightning }
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5' : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'}`}>
                                <tab.icon size={16} weight={isActive ? "fill" : "regular"} className={isActive ? 'text-primary' : 'group-hover:text-primary'} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-textMain mb-4">Account Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs text-textMuted mb-1">WABA ID</label><p className="text-sm text-textMain font-mono">{config.wabaId}</p></div>
                                    <div><label className="block text-xs text-textMuted mb-1">Phone Number ID</label><p className="text-sm text-textMain font-mono">{config.phoneNumberId}</p></div>
                                    <div><label className="block text-xs text-textMuted mb-1">Status</label><p className="text-sm capitalize text-textMain">{config.status}</p></div>
                                    <div><label className="block text-xs text-textMuted mb-1">Quality Rating</label><p className="text-sm text-textMain">{config.qualityRating || 'Unknown'}</p></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chatbot' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-textMain">Enable AI Chatbot</h3>
                                    <p className="text-sm text-textMuted mt-1">Automatically respond to incoming messages using an AI assistant</p>
                                </div>
                                <button onClick={() => setSettings({ ...settings, chatbotEnabled: !settings.chatbotEnabled })} className={`w-12 h-6 rounded-full transition-colors ${settings.chatbotEnabled ? 'bg-primary' : 'bg-gray-600'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${settings.chatbotEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            {settings.chatbotEnabled && (
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">Select Assistant</label>
                                    <Select
                                        value={assistants.map(a => ({ value: a.id, label: a.name })).find(o => o.value === settings.assistantId) || { value: '', label: 'Select an assistant...' }}
                                        onChange={(option) => setSettings({ ...settings, assistantId: option.value })}
                                        options={[{ value: '', label: 'Select an assistant...' }, ...assistants.map(a => ({ value: a.id, label: a.name }))]}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'calling' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-textMain">Enable Calling</h3>
                                    <p className="text-sm text-textMuted mt-1">Allow voice calls through WhatsApp</p>
                                </div>
                                <button onClick={() => setSettings({ ...settings, callingEnabled: !settings.callingEnabled })} className={`w-12 h-6 rounded-full transition-colors ${settings.callingEnabled ? 'bg-primary' : 'bg-gray-600'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${settings.callingEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            {settings.callingEnabled && (
                                <div className="space-y-4 pt-4 border-t border-border">
                                    {[
                                        { key: 'inboundCallsEnabled', label: 'Inbound Calls', desc: 'Receive calls from customers' },
                                        { key: 'outboundCallsEnabled', label: 'Outbound Calls', desc: 'Initiate calls to customers' },
                                        { key: 'callbackRequestEnabled', label: 'Callback Requests', desc: 'Allow users to request a callback' }
                                    ].map(toggle => (
                                        <div key={toggle.key} className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-textMain">{toggle.label}</h4>
                                                <p className="text-xs text-textMuted">{toggle.desc}</p>
                                            </div>
                                            <button onClick={() => setSettings({ ...settings, callSettings: { ...settings.callSettings, [toggle.key]: !(settings.callSettings as any)[toggle.key] } })} className={`w-10 h-5 rounded-full transition-colors ${(settings.callSettings as any)[toggle.key] ? 'bg-primary' : 'bg-gray-600'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${(settings.callSettings as any)[toggle.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'webhook' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-textMain mb-4">Webhook Configuration</h3>
                                <p className="text-sm text-textMuted mb-4">Configure these settings in your Meta App Dashboard.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    <div className="flex items-center gap-2"><GlobeHemisphereWest size={16} className="text-primary" />Server Region</div>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SERVER_REGIONS.map((region) => (
                                        <button key={region.id} onClick={() => setServerRegion(region.id as typeof serverRegion)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${serverRegion === region.id ? 'bg-primary/10 border-primary/30 text-textMain' : 'bg-background border-border text-textMuted hover:border-primary/20'}`}>
                                            <span className="text-lg">{region.flag}</span>
                                            <span className="text-sm font-medium">{region.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">Webhook URL</label>
                                <div className="flex items-center gap-2">
                                    <input type="text" readOnly value={`${SERVER_REGIONS.find(r => r.id === serverRegion)?.url}/api/webhooks/whatsapp`} className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-textMain font-mono text-sm" />
                                    <button onClick={() => copyToClipboard(`${SERVER_REGIONS.find(r => r.id === serverRegion)?.url}/api/webhooks/whatsapp`)} className="p-2.5 bg-surfaceHover rounded-lg hover:bg-surfaceHover/80 transition-colors"><Copy size={18} className="text-textMuted" /></button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">Verify Token</label>
                                <div className="flex items-center gap-2">
                                    <input type={showVerifyToken ? "text" : "password"} readOnly value={config.webhookVerifyToken} className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-textMain font-mono text-sm" />
                                    <button onClick={() => setShowVerifyToken(!showVerifyToken)} className="p-2.5 bg-surfaceHover rounded-lg hover:bg-surfaceHover/80 transition-colors">
                                        {showVerifyToken ? <EyeSlash size={18} className="text-textMuted" /> : <Eye size={18} className="text-textMuted" />}
                                    </button>
                                    <button onClick={() => copyToClipboard(config.webhookVerifyToken)} className="p-2.5 bg-surfaceHover rounded-lg hover:bg-surfaceHover/80 transition-colors"><Copy size={18} className="text-textMuted" /></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 text-textMuted hover:text-textMain transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition-colors">
                        {loading ? <><CircleNotch size={16} className="animate-spin" />Saving...</> : <><CheckCircle size={16} />Save Changes</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default WhatsAppMessenger;
