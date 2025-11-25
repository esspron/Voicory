import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Save, Play, Bot, GitBranch, BookOpen, BarChart3, Wrench, 
    FlaskConical, Layout, Settings, Sparkles, Globe,
    ChevronRight, Plus, Mic, Zap, Search, Filter, FileText,
    X, Check, Clock, MessageSquare, Phone, ChevronDown, Loader2,
    Brain, User, TrendingUp, AlertCircle, Heart, Lightbulb
} from 'lucide-react';
import { getAssistant, getVoices, getCallLogs, createAssistant, updateAssistant } from '../services/callyyService';
import { Assistant, Voice, CallLog, AssistantInput, MemoryConfig } from '../types';
import VoiceSelectorModal from '../components/assistant-editor/VoiceSelectorModal';
import LLMSelectorModal from '../components/assistant-editor/LLMSelectorModal';

// Tab definitions - Added Memory tab
const TABS = [
    { id: 'agent', label: 'Agent', icon: Bot, isNew: false },
    { id: 'memory', label: 'Memory', icon: Brain, isNew: true, highlight: true },
    { id: 'workflow', label: 'Workflow', icon: GitBranch, isNew: true },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'tests', label: 'Tests', icon: FlaskConical, isNew: true },
    { id: 'widget', label: 'Widget', icon: Layout },
] as const;

type TabId = typeof TABS[number]['id'];

// LLM Options
const LLM_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
    { id: 'groq', name: 'Groq', models: ['llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b'] },
    { id: 'together', name: 'Together AI', models: ['Qwen3-30B-A3B', 'Llama-3.2-90B'] },
];

// Language options
const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'hi-Latn', name: 'Hinglish', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

interface AssistantFormData {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    voiceId: string | null;
    elevenlabsModelId: string;
    language: string;
    additionalLanguages: string[];
    llmProvider: string;
    llmModel: string;
    temperature: number;
    maxTokens: number;
    interruptible: boolean;
    useDefaultPersonality: boolean;
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
    systemPrompt: `You are {{owner_name}}'s personal AI voice assistant.
Your first message has already been delivered using the {{message}} variable.
Call mode: {{call_mode}}
---
IF call_mode is "message_delivery":
You're calling to deliver a message on behalf of {{owner_name}}.
AFTER your first message:
- Ask: "Would you like to send any message back to {{owner_name}}?"
- Listen to their FULL response - don't interrupt or rush
- Let them speak freely and add multiple things
- Confirm what you heard: "Got it! I'll let {{owner_name}} know you said: [repeat their message]"
- Ask: "Anything else you'd like me to add?"`,
    firstMessage: '{{message}}',
    voiceId: null,
    elevenlabsModelId: 'eleven_turbo_v2_5',
    language: 'en',
    additionalLanguages: [],
    llmProvider: 'openai',
    llmModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024,
    interruptible: true,
    useDefaultPersonality: true,
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
    const [activeTab, setActiveTab] = useState<TabId>('agent');
    const [formData, setFormData] = useState<AssistantFormData>(DEFAULT_FORM_DATA);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const skipChangeDetection = useRef(false);
    const initialLoadComplete = useRef(false);
    
    // Modal states
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showLLMModal, setShowLLMModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    // Track changes - skip during initial load and after save
    useEffect(() => {
        if (skipChangeDetection.current) {
            skipChangeDetection.current = false;
            return;
        }
        if (initialLoadComplete.current) {
            setHasChanges(true);
        }
    }, [formData]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch voices
                const voicesData = await getVoices();
                setVoices(voicesData);
                
                // If editing existing assistant, fetch it
                if (id && id !== 'new') {
                    const assistant = await getAssistant(id);
                    if (assistant) {
                        setAssistantId(assistant.id);
                        setFormData({
                            name: assistant.name,
                            systemPrompt: assistant.systemPrompt || DEFAULT_FORM_DATA.systemPrompt,
                            firstMessage: assistant.firstMessage || DEFAULT_FORM_DATA.firstMessage,
                            voiceId: assistant.voiceId || null,
                            elevenlabsModelId: assistant.elevenlabsModelId || 'eleven_turbo_v2_5',
                            language: assistant.language || 'en',
                            additionalLanguages: [],
                            llmProvider: assistant.llmProvider || 'openai',
                            llmModel: assistant.llmModel || assistant.model || 'gpt-4o',
                            temperature: assistant.temperature ?? 0.7,
                            maxTokens: assistant.maxTokens ?? 1024,
                            interruptible: assistant.interruptible ?? true,
                            useDefaultPersonality: assistant.useDefaultPersonality ?? true,
                            ragEnabled: assistant.ragEnabled ?? false,
                            ragSimilarityThreshold: assistant.ragSimilarityThreshold ?? 0.7,
                            ragMaxResults: assistant.ragMaxResults ?? 5,
                            ragInstructions: assistant.ragInstructions || '',
                            knowledgeBaseIds: assistant.knowledgeBaseIds || [],
                            memoryEnabled: assistant.memoryEnabled ?? false,
                            memoryConfig: assistant.memoryConfig || DEFAULT_MEMORY_CONFIG,
                            status: assistant.status,
                        });
                        // Find and set selected voice
                        const voice = voicesData.find(v => v.id === assistant.voiceId);
                        if (voice) setSelectedVoice(voice);
                    }
                }
                // Mark initial load complete after setting form data
                setTimeout(() => {
                    initialLoadComplete.current = true;
                    setHasChanges(false);
                }, 0);
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
                systemPrompt: formData.systemPrompt,
                firstMessage: formData.firstMessage,
                voiceId: formData.voiceId || undefined,
                elevenlabsModelId: formData.elevenlabsModelId,
                language: formData.language,
                llmProvider: formData.llmProvider,
                llmModel: formData.llmModel,
                temperature: formData.temperature,
                maxTokens: formData.maxTokens,
                interruptible: formData.interruptible,
                useDefaultPersonality: formData.useDefaultPersonality,
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
                // Skip change detection for this status update
                skipChangeDetection.current = true;
                setFormData(prev => ({ ...prev, status: savedAssistant!.status }));
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

    const handleLanguageSelect = (langCode: string) => {
        setFormData({ ...formData, language: langCode });
        setShowLanguageModal(false);
    };

    const currentLanguage = LANGUAGES.find(l => l.code === formData.language) || LANGUAGES[0];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'agent':
                return (
                    <AgentTab 
                        formData={formData}
                        setFormData={setFormData}
                        selectedVoice={selectedVoice}
                        currentLanguage={currentLanguage}
                        onOpenVoiceModal={() => setShowVoiceModal(true)}
                        onOpenLLMModal={() => setShowLLMModal(true)}
                        onOpenLanguageModal={() => setShowLanguageModal(true)}
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
                return <KnowledgeBaseTab />;
            case 'analysis':
                return <AnalysisTab />;
            default:
                return <PlaceholderTab tabName={activeTab} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="bg-transparent text-textMain font-semibold text-lg outline-none placeholder:text-textMuted focus:underline decoration-border decoration-dashed underline-offset-4"
                                placeholder="Assistant Name"
                            />
                            {!assistantId && (
                                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
                                    New
                                </span>
                            )}
                            {hasChanges && assistantId && (
                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                                    Unsaved
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-textMuted flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${formData.status === 'active' ? 'bg-emerald-500' : formData.status === 'draft' ? 'bg-gray-400' : 'bg-yellow-500'}`}></span>
                            {formData.status === 'active' ? 'Published' : formData.status === 'draft' ? 'Draft' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain hover:bg-surfaceHover transition-colors"
                        disabled={saving}
                    >
                        <Play size={16} />
                        Test
                    </button>
                    <button 
                        onClick={() => handleSave(false)}
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain hover:bg-surfaceHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save
                    </button>
                    {formData.status !== 'active' && (
                        <button 
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                            Publish
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border bg-surface/30">
                <div className="flex items-center gap-1 px-6 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isHighlighted = 'highlight' in tab && tab.highlight;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                    ${activeTab === tab.id 
                                        ? 'border-primary text-textMain' 
                                        : 'border-transparent text-textMuted hover:text-textMain hover:border-border'
                                    }
                                `}
                            >
                                <Icon size={16} className={isHighlighted ? 'text-purple-400' : ''} />
                                {tab.label}
                                {isHighlighted ? (
                                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-primary text-white text-[10px] font-bold rounded uppercase">
                                        New
                                    </span>
                                ) : tab.isNew && (
                                    <span className="px-1.5 py-0.5 bg-gray-600 text-gray-300 text-[10px] font-medium rounded">
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
                    onModelChange={(modelId) => setFormData({...formData, elevenlabsModelId: modelId})}
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
    currentLanguage: { code: string; name: string; flag: string };
    onOpenVoiceModal: () => void;
    onOpenLLMModal: () => void;
    onOpenLanguageModal: () => void;
}

const AgentTab: React.FC<AgentTabProps> = ({
    formData,
    setFormData,
    selectedVoice,
    currentLanguage,
    onOpenVoiceModal,
    onOpenLLMModal,
    onOpenLanguageModal,
}) => {
    return (
        <div className="flex h-full overflow-hidden">
            {/* Left Panel - Prompts */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-border">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-textMain">System prompt</h3>
                        <a href="#" className="text-textMuted hover:text-primary">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline">
                                <path d="M3.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V9.5C1.5 10.0523 1.94772 10.5 2.5 10.5H8.5C9.05228 10.5 9.5 10.0523 9.5 9.5V8.5M6.5 1.5H10.5M10.5 1.5V5.5M10.5 1.5L5 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </a>
                    </div>
                    <button className="p-1.5 hover:bg-surfaceHover rounded text-textMuted hover:text-primary transition-colors" title="Enhance with AI">
                        <Sparkles size={16} />
                    </button>
                </div>

                {/* System Prompt Textarea */}
                <div className="relative mb-4">
                    <textarea
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})}
                        className="w-full h-64 bg-surface border border-border rounded-xl p-4 text-sm text-textMain outline-none focus:border-primary resize-none font-mono leading-relaxed"
                        placeholder="Enter system instructions..."
                    />
                    <button className="absolute top-3 right-3 p-1 hover:bg-surfaceHover rounded text-textMuted hover:text-textMain" title="Expand">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M9 1H13M13 1V5M13 1L8 6M5 13H1M1 13V9M1 13L6 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>

                {/* Prompt Footer */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-xs text-textMuted">
                        Type <code className="bg-surface px-1.5 py-0.5 rounded text-primary">{'{{'}</code> to add variables
                    </span>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`w-9 h-5 rounded-full transition-colors ${formData.useDefaultPersonality ? 'bg-primary' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${formData.useDefaultPersonality ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-xs text-textMain">Default personality</span>
                        </label>
                        <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-textMuted hover:text-textMain hover:bg-surfaceHover rounded transition-colors">
                            <Globe size={12} />
                            Set timezone
                        </button>
                    </div>
                </div>

                {/* First Message Section */}
                <div className="mb-4">
                    <h3 className="text-sm font-medium text-textMain mb-1">First message</h3>
                    <p className="text-xs text-textMuted mb-3">
                        The first message the agent will say. If empty, the agent will wait for the user to start the conversation.{' '}
                        <a href="#" className="text-primary hover:underline">Disclosure Requirements ↗</a>
                    </p>
                </div>

                <div className="relative mb-4">
                    <textarea
                        value={formData.firstMessage}
                        onChange={(e) => setFormData({...formData, firstMessage: e.target.value})}
                        className="w-full h-24 bg-surface border border-border rounded-xl p-4 text-sm text-textMain outline-none focus:border-primary resize-none font-mono"
                        placeholder="Hello! How can I help you today?"
                    />
                    <button className="absolute top-3 right-3 p-1 hover:bg-surfaceHover rounded text-textMuted hover:text-textMain" title="Expand">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M9 1H13M13 1V5M13 1L8 6M5 13H1M1 13V9M1 13L6 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>

                {/* First Message Footer */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-textMuted">
                        Type <code className="bg-surface px-1.5 py-0.5 rounded text-primary">{'{{'}</code> to add variables
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <div className={`w-9 h-5 rounded-full transition-colors ${formData.interruptible ? 'bg-primary' : 'bg-gray-600'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${formData.interruptible ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs text-textMain">Interruptible</span>
                    </label>
                </div>
            </div>

            {/* Right Panel - Voice, Language, LLM */}
            <div className="w-80 overflow-y-auto p-6 bg-surface/20">
                {/* Voices Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-textMain">Voices</h3>
                        <button className="p-1 hover:bg-surfaceHover rounded text-textMuted hover:text-textMain" title="Voice Settings">
                            <Settings size={14} />
                        </button>
                    </div>
                    <p className="text-xs text-textMuted mb-3">
                        Select the ElevenLabs voices you want to use for the agent.
                    </p>

                    {/* Selected Voice */}
                    <button
                        onClick={onOpenVoiceModal}
                        className="w-full flex items-center justify-between p-3 bg-surface border border-border rounded-lg hover:border-primary/50 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                                <Mic size={14} className="text-primary" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-textMain">
                                    {selectedVoice?.name || 'Select Voice'}
                                </div>
                                {selectedVoice && (
                                    <div className="text-[10px] text-primary font-medium">Primary</div>
                                )}
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-textMuted group-hover:text-textMain transition-colors" />
                    </button>

                    {/* Add Additional Voice */}
                    <button className="w-full flex items-center gap-2 mt-2 p-2 text-xs text-textMuted hover:text-textMain hover:bg-surfaceHover rounded transition-colors">
                        <Plus size={14} />
                        Add additional voice
                    </button>
                </div>

                {/* Language Section */}
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-textMain mb-2">Language</h3>
                    <p className="text-xs text-textMuted mb-3">
                        Choose the default and additional languages the agent will communicate in.
                    </p>

                    {/* Selected Language */}
                    <button
                        onClick={onOpenLanguageModal}
                        className="w-full flex items-center justify-between p-3 bg-surface border border-border rounded-lg hover:border-primary/50 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">{currentLanguage.flag}</span>
                            <div className="text-left">
                                <div className="text-sm font-medium text-textMain">{currentLanguage.name}</div>
                                <div className="text-[10px] text-primary font-medium">Default</div>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-textMuted group-hover:text-textMain transition-colors" />
                    </button>

                    {/* Add Additional Language */}
                    <button className="w-full flex items-center gap-2 mt-2 p-2 text-xs text-textMuted hover:text-textMain hover:bg-surfaceHover rounded transition-colors">
                        <Plus size={14} />
                        Add additional languages
                    </button>
                </div>

                {/* LLM Section */}
                <div>
                    <h3 className="text-sm font-medium text-textMain mb-2">LLM</h3>
                    <p className="text-xs text-textMuted mb-3">
                        Select which provider and model to use for the LLM.
                    </p>

                    {/* Selected LLM */}
                    <button
                        onClick={onOpenLLMModal}
                        className="w-full flex items-center justify-between p-3 bg-surface border border-border rounded-lg hover:border-primary/50 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                                <Zap size={14} className="text-blue-400" />
                            </div>
                            <div className="text-sm font-medium text-textMain">{formData.llmModel}</div>
                        </div>
                        <ChevronRight size={16} className="text-textMuted group-hover:text-textMain transition-colors" />
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
            <div className="max-w-4xl">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-purple-500/10 via-primary/5 to-blue-500/10 border border-primary/20 rounded-2xl p-8 mb-8">
                    <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center flex-shrink-0">
                            <Brain size={32} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-textMain">Customer Memory</h2>
                                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full uppercase tracking-wide">
                                    Exclusive
                                </span>
                            </div>
                            <p className="text-textMuted leading-relaxed mb-4">
                                Revolutionary AI memory that remembers every customer interaction. Your assistant builds a 
                                deep understanding of each customer over time - their preferences, pain points, past conversations, 
                                and relationship history. <span className="text-primary font-medium">No other platform offers this.</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-textMain font-medium">Enable Memory</span>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, memoryEnabled: !prev.memoryEnabled }))}
                                    className={`w-12 h-7 rounded-full transition-colors relative ${formData.memoryEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${formData.memoryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {formData.memoryEnabled ? (
                    <>
                        {/* Features Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-surface border border-border rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                                    <MessageSquare size={20} className="text-blue-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Conversation History</h3>
                                <p className="text-xs text-textMuted">Full transcripts and AI summaries of every past call</p>
                            </div>
                            <div className="bg-surface border border-border rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                                    <Lightbulb size={20} className="text-purple-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Smart Insights</h3>
                                <p className="text-xs text-textMuted">Auto-extracted preferences, objections & opportunities</p>
                            </div>
                            <div className="bg-surface border border-border rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <Heart size={20} className="text-emerald-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Sentiment Tracking</h3>
                                <p className="text-xs text-textMuted">Monitor customer satisfaction over time</p>
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                            <h3 className="font-semibold text-textMain mb-4 flex items-center gap-2">
                                <Settings size={18} />
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
                                    <select
                                        value={formData.memoryConfig.maxContextConversations}
                                        onChange={(e) => updateMemoryConfig('maxContextConversations', parseInt(e.target.value))}
                                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-textMain outline-none focus:border-primary"
                                    >
                                        <option value={3}>3 conversations</option>
                                        <option value={5}>5 conversations</option>
                                        <option value={10}>10 conversations</option>
                                        <option value={15}>15 conversations</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* What Gets Injected */}
                        <div className="bg-surface border border-border rounded-xl p-6">
                            <h3 className="font-semibold text-textMain mb-4 flex items-center gap-2">
                                <Zap size={18} className="text-primary" />
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
                        <div className="mt-6 p-4 bg-background rounded-xl border border-dashed border-border">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle size={14} className="text-textMuted" />
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
                    /* Disabled State */
                    <div className="border border-dashed border-border rounded-xl p-12 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-primary/20 flex items-center justify-center mx-auto mb-6">
                            <Brain size={40} className="text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-textMain mb-3">Unlock Customer Memory</h3>
                        <p className="text-sm text-textMuted mb-6 max-w-lg mx-auto leading-relaxed">
                            Enable memory to give your AI assistant the ability to remember every customer interaction. 
                            Build deeper relationships with personalized conversations that reference past discussions, 
                            preferences, and history.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-3 mb-6">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs text-textMuted">
                                <Check size={14} className="text-primary" />
                                Conversation Transcripts
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs text-textMuted">
                                <Check size={14} className="text-primary" />
                                AI-Generated Summaries
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs text-textMuted">
                                <Check size={14} className="text-primary" />
                                Customer Insights
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs text-textMuted">
                                <Check size={14} className="text-primary" />
                                Sentiment Tracking
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs text-textMuted">
                                <Check size={14} className="text-primary" />
                                Action Item Tracking
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, memoryEnabled: true }))}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            <Brain size={20} />
                            Enable Customer Memory
                        </button>
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
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-medium rounded-lg text-sm hover:bg-primaryHover transition-colors">
                        <Plus size={16} />
                        Add Tool
                    </button>
                </div>

                {/* Empty State */}
                <div className="border border-dashed border-border rounded-xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                        <Wrench size={28} className="text-textMuted" />
                    </div>
                    <h3 className="text-lg font-medium text-textMain mb-2">No tools configured</h3>
                    <p className="text-sm text-textMuted mb-4 max-w-md mx-auto">
                        Tools allow your agent to perform actions like booking appointments, looking up information, or triggering workflows.
                    </p>
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain hover:bg-surfaceHover transition-colors mx-auto">
                        <Plus size={16} />
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
const KnowledgeBaseTab: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [enableRAG, setEnableRAG] = useState(false);
    const [showRAGConfig, setShowRAGConfig] = useState(false);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-textMain">Agent Knowledge Base</h2>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowRAGConfig(!showRAGConfig)}
                            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm text-textMain hover:bg-surfaceHover transition-colors"
                        >
                            <Settings size={16} />
                            Configure RAG
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-medium rounded-lg text-sm hover:bg-primaryHover transition-colors">
                            <Plus size={16} />
                            Add document
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                    <input
                        type="text"
                        placeholder="Search Knowledge Base..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg pl-12 pr-4 py-3 text-sm text-textMain outline-none focus:border-primary"
                    />
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2 mb-6">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-textMuted hover:text-textMain hover:border-primary/50 transition-colors">
                        <Plus size={14} />
                        Type
                    </button>
                </div>

                {/* Empty State */}
                <div className="bg-surface/50 border border-border rounded-xl p-12 text-center">
                    <div className="w-14 h-14 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                        <FileText size={24} className="text-textMuted" />
                    </div>
                    <h3 className="text-lg font-medium text-textMain mb-2">No documents found</h3>
                    <p className="text-sm text-textMuted mb-6">
                        This agent has no attached documents yet.
                    </p>
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-border rounded-lg text-sm font-medium text-textMain hover:bg-surfaceHover transition-colors">
                        <Plus size={16} />
                        Add document
                    </button>
                </div>
            </div>

            {/* RAG Configuration Sidebar */}
            {showRAGConfig && (
                <div className="w-80 border-l border-border bg-surface/30 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Settings size={18} className="text-textMuted" />
                            <h3 className="font-medium text-textMain">RAG configuration</h3>
                        </div>
                        <button 
                            onClick={() => setShowRAGConfig(false)}
                            className="p-1 hover:bg-surfaceHover rounded text-textMuted hover:text-textMain"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Enable RAG Toggle */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-textMain">Enable RAG</span>
                            <button
                                onClick={() => setEnableRAG(!enableRAG)}
                                className={`w-10 h-6 rounded-full transition-colors ${enableRAG ? 'bg-primary' : 'bg-gray-600'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enableRAG ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'} mt-0.5`} />
                            </button>
                        </div>
                        <p className="text-xs text-textMuted leading-relaxed">
                            Retrieval-Augmented Generation (RAG) increases the agent's maximum Knowledge Base size. The agent will have access to relevant pieces of attached Knowledge Base during answer generation.
                        </p>
                    </div>

                    {enableRAG && (
                        <>
                            {/* Chunk Size */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">Chunk Size</label>
                                <input
                                    type="number"
                                    defaultValue={1000}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                />
                                <p className="text-xs text-textMuted mt-1">Characters per chunk</p>
                            </div>

                            {/* Chunk Overlap */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">Chunk Overlap</label>
                                <input
                                    type="number"
                                    defaultValue={200}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                />
                                <p className="text-xs text-textMuted mt-1">Overlap between chunks</p>
                            </div>

                            {/* Top K Results */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">Top K Results</label>
                                <input
                                    type="number"
                                    defaultValue={5}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                />
                                <p className="text-xs text-textMuted mt-1">Number of chunks to retrieve</p>
                            </div>
                        </>
                    )}
                </div>
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg pl-12 pr-4 py-3 text-sm text-textMain outline-none focus:border-primary"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {['Date After', 'Date Before', 'Call status', 'Duration'].map((filter) => (
                    <button 
                        key={filter}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-textMuted hover:text-textMain hover:border-primary/50 transition-colors"
                    >
                        <Plus size={14} />
                        {filter}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-border text-sm font-medium text-textMuted">
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
                    <div className="divide-y divide-border">
                        {callLogs.map((log) => (
                            <div key={log.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-surfaceHover transition-colors cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <ChevronRight size={16} className="text-textMuted" />
                                    <span className="text-sm text-textMain">{log.date}</span>
                                </div>
                                <div className="text-sm text-textMain">{log.assistantName}</div>
                                <div className="text-sm text-textMain font-mono">{log.duration}</div>
                                <div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
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
// PLACEHOLDER TAB
// ============================================
const PlaceholderTab: React.FC<{ tabName: string }> = ({ tabName }) => {
    const tabInfo: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
        'workflow': {
            title: 'Workflow Builder',
            description: 'Design complex conversation flows with branching logic and conditions.',
            icon: <GitBranch size={28} className="text-textMuted" />
        },
        'tests': {
            title: 'Test Scenarios',
            description: 'Create and run automated tests to validate your agent behavior.',
            icon: <FlaskConical size={28} className="text-textMuted" />
        },
        'widget': {
            title: 'Widget Configuration',
            description: 'Customize the embedded widget appearance and behavior.',
            icon: <Layout size={28} className="text-textMuted" />
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