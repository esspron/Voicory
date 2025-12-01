import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FloppyDisk, Play, Robot, GitBranch, BookOpen, ChartBar, Wrench,
    Flask, Gear, Sparkle, Globe,
    CaretRight, Plus, Microphone, Lightning, MagnifyingGlass, Funnel, FileText,
    X, Check, Clock, ChatCircle, Phone, CaretDown, CircleNotch,
    Brain, User, TrendUp, Warning, Heart, Lightbulb, Trash,
    Translate, Palette, BracketsCurly, Code, SquaresFour, TestTube, Layout,
    PaperPlaneTilt, SpeakerHigh, PhoneCall, ChatTeardrop, TextAa, Link as LinkIcon, ArrowsClockwise
} from '@phosphor-icons/react';
import { getAssistant, getVoices, getCallLogs, createAssistant, updateAssistant, deleteAssistant } from '../services/voicoryService';
import {
    getKnowledgeBases,
    getDocuments,
    KnowledgeBase,
    KnowledgeBaseDocument
} from '../services/knowledgeBaseService';
import {
    Assistant, Voice, CallLog, AssistantInput, MemoryConfig,
    LanguageSettings, StyleSettings, StyleMode, AdaptiveStyleConfig,
    DynamicVariable, DynamicVariablesConfig, StaticVariable, STATIC_VARIABLE_TEMPLATES,
    SUPPORTED_LANGUAGES, STYLE_OPTIONS, SYSTEM_VARIABLES,
    DEFAULT_LANGUAGE_SETTINGS, DEFAULT_STYLE_SETTINGS, DEFAULT_ADAPTIVE_CONFIG,
    DEFAULT_DYNAMIC_VARIABLES_CONFIG
} from '../types';
import VoiceSelectorModal from '../components/assistant-editor/VoiceSelectorModal';
import LLMSelectorModal from '../components/assistant-editor/LLMSelectorModal';
import PromptGeneratorModal from '../components/assistant-editor/PromptGeneratorModal';
import CallsTab from '../components/assistant-editor/CallsTab';
import MessagesTab from '../components/assistant-editor/MessagesTab';
import Select from '../components/ui/Select';
import { FadeIn } from '../components/ui/FadeIn';
import { useAuth } from '../contexts/AuthContext';

// Tab definitions - Calls and Messages replace Agent
const TABS = [
    { id: 'calls', label: 'Calls', icon: PhoneCall, isNew: false },
    { id: 'messages', label: 'Messages', icon: ChatTeardrop, isNew: false },
    { id: 'memory', label: 'Memory', icon: Brain, isNew: true, highlight: true },
    { id: 'workflow', label: 'Workflow', icon: GitBranch, isNew: true },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'analysis', label: 'Analysis', icon: ChartBar },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'tests', label: 'Tests', icon: TestTube, isNew: true },
    { id: 'widget', label: 'Widget', icon: SquaresFour },
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

// ============================================
// STATIC VARIABLES SECTION
// ============================================
interface StaticVariablesSectionProps {
    formData: AssistantFormData;
    setFormData: React.Dispatch<React.SetStateAction<AssistantFormData>>;
}

const StaticVariablesSection: React.FC<StaticVariablesSectionProps> = ({ formData, setFormData }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [newVar, setNewVar] = useState({ name: '', label: '', value: '' });

    const staticVars = formData.dynamicVariables.staticVariables || [];

    const handleAddVariable = (template?: typeof STATIC_VARIABLE_TEMPLATES[0]) => {
        if (template) {
            // Check if already exists
            if (staticVars.some(v => v.name === template.name)) return;
            
            setFormData(prev => ({
                ...prev,
                dynamicVariables: {
                    ...prev.dynamicVariables,
                    staticVariables: [
                        ...(prev.dynamicVariables.staticVariables || []),
                        { ...template, value: '' }
                    ]
                }
            }));
        } else if (newVar.name && newVar.label) {
            const varName = newVar.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            if (staticVars.some(v => v.name === varName)) return;
            
            setFormData(prev => ({
                ...prev,
                dynamicVariables: {
                    ...prev.dynamicVariables,
                    staticVariables: [
                        ...(prev.dynamicVariables.staticVariables || []),
                        { name: varName, label: newVar.label, value: newVar.value, category: 'custom' as const }
                    ]
                }
            }));
            setNewVar({ name: '', label: '', value: '' });
            setShowAddModal(false);
        }
    };

    const handleUpdateValue = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            dynamicVariables: {
                ...prev.dynamicVariables,
                staticVariables: prev.dynamicVariables.staticVariables?.map((v, i) => 
                    i === index ? { ...v, value } : v
                ) || []
            }
        }));
    };

    const handleRemoveVariable = (index: number) => {
        setFormData(prev => ({
            ...prev,
            dynamicVariables: {
                ...prev.dynamicVariables,
                staticVariables: prev.dynamicVariables.staticVariables?.filter((_, i) => i !== index) || []
            }
        }));
    };

    // Get templates that haven't been added yet
    const availableTemplates = STATIC_VARIABLE_TEMPLATES.filter(
        t => !staticVars.some(v => v.name === t.name)
    );

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <FileText size={16} weight="bold" className="text-emerald-400" />
                    <h3 className="text-sm font-semibold text-textMain">Business Info</h3>
                    {staticVars.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded">
                            {staticVars.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                    <Plus size={12} weight="bold" />
                    Add
                </button>
            </div>

            {staticVars.length === 0 ? (
                <div className="bg-surface/50 border border-dashed border-white/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-textMuted mb-3">
                        Add business details your agent can reference
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {STATIC_VARIABLE_TEMPLATES.slice(0, 4).map((template) => (
                            <button
                                key={template.name}
                                onClick={() => handleAddVariable(template)}
                                className="px-2.5 py-1.5 bg-surface border border-white/10 rounded-lg text-xs text-textMuted hover:text-textMain hover:border-emerald-500/30 transition-all"
                            >
                                + {template.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {staticVars.map((variable, index) => (
                        <div
                            key={variable.name}
                            className="bg-surface border border-white/10 rounded-xl p-3 group hover:border-emerald-500/20 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <code className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-mono text-emerald-400">
                                        {`{{${variable.name}}}`}
                                    </code>
                                    <span className="text-xs text-textMuted">{variable.label}</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveVariable(index)}
                                    className="p-1 text-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={12} weight="bold" />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={variable.value}
                                onChange={(e) => handleUpdateValue(index, e.target.value)}
                                placeholder={`Enter ${variable.label.toLowerCase()}...`}
                                className="w-full bg-background border border-white/5 rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-emerald-500/30 transition-all"
                            />
                        </div>
                    ))}

                    {/* Quick add more */}
                    {availableTemplates.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                            {availableTemplates.slice(0, 3).map((template) => (
                                <button
                                    key={template.name}
                                    onClick={() => handleAddVariable(template)}
                                    className="px-2 py-1 text-[10px] text-textMuted hover:text-emerald-400 hover:bg-emerald-500/5 rounded-md transition-colors"
                                >
                                    + {template.label}
                                </button>
                            ))}
                            {availableTemplates.length > 3 && (
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-2 py-1 text-[10px] text-textMuted hover:text-primary transition-colors"
                                >
                                    +{availableTemplates.length - 3} more...
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Add Variable Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-textMain">Add Business Variable</h4>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={16} weight="bold" />
                            </button>
                        </div>

                        <div className="p-4">
                            {/* Quick Templates */}
                            {availableTemplates.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs text-textMuted mb-2">Quick add:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTemplates.map((template) => (
                                            <button
                                                key={template.name}
                                                onClick={() => {
                                                    handleAddVariable(template);
                                                    setShowAddModal(false);
                                                }}
                                                className="px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-xs text-textMuted hover:text-textMain hover:border-emerald-500/30 transition-all"
                                            >
                                                {template.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Variable */}
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-xs text-textMuted mb-3">Or create custom:</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-textMuted mb-1 block">Label</label>
                                        <input
                                            type="text"
                                            value={newVar.label}
                                            onChange={(e) => setNewVar(prev => ({ 
                                                ...prev, 
                                                label: e.target.value,
                                                name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                                            }))}
                                            placeholder="e.g., Delivery Fee"
                                            className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-primary/50"
                                        />
                                    </div>
                                    {newVar.label && (
                                        <p className="text-[10px] text-textMuted">
                                            Variable: <code className="text-primary">{`{{${newVar.name}}}`}</code>
                                        </p>
                                    )}
                                    <div>
                                        <label className="text-xs text-textMuted mb-1 block">Value (optional)</label>
                                        <input
                                            type="text"
                                            value={newVar.value}
                                            onChange={(e) => setNewVar(prev => ({ ...prev, value: e.target.value }))}
                                            placeholder="e.g., $5.99"
                                            className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-primary/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5 flex justify-end gap-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-sm text-textMuted hover:text-textMain transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAddVariable()}
                                disabled={!newVar.label}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primaryHover transition-colors"
                            >
                                Add Variable
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// ============================================
// AGENT TAB
// ============================================
interface AgentTabProps {
    formData: AssistantFormData;
    setFormData: React.Dispatch<React.SetStateAction<AssistantFormData>>;
    selectedVoice: Voice | null;
    currentLanguage: { code: string; name: string; nativeName: string; flag: string };
    onOpenVoiceModal: () => void;
    onOpenLLMModal: () => void;
    onOpenLanguageModal: () => void;
    onOpenTimezoneModal: () => void;
    onAutoDetectToggle: () => void;
    onAddSupportedLanguage: (langCode: string) => void;
    onRemoveSupportedLanguage: (langCode: string) => void;
    onStyleModeSelect: (mode: StyleMode) => void;
    onAdaptiveConfigToggle: (key: 'mirrorFormality' | 'mirrorLength' | 'mirrorVocabulary') => void;
    onOpenPromptGenerator: () => void;
}

const AgentTab: React.FC<AgentTabProps> = ({
    formData,
    setFormData,
    selectedVoice,
    currentLanguage,
    onOpenVoiceModal,
    onOpenLLMModal,
    onOpenLanguageModal,
    onOpenTimezoneModal,
    onAutoDetectToggle,
    onAddSupportedLanguage,
    onRemoveSupportedLanguage,
    onStyleModeSelect,
    onAdaptiveConfigToggle,
    onOpenPromptGenerator,
}) => {
    const [showAddLanguageDropdown, setShowAddLanguageDropdown] = useState(false);
    const currentTimezone = TIMEZONES.find(tz => tz.value === formData.timezone) || TIMEZONES[0];
    const isFirstAutoDetectRun = useRef(true);

    // Auto-detect {{variables}} in system prompt and first message
    useEffect(() => {
        // Skip the first run to avoid triggering "Unsaved" on initial load
        if (isFirstAutoDetectRun.current) {
            isFirstAutoDetectRun.current = false;
            return;
        }

        const systemVarNames = SYSTEM_VARIABLES.map(v => v.name);
        const existingCustomVarNames = formData.dynamicVariables.variables.map(v => v.name);

        // Extract all {{variable}} patterns from prompts
        const allText = `${formData.systemPrompt} ${formData.firstMessage}`;
        const varPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
        const foundVars = new Set<string>();
        let match;
        while ((match = varPattern.exec(allText)) !== null) {
            foundVars.add(match[1].toLowerCase());
        }

        // Find variables that are NOT system vars and NOT already in custom vars
        const newVarsToAdd: DynamicVariable[] = [];
        foundVars.forEach(varName => {
            if (!systemVarNames.includes(varName) && !existingCustomVarNames.includes(varName)) {
                newVarsToAdd.push({
                    name: varName,
                    type: 'string',
                    description: `Auto-detected from prompt`,
                });
            }
        });

        // Add new variables if any found
        if (newVarsToAdd.length > 0) {
            setFormData(prev => ({
                ...prev,
                dynamicVariables: {
                    ...prev.dynamicVariables,
                    variables: [...prev.dynamicVariables.variables, ...newVarsToAdd]
                }
            }));
        }
    }, [formData.systemPrompt, formData.firstMessage]);

    // Get supported languages that are not already added
    const availableLanguages = SUPPORTED_LANGUAGES.filter(
        lang => lang.code !== formData.languageSettings.default &&
            !formData.languageSettings.supported.includes(lang.code)
    );

    // Get the actual language objects for supported languages
    const supportedLanguageObjects = formData.languageSettings.supported
        .map(code => SUPPORTED_LANGUAGES.find(l => l.code === code))
        .filter(Boolean);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left Panel - Prompts */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-white/5">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-textMain">System prompt</h3>
                        <a href="#" className="text-textMuted/50 hover:text-primary transition-colors">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline">
                                <path d="M3.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V9.5C1.5 10.0523 1.94772 10.5 2.5 10.5H8.5C9.05228 10.5 9.5 10.0523 9.5 9.5V8.5M6.5 1.5H10.5M10.5 1.5V5.5M10.5 1.5L5 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </a>
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
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                        className="w-full h-64 bg-surface/50 border border-white/10 rounded-xl p-4 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none font-mono leading-relaxed transition-all"
                        placeholder="Enter system instructions..."
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
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, useDefaultPersonality: !prev.useDefaultPersonality }))}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <div className={`w-9 h-5 rounded-full transition-colors ${formData.useDefaultPersonality ? 'bg-primary' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${formData.useDefaultPersonality ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-xs text-textMain">Default personality</span>
                        </button>
                        <button
                            type="button"
                            onClick={onOpenTimezoneModal}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-textMuted hover:text-textMain hover:bg-surfaceHover rounded transition-colors"
                        >
                            <Globe size={12} />
                            {currentTimezone.label} ({currentTimezone.offset})
                        </button>
                    </div>
                </div>

                {/* First Message Section */}
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-textMain mb-1">First message</h3>
                    <p className="text-xs text-textMuted/70 mb-3">
                        The first message the agent will say. If empty, the agent will wait for the user to start the conversation.{' '}
                        <a href="#" className="text-primary hover:underline">Disclosure Requirements ↗</a>
                    </p>
                </div>

                <div className="relative mb-4">
                    <textarea
                        value={formData.firstMessage}
                        onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                        className="w-full h-24 bg-surface/50 border border-white/10 rounded-xl p-4 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none font-mono transition-all"
                        placeholder="Hello! How can I help you today?"
                    />
                    <button className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg text-textMuted/50 hover:text-textMain transition-all" title="Expand">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M9 1H13M13 1V5M13 1L8 6M5 13H1M1 13V9M1 13L6 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* First Message Footer */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-xs text-textMuted">
                        Type <code className="bg-surface px-1.5 py-0.5 rounded text-primary">{'{{'}</code> to add variables
                    </span>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, interruptible: !prev.interruptible }))}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <div className={`w-9 h-5 rounded-full transition-colors ${formData.interruptible ? 'bg-primary' : 'bg-gray-600'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${formData.interruptible ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs text-textMain">Interruptible</span>
                    </button>
                </div>

                {/* ============================================
                    SYSTEM VARIABLES SECTION (Simplified)
                    ============================================ */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <BracketsCurly size={16} weight="bold" className="text-textMuted" />
                            <h3 className="text-sm font-semibold text-textMain">System Variables</h3>
                        </div>
                        <button
                            onClick={() => setFormData(prev => ({
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
                    <p className="text-xs text-textMuted mb-3">
                        Use these variables in your prompts: <code className="bg-surface px-1 py-0.5 rounded text-primary font-mono text-[11px]">{'{{customer_name}}'}</code>
                    </p>

                    {/* System Variables List */}
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
                            <p className="text-[10px] text-textMuted mt-3">
                                💡 For full customer context (preferences, history, addresses), enable <span className="text-primary font-medium">Memory</span> in the Model tab.
                            </p>
                        </div>
                    )}
                </div>

                {/* ============================================
                    STATIC VARIABLES SECTION (Business Info)
                    ============================================ */}
                <StaticVariablesSection 
                    formData={formData}
                    setFormData={setFormData}
                />

                {/* ============================================
                    CUSTOM VARIABLES SECTION
                    ============================================ */}
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
                            <button
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    dynamicVariables: {
                                        ...prev.dynamicVariables,
                                        variables: []
                                    }
                                }))}
                                className="text-xs text-textMuted hover:text-red-400 transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                        <p className="text-xs text-textMuted mb-3">
                            Variables detected from your prompts or added via AI generator
                        </p>

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
                                        {variable.placeholder && (
                                            <p className="text-[10px] text-textMuted mt-0.5">
                                                Example: {variable.placeholder}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            dynamicVariables: {
                                                ...prev.dynamicVariables,
                                                variables: prev.dynamicVariables.variables.filter((_, i) => i !== index)
                                            }
                                        }))}
                                        className="p-1 text-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove variable"
                                    >
                                        <X size={12} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-textMuted mt-2">
                            💡 These variables can be filled dynamically when making API calls to your assistant.
                        </p>
                    </div>
                )}
            </div>

            {/* Right Panel - Voice, Language, LLM */}
            <div className="w-80 overflow-y-auto p-6 bg-surface/30 backdrop-blur-sm">
                {/* Voices Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-textMain">Voices</h3>
                        <button className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-textMain transition-all" title="Voice Settings">
                            <Gear size={14} weight="bold" />
                        </button>
                    </div>
                    <p className="text-xs text-textMuted/70 mb-3">
                        Select the voice you want to use for the agent.
                    </p>

                    {/* Selected Voice */}
                    <button
                        onClick={onOpenVoiceModal}
                        className="w-full flex items-center justify-between p-3.5 bg-surface/50 border border-white/10 rounded-xl hover:border-primary/30 hover:bg-white/[0.03] transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                                <Microphone size={16} weight="fill" className="text-primary" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-textMain">
                                    {selectedVoice?.name || 'Select Voice'}
                                </div>
                                {selectedVoice && (
                                    <div className="text-[10px] text-primary font-semibold">Primary</div>
                                )}
                            </div>
                        </div>
                        <CaretRight size={16} weight="bold" className="text-textMuted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Add Additional Voice */}
                    <button className="w-full flex items-center gap-2 mt-2 p-2 text-xs text-textMuted hover:text-primary hover:bg-white/5 rounded-lg transition-all">
                        <Plus size={14} weight="bold" />
                        Add additional voice
                    </button>
                </div>

                {/* Language Section - Enhanced */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Translate size={16} weight="bold" className="text-textMuted" />
                        <h3 className="text-sm font-semibold text-textMain">Language</h3>
                    </div>
                    <p className="text-xs text-textMuted/70 mb-3">
                        Choose languages and enable auto-detection per customer.
                    </p>

                    {/* Default Language */}
                    <button
                        onClick={onOpenLanguageModal}
                        className="w-full flex items-center justify-between p-3.5 bg-surface/50 border border-white/10 rounded-xl hover:border-primary/30 hover:bg-white/[0.03] transition-all group mb-2"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{currentLanguage.flag}</span>
                            <div className="text-left">
                                <div className="text-sm font-medium text-textMain">{currentLanguage.name}</div>
                                <div className="text-[10px] text-primary font-semibold">Default</div>
                            </div>
                        </div>
                        <CaretRight size={16} weight="bold" className="text-textMuted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Auto-detect Toggle */}
                    <div
                        onClick={onAutoDetectToggle}
                        className="flex items-center justify-between p-3 bg-surface/50 border border-border rounded-lg mb-2 cursor-pointer hover:bg-surfaceHover transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <div className="text-xs">
                                <div className="text-textMain font-medium">Auto-detect & remember</div>
                                <div className="text-textMuted">Per customer preference</div>
                            </div>
                        </div>
                        <div
                            className={`w-9 h-5 rounded-full transition-colors ${formData.languageSettings.autoDetect ? 'bg-primary' : 'bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${formData.languageSettings.autoDetect ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                        </div>
                    </div>

                    {/* Supported Languages */}
                    {supportedLanguageObjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {supportedLanguageObjects.map((lang) => lang && (
                                <div
                                    key={lang.code}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded-md text-xs"
                                >
                                    <span>{lang.flag}</span>
                                    <span className="text-textMain">{lang.name}</span>
                                    <button
                                        onClick={() => onRemoveSupportedLanguage(lang.code)}
                                        className="text-textMuted hover:text-red-400 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Additional Language Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAddLanguageDropdown(!showAddLanguageDropdown)}
                            className="w-full flex items-center gap-2 p-2 text-xs text-textMuted hover:text-textMain hover:bg-surfaceHover rounded transition-colors"
                        >
                            <Plus size={14} />
                            Add supported language
                        </button>

                        {showAddLanguageDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                {availableLanguages.slice(0, 10).map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            onAddSupportedLanguage(lang.code);
                                            setShowAddLanguageDropdown(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-textMain hover:bg-surfaceHover transition-colors"
                                    >
                                        <span>{lang.flag}</span>
                                        <span>{lang.name}</span>
                                        {lang.nativeName !== lang.name && (
                                            <span className="text-textMuted">({lang.nativeName})</span>
                                        )}
                                    </button>
                                ))}
                                {availableLanguages.length > 10 && (
                                    <div className="px-3 py-2 text-xs text-textMuted border-t border-border">
                                        + {availableLanguages.length - 10} more languages available
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Communication Style Section - NEW */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Palette size={16} weight="bold" className="text-textMuted" />
                        <h3 className="text-sm font-semibold text-textMain">Communication Style</h3>
                    </div>
                    <p className="text-xs text-textMuted/70 mb-3">
                        How the AI should communicate with customers.
                    </p>

                    {/* Style Options Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {STYLE_OPTIONS.map((style) => {
                            const isSelected = formData.styleSettings.mode === style.mode;
                            const colorClasses = {
                                blue: isSelected ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5',
                                green: isSelected ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5',
                                yellow: isSelected ? 'border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/10' : 'border-white/10 hover:border-yellow-500/30 hover:bg-yellow-500/5',
                                purple: isSelected ? 'border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/10' : 'border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5',
                            };
                            return (
                                <button
                                    key={style.mode}
                                    onClick={() => onStyleModeSelect(style.mode)}
                                    className={`p-3 rounded-xl border transition-all text-left ${colorClasses[style.color as keyof typeof colorClasses]}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base">{style.icon}</span>
                                        <span className={`text-xs font-semibold ${isSelected ? 'text-textMain' : 'text-textMuted'}`}>
                                            {style.label}
                                        </span>
                                        {isSelected && (
                                            <Check size={12} weight="bold" className="text-primary ml-auto" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-textMuted/70 leading-tight">
                                        {style.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Adaptive Settings - Show when Adaptive is selected */}
                    {formData.styleSettings.mode === 'adaptive' && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-purple-300">Adaptive Settings</span>
                                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[9px] font-bold rounded uppercase">AI-Powered</span>
                            </div>

                            <div
                                onClick={() => onAdaptiveConfigToggle('mirrorFormality')}
                                className="flex items-center justify-between cursor-pointer hover:bg-surfaceHover p-1 rounded transition-colors"
                            >
                                <span className="text-xs text-textMuted">Mirror formality level</span>
                                <div
                                    className={`w-8 h-4.5 rounded-full transition-colors ${formData.styleSettings.adaptiveConfig.mirrorFormality ? 'bg-purple-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${formData.styleSettings.adaptiveConfig.mirrorFormality ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </div>
                            </div>

                            <div
                                onClick={() => onAdaptiveConfigToggle('mirrorLength')}
                                className="flex items-center justify-between cursor-pointer hover:bg-surfaceHover p-1 rounded transition-colors"
                            >
                                <span className="text-xs text-textMuted">Match response length</span>
                                <div
                                    className={`w-8 h-4.5 rounded-full transition-colors ${formData.styleSettings.adaptiveConfig.mirrorLength ? 'bg-purple-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${formData.styleSettings.adaptiveConfig.mirrorLength ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </div>
                            </div>

                            <div
                                onClick={() => onAdaptiveConfigToggle('mirrorVocabulary')}
                                className="flex items-center justify-between cursor-pointer hover:bg-surfaceHover p-1 rounded transition-colors"
                            >
                                <span className="text-xs text-textMuted">Adapt vocabulary</span>
                                <div
                                    className={`w-8 h-4.5 rounded-full transition-colors ${formData.styleSettings.adaptiveConfig.mirrorVocabulary ? 'bg-purple-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${formData.styleSettings.adaptiveConfig.mirrorVocabulary ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* LLM Section */}
                <div>
                    <h3 className="text-sm font-semibold text-textMain mb-2">LLM</h3>
                    <p className="text-xs text-textMuted/70 mb-3">
                        Select which provider and model to use for the LLM.
                    </p>

                    {/* Selected LLM */}
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
            </div>
        </div>
    );
};

// ============================================
// MEMORY TAB
// ============================================
interface MemoryTabProps {
    formData: AssistantFormData;
    setFormData: React.Dispatch<React.SetStateAction<AssistantFormData>>;
}

const MemoryTab: React.FC<MemoryTabProps> = ({ formData, setFormData }) => {
    const updateMemoryConfig = (key: keyof MemoryConfig, value: any) => {
        setFormData(prev => ({
            ...prev,
            memoryConfig: {
                ...prev.memoryConfig,
                [key]: value
            }
        }));
    };

    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-4xl mx-auto">
                {/* Header with Toggle */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-textMain">Customer Memory</h2>
                        <p className="text-sm text-textMuted mt-1">
                            AI memory that remembers every customer interaction
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-textMuted">{formData.memoryEnabled ? 'Enabled' : 'Disabled'}</span>
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, memoryEnabled: !prev.memoryEnabled }))}
                            className={`w-12 h-7 rounded-full transition-colors relative ${formData.memoryEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${formData.memoryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {formData.memoryEnabled ? (
                    <>
                        {/* Features Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-surface border border-white/10 rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                                    <ChatCircle size={20} weight="duotone" className="text-blue-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Conversation History</h3>
                                <p className="text-xs text-textMuted">Full transcripts and AI summaries of every past call</p>
                            </div>
                            <div className="bg-surface border border-white/10 rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                                    <Lightbulb size={20} weight="duotone" className="text-purple-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Smart Insights</h3>
                                <p className="text-xs text-textMuted">Auto-extracted preferences, objections & opportunities</p>
                            </div>
                            <div className="bg-surface border border-white/10 rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <Heart size={20} weight="duotone" className="text-emerald-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Sentiment Tracking</h3>
                                <p className="text-xs text-textMuted">Monitor customer satisfaction over time</p>
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="bg-surface border border-white/10 rounded-xl p-6 mb-6">
                            <h3 className="font-semibold text-textMain mb-4 flex items-center gap-2">
                                <Gear size={18} weight="duotone" />
                                Memory Configuration
                            </h3>

                            <div className="space-y-4">
                                {/* Remember Conversations */}
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Remember Conversations</div>
                                        <div className="text-xs text-textMuted">Store and recall past conversation transcripts</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('rememberConversations', !formData.memoryConfig.rememberConversations)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.rememberConversations ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.rememberConversations ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Extract Insights */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Extract Insights</div>
                                        <div className="text-xs text-textMuted">AI automatically identifies preferences, objections & opportunities</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('extractInsights', !formData.memoryConfig.extractInsights)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.extractInsights ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.extractInsights ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Track Sentiment */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Track Sentiment</div>
                                        <div className="text-xs text-textMuted">Monitor customer mood and satisfaction trends</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('trackSentiment', !formData.memoryConfig.trackSentiment)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.trackSentiment ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.trackSentiment ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Auto-generate Summary */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Auto-generate Summary</div>
                                        <div className="text-xs text-textMuted">Create AI summaries after each call ends</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('autoGenerateSummary', !formData.memoryConfig.autoGenerateSummary)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.autoGenerateSummary ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.autoGenerateSummary ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Max Context Conversations */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Context Window</div>
                                        <div className="text-xs text-textMuted">Number of past conversations to include in context</div>
                                    </div>
                                    <div className="w-48">
                                        <Select
                                            value={{
                                                value: formData.memoryConfig.maxContextConversations.toString(),
                                                label: `${formData.memoryConfig.maxContextConversations} conversations`
                                            }}
                                            onChange={(option) => updateMemoryConfig('maxContextConversations', parseInt(option.value))}
                                            options={[
                                                { value: '3', label: '3 conversations' },
                                                { value: '5', label: '5 conversations' },
                                                { value: '10', label: '10 conversations' },
                                                { value: '15', label: '15 conversations' }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* What Gets Injected */}
                        <div className="bg-surface border border-white/10 rounded-xl p-6">
                            <h3 className="font-semibold text-textMain mb-4 flex items-center gap-2">
                                <Lightning size={18} weight="fill" className="text-primary" />
                                Context Injected Into Calls
                            </h3>
                            <p className="text-xs text-textMuted mb-4">
                                When memory is enabled, the following information is automatically added to the system prompt for each call:
                            </p>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.memoryConfig.includeSummary}
                                        onChange={(e) => updateMemoryConfig('includeSummary', e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm text-textMain">Customer Summary</div>
                                        <div className="text-xs text-textMuted">Executive summary of who this customer is</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.memoryConfig.includeInsights}
                                        onChange={(e) => updateMemoryConfig('includeInsights', e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm text-textMain">Key Insights</div>
                                        <div className="text-xs text-textMuted">Important preferences, objections, and opportunities</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.memoryConfig.includeActionItems}
                                        onChange={(e) => updateMemoryConfig('includeActionItems', e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm text-textMain">Pending Action Items</div>
                                        <div className="text-xs text-textMuted">Follow-ups and commitments from past calls</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Example Preview */}
                        <div className="mt-6 p-4 bg-background rounded-xl border border-dashed border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Warning size={14} weight="duotone" className="text-textMuted" />
                                <span className="text-xs font-medium text-textMuted uppercase tracking-wide">Example Memory Context</span>
                            </div>
                            <pre className="text-xs text-textMuted font-mono whitespace-pre-wrap leading-relaxed">
                                {`--- CUSTOMER MEMORY ---
Customer: Rahul Sharma

Relationship:
- Total conversations: 4
- Last contact: Nov 20, 2025
- Overall sentiment: Positive
- Engagement score: 78/100

Personality: friendly, detail-oriented, price-conscious

Interests: premium features, mobile app integration

Pain points: current solution is slow, poor support

--- RECENT CONVERSATIONS ---
[1] Nov 20, 2025 (callback_requested)
Summary: Discussed enterprise pricing, requested callback
Key points:
  - Interested in annual plan
  - Needs approval from CFO
  - Follow up next week

--- KEY INSIGHTS ---
[PREFERENCE] Prefers morning calls (9-11 AM)
[OBJECTION] Concerned about migration complexity
[OPPORTUNITY] Expanding to 3 new locations
--- END MEMORY ---`}
                            </pre>
                        </div>
                    </>
                ) : (
                    /* Disabled State - Simple */
                    <div className="bg-surface border border-white/10 rounded-xl p-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Brain size={24} weight="duotone" className="text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-textMain mb-2">Memory is disabled</h3>
                                <p className="text-sm text-textMuted mb-4">
                                    Enable memory to let your AI assistant remember customer interactions,
                                    extract insights, and provide personalized responses based on conversation history.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">Conversation History</span>
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">AI Summaries</span>
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">Customer Insights</span>
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">Sentiment Tracking</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// TOOLS TAB
// ============================================
const ToolsTab: React.FC = () => {
    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-textMain">Tools</h2>
                        <p className="text-sm text-textMuted mt-1">
                            Define custom functions that the agent can call during conversations.
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all">
                        <Plus size={16} weight="bold" />
                        Add Tool
                    </button>
                </div>

                {/* Empty State */}
                <div className="border border-dashed border-white/10 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <Wrench size={28} weight="duotone" className="text-textMuted" />
                    </div>
                    <h3 className="text-lg font-medium text-textMain mb-2">No tools configured</h3>
                    <p className="text-sm text-textMuted mb-4 max-w-md mx-auto">
                        Tools allow your agent to perform actions like booking appointments, looking up information, or triggering workflows.
                    </p>
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 transition-all mx-auto">
                        <Plus size={16} weight="bold" />
                        Create your first tool
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// KNOWLEDGE BASE TAB (with RAG)
// ============================================
interface KnowledgeBaseTabProps {
    formData: AssistantFormData;
    setFormData: React.Dispatch<React.SetStateAction<AssistantFormData>>;
}

const KnowledgeBaseTab: React.FC<KnowledgeBaseTabProps> = ({ formData, setFormData }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showRAGConfig, setShowRAGConfig] = useState(false);
    const [showKBSelector, setShowKBSelector] = useState(false);
    const [allKnowledgeBases, setAllKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [linkedDocuments, setLinkedDocuments] = useState<KnowledgeBaseDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // Load all knowledge bases
    useEffect(() => {
        const loadKnowledgeBases = async () => {
            setLoading(true);
            try {
                const kbs = await getKnowledgeBases();
                setAllKnowledgeBases(kbs);
            } catch (error) {
                console.error('Error loading knowledge bases:', error);
            } finally {
                setLoading(false);
            }
        };
        loadKnowledgeBases();
    }, []);

    // Load documents for linked knowledge bases
    useEffect(() => {
        const loadDocuments = async () => {
            if (!formData.knowledgeBaseIds || formData.knowledgeBaseIds.length === 0) {
                setLinkedDocuments([]);
                return;
            }

            setLoadingDocs(true);
            try {
                const allDocs: KnowledgeBaseDocument[] = [];
                for (const kbId of formData.knowledgeBaseIds) {
                    const docs = await getDocuments(kbId);
                    allDocs.push(...docs);
                }
                setLinkedDocuments(allDocs);
            } catch (error) {
                console.error('Error loading documents:', error);
            } finally {
                setLoadingDocs(false);
            }
        };
        loadDocuments();
    }, [formData.knowledgeBaseIds]);

    // Get linked knowledge bases
    const linkedKnowledgeBases = allKnowledgeBases.filter(kb => 
        formData.knowledgeBaseIds?.includes(kb.id)
    );

    // Get available (unlinked) knowledge bases
    const availableKnowledgeBases = allKnowledgeBases.filter(kb => 
        !formData.knowledgeBaseIds?.includes(kb.id)
    );

    // Link a knowledge base
    const handleLinkKB = (kbId: string) => {
        const newIds = [...(formData.knowledgeBaseIds || []), kbId];
        setFormData({ ...formData, knowledgeBaseIds: newIds, ragEnabled: true });
        setShowKBSelector(false);
    };

    // Unlink a knowledge base
    const handleUnlinkKB = (kbId: string) => {
        const newIds = (formData.knowledgeBaseIds || []).filter(id => id !== kbId);
        setFormData({ 
            ...formData, 
            knowledgeBaseIds: newIds,
            ragEnabled: newIds.length > 0 
        });
    };

    // Filter documents based on search
    const filteredDocuments = linkedDocuments.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get document type icon
    const getDocTypeIcon = (type: string) => {
        switch (type) {
            case 'url': return <Globe size={18} weight="duotone" className="text-blue-400" />;
            case 'file': return <FileText size={18} weight="duotone" className="text-violet-400" />;
            case 'text': return <TextAa size={18} weight="duotone" className="text-emerald-400" />;
            default: return <FileText size={18} weight="duotone" className="text-textMuted" />;
        }
    };

    const getDocTypeBg = (type: string) => {
        switch (type) {
            case 'url': return 'bg-blue-500/10';
            case 'file': return 'bg-violet-500/10';
            case 'text': return 'bg-emerald-500/10';
            default: return 'bg-white/5';
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-textMain">Agent Knowledge Base</h2>
                        <p className="text-sm text-textMuted mt-1">
                            {linkedKnowledgeBases.length > 0 
                                ? `${linkedKnowledgeBases.length} knowledge base${linkedKnowledgeBases.length > 1 ? 's' : ''} linked · ${linkedDocuments.length} documents`
                                : 'Link knowledge bases to give your agent access to documents'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowRAGConfig(!showRAGConfig)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm transition-all ${
                                formData.ragEnabled 
                                    ? 'bg-primary/10 border-primary/30 text-primary' 
                                    : 'bg-surface border-white/10 text-textMain hover:bg-white/5'
                            }`}
                        >
                            <Gear size={16} weight="bold" />
                            RAG {formData.ragEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button 
                            onClick={() => setShowKBSelector(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            <Plus size={16} weight="bold" />
                            Link Knowledge Base
                        </button>
                    </div>
                </div>

                {/* Linked Knowledge Bases */}
                {linkedKnowledgeBases.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-textMuted mb-3">Linked Knowledge Bases</h3>
                        <div className="flex flex-wrap gap-2">
                            {linkedKnowledgeBases.map(kb => (
                                <div 
                                    key={kb.id}
                                    className="group flex items-center gap-2 px-3 py-2 bg-surface/80 border border-white/10 rounded-xl hover:border-primary/30 transition-all"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                        <BookOpen size={16} weight="fill" className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-textMain truncate">{kb.name}</p>
                                        <p className="text-xs text-textMuted">{kb.total_documents} documents</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleUnlinkKB(kb.id);
                                        }}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                                        title="Unlink knowledge base"
                                    >
                                        <X size={16} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search */}
                {linkedDocuments.length > 0 && (
                    <div className="relative mb-4">
                        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} weight="bold" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                    </div>
                )}

                {/* Loading State */}
                {(loading || loadingDocs) && (
                    <div className="flex items-center justify-center py-12">
                        <CircleNotch size={32} className="animate-spin text-primary" />
                    </div>
                )}

                {/* Documents Grid */}
                {!loading && !loadingDocs && filteredDocuments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocuments.map(doc => {
                            const kb = allKnowledgeBases.find(k => k.id === doc.knowledge_base_id);
                            return (
                                <div 
                                    key={doc.id} 
                                    className="group bg-surface/50 border border-white/10 rounded-xl p-4 hover:border-primary/30 hover:bg-white/[0.03] transition-all"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getDocTypeBg(doc.type)}`}>
                                            {getDocTypeIcon(doc.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-textMain truncate">{doc.name}</p>
                                            <p className="text-xs text-textMuted capitalize">{doc.type}</p>
                                            {doc.character_count > 0 && (
                                                <p className="text-xs text-textMuted/60 mt-1">
                                                    {doc.character_count.toLocaleString()} chars
                                                </p>
                                            )}
                                            {kb && (
                                                <p className="text-xs text-primary/60 mt-1 flex items-center gap-1">
                                                    <BookOpen size={10} weight="fill" />
                                                    {kb.name}
                                                </p>
                                            )}
                                            {doc.processing_status === 'processing' && (
                                                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                                    <ArrowsClockwise size={12} className="animate-spin" />
                                                    Processing...
                                                </p>
                                            )}
                                            {doc.processing_status === 'completed' && (
                                                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                                    <Check size={12} weight="bold" />
                                                    Ready
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State - No knowledge bases linked */}
                {!loading && !loadingDocs && linkedKnowledgeBases.length === 0 && (
                    <div className="bg-surface/50 border border-white/10 rounded-xl p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                            <BookOpen size={28} weight="duotone" className="text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-textMain mb-2">No knowledge bases linked</h3>
                        <p className="text-sm text-textMuted mb-6 max-w-md mx-auto">
                            Link a knowledge base to give this agent access to your documents. 
                            The agent will use RAG to find relevant information during conversations.
                        </p>
                        <button 
                            onClick={() => setShowKBSelector(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            <Plus size={16} weight="bold" />
                            Link Knowledge Base
                        </button>
                    </div>
                )}

                {/* Empty State - Knowledge base linked but no documents */}
                {!loading && !loadingDocs && linkedKnowledgeBases.length > 0 && linkedDocuments.length === 0 && (
                    <div className="bg-surface/50 border border-white/10 rounded-xl p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-4">
                            <FileText size={24} weight="duotone" className="text-textMuted" />
                        </div>
                        <h3 className="text-lg font-medium text-textMain mb-2">No documents in linked knowledge bases</h3>
                        <p className="text-sm text-textMuted mb-6">
                            Add documents to your knowledge bases to enable RAG.
                        </p>
                        <a 
                            href="/knowledge-base"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-white/10 rounded-xl text-sm font-medium text-textMain hover:bg-white/5 transition-all"
                        >
                            <BookOpen size={16} weight="bold" />
                            Go to Knowledge Base
                        </a>
                    </div>
                )}
            </div>

            {/* RAG Configuration Sidebar */}
            {showRAGConfig && (
                <div className="w-80 border-l border-white/5 bg-surface/30 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Gear size={18} weight="duotone" className="text-textMuted" />
                            <h3 className="font-medium text-textMain">RAG Configuration</h3>
                        </div>
                        <button
                            onClick={() => setShowRAGConfig(false)}
                            className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-textMain transition-all"
                        >
                            <X size={16} weight="bold" />
                        </button>
                    </div>

                    {/* Enable RAG Toggle */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-textMain">Enable RAG</span>
                            <button
                                onClick={() => setFormData({ ...formData, ragEnabled: !formData.ragEnabled })}
                                className={`w-10 h-6 rounded-full transition-colors ${formData.ragEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${formData.ragEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'} mt-0.5`} />
                            </button>
                        </div>
                        <p className="text-xs text-textMuted leading-relaxed">
                            Retrieval-Augmented Generation (RAG) allows the agent to search through linked knowledge bases and include relevant information in responses.
                        </p>
                    </div>

                    {formData.ragEnabled && (
                        <>
                            {/* Similarity Threshold */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">Similarity Threshold</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="1"
                                    value={formData.ragSimilarityThreshold}
                                    onChange={(e) => setFormData({ ...formData, ragSimilarityThreshold: parseFloat(e.target.value) || 0.7 })}
                                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                />
                                <p className="text-xs text-textMuted mt-1">Minimum relevance score (0-1)</p>
                            </div>

                            {/* Max Results */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">Max Results</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={formData.ragMaxResults}
                                    onChange={(e) => setFormData({ ...formData, ragMaxResults: parseInt(e.target.value) || 5 })}
                                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                />
                                <p className="text-xs text-textMuted mt-1">Number of chunks to retrieve</p>
                            </div>

                            {/* RAG Instructions */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">RAG Instructions</label>
                                <textarea
                                    value={formData.ragInstructions || ''}
                                    onChange={(e) => setFormData({ ...formData, ragInstructions: e.target.value })}
                                    placeholder="How should the agent use retrieved information..."
                                    rows={4}
                                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary resize-none"
                                />
                                <p className="text-xs text-textMuted mt-1">Guide how the agent uses knowledge base content</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Knowledge Base Selector Modal */}
            {showKBSelector && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[500px] shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-semibold text-textMain">Link Knowledge Base</h2>
                                <p className="text-sm text-textMuted mt-1">Select a knowledge base to link to this agent</p>
                            </div>
                            <button
                                onClick={() => setShowKBSelector(false)}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {availableKnowledgeBases.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-3">
                                        <BookOpen size={24} weight="duotone" className="text-textMuted" />
                                    </div>
                                    <p className="text-sm text-textMuted mb-4">
                                        {allKnowledgeBases.length === 0 
                                            ? "No knowledge bases found. Create one first."
                                            : "All knowledge bases are already linked."
                                        }
                                    </p>
                                    {allKnowledgeBases.length === 0 && (
                                        <a 
                                            href="/knowledge-base"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
                                        >
                                            <Plus size={16} weight="bold" />
                                            Create Knowledge Base
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availableKnowledgeBases.map(kb => (
                                        <button
                                            key={kb.id}
                                            onClick={() => handleLinkKB(kb.id)}
                                            className="w-full flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-primary/30 transition-all text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                                <BookOpen size={20} weight="duotone" className="text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-textMain">{kb.name}</p>
                                                <p className="text-xs text-textMuted">
                                                    {kb.total_documents} documents · {kb.total_characters.toLocaleString()} characters
                                                </p>
                                            </div>
                                            <Plus size={18} className="text-primary" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => setShowKBSelector(false)}
                                className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// ============================================
// ANALYSIS TAB (Call Logs - Simplified for MVP)
// ============================================
const AnalysisTab: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const logs = await getCallLogs();
                setCallLogs(logs);
            } catch (error) {
                console.error('Error fetching call logs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/20 text-emerald-400';
            case 'failed': return 'bg-red-500/20 text-red-400';
            case 'ongoing': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <div className="p-6 overflow-y-auto h-full">
            {/* Header */}
            <h2 className="text-2xl font-semibold text-textMain mb-6">Analysis</h2>

            {/* Search */}
            <div className="relative mb-4">
                <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} weight="bold" />
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {['Date After', 'Date Before', 'Call status', 'Duration'].map((filter) => (
                    <button
                        key={filter}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-white/10 rounded-xl text-sm text-textMuted hover:text-textMain hover:border-primary/30 transition-all"
                    >
                        <Plus size={14} weight="bold" />
                        {filter}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/5 text-sm font-medium text-textMuted">
                    <div>Date</div>
                    <div>Assistant</div>
                    <div>Duration</div>
                    <div>Status</div>
                    <div className="text-right">Cost</div>
                </div>

                {/* Table Body */}
                {loading ? (
                    <div className="p-8 text-center text-textMuted">Loading call logs...</div>
                ) : callLogs.length === 0 ? (
                    <div className="p-8 text-center text-textMuted">No conversations found</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {callLogs.map((log) => (
                            <div key={log.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <CaretRight size={16} weight="bold" className="text-textMuted" />
                                    <span className="text-sm text-textMain">{log.date}</span>
                                </div>
                                <div className="text-sm text-textMain">{log.assistantName}</div>
                                <div className="text-sm text-textMain font-mono">{log.duration}</div>
                                <div>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(log.status)}`}>
                                        {log.status === 'completed' ? 'Successful' : log.status === 'failed' ? 'Failed' : 'Ongoing'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm text-textMain font-mono">₹{log.cost.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// TESTS TAB - For creating test cases
// ============================================
interface TestsTabProps {
    assistantId: string | null;
    formData: AssistantFormData;
    selectedVoice: Voice | null;
}

const TestsTab: React.FC<TestsTabProps> = ({ assistantId }) => {
    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-textMain mb-2">Test Cases</h2>
                    <p className="text-sm text-textMuted">
                        Create automated test scenarios to validate your agent's behavior and responses.
                    </p>
                </div>

                {/* Coming Soon Card */}
                <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-surface/30">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                        <TestTube size={36} weight="duotone" className="text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-textMain mb-3">Automated Testing Coming Soon</h3>
                    <p className="text-sm text-textMuted mb-8 max-w-lg mx-auto leading-relaxed">
                        Create test scenarios with expected inputs and outputs. Run automated tests to ensure your agent 
                        behaves correctly across different conversations and edge cases.
                    </p>
                    
                    {/* Feature Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                        <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-left">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                                <ChatCircle size={20} className="text-primary" />
                            </div>
                            <h4 className="text-sm font-medium text-textMain mb-1">Conversation Tests</h4>
                            <p className="text-xs text-textMuted">Define multi-turn conversations with expected responses</p>
                        </div>
                        <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-left">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                                <Check size={20} className="text-primary" />
                            </div>
                            <h4 className="text-sm font-medium text-textMain mb-1">Assertions</h4>
                            <p className="text-xs text-textMuted">Validate response content, tone, and language</p>
                        </div>
                        <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-left">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                                <Play size={20} className="text-primary" />
                            </div>
                            <h4 className="text-sm font-medium text-textMain mb-1">Batch Testing</h4>
                            <p className="text-xs text-textMuted">Run all tests with one click before publishing</p>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
                        <Sparkle size={16} className="text-primary" />
                        <span className="text-sm text-primary font-medium">Coming in Q1 2026</span>
                    </div>
                </div>

                {/* Tip */}
                <div className="mt-6 p-4 bg-surface/50 border border-white/5 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-textMain mb-1">Pro Tip</h4>
                        <p className="text-xs text-textMuted">
                            Use the <strong className="text-textMain">Chat</strong> button in the header to manually test your agent's 
                            responses before publishing. This helps you verify the configuration is working correctly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// CHAT SIDEBAR - Preview/Talk to Agent
// ============================================
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

    // Always use Railway backend (even in dev) since local backend may not be running
    const BACKEND_URL = 'https://callyy-production.up.railway.app';

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

        // Determine which system prompt and first message to use based on active tab
        const isMessaging = activeTab === 'messages';
        const systemPromptToUse = isMessaging 
            ? (formData.messagingSystemPrompt || formData.systemPrompt)
            : formData.systemPrompt;
        const firstMessageToUse = isMessaging
            ? (formData.messagingFirstMessage || formData.firstMessage)
            : formData.firstMessage;

        const response = await fetch(`${BACKEND_URL}/api/test-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                conversationHistory,
                assistantId,
                userId: user?.id,
                channel: isMessaging ? 'messaging' : 'calls',
                assistantConfig: {
                    name: formData.name,
                    systemPrompt: systemPromptToUse,
                    firstMessage: firstMessageToUse,
                    languageSettings: formData.languageSettings,
                    styleSettings: formData.styleSettings,
                    llmModel: formData.llmModel,
                    temperature: formData.temperature,
                    maxTokens: formData.maxTokens,
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
// PLACEHOLDER TAB
// ============================================
const PlaceholderTab: React.FC<{ tabName: string }> = ({ tabName }) => {
    const tabInfo: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
        'workflow': {
            title: 'Workflow Builder',
            description: 'Design complex conversation flows with branching logic and conditions.',
            icon: <GitBranch size={28} weight="duotone" className="text-textMuted" />
        },
        'widget': {
            title: 'Widget Configuration',
            description: 'Customize the embedded widget appearance and behavior.',
            icon: <Layout size={28} weight="duotone" className="text-textMuted" />
        },
    };

    const info = tabInfo[tabName] || { title: tabName, description: '', icon: null };

    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-2xl">
                <div className="border border-dashed border-border rounded-xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                        {info.icon}
                    </div>
                    <h3 className="text-lg font-medium text-textMain mb-2">{info.title}</h3>
                    <p className="text-sm text-textMuted mb-4 max-w-md mx-auto">
                        {info.description}
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded text-xs text-textMuted">
                        Coming Soon
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AssistantEditor;