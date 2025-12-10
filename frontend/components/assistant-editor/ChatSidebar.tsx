import {
    Robot, X, Trash, ChatCircle, User, Warning, CircleNotch, PaperPlaneTilt
} from '@phosphor-icons/react';
import React, { useState, useRef, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../lib/api';
import { Voice, LanguageSettings, StyleSettings, DynamicVariablesConfig } from '../../types';

interface AssistantFormData {
    name: string;
    // Unified instruction field (like Vapi, Retell, LiveKit)
    instruction: string;
    languageSettings: LanguageSettings;
    styleSettings: StyleSettings;
    // Dynamic Variables for personalization
    dynamicVariables: DynamicVariablesConfig;
    llmModel: string;
    temperature: number;
    maxTokens: number;
    timezone: string;
    // RAG settings
    ragEnabled: boolean;
    ragSimilarityThreshold: number;
    ragMaxResults: number;
    ragInstructions: string;
    knowledgeBaseIds: string[];
    // Memory settings
    memoryEnabled: boolean;
}

type TabId = 'calls' | 'messages' | 'memory' | 'workflow' | 'knowledge-base' | 'analysis' | 'tools' | 'tests' | 'widget';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost: number | null;
        balance: number | null;
    };
}

interface ChatSidebarProps {
    assistantId: string | null;
    formData: AssistantFormData;
    selectedVoice: Voice | null;
    activeTab: TabId;
    onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ assistantId, formData, selectedVoice, activeTab, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get user for billing
    const { user } = useAuth();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const getAIResponse = async (userMessage: string): Promise<string> => {
        const conversationHistory = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Determine channel based on active tab
        const isMessaging = activeTab === 'messages';

        const response = await authFetch('/api/test-chat', {
            method: 'POST',
            body: JSON.stringify({
                message: userMessage,
                conversationHistory,
                assistantId,
                userId: user?.id,
                channel: isMessaging ? 'messaging' : 'calls',
                assistantConfig: {
                    name: formData.name,
                    // Use unified 'instruction' field (matches backend expectation)
                    instruction: formData.instruction,
                    languageSettings: formData.languageSettings,
                    styleSettings: formData.styleSettings,
                    dynamicVariables: formData.dynamicVariables,
                    llmModel: formData.llmModel,
                    temperature: formData.temperature,
                    maxTokens: formData.maxTokens,
                    timezone: formData.timezone,
                    // RAG settings
                    ragEnabled: formData.ragEnabled,
                    ragSimilarityThreshold: formData.ragSimilarityThreshold,
                    ragMaxResults: formData.ragMaxResults,
                    ragInstructions: formData.ragInstructions,
                    knowledgeBaseIds: formData.knowledgeBaseIds,
                    // Memory settings
                    memoryEnabled: formData.memoryEnabled,
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to get response');
        }

        const data = await response.json();
        return data.response;
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        setError(null);
        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await getAIResponse(userMessage.content);
            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Error generating response:', err);
            setError(err instanceof Error ? err.message : 'Failed to get response');
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        setError(null);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-background border-l border-white/10 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between bg-surface/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Robot size={20} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-textMain">{formData.name || 'Assistant'}</h4>
                        <p className="text-xs text-textMuted">
                            {selectedVoice ? selectedVoice.name : 'Chat Preview'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClearChat} 
                        className="p-2 text-textMuted hover:text-textMain hover:bg-surface rounded-lg transition-colors"
                        title="Clear chat"
                    >
                        <Trash size={16} />
                    </button>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-textMuted hover:text-textMain hover:bg-surface rounded-lg transition-colors"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center max-w-xs">
                            <div className="w-14 h-14 rounded-2xl bg-surface border border-white/5 flex items-center justify-center mx-auto mb-4">
                                <ChatCircle size={24} weight="duotone" className="text-textMuted" />
                            </div>
                            <h4 className="text-sm font-medium text-textMain mb-2">Chat with {formData.name || 'your agent'}</h4>
                            <p className="text-xs text-textMuted leading-relaxed">
                                Test your agent's responses before deploying to WhatsApp or phone.
                            </p>
                            {!assistantId && (
                                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-4">
                                    💡 Save to test with full config
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                    message.role === 'user' ? 'bg-blue-500/20' : 'bg-gradient-to-br from-primary/20 to-primary/10'
                                }`}>
                                    {message.role === 'user' ? <User size={16} className="text-blue-400" /> : <Robot size={16} className="text-primary" />}
                                </div>
                                <div className={`flex flex-col max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl ${
                                        message.role === 'user'
                                            ? 'bg-blue-500/20 text-textMain rounded-tr-md'
                                            : 'bg-surface border border-white/5 text-textMain rounded-tl-md'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    <span className="text-[10px] text-textMuted mt-1 px-2">{formatTime(message.timestamp)}</span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                    <Robot size={16} className="text-primary" />
                                </div>
                                <div className="px-4 py-3 bg-surface border border-white/5 rounded-2xl rounded-tl-md">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-textMuted/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-textMuted/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-textMuted/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="flex gap-3 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <Warning size={16} className="text-red-400" />
                                </div>
                                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-md">
                                    <p className="text-sm text-red-400">{error}</p>
                                    <button onClick={() => setError(null)} className="text-xs text-red-400/70 hover:text-red-400 mt-1">Dismiss</button>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-surface/50">
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="w-11 h-11 flex items-center justify-center bg-primary text-black rounded-xl hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <CircleNotch size={18} className="animate-spin" /> : <PaperPlaneTilt size={18} weight="fill" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================


export default ChatSidebar;
