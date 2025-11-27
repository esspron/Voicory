import React, { useState, useEffect } from 'react';
import {
    MessageCircle,
    Phone,
    Plus,
    Settings,
    CheckCircle,
    AlertCircle,
    Loader2,
    ExternalLink,
    Copy,
    RefreshCw,
    Bot,
    PhoneCall,
    MessageSquare,
    Clock,
    Users,
    TrendingUp,
    Shield,
    Zap,
    ChevronRight,
    X,
    Info,
    KeyRound,
    Sparkles
} from 'lucide-react';
import {
    getWhatsAppConfigs,
    createWhatsAppConfig,
    updateWhatsAppConfig,
    deleteWhatsAppConfig,
    verifyWhatsAppConnection,
    updateCallingSettings
} from '../../services/whatsappService';
import { getAssistants } from '../../services/callyyService';
import { WhatsAppConfig, WhatsAppCallSettings, Assistant } from '../../types';

const WhatsAppMessenger: React.FC = () => {
    const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<WhatsAppConfig | null>(null);
    const [verifying, setVerifying] = useState<string | null>(null);

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
                    <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                        <CheckCircle size={12} />
                        Connected
                    </span>
                );
            case 'pending':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                        <Clock size={12} />
                        Pending
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                        <AlertCircle size={12} />
                        Error
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-400/10 px-2 py-1 rounded-full">
                        <AlertCircle size={12} />
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">
                        WhatsApp Business
                    </h1>
                    <p className="text-textMuted text-sm mt-1">
                        Connect your WhatsApp Business account to enable chatbot and calling features.
                    </p>
                </div>
                <button
                    onClick={() => setShowConnectModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors"
                >
                    <Plus size={18} />
                    Connect WhatsApp
                </button>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Bot className="text-blue-400" size={20} />
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

                <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <PhoneCall className="text-purple-400" size={20} />
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

                <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <MessageSquare className="text-green-400" size={20} />
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
                            className="bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                                        <MessageCircle className="text-green-500" size={24} />
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
                                        className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-colors"
                                        title="Verify Connection"
                                    >
                                        {verifying === config.id ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <RefreshCw size={18} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleOpenSettings(config)}
                                        className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-colors"
                                        title="Settings"
                                    >
                                        <Settings size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Features Status */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
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
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm"
                                >
                                    <Settings size={16} />
                                    Configure
                                </button>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-surfaceHover text-textMain rounded-lg hover:bg-surfaceHover/80 transition-colors text-sm"
                                >
                                    <MessageSquare size={16} />
                                    View Chats
                                </button>
                                {config.callingEnabled && (
                                    <button
                                        className="flex items-center gap-2 px-4 py-2 bg-surfaceHover text-textMain rounded-lg hover:bg-surfaceHover/80 transition-colors text-sm"
                                    >
                                        <Phone size={16} />
                                        Call History
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="bg-surface border border-border rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="text-green-500" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-textMain mb-2">
                        Connect Your WhatsApp Business Account
                    </h3>
                    <p className="text-textMuted mb-6 max-w-md mx-auto">
                        Link your WhatsApp Business account to enable AI-powered chatbot responses and voice calling features.
                    </p>
                    <button
                        onClick={() => setShowConnectModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primaryHover transition-colors"
                    >
                        <Plus size={18} />
                        Connect WhatsApp Business
                    </button>
                </div>
            )}

            {/* Setup Guide */}
            <div className="mt-8 bg-surface border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-textMain mb-4">Setup Guide</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">1</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-textMain text-sm">Create Meta App</h4>
                            <p className="text-xs text-textMuted mt-1">
                                Go to Meta for Developers and create a new app with WhatsApp product
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">2</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-textMain text-sm">Get Access Token</h4>
                            <p className="text-xs text-textMuted mt-1">
                                Generate a permanent access token from the API Setup page
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">3</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-textMain text-sm">Configure Webhooks</h4>
                            <p className="text-xs text-textMuted mt-1">
                                Set up webhooks to receive messages and call events
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">4</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-textMain text-sm">Enable Calling</h4>
                            <p className="text-xs text-textMuted mt-1">
                                Subscribe to calls webhook and enable calling features
                            </p>
                        </div>
                    </div>
                </div>
                <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-primary hover:underline text-sm"
                >
                    Read the full documentation
                    <ExternalLink size={14} />
                </a>
            </div>

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
        // Check if SDK is already loaded
        if ((window as any).FB) return;

        // Load Facebook SDK
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

        // Launch Embedded Signup
        FB.login(
            (response: any) => {
                if (response.authResponse) {
                    // Successfully authenticated
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
                extras: {
                    setup: {},
                    featureType: '',
                    sessionInfoVersion: '3'
                }
            }
        );
    };

    const handleOAuthSuccess = async (authResponse: any) => {
        try {
            // Exchange the code for access token and get WABA details
            // This would typically be done via your backend
            const response = await fetch('/api/whatsapp/oauth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: authResponse.code,
                    accessToken: authResponse.accessToken
                })
            });

            if (!response.ok) {
                throw new Error('Failed to complete OAuth');
            }

            const data = await response.json();

            // Create WhatsApp config with the received data
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
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
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
        setFormData({
            wabaId: '',
            phoneNumberId: '',
            displayPhoneNumber: '',
            displayName: '',
            accessToken: '',
            appId: ''
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <MessageCircle className="text-green-500" size={20} />
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
                    <button onClick={onClose} className="text-textMuted hover:text-textMain">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Choose Connection Method */}
                    {connectionMethod === 'choose' && (
                        <div className="space-y-4">
                            <p className="text-sm text-textMuted mb-6">
                                Choose how you want to connect your WhatsApp Business account
                            </p>

                            {/* Option 1: Facebook OAuth (Recommended) */}
                            <button
                                onClick={() => setConnectionMethod('oauth')}
                                className="w-full p-4 bg-background border-2 border-border rounded-xl hover:border-primary/50 transition-all group text-left"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-textMain">Continue with Facebook</h3>
                                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                                                Recommended
                                            </span>
                                        </div>
                                        <p className="text-sm text-textMuted mt-1">
                                            One-click setup via Facebook Business. Automatically configures everything for you.
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-textMuted">
                                            <span className="flex items-center gap-1">
                                                <Sparkles size={12} className="text-primary" />
                                                Quick setup
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Shield size={12} className="text-green-400" />
                                                Secure OAuth
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Zap size={12} className="text-yellow-400" />
                                                Auto-config
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-textMuted group-hover:text-primary transition-colors" />
                                </div>
                            </button>

                            {/* Option 2: Manual Setup */}
                            <button
                                onClick={() => setConnectionMethod('manual')}
                                className="w-full p-4 bg-background border-2 border-border rounded-xl hover:border-primary/50 transition-all group text-left"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-surfaceHover rounded-xl flex items-center justify-center shrink-0">
                                        <KeyRound className="text-textMuted" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-textMain">Manual Setup</h3>
                                        <p className="text-sm text-textMuted mt-1">
                                            Enter your WhatsApp Business API credentials manually. Best for advanced users.
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-textMuted">
                                            <span className="flex items-center gap-1">
                                                <Settings size={12} />
                                                Full control
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <KeyRound size={12} />
                                                Use existing tokens
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-textMuted group-hover:text-primary transition-colors" />
                                </div>
                            </button>

                            <div className="pt-4 border-t border-border">
                                <a
                                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                    <Info size={14} />
                                    Learn more about WhatsApp Business API setup
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* OAuth Flow */}
                    {connectionMethod === 'oauth' && (
                        <div className="space-y-6">
                            {oauthStatus === 'idle' && (
                                <>
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                            <div className="text-sm">
                                                <p className="text-blue-400 font-medium">What happens next?</p>
                                                <ul className="text-textMuted mt-2 space-y-1">
                                                    <li>• A Facebook popup will open</li>
                                                    <li>• Log in to your Facebook Business account</li>
                                                    <li>• Select or create a WhatsApp Business Account</li>
                                                    <li>• Choose a phone number to connect</li>
                                                    <li>• Verify your phone number via SMS/call</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {!FB_APP_ID && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="text-yellow-400 shrink-0 mt-0.5" size={18} />
                                                <div className="text-sm">
                                                    <p className="text-yellow-400 font-medium">Configuration Required</p>
                                                    <p className="text-textMuted mt-1">
                                                        Facebook OAuth is not configured. Please set <code className="text-xs bg-background px-1 py-0.5 rounded">VITE_FACEBOOK_APP_ID</code> and <code className="text-xs bg-background px-1 py-0.5 rounded">VITE_FACEBOOK_CONFIG_ID</code> environment variables, or use Manual Setup.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleFacebookLogin}
                                        disabled={!FB_APP_ID}
                                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#1877F2] text-white font-semibold rounded-lg hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                        Continue with Facebook
                                    </button>
                                </>
                            )}

                            {oauthStatus === 'connecting' && (
                                <div className="text-center py-8">
                                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                                    <h3 className="font-semibold text-textMain">Connecting to Facebook...</h3>
                                    <p className="text-sm text-textMuted mt-1">
                                        Complete the setup in the popup window
                                    </p>
                                </div>
                            )}

                            {oauthStatus === 'success' && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="font-semibold text-textMain">Connected Successfully!</h3>
                                    <p className="text-sm text-textMuted mt-1">
                                        Your WhatsApp Business account is now connected
                                    </p>
                                </div>
                            )}

                            {oauthStatus === 'error' && error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                                        <div className="text-sm">
                                            <p className="text-red-400 font-medium">Connection Failed</p>
                                            <p className="text-textMuted mt-1">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Setup Flow */}
                    {connectionMethod === 'manual' && (
                        <>
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                            <div className="text-sm">
                                                <p className="text-blue-400 font-medium">Before you begin</p>
                                                <p className="text-textMuted mt-1">
                                                    You need a Meta Business account and a WhatsApp Business API app.
                                                    <a
                                                        href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline ml-1"
                                                    >
                                                        Get started →
                                                    </a>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">
                                            WhatsApp Business Account ID
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.wabaId}
                                            onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                                            placeholder="e.g., 123456789012345"
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">
                                            Phone Number ID
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.phoneNumberId}
                                            onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                                            placeholder="e.g., 123456789012345"
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">
                                            Display Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.displayPhoneNumber}
                                            onChange={(e) => setFormData({ ...formData, displayPhoneNumber: e.target.value })}
                                            placeholder="e.g., +1 555-123-4567"
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">
                                            Business Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            placeholder="e.g., My Business"
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">
                                            Permanent Access Token
                                        </label>
                                        <textarea
                                            value={formData.accessToken}
                                            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                            placeholder="Paste your permanent (System User) access token here"
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                                        />
                                        <p className="text-xs text-textMuted mt-1">
                                            Create a System User in Business Settings → System Users → Generate Token with <code className="bg-surface px-1 rounded">whatsapp_business_messaging</code> permission.
                                            <a
                                                href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-user-access-tokens"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline ml-1"
                                            >
                                                Learn how →
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">
                                            App ID (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.appId}
                                            onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                                            placeholder="e.g., 123456789012345"
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <p className="text-xs text-textMuted mt-1">
                                            Found in Meta for Developers → Your App → App Dashboard
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-textMain mb-2">
                                            App Secret (Optional)
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.appSecret || ''}
                                            onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                                            placeholder="Your app secret for webhook verification"
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <p className="text-xs text-textMuted mt-1">
                                            Required for webhook signature verification. Found in App Settings → Basic.
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                            <p className="text-red-400 text-sm">{error}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border">
                    {connectionMethod === 'choose' ? (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-textMuted hover:text-textMain transition-colors"
                        >
                            Cancel
                        </button>
                    ) : connectionMethod === 'oauth' ? (
                        <>
                            <button
                                onClick={resetModal}
                                className="px-4 py-2 text-textMuted hover:text-textMain transition-colors"
                            >
                                ← Back
                            </button>
                            {oauthStatus === 'error' && (
                                <button
                                    onClick={() => setOauthStatus('idle')}
                                    className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primaryHover transition-colors"
                                >
                                    Try Again
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            {step > 1 ? (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="px-4 py-2 text-textMuted hover:text-textMain transition-colors"
                                >
                                    Back
                                </button>
                            ) : (
                                <button
                                    onClick={resetModal}
                                    className="px-4 py-2 text-textMuted hover:text-textMain transition-colors"
                                >
                                    ← Back
                                </button>
                            )}

                            {step < 2 ? (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    disabled={!formData.wabaId || !formData.phoneNumberId || !formData.displayPhoneNumber || !formData.displayName}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Continue
                                    <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleManualSubmit}
                                    disabled={loading || !formData.accessToken}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
                                            Connect
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
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

const WhatsAppSettingsModal: React.FC<SettingsModalProps> = ({ config, assistants, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'chatbot' | 'calling' | 'webhook'>('general');
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        chatbotEnabled: config.chatbotEnabled,
        assistantId: config.assistantId || '',
        callingEnabled: config.callingEnabled,
        callSettings: config.callSettings || {
            inboundCallsEnabled: false,
            outboundCallsEnabled: false,
            callbackRequestEnabled: false
        }
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
                await updateCallingSettings(config.id, settings.callSettings as WhatsAppCallSettings);
            }

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
        }
        setLoading(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <Settings className="text-green-500" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-textMain">{config.displayName}</h2>
                            <p className="text-xs text-textMuted">{config.displayPhoneNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-textMuted hover:text-textMain">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-6">
                    {[
                        { id: 'general', label: 'General', icon: Settings },
                        { id: 'chatbot', label: 'Chatbot', icon: Bot },
                        { id: 'calling', label: 'Calling', icon: PhoneCall },
                        { id: 'webhook', label: 'Webhook', icon: Zap }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'text-primary border-primary'
                                    : 'text-textMuted border-transparent hover:text-textMain'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-textMain mb-4">Account Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-textMuted mb-1">WABA ID</label>
                                        <p className="text-sm text-textMain font-mono">{config.wabaId}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-textMuted mb-1">Phone Number ID</label>
                                        <p className="text-sm text-textMain font-mono">{config.phoneNumberId}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-textMuted mb-1">Status</label>
                                        <p className="text-sm capitalize text-textMain">{config.status}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-textMuted mb-1">Quality Rating</label>
                                        <p className="text-sm text-textMain">{config.qualityRating || 'Unknown'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chatbot' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-textMain">Enable AI Chatbot</h3>
                                    <p className="text-sm text-textMuted mt-1">
                                        Automatically respond to incoming messages using an AI assistant
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, chatbotEnabled: !settings.chatbotEnabled })}
                                    className={`w-12 h-6 rounded-full transition-colors ${
                                        settings.chatbotEnabled ? 'bg-primary' : 'bg-gray-600'
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                            settings.chatbotEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>

                            {settings.chatbotEnabled && (
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Select Assistant
                                    </label>
                                    <select
                                        value={settings.assistantId}
                                        onChange={(e) => setSettings({ ...settings, assistantId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">Select an assistant...</option>
                                        {assistants.map((assistant) => (
                                            <option key={assistant.id} value={assistant.id}>
                                                {assistant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'calling' && (
                        <div className="space-y-6">
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="text-yellow-400 shrink-0 mt-0.5" size={18} />
                                    <div className="text-sm">
                                        <p className="text-yellow-400 font-medium">Calling Requirements</p>
                                        <p className="text-textMuted mt-1">
                                            Your business must have a messaging limit of at least 2,000 messages/day to use calling features.
                                            <a
                                                href="https://developers.facebook.com/docs/whatsapp/cloud-api/calling"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline ml-1"
                                            >
                                                Learn more →
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-textMain">Enable Calling</h3>
                                    <p className="text-sm text-textMuted mt-1">
                                        Allow voice calls through WhatsApp
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, callingEnabled: !settings.callingEnabled })}
                                    className={`w-12 h-6 rounded-full transition-colors ${
                                        settings.callingEnabled ? 'bg-primary' : 'bg-gray-600'
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                            settings.callingEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>

                            {settings.callingEnabled && (
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-textMain">Inbound Calls</h4>
                                            <p className="text-xs text-textMuted">Receive calls from customers</p>
                                        </div>
                                        <button
                                            onClick={() => setSettings({
                                                ...settings,
                                                callSettings: {
                                                    ...settings.callSettings,
                                                    inboundCallsEnabled: !settings.callSettings.inboundCallsEnabled
                                                }
                                            })}
                                            className={`w-10 h-5 rounded-full transition-colors ${
                                                settings.callSettings.inboundCallsEnabled ? 'bg-primary' : 'bg-gray-600'
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                                    settings.callSettings.inboundCallsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-textMain">Outbound Calls</h4>
                                            <p className="text-xs text-textMuted">Initiate calls to customers</p>
                                        </div>
                                        <button
                                            onClick={() => setSettings({
                                                ...settings,
                                                callSettings: {
                                                    ...settings.callSettings,
                                                    outboundCallsEnabled: !settings.callSettings.outboundCallsEnabled
                                                }
                                            })}
                                            className={`w-10 h-5 rounded-full transition-colors ${
                                                settings.callSettings.outboundCallsEnabled ? 'bg-primary' : 'bg-gray-600'
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                                    settings.callSettings.outboundCallsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-textMain">Callback Requests</h4>
                                            <p className="text-xs text-textMuted">Allow users to request a callback</p>
                                        </div>
                                        <button
                                            onClick={() => setSettings({
                                                ...settings,
                                                callSettings: {
                                                    ...settings.callSettings,
                                                    callbackRequestEnabled: !settings.callSettings.callbackRequestEnabled
                                                }
                                            })}
                                            className={`w-10 h-5 rounded-full transition-colors ${
                                                settings.callSettings.callbackRequestEnabled ? 'bg-primary' : 'bg-gray-600'
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                                    settings.callSettings.callbackRequestEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'webhook' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-textMain mb-4">Webhook Configuration</h3>
                                <p className="text-sm text-textMuted mb-4">
                                    Configure these settings in your Meta App Dashboard to receive messages and call events.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Webhook URL
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={import.meta.env.VITE_WEBHOOK_BASE_URL 
                                            ? `${import.meta.env.VITE_WEBHOOK_BASE_URL}/api/webhooks/whatsapp`
                                            : `https://callyy-production.up.railway.app/api/webhooks/whatsapp`}
                                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-textMain font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(
                                            import.meta.env.VITE_WEBHOOK_BASE_URL 
                                                ? `${import.meta.env.VITE_WEBHOOK_BASE_URL}/api/webhooks/whatsapp`
                                                : `https://callyy-production.up.railway.app/api/webhooks/whatsapp`
                                        )}
                                        className="p-2.5 bg-surfaceHover rounded-lg hover:bg-surfaceHover/80 transition-colors"
                                    >
                                        <Copy size={18} className="text-textMuted" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Verify Token
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={config.webhookVerifyToken}
                                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-textMain font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(config.webhookVerifyToken)}
                                        className="p-2.5 bg-surfaceHover rounded-lg hover:bg-surfaceHover/80 transition-colors"
                                    >
                                        <Copy size={18} className="text-textMuted" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface border border-border rounded-lg p-4">
                                <h4 className="font-medium text-textMain mb-2">Required Webhook Fields</h4>
                                <ul className="text-sm text-textMuted space-y-1">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-400" />
                                        <code className="text-xs bg-background px-1.5 py-0.5 rounded">messages</code>
                                        - Receive incoming messages
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-400" />
                                        <code className="text-xs bg-background px-1.5 py-0.5 rounded">message_status</code>
                                        - Message delivery status
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-400" />
                                        <code className="text-xs bg-background px-1.5 py-0.5 rounded">calls</code>
                                        - Call events (if calling enabled)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-textMuted hover:text-textMain transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primaryHover disabled:opacity-50 transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppMessenger;
