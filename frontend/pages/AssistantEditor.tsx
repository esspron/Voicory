import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FloppyDisk, Play, Robot, GitBranch, BookOpen, ChartBar, Wrench,
    Gear, Globe, X, Check, ChatCircle, Phone, CircleNotch,
    Brain, Trash, Translate, SquaresFour, TestTube, Lightning, PhoneCall, ChatTeardrop
} from '@phosphor-icons/react';
import { getAssistant, getVoices, createAssistant, updateAssistant, deleteAssistant } from '../services/voicoryService';
import {
    Assistant, Voice, AssistantInput, MemoryConfig,
    LanguageSettings, StyleSettings, StyleMode,
    DynamicVariable, DynamicVariablesConfig,
    SUPPORTED_LANGUAGES, STYLE_OPTIONS,
    DEFAULT_LANGUAGE_SETTINGS, DEFAULT_STYLE_SETTINGS,
    DEFAULT_DYNAMIC_VARIABLES_CONFIG
} from '../types';
import VoiceSelectorModal from '../components/assistant-editor/VoiceSelectorModal';
import LLMSelectorModal from '../components/assistant-editor/LLMSelectorModal';
import PromptGeneratorModal from '../components/assistant-editor/PromptGeneratorModal';
import CallsTab from '../components/assistant-editor/CallsTab';
import MessagesTab from '../components/assistant-editor/MessagesTab';
import MemoryTab from '../components/assistant-editor/MemoryTab';
import ToolsTab from '../components/assistant-editor/ToolsTab';
import KnowledgeBaseTab from '../components/assistant-editor/KnowledgeBaseTab';
import AnalysisTab from '../components/assistant-editor/AnalysisTab';
import TestsTab from '../components/assistant-editor/TestsTab';
import ChatSidebar from '../components/assistant-editor/ChatSidebar';
import PlaceholderTab from '../components/assistant-editor/PlaceholderTab';
import Select from '../components/ui/Select';
import { FadeIn } from '../components/ui/FadeIn';
import { useAuth } from '../contexts/AuthContext';

// Tab definitions - Calls and Messages replace Agent
const TABS = [
    { id: 'calls', label: 'Calls', icon: PhoneCall, isNew: false },
    { id: 'messages', label: 'Messages', icon: ChatTeardrop, isNew: false },
    { id: 'memory', label: 'Memory', icon: Brain, isNew: true, highlight: true },
    { id: 'workflow', label: 'Workflow', icon: GitBranch, isNew: true },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, isNew: false },
    { id: 'analysis', label: 'Analysis', icon: ChartBar, isNew: false },
    { id: 'tools', label: 'Tools', icon: Wrench, isNew: false },
    { id: 'tests', label: 'Tests', icon: TestTube, isNew: true },
    { id: 'widget', label: 'Widget', icon: SquaresFour, isNew: false },
] as const;

type TabId = typeof TABS[number]['id'];

// LLM Options
const LLM_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
    { id: 'groq', name: 'Groq', models: ['llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b'] },
    { id: 'together', name: 'Together AI', models: ['Qwen3-30B-A3B', 'Llama-3.2-90B'] },
];

// Language options - now imported from types.ts as SUPPORTED_LANGUAGES

// Timezone options
const TIMEZONES = [
    { value: 'Asia/Kolkata', label: 'India (IST)', offset: '+5:30' },
    { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-5:00' },
    { value: 'America/Chicago', label: 'Central Time (CT)', offset: '-6:00' },
    { value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-7:00' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-8:00' },
    { value: 'Europe/London', label: 'London (GMT)', offset: '+0:00' },
    { value: 'Europe/Paris', label: 'Central European (CET)', offset: '+1:00' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+4:00' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+8:00' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)', offset: '+9:00' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: '+10:00' },
    { value: 'Pacific/Auckland', label: 'New Zealand (NZST)', offset: '+12:00' },
];

interface AssistantFormData {
    name: string;
    // Inbound Call Configuration
    systemPrompt: string;
    firstMessage: string;
    // Outbound Call Configuration
    outboundSystemPrompt: string;
    outboundFirstMessage: string;
    // Messaging Configuration
    messagingSystemPrompt: string;
    messagingFirstMessage: string;
    // Voice Settings
    voiceId: string | null;
    elevenlabsModelId: string;
    // Language & Style Settings (NEW)
    languageSettings: LanguageSettings;
    styleSettings: StyleSettings;
    // Dynamic Variables (ElevenLabs-style personalization)
    dynamicVariables: DynamicVariablesConfig;
    // LLM Settings
    llmProvider: string;
    llmModel: string;
    temperature: number;
    maxTokens: number;
    interruptible: boolean;
    useDefaultPersonality: boolean;
    timezone: string;
    ragEnabled: boolean;
    ragSimilarityThreshold: number;
    ragMaxResults: number;
    ragInstructions: string;
    knowledgeBaseIds: string[];
    // Memory settings
    memoryEnabled: boolean;
    memoryConfig: MemoryConfig;
    status: 'active' | 'inactive' | 'draft';
}

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
    rememberConversations: true,
    extractInsights: true,
    trackSentiment: true,
    maxContextConversations: 5,
    includeSummary: true,
    includeInsights: true,
    includeActionItems: true,
    autoGenerateSummary: true
};

const DEFAULT_FORM_DATA: AssistantFormData = {
    name: 'New Assistant',
    // Inbound Call Configuration
    systemPrompt: `You are a helpful, friendly AI voice assistant. Your role is to assist callers with their questions and needs in a professional yet conversational manner.

Guidelines:
- Be warm, patient, and attentive to the caller's needs
- Listen carefully and ask clarifying questions when needed
- Provide clear, concise, and accurate information
- If you don't know something, be honest and offer to help find the answer
- Keep responses conversational and natural for voice
- Be respectful of the caller's time

You can be customized with specific knowledge, personality traits, and capabilities based on the business needs.`,
    firstMessage: 'Hello! Thanks for calling. How can I help you today?',
    // Outbound Call Configuration
    outboundSystemPrompt: `You are a professional AI assistant making an outbound call. Your goal is to deliver your message efficiently while being respectful of the customer's time.

Guidelines:
- Introduce yourself and your company clearly at the start
- Confirm you're speaking with the right person
- State the purpose of your call early
- Be concise and get to the point
- If it's not a good time, offer to call back later
- Thank them for their time at the end`,
    outboundFirstMessage: 'Hi {{customer_name}}, this is {{assistant_name}} calling from {{company_name}}. Do you have a moment to talk?',
    // Messaging Configuration
    messagingSystemPrompt: `You are a helpful assistant responding via WhatsApp/SMS messaging.

Guidelines for messaging:
- Keep responses concise and mobile-friendly
- Use appropriate emojis when it fits the context 😊
- Share links when helpful (they're clickable!)
- Remember conversations are asynchronous - customers may reply hours later
- Be conversational but efficient
- You can share images, documents, and location when relevant`,
    messagingFirstMessage: 'Hey! 👋 Thanks for reaching out. How can I help you today?',
    // Voice Settings
    voiceId: null,
    elevenlabsModelId: 'eleven_turbo_v2_5',
    languageSettings: { ...DEFAULT_LANGUAGE_SETTINGS },
    styleSettings: { ...DEFAULT_STYLE_SETTINGS },
    dynamicVariables: { ...DEFAULT_DYNAMIC_VARIABLES_CONFIG },
    llmProvider: 'openai',
    llmModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024,
    interruptible: true,
    useDefaultPersonality: true,
    timezone: 'Asia/Kolkata',
    ragEnabled: false,
    ragSimilarityThreshold: 0.7,
    ragMaxResults: 5,
    ragInstructions: '',
    knowledgeBaseIds: [],
    memoryEnabled: false,
    memoryConfig: DEFAULT_MEMORY_CONFIG,
    status: 'draft',
};

const AssistantEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('calls');
    const [formData, setFormData] = useState<AssistantFormData>(DEFAULT_FORM_DATA);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const originalFormDataRef = useRef<string>('');

    // Modal states
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showLLMModal, setShowLLMModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showTimezoneModal, setShowTimezoneModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPromptGenerator, setShowPromptGenerator] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showChatSidebar, setShowChatSidebar] = useState(false);

    // Helper to create a comparable string from form data (only key user-editable fields)
    const getFormDataFingerprint = (data: AssistantFormData) => {
        return JSON.stringify({
            name: data.name,
            // Inbound
            systemPrompt: data.systemPrompt,
            firstMessage: data.firstMessage,
            // Outbound
            outboundSystemPrompt: data.outboundSystemPrompt,
            outboundFirstMessage: data.outboundFirstMessage,
            // Messaging
            messagingSystemPrompt: data.messagingSystemPrompt,
            messagingFirstMessage: data.messagingFirstMessage,
            // Settings
            voiceId: data.voiceId,
            llmProvider: data.llmProvider,
            llmModel: data.llmModel,
            temperature: data.temperature,
            interruptible: data.interruptible,
            useDefaultPersonality: data.useDefaultPersonality,
            timezone: data.timezone,
            memoryEnabled: data.memoryEnabled,
            languageDefault: data.languageSettings?.default,
            languageAutoDetect: data.languageSettings?.autoDetect,
            styleMode: data.styleSettings?.mode,
        });
    };

    // Track changes by comparing against original snapshot
    useEffect(() => {
        // Don't compare during loading or if we don't have original data
        if (loading || !originalFormDataRef.current) {
            return;
        }
        const currentFingerprint = getFormDataFingerprint(formData);
        setHasChanges(currentFingerprint !== originalFormDataRef.current);
    }, [formData, loading]);

    useEffect(() => {
        const fetchData = async () => {
            // Reset to loading state
            setLoading(true);
            setHasChanges(false);
            originalFormDataRef.current = '';
            
            try {
                // Fetch voices
                const voicesData = await getVoices();
                setVoices(voicesData);

                let loadedFormData: AssistantFormData;

                // If editing existing assistant, fetch it
                if (id && id !== 'new') {
                    const assistant = await getAssistant(id);
                    if (assistant) {
                        setAssistantId(assistant.id);
                        loadedFormData = {
                            name: assistant.name,
                            // Inbound Call Configuration
                            systemPrompt: assistant.systemPrompt || DEFAULT_FORM_DATA.systemPrompt,
                            firstMessage: assistant.firstMessage || DEFAULT_FORM_DATA.firstMessage,
                            // Outbound Call Configuration
                            outboundSystemPrompt: assistant.outboundSystemPrompt || DEFAULT_FORM_DATA.outboundSystemPrompt,
                            outboundFirstMessage: assistant.outboundFirstMessage || DEFAULT_FORM_DATA.outboundFirstMessage,
                            // Messaging Configuration
                            messagingSystemPrompt: assistant.messagingSystemPrompt || DEFAULT_FORM_DATA.messagingSystemPrompt,
                            messagingFirstMessage: assistant.messagingFirstMessage || DEFAULT_FORM_DATA.messagingFirstMessage,
                            // Voice & Settings
                            voiceId: assistant.voiceId || null,
                            elevenlabsModelId: assistant.elevenlabsModelId || 'eleven_turbo_v2_5',
                            languageSettings: assistant.languageSettings || { ...DEFAULT_LANGUAGE_SETTINGS },
                            styleSettings: assistant.styleSettings || { ...DEFAULT_STYLE_SETTINGS },
                            dynamicVariables: assistant.dynamicVariables || { ...DEFAULT_DYNAMIC_VARIABLES_CONFIG },
                            llmProvider: assistant.llmProvider || 'openai',
                            llmModel: assistant.llmModel || assistant.model || 'gpt-4o',
                            temperature: assistant.temperature ?? 0.7,
                            maxTokens: assistant.maxTokens ?? 1024,
                            interruptible: assistant.interruptible ?? true,
                            useDefaultPersonality: assistant.useDefaultPersonality ?? true,
                            timezone: assistant.timezone || 'Asia/Kolkata',
                            ragEnabled: assistant.ragEnabled ?? false,
                            ragSimilarityThreshold: assistant.ragSimilarityThreshold ?? 0.7,
                            ragMaxResults: assistant.ragMaxResults ?? 5,
                            ragInstructions: assistant.ragInstructions || '',
                            knowledgeBaseIds: assistant.knowledgeBaseIds || [],
                            memoryEnabled: assistant.memoryEnabled ?? false,
                            memoryConfig: assistant.memoryConfig || DEFAULT_MEMORY_CONFIG,
                            status: assistant.status,
                        };
                        setFormData(loadedFormData);
                        // Find and set selected voice
                        const voice = voicesData.find(v => v.id === assistant.voiceId);
                        if (voice) setSelectedVoice(voice);
                    } else {
                        loadedFormData = { ...DEFAULT_FORM_DATA };
                        setFormData(loadedFormData);
                    }
                } else {
                    // Reset to defaults for new assistant
                    setAssistantId(null);
                    loadedFormData = { ...DEFAULT_FORM_DATA };
                    setFormData(loadedFormData);
                    setSelectedVoice(null);
                }
                
                // Store the fingerprint of loaded data AFTER setting loading to false
                // This ensures the comparison effect sees the correct state
                originalFormDataRef.current = getFormDataFingerprint(loadedFormData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSave = async (publish: boolean = false) => {
        if (saving) return;

        setSaving(true);
        try {
            const inputData: AssistantInput = {
                name: formData.name,
                // Inbound Call Configuration
                systemPrompt: formData.systemPrompt,
                firstMessage: formData.firstMessage,
                // Outbound Call Configuration
                outboundSystemPrompt: formData.outboundSystemPrompt,
                outboundFirstMessage: formData.outboundFirstMessage,
                // Messaging Configuration
                messagingSystemPrompt: formData.messagingSystemPrompt,
                messagingFirstMessage: formData.messagingFirstMessage,
                // Voice & Settings
                voiceId: formData.voiceId || undefined,
                elevenlabsModelId: formData.elevenlabsModelId,
                languageSettings: formData.languageSettings,
                styleSettings: formData.styleSettings,
                dynamicVariables: formData.dynamicVariables,
                llmProvider: formData.llmProvider,
                llmModel: formData.llmModel,
                temperature: formData.temperature,
                maxTokens: formData.maxTokens,
                interruptible: formData.interruptible,
                useDefaultPersonality: formData.useDefaultPersonality,
                timezone: formData.timezone,
                ragEnabled: formData.ragEnabled,
                ragSimilarityThreshold: formData.ragSimilarityThreshold,
                ragMaxResults: formData.ragMaxResults,
                ragInstructions: formData.ragInstructions,
                knowledgeBaseIds: formData.knowledgeBaseIds,
                memoryEnabled: formData.memoryEnabled,
                memoryConfig: formData.memoryConfig,
                status: publish ? 'active' : formData.status,
            };

            let savedAssistant: Assistant | null;

            if (assistantId) {
                // Update existing assistant
                savedAssistant = await updateAssistant(assistantId, inputData);
            } else {
                // Create new assistant
                savedAssistant = await createAssistant(inputData);
            }

            if (savedAssistant) {
                setAssistantId(savedAssistant.id);
                const updatedFormData = { ...formData, status: savedAssistant.status };
                setFormData(updatedFormData);
                // Update the fingerprint to match new saved state
                originalFormDataRef.current = getFormDataFingerprint(updatedFormData);
                setHasChanges(false);

                // Navigate to the saved assistant if creating new
                if (!assistantId) {
                    navigate(`/assistants/${savedAssistant.id}`, { replace: true });
                }
            }
        } catch (error) {
            console.error('Error saving assistant:', error);
            alert('Failed to save assistant. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleVoiceSelect = (voice: Voice) => {
        setSelectedVoice(voice);
        setFormData({ ...formData, voiceId: voice.id });
        setShowVoiceModal(false);
    };

    const handleLLMSelect = (provider: string, model: string) => {
        setFormData({ ...formData, llmProvider: provider, llmModel: model });
        setShowLLMModal(false);
    };

    // Language settings handlers
    const handleDefaultLanguageSelect = (langCode: string) => {
        setFormData({
            ...formData,
            languageSettings: { ...formData.languageSettings, default: langCode }
        });
        setShowLanguageModal(false);
    };

    const handleAutoDetectToggle = () => {
        setFormData(prev => ({
            ...prev,
            languageSettings: {
                ...prev.languageSettings,
                autoDetect: !prev.languageSettings.autoDetect
            }
        }));
    };

    const handleAddSupportedLanguage = (langCode: string) => {
        if (!formData.languageSettings.supported.includes(langCode) && langCode !== formData.languageSettings.default) {
            setFormData({
                ...formData,
                languageSettings: {
                    ...formData.languageSettings,
                    supported: [...formData.languageSettings.supported, langCode]
                }
            });
        }
    };

    const handleRemoveSupportedLanguage = (langCode: string) => {
        setFormData({
            ...formData,
            languageSettings: {
                ...formData.languageSettings,
                supported: formData.languageSettings.supported.filter(l => l !== langCode)
            }
        });
    };

    // Style settings handlers
    const handleStyleModeSelect = (mode: StyleMode) => {
        setFormData({
            ...formData,
            styleSettings: { ...formData.styleSettings, mode }
        });
    };

    const handleAdaptiveConfigToggle = (key: keyof typeof formData.styleSettings.adaptiveConfig) => {
        setFormData(prev => ({
            ...prev,
            styleSettings: {
                ...prev.styleSettings,
                adaptiveConfig: {
                    ...prev.styleSettings.adaptiveConfig,
                    [key]: !prev.styleSettings.adaptiveConfig[key]
                }
            }
        }));
    };

    const handleDelete = async () => {
        if (!assistantId || deleting) return;

        setDeleting(true);
        try {
            await deleteAssistant(assistantId);
            navigate('/assistants', { replace: true });
        } catch (error) {
            console.error('Error deleting assistant:', error);
            alert('Failed to delete assistant. Please try again.');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Handle applying generated prompt from AI
    const handleApplyGeneratedPrompt = (data: {
        systemPrompt: string;
        firstMessage: string;
        messagingSystemPrompt?: string;
        messagingFirstMessage?: string;
        suggestedVariables?: Array<{ name: string; description: string; example?: string }>;
        suggestedAgentName?: string;
    }) => {
        setFormData(prev => {
            const newData = { ...prev };
            
            // Apply voice system prompt
            if (data.systemPrompt) {
                newData.systemPrompt = data.systemPrompt;
            }
            
            // Apply voice first message
            if (data.firstMessage) {
                newData.firstMessage = data.firstMessage;
            }

            // Apply messaging system prompt if provided
            if (data.messagingSystemPrompt) {
                newData.messagingSystemPrompt = data.messagingSystemPrompt;
            }

            // Apply messaging first message if provided
            if (data.messagingFirstMessage) {
                newData.messagingFirstMessage = data.messagingFirstMessage;
            }
            
            // Apply suggested agent name if current name is default
            if (data.suggestedAgentName && prev.name === 'New Assistant') {
                newData.name = data.suggestedAgentName;
            }
            
            // Add suggested variables to dynamic variables
            if (data.suggestedVariables && data.suggestedVariables.length > 0) {
                const existingVarNames = prev.dynamicVariables.variables.map(v => v.name);
                const newVariables = data.suggestedVariables
                    .filter(v => !existingVarNames.includes(v.name))
                    .map(v => ({
                        name: v.name,
                        type: 'string' as const,
                        description: v.description,
                        placeholder: v.example || ''
                    }));
                
                if (newVariables.length > 0) {
                    newData.dynamicVariables = {
                        ...prev.dynamicVariables,
                        variables: [...prev.dynamicVariables.variables, ...newVariables]
                    };
                }
            }
            
            return newData;
        });
    };

    const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === formData.languageSettings.default) || SUPPORTED_LANGUAGES[0];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'calls':
                return (
                    <CallsTab
                        formData={formData}
                        setFormData={setFormData}
                        selectedVoice={selectedVoice}
                        onOpenVoiceModal={() => setShowVoiceModal(true)}
                        onOpenLLMModal={() => setShowLLMModal(true)}
                        onOpenLanguageModal={() => setShowLanguageModal(true)}
                        onOpenTimezoneModal={() => setShowTimezoneModal(true)}
                        onAutoDetectToggle={handleAutoDetectToggle}
                        onAddSupportedLanguage={handleAddSupportedLanguage}
                        onRemoveSupportedLanguage={handleRemoveSupportedLanguage}
                        onStyleModeSelect={handleStyleModeSelect}
                        onAdaptiveConfigToggle={handleAdaptiveConfigToggle}
                        onOpenPromptGenerator={() => setShowPromptGenerator(true)}
                    />
                );
            case 'messages':
                return (
                    <MessagesTab
                        formData={formData}
                        setFormData={setFormData}
                        onOpenLLMModal={() => setShowLLMModal(true)}
                        onOpenPromptGenerator={() => setShowPromptGenerator(true)}
                    />
                );
            case 'memory':
                return (
                    <MemoryTab
                        formData={formData}
                        setFormData={setFormData}
                    />
                );
            case 'tools':
                return <ToolsTab />;
            case 'knowledge-base':
                return <KnowledgeBaseTab formData={formData} setFormData={setFormData} />;
            case 'analysis':
                return <AnalysisTab />;
            case 'tests':
                return <TestsTab assistantId={assistantId} formData={formData} selectedVoice={selectedVoice} />;
            default:
                return <PlaceholderTab tabName={activeTab} />;
        }
    };

    return (
        <FadeIn className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-surface/80 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-transparent text-textMain font-semibold text-lg outline-none placeholder:text-textMuted focus:underline decoration-primary/50 decoration-dashed underline-offset-4 min-w-0 w-auto max-w-[200px]"
                                placeholder="Assistant Name"
                                size={formData.name.length || 10}
                            />
                            {!assistantId && (
                                <span className="px-2.5 py-0.5 bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-xs font-semibold rounded-full flex-shrink-0 border border-primary/20">
                                    New
                                </span>
                            )}
                            {hasChanges && assistantId && (
                                <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-400 text-xs font-semibold rounded-full flex-shrink-0 border border-amber-500/20">
                                    Unsaved
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-textMuted flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : formData.status === 'draft' ? 'bg-gray-400' : 'bg-yellow-500'}`}></span>
                            {formData.status === 'active' ? 'Published' : formData.status === 'draft' ? 'Draft' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Delete button - only show for existing assistants */}
                    {assistantId && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={saving || deleting}
                            className="group flex items-center gap-2 px-3 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-50"
                            title="Delete assistant"
                        >
                            <Trash size={16} weight="bold" className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                    {/* Test - goes to Tests tab for test cases */}
                    <button
                        onClick={() => setActiveTab('tests')}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 hover:border-white/20 transition-all"
                        disabled={saving}
                    >
                        <Play size={16} weight="fill" className="group-hover:scale-110 transition-transform" />
                        Test
                    </button>
                    {/* Chat - opens sidebar for text chat preview */}
                    <button
                        onClick={() => setShowChatSidebar(true)}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 hover:border-white/20 transition-all"
                        disabled={saving}
                    >
                        <ChatCircle size={16} weight="fill" className="group-hover:scale-110 transition-transform" />
                        Chat
                    </button>
                    {/* Talk to Assistant - Voice call (coming soon) */}
                    <button
                        className="group flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-xl text-sm text-primary hover:bg-primary/20 transition-all cursor-not-allowed opacity-70"
                        disabled
                        title="Voice calling coming soon"
                    >
                        <Phone size={16} weight="fill" />
                        Talk to Assistant
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving || !hasChanges}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <FloppyDisk size={16} weight="bold" className="group-hover:scale-110 transition-transform" />}
                        Save
                    </button>
                    {formData.status !== 'active' && (
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                        >
                            {saving ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <Lightning size={16} weight="fill" className="group-hover:scale-110 transition-transform" />}
                            Publish
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/5 bg-surface/50 backdrop-blur-sm">
                <div className="flex items-center gap-1 px-6 py-2 overflow-x-auto scrollbar-thin">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isHighlighted = 'highlight' in tab && tab.highlight;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap
                                    ${isActive
                                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5'
                                        : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                                    }
                                `}
                            >
                                <Icon
                                    size={18}
                                    weight={isActive ? "fill" : "regular"}
                                    className={`transition-all ${isHighlighted ? 'text-purple-400' : isActive ? 'text-primary' : 'group-hover:text-primary'}`}
                                />
                                {tab.label}
                                {isHighlighted ? (
                                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-[10px] font-bold rounded-md uppercase shadow-lg shadow-purple-500/25">
                                        New
                                    </span>
                                ) : tab.isNew && (
                                    <span className="px-1.5 py-0.5 bg-white/10 text-textMuted text-[10px] font-medium rounded-md">
                                        New
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {renderTabContent()}
            </div>

            {/* Modals */}
            {showVoiceModal && (
                <VoiceSelectorModal
                    voices={voices}
                    selectedVoice={selectedVoice}
                    onSelect={handleVoiceSelect}
                    onClose={() => setShowVoiceModal(false)}
                    elevenlabsModelId={formData.elevenlabsModelId}
                    onModelChange={(modelId) => setFormData({ ...formData, elevenlabsModelId: modelId })}
                />
            )}

            {showLLMModal && (
                <LLMSelectorModal
                    providers={LLM_PROVIDERS}
                    selectedProvider={formData.llmProvider}
                    selectedModel={formData.llmModel}
                    onSelect={handleLLMSelect}
                    onClose={() => setShowLLMModal(false)}
                />
            )}

            {/* Language Selector Modal */}
            {showLanguageModal && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <Translate size={22} weight="duotone" className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-textMain">Select Default Language</h3>
                                    <p className="text-sm text-textMuted/70">28 languages supported with Multilingual v2</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLanguageModal(false)}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {/* Group by region */}
                            {['English', 'India', 'Europe', 'Asia', 'Other'].map((region) => {
                                const regionLanguages = SUPPORTED_LANGUAGES.filter(lang => {
                                    if (region === 'English') return lang.code.startsWith('en');
                                    if (region === 'India') return ['hi', 'hi-Latn', 'ta', 'te', 'mr', 'bn', 'gu', 'kn', 'ml', 'pa'].includes(lang.code);
                                    if (region === 'Europe') return ['es', 'es-MX', 'fr', 'de', 'it', 'pt', 'pt-BR', 'nl', 'pl', 'ru', 'tr'].includes(lang.code);
                                    if (region === 'Asia') return ['ja', 'ko', 'zh', 'ar'].includes(lang.code);
                                    return false;
                                });
                                if (regionLanguages.length === 0) return null;

                                return (
                                    <div key={region} className="mb-4">
                                        <div className="text-xs font-medium text-textMuted uppercase tracking-wider mb-2">{region}</div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {regionLanguages.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => handleDefaultLanguageSelect(lang.code)}
                                                    className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors text-left ${formData.languageSettings.default === lang.code
                                                        ? 'bg-primary/10 border border-primary/30'
                                                        : 'hover:bg-surfaceHover border border-transparent'
                                                        }`}
                                                >
                                                    <span className="text-lg">{lang.flag}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-textMain truncate">{lang.name}</div>
                                                        {lang.nativeName !== lang.name && (
                                                            <div className="text-[10px] text-textMuted truncate">{lang.nativeName}</div>
                                                        )}
                                                    </div>
                                                    {formData.languageSettings.default === lang.code && (
                                                        <Check size={16} className="text-primary flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Timezone Modal */}
            {showTimezoneModal && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <Globe size={22} weight="duotone" className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-textMain">Set Timezone</h3>
                                    <p className="text-sm text-textMuted/70">Choose the timezone for this assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTimezoneModal(false)}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            <div className="space-y-1">
                                {TIMEZONES.map((tz) => (
                                    <button
                                        key={tz.value}
                                        onClick={() => {
                                            setFormData({ ...formData, timezone: tz.value });
                                            setShowTimezoneModal(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${formData.timezone === tz.value
                                            ? 'bg-primary/10 border border-primary/30'
                                            : 'hover:bg-surfaceHover border border-transparent'
                                            }`}
                                    >
                                        <span className="text-sm font-medium text-textMain">{tz.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-textMuted font-mono">UTC{tz.offset}</span>
                                            {formData.timezone === tz.value && (
                                                <Check size={16} className="text-primary" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
                                <Trash size={24} weight="duotone" className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-textMain">Delete Assistant</h3>
                                <p className="text-sm text-textMuted/70">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm text-textMuted mb-6">
                            Are you sure you want to delete <span className="font-medium text-textMain">"{formData.name}"</span>?
                            All associated data including call logs and configurations will be permanently removed.
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <Trash size={16} weight="bold" />}
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Chat Sidebar - Preview/Talk to Agent */}
            {showChatSidebar && (
                <ChatSidebar
                    assistantId={assistantId}
                    formData={formData}
                    selectedVoice={selectedVoice}
                    activeTab={activeTab}
                    onClose={() => setShowChatSidebar(false)}
                />
            )}

            {/* Prompt Generator Modal */}
            {showPromptGenerator && (
                <PromptGeneratorModal
                    onClose={() => setShowPromptGenerator(false)}
                    onApply={handleApplyGeneratedPrompt}
                    currentAgentName={formData.name}
                />
            )}
        </FadeIn>
    );
};

export default AssistantEditor;
