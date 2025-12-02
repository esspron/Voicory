import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Sparkle, CircleNotch, Lightning, MagicWand, PaperPlaneTilt,
    Check, Copy, ArrowRight, Buildings, User, BracketsCurly,
    Phone, ChatCircle, WhatsappLogo
} from '@phosphor-icons/react';
import { DynamicVariable } from '../../types';

interface PromptGeneratorModalProps {
    onClose: () => void;
    onApply: (data: {
        systemPrompt: string;
        firstMessage: string;
        messagingSystemPrompt?: string;
        messagingFirstMessage?: string;
        suggestedVariables?: Array<{ name: string; description: string; example?: string }>;
        suggestedAgentName?: string;
    }) => void;
    currentAgentName?: string;
}

interface GeneratedResult {
    systemPrompt: string;
    firstMessage: string;
    messagingSystemPrompt?: string;
    messagingFirstMessage?: string;
    suggestedVariables: Array<{ name: string; description: string; example?: string }>;
    suggestedAgentName?: string;
}

const EXAMPLE_PROMPTS = [
    {
        title: 'Customer Support',
        description: 'Customer support agent for a dry cleaning business',
        icon: '🧺',
    },
    {
        title: 'Restaurant Reservations',
        description: 'Restaurant booking assistant for an Italian restaurant',
        icon: '🍝',
    },
    {
        title: 'Medical Clinic',
        description: 'Appointment scheduler for a dental clinic',
        icon: '🦷',
    },
    {
        title: 'Real Estate',
        description: 'Property inquiry assistant for a real estate agency',
        icon: '🏠',
    },
    {
        title: 'E-commerce',
        description: 'Order tracking and support for an online store',
        icon: '📦',
    },
    {
        title: 'Fitness Studio',
        description: 'Class booking assistant for a yoga studio',
        icon: '🧘',
    },
];

const PromptGeneratorModal: React.FC<PromptGeneratorModalProps> = ({
    onClose,
    onApply,
    currentAgentName,
}) => {
    const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input');
    const [description, setDescription] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [agentName, setAgentName] = useState(currentAgentName || '');
    const [generateMessaging, setGenerateMessaging] = useState(true);
    const [result, setResult] = useState<GeneratedResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [previewTab, setPreviewTab] = useState<'calls' | 'messaging'>('calls');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Backend URL from environment (falls back to production if not set)
    const BACKEND_URL = import.meta.env['VITE_BACKEND_URL'] || 'https://callyy-production.up.railway.app';

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleGenerate = async () => {
        if (!description.trim()) return;

        setStep('generating');
        setError(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/generate-prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: description.trim(),
                    businessName: businessName.trim() || undefined,
                    agentName: agentName.trim() || undefined,
                    generateMessaging: generateMessaging,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate prompt');
            }

            const data = await response.json();
            setResult(data);
            setStep('preview');
        } catch (err) {
            console.error('Error generating prompt:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate prompt');
            setStep('input');
        }
    };

    const handleApply = () => {
        if (!result) return;
        onApply(result);
        onClose();
    };

    const handleExampleClick = (example: typeof EXAMPLE_PROMPTS[0]) => {
        setDescription(example.description);
        textareaRef.current?.focus();
    };

    const handleCopy = () => {
        const textToCopy = previewTab === 'calls' 
            ? result?.systemPrompt 
            : result?.messagingSystemPrompt;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey && step === 'input' && description.trim()) {
            handleGenerate();
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-primary/20 flex items-center justify-center">
                            <Sparkle size={22} weight="fill" className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-textMain">AI Prompt Generator</h3>
                            <p className="text-sm text-textMuted/70">
                                {step === 'input' && 'Describe what your assistant should do'}
                                {step === 'generating' && 'Creating your prompt...'}
                                {step === 'preview' && 'Review and customize your prompt'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 'input' && (
                        <div className="space-y-5">
                            {/* Description Input */}
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    What should your assistant do?
                                </label>
                                <textarea
                                    ref={textareaRef}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g., Customer support agent for a dry cleaning business that handles pickup schedules, pricing inquiries, and order status..."
                                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none transition-all"
                                />
                                <p className="text-xs text-textMuted mt-2">
                                    Be specific! Include the type of business, key tasks, and any special requirements.
                                </p>
                            </div>

                            {/* Optional Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-textMain mb-2">
                                        <Buildings size={14} className="text-textMuted" />
                                        Business Name <span className="text-textMuted/50">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="e.g., SparkleClean"
                                        className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-textMain mb-2">
                                        <User size={14} className="text-textMuted" />
                                        Agent Name <span className="text-textMuted/50">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={agentName}
                                        onChange={(e) => setAgentName(e.target.value)}
                                        placeholder="e.g., Maya"
                                        className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Generate Messaging Toggle */}
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                            <WhatsappLogo size={18} weight="fill" className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-textMain">Also generate for Messaging</div>
                                            <div className="text-xs text-textMuted">Create optimized prompts for WhatsApp/SMS</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setGenerateMessaging(!generateMessaging)}
                                        className="flex items-center gap-1.5"
                                    >
                                        <div className={`w-10 h-6 rounded-full transition-colors ${generateMessaging ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                                            <div className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${generateMessaging ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Example Prompts */}
                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-3">
                                    Or try an example:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {EXAMPLE_PROMPTS.map((example, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleExampleClick(example)}
                                            className="flex items-center gap-3 p-3 bg-background border border-white/5 rounded-xl hover:border-primary/30 hover:bg-white/[0.02] transition-all text-left group"
                                        >
                                            <span className="text-xl">{example.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-textMain group-hover:text-primary transition-colors">
                                                    {example.title}
                                                </div>
                                            </div>
                                            <ArrowRight size={14} className="text-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-primary/20 flex items-center justify-center">
                                    <MagicWand size={36} weight="duotone" className="text-primary animate-pulse" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center">
                                    <CircleNotch size={18} className="text-primary animate-spin" />
                                </div>
                            </div>
                            <h4 className="text-lg font-semibold text-textMain mb-2">Crafting Your Prompt</h4>
                            <p className="text-sm text-textMuted text-center max-w-sm">
                                AI is analyzing your requirements and creating a professional system prompt with best practices...
                            </p>
                        </div>
                    )}

                    {step === 'preview' && result && (
                        <div className="space-y-5">
                            {/* Tab Selector for Calls / Messaging */}
                            {result.messagingSystemPrompt && (
                                <div className="flex gap-1 p-1 bg-background border border-white/10 rounded-xl">
                                    <button
                                        onClick={() => setPreviewTab('calls')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                            previewTab === 'calls'
                                                ? 'bg-primary/15 text-primary border border-primary/20'
                                                : 'text-textMuted hover:text-textMain hover:bg-white/5'
                                        }`}
                                    >
                                        <Phone size={16} weight={previewTab === 'calls' ? 'fill' : 'regular'} />
                                        Voice Calls
                                    </button>
                                    <button
                                        onClick={() => setPreviewTab('messaging')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                            previewTab === 'messaging'
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                : 'text-textMuted hover:text-textMain hover:bg-white/5'
                                        }`}
                                    >
                                        <WhatsappLogo size={16} weight={previewTab === 'messaging' ? 'fill' : 'regular'} />
                                        Messaging
                                    </button>
                                </div>
                            )}

                            {/* System Prompt Preview */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-textMain flex items-center gap-2">
                                        {previewTab === 'calls' ? (
                                            <>
                                                <Phone size={14} className="text-primary" />
                                                Voice System Prompt
                                            </>
                                        ) : (
                                            <>
                                                <WhatsappLogo size={14} className="text-emerald-400" />
                                                Messaging System Prompt
                                            </>
                                        )}
                                    </label>
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-all"
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={12} className="text-emerald-400" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={12} />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="bg-background border border-white/10 rounded-xl p-4 max-h-64 overflow-y-auto">
                                    <pre className="text-sm text-textMain whitespace-pre-wrap font-mono leading-relaxed">
                                        {previewTab === 'calls' ? result.systemPrompt : result.messagingSystemPrompt}
                                    </pre>
                                </div>
                            </div>

                            {/* First Message Preview */}
                            <div>
                                <label className="text-sm font-medium text-textMain mb-2 block flex items-center gap-2">
                                    {previewTab === 'calls' ? 'Voice First Message' : 'Messaging First Message'}
                                </label>
                                <div className="bg-background border border-white/10 rounded-xl p-4">
                                    <p className="text-sm text-textMain">
                                        {previewTab === 'calls' ? result.firstMessage : result.messagingFirstMessage}
                                    </p>
                                </div>
                            </div>

                            {/* Suggested Variables */}
                            {result.suggestedVariables && result.suggestedVariables.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BracketsCurly size={14} className="text-textMuted" />
                                        <label className="text-sm font-medium text-textMain">
                                            Suggested Custom Variables
                                        </label>
                                    </div>
                                    <div className="bg-background border border-white/10 rounded-xl p-4 space-y-3">
                                        {result.suggestedVariables.map((variable, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <code className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs font-mono text-primary flex-shrink-0">
                                                    {`{{${variable.name}}}`}
                                                </code>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-textMain">{variable.description}</p>
                                                    {variable.example && (
                                                        <p className="text-xs text-textMuted mt-0.5">
                                                            Example: {variable.example}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-textMuted mt-2">
                                        💡 These variables will be available in your prompt. You can add them after applying.
                                    </p>
                                </div>
                            )}

                            {/* Suggested Agent Name */}
                            {result.suggestedAgentName && !agentName && (
                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                                    <User size={16} className="text-primary" />
                                    <span className="text-sm text-textMain">
                                        Suggested name: <span className="font-medium text-primary">{result.suggestedAgentName}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        {step === 'input' && (
                            <>
                                <p className="text-xs text-textMuted flex items-center gap-2">
                                    <span>Press <kbd className="px-1.5 py-0.5 bg-surface border border-white/10 rounded text-[10px]">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-surface border border-white/10 rounded text-[10px]">Enter</kbd></span>
                                    {generateMessaging && (
                                        <span className="flex items-center gap-1 text-emerald-400">
                                            <WhatsappLogo size={12} weight="fill" />
                                            <span>+ Messaging</span>
                                        </span>
                                    )}
                                </p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={!description.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                >
                                    <Sparkle size={16} weight="fill" />
                                    {generateMessaging ? 'Generate Both Prompts' : 'Generate Prompt'}
                                </button>
                            </>
                        )}

                        {step === 'generating' && (
                            <div className="w-full flex justify-center">
                                <button
                                    onClick={() => setStep('input')}
                                    className="px-4 py-2 text-sm text-textMuted hover:text-textMain transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {step === 'preview' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setStep('input')}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 transition-all"
                                    >
                                        Regenerate
                                    </button>
                                    {result?.messagingSystemPrompt && (
                                        <span className="text-xs text-textMuted flex items-center gap-1.5">
                                            <Phone size={12} className="text-primary" />
                                            +
                                            <WhatsappLogo size={12} className="text-emerald-400" />
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleApply}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
                                >
                                    <Lightning size={16} weight="fill" />
                                    {result?.messagingSystemPrompt ? 'Apply Both Prompts' : 'Apply to Assistant'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PromptGeneratorModal;
