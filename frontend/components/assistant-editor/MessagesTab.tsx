import {
    ChatCircle, Sparkle, WhatsappLogo, DeviceMobile, Lightning,
    CaretRight, BracketsCurly, Code, X
} from '@phosphor-icons/react';
import React from 'react';

import { DynamicVariablesConfig, SYSTEM_VARIABLES } from '../../types';

export interface MessagesFormData {
    messagingSystemPrompt: string;
    messagingFirstMessage: string;
    dynamicVariables: DynamicVariablesConfig;
    llmProvider: string;
    llmModel: string;
    temperature: number;
    maxTokens: number;
}

interface MessagesTabProps {
    formData: MessagesFormData;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    onOpenLLMModal: () => void;
    onOpenPromptGenerator: () => void;
}

const MessagesTab: React.FC<MessagesTabProps> = ({
    formData,
    setFormData,
    onOpenLLMModal,
    onOpenPromptGenerator,
}) => {
    return (
        <div className="flex h-full overflow-hidden">
            {/* Left Panel - Prompts */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-white/5">
                {/* Header with Channel Info */}
                <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <WhatsappLogo size={20} weight="fill" className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-textMain mb-1">Messaging Channels</h3>
                            <p className="text-xs text-textMuted leading-relaxed">
                                Configure how your assistant responds on WhatsApp and SMS. 
                                Messages can include links, emojis, and rich formatting.
                            </p>
                        </div>
                    </div>
                </div>

                {/* System Prompt Section */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-textMain">System prompt</h3>
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400">
                            Messaging
                        </span>
                    </div>
                    <button 
                        onClick={onOpenPromptGenerator}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-primary/10 rounded-lg text-textMuted hover:text-primary transition-all group border border-transparent hover:border-primary/20" 
                        title="Generate with AI"
                    >
                        <Sparkle size={16} weight="fill" className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">AI Generate</span>
                    </button>
                </div>

                {/* System Prompt Textarea */}
                <div className="relative mb-4">
                    <textarea
                        value={formData.messagingSystemPrompt || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, messagingSystemPrompt: e.target.value }))}
                        className="w-full h-64 bg-surface/50 border border-white/10 rounded-xl p-4 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none font-mono leading-relaxed transition-all"
                        placeholder={`You are a helpful assistant responding via WhatsApp/SMS.

Guidelines for messaging:
- Keep responses concise and mobile-friendly
- Use appropriate emojis when it fits the context
- Share links when helpful (they're clickable!)
- Remember conversations are asynchronous
- Be conversational but efficient

You can share images, documents, and location when relevant.`}
                    />
                    <button className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg text-textMuted/50 hover:text-textMain transition-all" title="Expand">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M9 1H13M13 1V5M13 1L8 6M5 13H1M1 13V9M1 13L6 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Prompt Footer */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-xs text-textMuted">
                        Type <code className="bg-surface px-1.5 py-0.5 rounded text-primary">{'{{'}</code> to add variables
                    </span>
                </div>

                {/* First Message Section */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-textMain">First message</h3>
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400">
                            Messaging
                        </span>
                    </div>
                    <p className="text-xs text-textMuted/70 mb-3">
                        The welcome message when a customer starts a chat. Can include emojis and links.
                    </p>
                </div>

                <div className="relative mb-4">
                    <textarea
                        value={formData.messagingFirstMessage || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, messagingFirstMessage: e.target.value }))}
                        className="w-full h-24 bg-surface/50 border border-white/10 rounded-xl p-4 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none font-mono transition-all"
                        placeholder="Hey! 👋 Thanks for reaching out. How can I help you today?"
                    />
                </div>

                {/* Messaging Tips */}
                <div className="mb-8 p-4 bg-surface/30 border border-white/5 rounded-xl">
                    <h4 className="text-xs font-semibold text-textMain mb-3 flex items-center gap-2">
                        <DeviceMobile size={14} weight="duotone" className="text-textMuted" />
                        Messaging Best Practices
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span className="text-xs text-textMuted">Keep messages under 300 chars</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span className="text-xs text-textMuted">Use emojis sparingly 😊</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span className="text-xs text-textMuted">Share clickable links</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span className="text-xs text-textMuted">Expect async replies</span>
                        </div>
                    </div>
                </div>

                {/* System Variables Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <BracketsCurly size={16} weight="bold" className="text-textMuted" />
                            <h3 className="text-sm font-semibold text-textMain">System Variables</h3>
                        </div>
                        <button
                            onClick={() => setFormData((prev: any) => ({
                                ...prev,
                                dynamicVariables: {
                                    ...prev.dynamicVariables,
                                    enableSystemVariables: !prev.dynamicVariables.enableSystemVariables
                                }
                            }))}
                            className="flex items-center gap-1.5"
                        >
                            <div className={`w-9 h-5 rounded-full transition-colors ${formData.dynamicVariables.enableSystemVariables ? 'bg-primary' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${formData.dynamicVariables.enableSystemVariables ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                            </div>
                        </button>
                    </div>

                    {formData.dynamicVariables.enableSystemVariables && (
                        <div className="bg-surface border border-border rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-2">
                                {SYSTEM_VARIABLES.map((variable) => (
                                    <div
                                        key={variable.name}
                                        className="flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                                    >
                                        <code className="px-1.5 py-0.5 bg-blue-500/10 rounded text-[10px] font-mono text-blue-300">
                                            {`{{${variable.name}}}`}
                                        </code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Custom Variables Section */}
                {formData.dynamicVariables.variables.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Code size={16} weight="bold" className="text-primary" />
                                <h3 className="text-sm font-semibold text-textMain">Custom Variables</h3>
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">
                                    {formData.dynamicVariables.variables.length}
                                </span>
                            </div>
                        </div>

                        <div className="bg-surface border border-primary/20 rounded-lg p-3 space-y-2">
                            {formData.dynamicVariables.variables.map((variable, index) => (
                                <div
                                    key={variable.name}
                                    className="flex items-start gap-3 p-2 bg-primary/5 border border-primary/10 rounded-lg group"
                                >
                                    <code className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-mono text-primary flex-shrink-0">
                                        {`{{${variable.name}}}`}
                                    </code>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-textMain leading-relaxed">{variable.description}</p>
                                    </div>
                                    <button
                                        onClick={() => setFormData((prev: any) => ({
                                            ...prev,
                                            dynamicVariables: {
                                                ...prev.dynamicVariables,
                                                variables: prev.dynamicVariables.variables.filter((_: any, i: number) => i !== index)
                                            }
                                        }))}
                                        className="p-1 text-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X size={12} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel - Settings */}
            <div className="w-80 overflow-y-auto p-6 bg-surface/30 backdrop-blur-sm">
                {/* Channel Status */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-textMain mb-3">Connected Channels</h3>
                    
                    {/* WhatsApp */}
                    <div className="p-3 bg-surface/50 border border-white/10 rounded-xl mb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <WhatsappLogo size={18} weight="fill" className="text-emerald-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-textMain">WhatsApp</div>
                                    <div className="text-[10px] text-textMuted">Configure in Messenger</div>
                                </div>
                            </div>
                            <CaretRight size={16} weight="bold" className="text-textMuted" />
                        </div>
                    </div>

                    {/* SMS - Coming Soon */}
                    <div className="p-3 bg-surface/50 border border-white/10 rounded-xl opacity-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <DeviceMobile size={18} weight="fill" className="text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-textMain">SMS</div>
                                    <div className="text-[10px] text-textMuted">Coming soon</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messaging Features */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-textMain mb-3">Messaging Features</h3>
                    
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-surface/50 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">🔗</span>
                                <span className="text-xs text-textMain">Rich Links</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-medium">Enabled</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-surface/50 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">📎</span>
                                <span className="text-xs text-textMain">File Sharing</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-medium">Enabled</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-surface/50 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">⚡</span>
                                <span className="text-xs text-textMain">Quick Replies</span>
                            </div>
                            <span className="text-[10px] text-textMuted font-medium">Coming Soon</span>
                        </div>
                    </div>
                </div>

                {/* LLM Section */}
                <div>
                    <h3 className="text-sm font-semibold text-textMain mb-2">LLM</h3>
                    <p className="text-xs text-textMuted/70 mb-3">
                        Select provider and model for messaging.
                    </p>

                    <button
                        onClick={onOpenLLMModal}
                        className="w-full flex items-center justify-between p-3.5 bg-surface/50 border border-white/10 rounded-xl hover:border-primary/30 hover:bg-white/[0.03] transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                                <Lightning size={16} weight="fill" className="text-blue-400" />
                            </div>
                            <div className="text-sm font-medium text-textMain">{formData.llmModel}</div>
                        </div>
                        <CaretRight size={16} weight="bold" className="text-textMuted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                </div>

                {/* Info Card */}
                <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                        <ChatCircle size={18} weight="duotone" className="text-blue-400 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-semibold text-textMain mb-1">Shared with Calls?</h4>
                            <p className="text-[10px] text-textMuted leading-relaxed">
                                Voice, Language, and Style settings are shared across all channels. 
                                The messaging prompt is optimized for text-based conversations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessagesTab;
