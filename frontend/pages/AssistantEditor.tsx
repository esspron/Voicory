import {
    FloppyDisk, Play,
    Globe, X, Check, ChatCircle, Phone, CircleNotch,
    Trash, Translate, Lightning, Copy, CopySimple, SpeakerHigh, SpeakerSlash
} from '@phosphor-icons/react';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import AgentTab from '../components/assistant-editor/AgentTab';
import TestsTab from '../components/assistant-editor/TestsTab';
import ChatSidebar from '../components/assistant-editor/ChatSidebar';
import IntegrationsTab from '../components/assistant-editor/IntegrationsTab';
import KnowledgeBaseTab from '../components/assistant-editor/KnowledgeBaseTab';
import LLMSelectorModal from '../components/assistant-editor/LLMSelectorModal';
import MemoryTab from '../components/assistant-editor/MemoryTab';
import PromptGeneratorModal from '../components/assistant-editor/PromptGeneratorModal';
import VoiceSelectorModal from '../components/assistant-editor/VoiceSelectorModal';
import LiveKitVoiceCall from '../components/LiveKitVoiceCall';
import WidgetTab from '../components/assistant-editor/WidgetTab';
import { FadeIn } from '../components/ui/FadeIn';
import type { AssistantIntegrations } from '../types/integrations';
import { DEFAULT_INTEGRATIONS } from '../types/integrations';
import { getAssistantIntegrations, saveAssistantIntegrations } from '../services/integrationService';
import type { REScript } from '../types/reScripts';
import { useAuth } from '../contexts/AuthContext';
import { useClipboard } from '../hooks';
import { authFetch } from '../lib/api';
import { supabase } from '../services/supabase';
import { logger } from '../lib/logger';
import { getAssistant, getVoices, createAssistant, updateAssistant, deleteAssistant, duplicateAssistant } from '../services/voicoryService';
import {
    Assistant, Voice, AssistantInput, MemoryConfig,
    LanguageSettings, StyleSettings, StyleMode,
    DynamicVariablesConfig,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE_SETTINGS, DEFAULT_STYLE_SETTINGS,
    DEFAULT_DYNAMIC_VARIABLES_CONFIG
} from '../types';

// Tab definitions - Agent tab with unified instruction for both calls and messages
const TABS = [
    { id: 'agent', label: 'Agent' },
    { id: 'memory', label: 'Memory' },
    { id: 'knowledge-base', label: 'Knowledge Base' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'tests', label: 'Tests' },
    { id: 'widget', label: 'Widget' },
] as const;

type TabId = typeof TABS[number]['id'];

// LLM Options
const LLM_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
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
    title: string;  // Short title/role (e.g., Sales Support, Customer Support)
    // Unified instruction (like Vapi, Retell, LiveKit)
    instruction: string;
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
    // Integrations (CRM, HTTP, LiveKit)
    integrations: AssistantIntegrations;
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
    title: '',  // Short title/role (e.g., Sales Support, Customer Support)
    // Unified instruction (like Vapi, Retell, LiveKit)
    instruction: `You are a helpful, friendly AI assistant. Your role is to assist users with their questions and needs in a professional yet conversational manner.

Guidelines:
- Be warm, patient, and attentive to the user's needs
- Listen carefully and ask clarifying questions when needed
- Provide clear, concise, and accurate information
- If you don't know something, be honest and offer to help find the answer
- Keep responses conversational and natural
- Be respectful of the user's time

You can be customized with specific knowledge, personality traits, and capabilities based on the business needs.`,
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
    ragSimilarityThreshold: 0.2,
    ragMaxResults: 10,
    ragInstructions: 'STRICT MODE: Only answer using the knowledge base content. If the information is not in the knowledge base, say "I don\'t have information about that in my knowledge base."',
    knowledgeBaseIds: [],
    memoryEnabled: false,
    memoryConfig: DEFAULT_MEMORY_CONFIG,
    integrations: { ...DEFAULT_INTEGRATIONS },
    status: 'draft',
};

const AssistantEditor: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('agent');
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
    const [duplicating, setDuplicating] = useState(false);
    const [previewingVoice, setPreviewingVoice] = useState(false);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [showChatSidebar, setShowChatSidebar] = useState(false);
    const [showVoiceCallPreview, setShowVoiceCallPreview] = useState(false);
    
    // Get user from auth context
    const { user } = useAuth();
    
    // Clipboard for assistant ID
    const { copy: copyId, copied: copiedId } = useClipboard(2000);

    // Helper to create a comparable string from form data (only key user-editable fields)
    const getFormDataFingerprint = (data: AssistantFormData) => {
        return JSON.stringify({
            name: data.name,
            title: data.title,
            instruction: data.instruction,
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
            // Integrations (for change detection)
            integrations: data.integrations,
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
                let loadedIntegrations: AssistantIntegrations = { ...DEFAULT_INTEGRATIONS };

                // If editing existing assistant, fetch it
                if (id && id !== 'new') {
                    const assistant = await getAssistant(id);
                    if (assistant) {
                        setAssistantId(assistant.id);
                        
                        // Fetch integrations for this assistant
                        try {
                            loadedIntegrations = await getAssistantIntegrations(assistant.id);
                        } catch {
                            logger.debug('No integrations found, using defaults');
                        }
                        
                        loadedFormData = {
                            name: assistant.name,
                            title: assistant.title || '',  // Short title/role
                            // Unified instruction (like Vapi, Retell, LiveKit)
                            instruction: assistant.instruction || DEFAULT_FORM_DATA.instruction,
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
                            integrations: loadedIntegrations,
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
                    
                    // Check if applying RE script template from gallery
                    const templateParam = searchParams.get('template');
                    if (templateParam === 're-script') {
                        const templateJson = sessionStorage.getItem('applyScriptTemplate');
                        if (templateJson) {
                            try {
                                const template: REScript = JSON.parse(templateJson);
                                loadedFormData = {
                                    ...loadedFormData,
                                    name: template.name,
                                    instruction: template.systemPrompt,
                                    // Map template variables to dynamic variables
                                    dynamicVariables: {
                                        ...DEFAULT_DYNAMIC_VARIABLES_CONFIG,
                                        variables: template.variables.map(v => ({
                                            name: v.name,
                                            type: v.type === 'currency' || v.type === 'number' ? 'string' : v.type,
                                            description: v.description,
                                            placeholder: v.placeholder || '',
                                        })),
                                    },
                                };
                                sessionStorage.removeItem('applyScriptTemplate');
                                logger.info('Applied RE script template', { templateId: template.id });
                            } catch (e) {
                                logger.error('Failed to parse RE script template', { error: e });
                            }
                        }
                    }
                    
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
    }, [id, searchParams]);

    const handleSave = async (publish: boolean = false) => {
        if (saving) return;

        setSaving(true);
        try {
            const inputData: AssistantInput = {
                name: formData.name,
                title: formData.title || undefined,  // Short title/role
                // Unified instruction (like Vapi, Retell, LiveKit)
                instruction: formData.instruction,
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
                
                // Save integrations to database
                try {
                    await saveAssistantIntegrations(savedAssistant.id, formData.integrations);
                    logger.info('Integrations saved');
                } catch (integrationsError) {
                    const errorMessage = integrationsError instanceof Error ? integrationsError.message : 'Unknown error';
                    logger.error('Failed to save integrations: ' + errorMessage);
                }
                
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

    const handleDuplicate = async () => {
        if (!assistantId || duplicating) return;
        setDuplicating(true);
        try {
            const copy = await duplicateAssistant(assistantId);
            if (copy) {
                navigate(`/assistants/${copy.id}`, { replace: false });
            }
        } catch (error) {
            console.error('Error duplicating assistant:', error);
            alert('Failed to duplicate assistant. Please try again.');
        } finally {
            setDuplicating(false);
        }
    };

    const handlePreviewVoice = async () => {
        if (!formData.voiceId || previewingVoice) return;

        // Stop any currently playing preview
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
            setPreviewingVoice(false);
            return;
        }

        setPreviewingVoice(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/assistants/preview-voice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    voice_id: formData.voiceId,
                    model_id: formData.elevenlabsModelId || 'eleven_turbo_v2_5',
                    text: `Hello! I'm ${formData.name}. How can I help you today?`,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as {error?: string}).error || 'Preview failed');
            }

            const { audio } = await res.json() as { audio: string };
            previewAudioRef.current = new Audio(audio);
            previewAudioRef.current.play().catch(console.error);
            previewAudioRef.current.onended = () => {
                previewAudioRef.current = null;
                setPreviewingVoice(false);
            };
        } catch (error) {
            console.error('Error previewing voice:', error);
            setPreviewingVoice(false);
            alert('Voice preview failed. Check ElevenLabs API key or voice selection.');
        }
    };

    // Handle saving with updated knowledge base IDs (for link/unlink operation)
    const handleSaveWithKnowledgeBaseIds = async (updatedKnowledgeBaseIds: string[]) => {
        if (saving || !assistantId) return;

        setSaving(true);
        try {
            // When linking (adding KBs), apply strict RAG settings
            const isLinking = updatedKnowledgeBaseIds.length > (formData.knowledgeBaseIds?.length || 0);
            const strictRagInstructions = 'STRICT MODE: Only answer using the knowledge base content. If the information is not in the knowledge base, say "I don\'t have information about that in my knowledge base."';
            
            const inputData: AssistantInput = {
                name: formData.name,
                // Unified instruction (like Vapi, Retell, LiveKit)
                instruction: formData.instruction,
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
                // Use the updated knowledge base IDs passed in
                ragEnabled: updatedKnowledgeBaseIds.length > 0,
                // Apply strict settings when linking, keep existing when unlinking
                ragSimilarityThreshold: isLinking ? (formData.ragSimilarityThreshold || 0.2) : formData.ragSimilarityThreshold,
                ragMaxResults: isLinking ? (formData.ragMaxResults || 10) : formData.ragMaxResults,
                ragInstructions: isLinking ? (formData.ragInstructions || strictRagInstructions) : formData.ragInstructions,
                knowledgeBaseIds: updatedKnowledgeBaseIds,
                memoryEnabled: formData.memoryEnabled,
                memoryConfig: formData.memoryConfig,
                status: formData.status,
            };

            const savedAssistant = await updateAssistant(assistantId, inputData);

            if (savedAssistant) {
                const updatedFormData: AssistantFormData = { 
                    ...formData, 
                    knowledgeBaseIds: updatedKnowledgeBaseIds,
                    ragEnabled: updatedKnowledgeBaseIds.length > 0,
                    // Also update RAG settings in local state
                    ragSimilarityThreshold: inputData.ragSimilarityThreshold ?? formData.ragSimilarityThreshold,
                    ragMaxResults: inputData.ragMaxResults ?? formData.ragMaxResults,
                    ragInstructions: inputData.ragInstructions ?? formData.ragInstructions,
                    status: savedAssistant.status 
                };
                setFormData(updatedFormData);
                originalFormDataRef.current = getFormDataFingerprint(updatedFormData);
                setHasChanges(false);
            }
        } catch (error) {
            console.error('Error saving assistant:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Handle applying generated prompt from AI
    const handleApplyGeneratedPrompt = (data: {
        instruction: string;
        suggestedVariables?: Array<{ name: string; description: string; example?: string }>;
        suggestedAgentName?: string;
    }) => {
        setFormData(prev => {
            const newData = { ...prev };
            
            // Apply instruction
            if (data.instruction) {
                newData.instruction = data.instruction;
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

    // Handler for integrations changes
    const handleIntegrationsChange = (newIntegrations: AssistantIntegrations) => {
        setFormData(prev => ({ ...prev, integrations: newIntegrations }));
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'agent':
                return (
                    <AgentTab
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
            case 'memory':
                return (
                    <MemoryTab
                        formData={formData}
                        setFormData={setFormData}
                    />
                );
            case 'knowledge-base':
                return <KnowledgeBaseTab formData={formData} setFormData={setFormData} onSave={handleSaveWithKnowledgeBaseIds} />;
            case 'tests':
                return <TestsTab assistantId={assistantId} formData={formData} selectedVoice={selectedVoice} />;
            case 'integrations':
                return (
                    <IntegrationsTab
                        integrations={formData.integrations}
                        onIntegrationsChange={handleIntegrationsChange}
                        assistantId={assistantId}
                    />
                );
            case 'widget':
                return <WidgetTab assistantId={assistantId || undefined} assistantName={formData.name} />;
            default:
                return null;
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
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Capitalize first letter of each word
                                    const capitalized = value.replace(/\b\w/g, (char) => char.toUpperCase());
                                    setFormData({ ...formData, name: capitalized });
                                }}
                                className="bg-transparent text-textMain font-semibold text-lg outline-none placeholder:text-textMuted focus:underline decoration-primary/50 decoration-dashed underline-offset-4 min-w-0 w-auto max-w-[200px] capitalize"
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
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Capitalize first letter of each word
                                    const capitalized = value.replace(/\b\w/g, (char) => char.toUpperCase());
                                    setFormData({ ...formData, title: capitalized });
                                }}
                                className="bg-transparent text-xs text-textMuted outline-none placeholder:text-textMuted/50 focus:text-primary focus:underline decoration-primary/30 decoration-dashed underline-offset-2 min-w-0 w-auto capitalize"
                                placeholder="Add title..."
                                size={formData.title.length || 10}
                            />
                            <span className="text-xs text-textMuted/40">•</span>
                            <span className="text-xs text-textMuted flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : formData.status === 'draft' ? 'bg-gray-400' : 'bg-yellow-500'}`}></span>
                                {formData.status === 'active' ? 'Published' : formData.status === 'draft' ? 'Draft' : 'Inactive'}
                            </span>
                            {assistantId && (
                                <button
                                    onClick={() => copyId(assistantId)}
                                    className="group flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors"
                                    title="Copy Assistant ID"
                                >
                                    <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover:border-primary/30 transition-colors">
                                        {assistantId.slice(0, 8)}...
                                    </span>
                                    {copiedId ? (
                                        <Check size={14} weight="bold" className="text-emerald-400" />
                                    ) : (
                                        <Copy size={14} weight="bold" className="group-hover:scale-110 transition-transform" />
                                    )}
                                </button>
                            )}
                        </div>
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
                    {/* Duplicate button - only show for existing assistants */}
                    {assistantId && (
                        <button
                            onClick={handleDuplicate}
                            disabled={saving || duplicating}
                            className="group flex items-center gap-2 px-3 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMuted hover:bg-white/5 hover:border-white/20 hover:text-textMain transition-all disabled:opacity-50"
                            title="Duplicate assistant"
                        >
                            {duplicating ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <CopySimple size={16} weight="bold" className="group-hover:scale-110 transition-transform" />}
                        </button>
                    )}
                    {/* Preview Voice button - only show when a voice is selected */}
                    {formData.voiceId && (
                        <button
                            onClick={handlePreviewVoice}
                            disabled={saving}
                            className={`group flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm transition-all disabled:opacity-50 ${previewingVoice
                                ? 'bg-primary/20 border-primary/40 text-primary'
                                : 'bg-surface/50 border-white/10 text-textMuted hover:bg-white/5 hover:border-white/20 hover:text-textMain'
                            }`}
                            title={previewingVoice ? 'Stop preview' : 'Preview voice'}
                        >
                            {previewingVoice
                                ? <SpeakerSlash size={16} weight="bold" className="animate-pulse" />
                                : <SpeakerHigh size={16} weight="bold" className="group-hover:scale-110 transition-transform" />
                            }
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
                    {/* Talk to Assistant - Voice call */}
                    <button
                        onClick={() => setShowVoiceCallPreview(true)}
                        className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl text-sm text-primary hover:from-primary/30 hover:to-primary/20 hover:border-primary/40 transition-all"
                        disabled={saving || !assistantId}
                        title={!assistantId ? "Save assistant first to test voice" : "Talk to this assistant"}
                    >
                        <Phone size={16} weight="fill" className="group-hover:scale-110 transition-transform" />
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
                                {tab.label}
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

            {/* Voice Call Preview Modal - Using LiveKit */}
            {showVoiceCallPreview && assistantId && user && (
                <LiveKitVoiceCall
                    assistantId={assistantId}
                    assistantName={formData.name}
                    isOpen={showVoiceCallPreview}
                    onClose={() => setShowVoiceCallPreview(false)}
                    onConversationEnd={(transcript) => {
                        logger.info('Voice conversation ended', { context: { messageCount: transcript.length } });
                    }}
                />
            )}
        </FadeIn>
    );
};

export default AssistantEditor;
