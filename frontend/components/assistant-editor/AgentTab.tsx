import {
    Sparkle, Globe, Microphone,
    CaretRight, Plus, X, Check, Translate, Palette, Lightning, Gear,
    BracketsCurly, Code, Robot
} from '@phosphor-icons/react';
import React, { useState, useRef, useEffect } from 'react';

import {
    Voice, LanguageSettings, StyleSettings, StyleMode,
    DynamicVariable, DynamicVariablesConfig,
    SUPPORTED_LANGUAGES, STYLE_OPTIONS, SYSTEM_VARIABLES,
} from '../../types';

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

export interface AgentFormData {
    // Unified instruction (like Vapi, Retell, LiveKit)
    instruction: string;
    // Shared settings
    voiceId: string | null;
    elevenlabsModelId: string;
    languageSettings: LanguageSettings;
    styleSettings: StyleSettings;
    dynamicVariables: DynamicVariablesConfig;
    llmProvider: string;
    llmModel: string;
    temperature: number;
    maxTokens: number;
    interruptible: boolean;
    useDefaultPersonality: boolean;
    timezone: string;
}

interface AgentTabProps {
    formData: AgentFormData;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    selectedVoice: Voice | null;
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
    const currentTimezone = TIMEZONES.find(tz => tz.value === formData.timezone) || TIMEZONES[0]!;
    const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === formData.languageSettings.default) || SUPPORTED_LANGUAGES[0]!;
    const isFirstAutoDetectRun = useRef(true);

    // Auto-detect variables in instruction
    useEffect(() => {
        if (isFirstAutoDetectRun.current) {
            isFirstAutoDetectRun.current = false;
            return;
        }

        const systemVarNames = SYSTEM_VARIABLES.map(v => v.name);
        const existingCustomVarNames = formData.dynamicVariables.variables.map(v => v.name);

        // Extract variables from instruction
        const varPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
        const foundVars = new Set<string>();
        let match;
        while ((match = varPattern.exec(formData.instruction || '')) !== null) {
            if (match[1]) foundVars.add(match[1].toLowerCase());
        }

        const newVarsToAdd: DynamicVariable[] = [];
        foundVars.forEach(varName => {
            if (!systemVarNames.includes(varName) && !existingCustomVarNames.includes(varName)) {
                newVarsToAdd.push({
                    name: varName,
                    type: 'string',
                    description: `Auto-detected from instruction`,
                });
            }
        });

        if (newVarsToAdd.length > 0) {
            setFormData((prev: any) => ({
                ...prev,
                dynamicVariables: {
                    ...prev.dynamicVariables,
                    variables: [...prev.dynamicVariables.variables, ...newVarsToAdd]
                }
            }));
        }
    }, [formData.instruction]);

    // Get supported languages for dropdown
    const availableLanguages = SUPPORTED_LANGUAGES.filter(
        lang => lang.code !== formData.languageSettings.default &&
            !formData.languageSettings.supported.includes(lang.code)
    );

    const supportedLanguageObjects = formData.languageSettings.supported
        .map(code => SUPPORTED_LANGUAGES.find(l => l.code === code))
        .filter(Boolean);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left Panel - Instruction */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-white/5">
                {/* Header Info */}
                <div className="mb-4 p-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl">
                    <div className="flex items-start gap-2">
                        <Robot size={16} weight="duotone" className="text-primary mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-textMain">Unified Instruction</p>
                            <p className="text-xs text-textMuted">This instruction applies to both voice calls and messaging channels (WhatsApp, SMS, Web Chat).</p>
                        </div>
                    </div>
                </div>

                {/* Instruction Section */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-textMain">Instruction</h3>
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary">
                            Calls & Messages
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

                {/* Instruction Textarea */}
                <div className="relative mb-4">
                    <textarea
                        value={formData.instruction || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, instruction: e.target.value }))}
                        className="w-full h-80 bg-surface/50 border border-white/10 rounded-xl p-4 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none font-mono leading-relaxed transition-all"
                        placeholder={`You are a helpful, friendly AI assistant. Your role is to assist users with their questions and needs in a professional yet conversational manner.

Guidelines:
- Be warm, patient, and attentive to the user's needs
- Listen carefully and ask clarifying questions when needed
- Provide clear, concise, and accurate information
- If you don't know something, be honest and offer to help find the answer
- Keep responses conversational and natural
- Be respectful of the user's time

You can be customized with specific knowledge, personality traits, and capabilities based on the business needs.`}
                    />
                    <button className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg text-textMuted/50 hover:text-textMain transition-all" title="Expand">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M9 1H13M13 1V5M13 1L8 6M5 13H1M1 13V9M1 13L6 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Instruction Footer */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-xs text-textMuted">
                        Type <code className="bg-surface px-1.5 py-0.5 rounded text-primary">{'{{'}</code> to add variables
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData((prev: any) => ({ ...prev, useDefaultPersonality: !prev.useDefaultPersonality }))}
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

                {/* Interruptible Setting */}
                <div className="flex items-center justify-between mb-8 p-3 bg-surface/30 border border-white/5 rounded-xl">
                    <div>
                        <p className="text-xs font-medium text-textMain">Interruptible</p>
                        <p className="text-xs text-textMuted">Allow users to interrupt the assistant while speaking</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, interruptible: !prev.interruptible }))}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <div className={`w-9 h-5 rounded-full transition-colors ${formData.interruptible ? 'bg-primary' : 'bg-gray-600'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${formData.interruptible ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                        </div>
                    </button>
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
                    <p className="text-xs text-textMuted mb-3">
                        Use these variables in your instruction: <code className="bg-surface px-1 py-0.5 rounded text-primary font-mono text-[11px]">{'{{customer_name}}'}</code>
                    </p>

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
                            <button
                                onClick={() => setFormData((prev: any) => ({
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

            {/* Right Panel - Voice, Language, LLM */}
            <div className="w-80 overflow-y-auto p-6 bg-surface/30 backdrop-blur-sm">
                {/* Voices Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-textMain">Voice</h3>
                        <button className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-textMain transition-all" title="Voice Settings">
                            <Gear size={14} weight="bold" />
                        </button>
                    </div>
                    <p className="text-xs text-textMuted/70 mb-3">
                        Select the voice for voice calls.
                    </p>

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

                    <button className="w-full flex items-center gap-2 mt-2 p-2 text-xs text-textMuted hover:text-primary hover:bg-white/5 rounded-lg transition-all">
                        <Plus size={14} weight="bold" />
                        Add additional voice
                    </button>
                </div>

                {/* Language Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Translate size={16} weight="bold" className="text-textMuted" />
                        <h3 className="text-sm font-semibold text-textMain">Language</h3>
                    </div>
                    <p className="text-xs text-textMuted/70 mb-3">
                        Choose languages and enable auto-detection.
                    </p>

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
                        <div className={`w-9 h-5 rounded-full transition-colors ${formData.languageSettings.autoDetect ? 'bg-primary' : 'bg-gray-600'}`}>
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

                    {/* Add Language Dropdown */}
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
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Communication Style Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Palette size={16} weight="bold" className="text-textMuted" />
                        <h3 className="text-sm font-semibold text-textMain">Communication Style</h3>
                    </div>
                    <p className="text-xs text-textMuted/70 mb-3">
                        How the AI should communicate.
                    </p>

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

                    {/* Adaptive Settings */}
                    {formData.styleSettings.mode === 'adaptive' && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-purple-300">Adaptive Settings</span>
                            </div>

                            {[
                                { key: 'mirrorFormality' as const, label: 'Mirror formality level' },
                                { key: 'mirrorLength' as const, label: 'Match response length' },
                                { key: 'mirrorVocabulary' as const, label: 'Adapt vocabulary' },
                            ].map(({ key, label }) => (
                                <div
                                    key={key}
                                    onClick={() => onAdaptiveConfigToggle(key)}
                                    className="flex items-center justify-between cursor-pointer hover:bg-surfaceHover p-1 rounded transition-colors"
                                >
                                    <span className="text-xs text-textMuted">{label}</span>
                                    <div className={`w-8 h-4.5 rounded-full transition-colors ${formData.styleSettings.adaptiveConfig[key] ? 'bg-purple-500' : 'bg-gray-600'}`}>
                                        <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${formData.styleSettings.adaptiveConfig[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* LLM Section */}
                <div>
                    <h3 className="text-sm font-semibold text-textMain mb-2">LLM</h3>
                    <p className="text-xs text-textMuted/70 mb-3">
                        Select provider and model.
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
            </div>
        </div>
    );
};

export default AgentTab;
