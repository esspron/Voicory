// ============================================
// VOICE AGENT TAB COMPONENT
// Configure real-time voice agent settings
// ============================================

import {
    Waveform,
    Brain,
    SpeakerHigh,
    Microphone,
    Lightning,
    Sliders,
    Timer,
    Info,
    CaretDown,
} from '@phosphor-icons/react';
import React, { useState, useMemo } from 'react';
import { Toggle, Tooltip } from '../ui';
import Select, { type SelectOption } from '../ui/Select';

// ============================================
// TYPES (Exported for use in parent component)
// ============================================

export interface VoiceAgentConfig {
    // STT Settings
    stt_provider: 'deepgram' | 'whisper';
    stt_model: string;
    stt_language: string;
    stt_interim_results: boolean;
    stt_endpointing_ms: number;
    
    // LLM Settings
    llm_provider: 'openai';
    llm_model: string;
    llm_temperature: number;
    llm_max_tokens: number;
    llm_streaming: boolean;
    llm_first_response_filler?: string;
    
    // TTS Settings
    tts_provider: 'elevenlabs' | 'google';
    tts_voice_id?: string;
    tts_model: string;
    tts_stability: number;
    tts_similarity_boost: number;
    tts_speaking_rate: number;
    
    // VAD Settings
    vad_enabled: boolean;
    vad_threshold: number;
    vad_min_speech_duration_ms: number;
    vad_silence_duration_ms: number;
    
    // Interruption Settings
    interruption_enabled: boolean;
    interruption_threshold_ms: number;
    interruption_cancel_pending: boolean;
    
    // Turn Detection
    turn_detection_mode: 'server_vad' | 'client_vad' | 'push_to_talk' | 'semantic';
    turn_end_silence_ms: number;
    
    // Latency Optimization
    optimistic_stt: boolean;
    sentence_splitting: boolean;
    parallel_processing: boolean;
    
    // Session Settings
    greeting_enabled: boolean;
    greeting_delay_ms: number;
    farewell_enabled: boolean;
    farewell_phrase: string;
    max_session_duration_ms: number;
    idle_timeout_ms: number;
}

interface VoiceAgentTabProps {
    config: VoiceAgentConfig;
    onConfigChange: (config: VoiceAgentConfig) => void;
}

// ============================================
// PROVIDER OPTIONS
// ============================================

const STT_PROVIDERS = [
    { value: 'deepgram', label: 'Deepgram', description: 'Best accuracy & real-time streaming', recommended: true },
    { value: 'whisper', label: 'OpenAI Whisper', description: 'High accuracy, batch mode' },
];

const STT_MODELS: Record<string, { value: string; label: string }[]> = {
    deepgram: [
        { value: 'nova-2', label: 'Nova 2 (Recommended)' },
        { value: 'nova', label: 'Nova' },
        { value: 'enhanced', label: 'Enhanced' },
        { value: 'base', label: 'Base' },
    ],
    whisper: [
        { value: 'whisper-1', label: 'Whisper 1' },
    ],
};

const LLM_PROVIDERS = [
    { value: 'openai', label: 'OpenAI', description: 'GPT-4o, best for real-time voice AI', recommended: true },
];

const LLM_MODELS: Record<string, { value: string; label: string }[]> = {
    openai: [
        { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fastest)' },
    ],
};

const TTS_PROVIDERS = [
    { value: 'elevenlabs', label: 'ElevenLabs', description: 'Best quality, streaming WebSocket', recommended: true },
    { value: 'google', label: 'Google Cloud TTS', description: 'Multi-language, natural voices' },
];

const TTS_MODELS: Record<string, { value: string; label: string }[]> = {
    elevenlabs: [
        { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5 (Fastest)' },
        { value: 'eleven_flash_v2_5', label: 'Flash v2.5' },
        { value: 'eleven_multilingual_v2', label: 'Multilingual v2' },
    ],
    google: [
        { value: 'en-US-Neural2-J', label: 'Neural2 Male (English)' },
        { value: 'en-US-Neural2-F', label: 'Neural2 Female (English)' },
        { value: 'en-US-Studio-O', label: 'Studio Male (English)' },
        { value: 'en-US-Studio-Q', label: 'Studio Female (English)' },
        { value: 'hi-IN-Neural2-A', label: 'Neural2 Female (Hindi)' },
        { value: 'hi-IN-Neural2-B', label: 'Neural2 Male (Hindi)' },
    ],
};

const TURN_DETECTION_MODES = [
    { value: 'server_vad', label: 'Server VAD', description: 'Best for most use cases' },
    { value: 'client_vad', label: 'Client VAD', description: 'Lower latency, needs good client' },
    { value: 'push_to_talk', label: 'Push to Talk', description: 'User controls when to speak' },
    { value: 'semantic', label: 'Semantic', description: 'AI detects turn completion' },
];

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ar', label: 'Arabic' },
];

// ============================================
// DEFAULT CONFIG (Exported for use in parent component)
// ============================================

export const DEFAULT_VOICE_AGENT_CONFIG: VoiceAgentConfig = {
    stt_provider: 'deepgram',
    stt_model: 'nova-2',
    stt_language: 'en',
    stt_interim_results: true,
    stt_endpointing_ms: 400,
    
    llm_provider: 'openai',
    llm_model: 'gpt-4o',
    llm_temperature: 0.7,
    llm_max_tokens: 300,
    llm_streaming: true,
    
    tts_provider: 'elevenlabs',
    tts_model: 'eleven_turbo_v2_5',
    tts_stability: 0.5,
    tts_similarity_boost: 0.75,
    tts_speaking_rate: 1.0,
    
    vad_enabled: true,
    vad_threshold: 0.5,
    vad_min_speech_duration_ms: 200,
    vad_silence_duration_ms: 500,
    
    interruption_enabled: true,
    interruption_threshold_ms: 200,
    interruption_cancel_pending: true,
    
    turn_detection_mode: 'server_vad',
    turn_end_silence_ms: 700,
    
    optimistic_stt: true,
    sentence_splitting: true,
    parallel_processing: true,
    
    greeting_enabled: true,
    greeting_delay_ms: 500,
    farewell_enabled: true,
    farewell_phrase: 'Goodbye! Have a great day.',
    max_session_duration_ms: 3600000,
    idle_timeout_ms: 60000,
};

// ============================================
// COMPONENT
// ============================================

export function VoiceAgentTab({ config, onConfigChange }: VoiceAgentTabProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stt', 'llm', 'tts']));
    
    // Memoized select options
    const sttProviderOptions: SelectOption[] = useMemo(() => 
        STT_PROVIDERS.map(p => ({ 
            value: p.value, 
            label: p.recommended ? `${p.label} (Recommended)` : p.label 
        })), 
    []);
    
    const sttModelOptions: SelectOption[] = useMemo(() => 
        (STT_MODELS[config.stt_provider] || []).map(m => ({ value: m.value, label: m.label })), 
    [config.stt_provider]);
    
    const languageOptions: SelectOption[] = useMemo(() => 
        LANGUAGES.map(l => ({ value: l.value, label: l.label })), 
    []);
    
    const llmProviderOptions: SelectOption[] = useMemo(() => 
        LLM_PROVIDERS.map(p => ({ value: p.value, label: p.label })), 
    []);
    
    const llmModelOptions: SelectOption[] = useMemo(() => 
        (LLM_MODELS[config.llm_provider] || []).map(m => ({ value: m.value, label: m.label })), 
    [config.llm_provider]);
    
    const ttsProviderOptions: SelectOption[] = useMemo(() => 
        TTS_PROVIDERS.map(p => ({ 
            value: p.value, 
            label: p.recommended ? `${p.label} (Recommended)` : p.label 
        })), 
    []);
    
    const ttsModelOptions: SelectOption[] = useMemo(() => 
        (TTS_MODELS[config.tts_provider] || []).map(m => ({ value: m.value, label: m.label })), 
    [config.tts_provider]);
    
    const turnDetectionOptions: SelectOption[] = useMemo(() => 
        TURN_DETECTION_MODES.map(m => ({ value: m.value, label: m.label })), 
    []);
    
    // Helper to safely get current select value
    const getSelectValue = (options: SelectOption[], currentValue: string): SelectOption => {
        return options.find(o => o.value === currentValue) ?? options[0] ?? { value: '', label: 'Select...' };
    };
    
    // Update config field - notify parent of changes
    const updateConfig = <K extends keyof VoiceAgentConfig>(
        key: K, 
        value: VoiceAgentConfig[K]
    ) => {
        onConfigChange({ ...config, [key]: value });
    };
    
    // Toggle section expansion
    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    };
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-textMain flex items-center gap-2">
                    <Waveform size={24} weight="bold" className="text-primary" />
                    Voice Agent Configuration
                </h2>
                <p className="text-sm text-textMuted mt-1">
                    Configure real-time voice settings for STT, LLM, TTS, and conversation handling
                </p>
            </div>
            
            {/* STT Section */}
            <ConfigSection
                title="Speech-to-Text (STT)"
                description="Configure how audio is transcribed to text"
                icon={Microphone}
                expanded={expandedSections.has('stt')}
                onToggle={() => toggleSection('stt')}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Provider</label>
                        <Select
                            value={getSelectValue(sttProviderOptions, config.stt_provider)}
                            onChange={(option) => {
                                updateConfig('stt_provider', option.value as VoiceAgentConfig['stt_provider']);
                                updateConfig('stt_model', STT_MODELS[option.value]?.[0]?.value || 'default');
                            }}
                            options={sttProviderOptions}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Model</label>
                        <Select
                            value={getSelectValue(sttModelOptions, config.stt_model)}
                            onChange={(option) => updateConfig('stt_model', option.value)}
                            options={sttModelOptions}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Language</label>
                        <Select
                            value={getSelectValue(languageOptions, config.stt_language)}
                            onChange={(option) => updateConfig('stt_language', option.value)}
                            options={languageOptions}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Endpointing (ms)
                            <Tooltip content="Silence duration to end utterance">
                                <Info size={14} className="inline ml-1 text-textMuted" />
                            </Tooltip>
                        </label>
                        <input
                            type="number"
                            value={config.stt_endpointing_ms}
                            onChange={(e) => updateConfig('stt_endpointing_ms', parseInt(e.target.value) || 400)}
                            min={100}
                            max={2000}
                            step={50}
                            className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
                
                <div className="mt-4 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-textMain">
                        <Toggle
                            checked={config.stt_interim_results}
                            onChange={() => updateConfig('stt_interim_results', !config.stt_interim_results)}
                            size="sm"
                        />
                        Interim Results
                        <Tooltip content="Show partial transcripts while speaking">
                            <Info size={14} className="text-textMuted" />
                        </Tooltip>
                    </label>
                </div>
            </ConfigSection>
            
            {/* LLM Section */}
            <ConfigSection
                title="Language Model (LLM)"
                description="Configure the AI model for generating responses"
                icon={Brain}
                expanded={expandedSections.has('llm')}
                onToggle={() => toggleSection('llm')}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Provider</label>
                        <Select
                            value={getSelectValue(llmProviderOptions, config.llm_provider)}
                            onChange={(option) => {
                                updateConfig('llm_provider', option.value as VoiceAgentConfig['llm_provider']);
                                updateConfig('llm_model', LLM_MODELS[option.value]?.[0]?.value || 'gpt-4o');
                            }}
                            options={llmProviderOptions}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Model</label>
                        <Select
                            value={getSelectValue(llmModelOptions, config.llm_model)}
                            onChange={(option) => updateConfig('llm_model', option.value)}
                            options={llmModelOptions}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Temperature
                            <span className="text-textMuted ml-2">{config.llm_temperature}</span>
                        </label>
                        <input
                            type="range"
                            value={config.llm_temperature}
                            onChange={(e) => updateConfig('llm_temperature', parseFloat(e.target.value))}
                            min={0}
                            max={1}
                            step={0.1}
                            className="w-full accent-primary"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Max Tokens</label>
                        <input
                            type="number"
                            value={config.llm_max_tokens}
                            onChange={(e) => updateConfig('llm_max_tokens', parseInt(e.target.value) || 300)}
                            min={50}
                            max={2000}
                            step={50}
                            className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
                
                <div className="mt-4">
                    <label className="block text-sm font-medium text-textMain mb-2">
                        First Response Filler
                        <Tooltip content="Text to speak while processing first response">
                            <Info size={14} className="inline ml-1 text-textMuted" />
                        </Tooltip>
                    </label>
                    <input
                        type="text"
                        value={config.llm_first_response_filler || ''}
                        onChange={(e) => updateConfig('llm_first_response_filler', e.target.value)}
                        placeholder="e.g., 'Let me think about that...'"
                        className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary"
                    />
                </div>
                
                <div className="mt-4 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-textMain">
                        <Toggle
                            checked={config.llm_streaming}
                            onChange={() => updateConfig('llm_streaming', !config.llm_streaming)}
                            size="sm"
                        />
                        Streaming
                        <Tooltip content="Stream tokens for faster TTS start">
                            <Info size={14} className="text-textMuted" />
                        </Tooltip>
                    </label>
                </div>
            </ConfigSection>
            
            {/* TTS Section */}
            <ConfigSection
                title="Text-to-Speech (TTS)"
                description="Configure voice synthesis settings"
                icon={SpeakerHigh}
                expanded={expandedSections.has('tts')}
                onToggle={() => toggleSection('tts')}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Provider</label>
                        <Select
                            value={getSelectValue(ttsProviderOptions, config.tts_provider)}
                            onChange={(option) => {
                                updateConfig('tts_provider', option.value as VoiceAgentConfig['tts_provider']);
                                updateConfig('tts_model', TTS_MODELS[option.value]?.[0]?.value || 'default');
                            }}
                            options={ttsProviderOptions}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Model</label>
                        <Select
                            value={getSelectValue(ttsModelOptions, config.tts_model)}
                            onChange={(option) => updateConfig('tts_model', option.value)}
                            options={ttsModelOptions}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Stability
                            <span className="text-textMuted ml-2">{config.tts_stability}</span>
                        </label>
                        <input
                            type="range"
                            value={config.tts_stability}
                            onChange={(e) => updateConfig('tts_stability', parseFloat(e.target.value))}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full accent-primary"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Similarity Boost
                            <span className="text-textMuted ml-2">{config.tts_similarity_boost}</span>
                        </label>
                        <input
                            type="range"
                            value={config.tts_similarity_boost}
                            onChange={(e) => updateConfig('tts_similarity_boost', parseFloat(e.target.value))}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full accent-primary"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Speaking Rate
                            <span className="text-textMuted ml-2">{config.tts_speaking_rate}x</span>
                        </label>
                        <input
                            type="range"
                            value={config.tts_speaking_rate}
                            onChange={(e) => updateConfig('tts_speaking_rate', parseFloat(e.target.value))}
                            min={0.5}
                            max={2}
                            step={0.1}
                            className="w-full accent-primary"
                        />
                    </div>
                </div>
            </ConfigSection>
            
            {/* VAD & Interruption Section */}
            <ConfigSection
                title="Voice Detection & Interruption"
                description="Configure voice activity detection and barge-in behavior"
                icon={Lightning}
                expanded={expandedSections.has('vad')}
                onToggle={() => toggleSection('vad')}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-textMain">
                            <Toggle
                                checked={config.vad_enabled}
                                onChange={() => updateConfig('vad_enabled', !config.vad_enabled)}
                                size="sm"
                            />
                            Enable VAD
                        </label>
                        
                        <label className="flex items-center gap-2 text-sm text-textMain">
                            <Toggle
                                checked={config.interruption_enabled}
                                onChange={() => updateConfig('interruption_enabled', !config.interruption_enabled)}
                                size="sm"
                            />
                            Enable Interruption (Barge-in)
                        </label>
                    </div>
                    
                    {config.vad_enabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    VAD Threshold
                                    <span className="text-textMuted ml-2">{config.vad_threshold}</span>
                                </label>
                                <input
                                    type="range"
                                    value={config.vad_threshold}
                                    onChange={(e) => updateConfig('vad_threshold', parseFloat(e.target.value))}
                                    min={0.1}
                                    max={1}
                                    step={0.05}
                                    className="w-full accent-primary"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">Silence Duration (ms)</label>
                                <input
                                    type="number"
                                    value={config.vad_silence_duration_ms}
                                    onChange={(e) => updateConfig('vad_silence_duration_ms', parseInt(e.target.value) || 500)}
                                    min={100}
                                    max={2000}
                                    step={50}
                                    className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary"
                                />
                            </div>
                        </>
                    )}
                    
                    {config.interruption_enabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Interruption Threshold (ms)
                                    <Tooltip content="Min speech duration to interrupt agent">
                                        <Info size={14} className="inline ml-1 text-textMuted" />
                                    </Tooltip>
                                </label>
                                <input
                                    type="number"
                                    value={config.interruption_threshold_ms}
                                    onChange={(e) => updateConfig('interruption_threshold_ms', parseInt(e.target.value) || 200)}
                                    min={50}
                                    max={1000}
                                    step={50}
                                    className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary"
                                />
                            </div>
                            
                            <div className="flex items-center">
                                <label className="flex items-center gap-2 text-sm text-textMain">
                                    <Toggle
                                        checked={config.interruption_cancel_pending}
                                        onChange={() => updateConfig('interruption_cancel_pending', !config.interruption_cancel_pending)}
                                        size="sm"
                                    />
                                    Cancel Pending Speech
                                    <Tooltip content="Stop queued TTS when interrupted">
                                        <Info size={14} className="text-textMuted" />
                                    </Tooltip>
                                </label>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/5">
                    <label className="block text-sm font-medium text-textMain mb-2">Turn Detection Mode</label>
                    <Select
                        value={getSelectValue(turnDetectionOptions, config.turn_detection_mode)}
                        onChange={(option) => updateConfig('turn_detection_mode', option.value as VoiceAgentConfig['turn_detection_mode'])}
                        options={turnDetectionOptions}
                    />
                    <p className="text-xs text-textMuted mt-1">
                        {TURN_DETECTION_MODES.find(m => m.value === config.turn_detection_mode)?.description}
                    </p>
                </div>
            </ConfigSection>
            
            {/* Latency Optimization Section */}
            <ConfigSection
                title="Latency Optimization"
                description="Fine-tune settings for faster responses"
                icon={Timer}
                expanded={expandedSections.has('latency')}
                onToggle={() => toggleSection('latency')}
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-6 flex-wrap">
                        <label className="flex items-center gap-2 text-sm text-textMain">
                            <Toggle
                                checked={config.optimistic_stt}
                                onChange={() => updateConfig('optimistic_stt', !config.optimistic_stt)}
                                size="sm"
                            />
                            Optimistic STT
                            <Tooltip content="Start STT before VAD confirms speech">
                                <Info size={14} className="text-textMuted" />
                            </Tooltip>
                        </label>
                        
                        <label className="flex items-center gap-2 text-sm text-textMain">
                            <Toggle
                                checked={config.sentence_splitting}
                                onChange={() => updateConfig('sentence_splitting', !config.sentence_splitting)}
                                size="sm"
                            />
                            Sentence Splitting
                            <Tooltip content="Split sentences for faster TTS start">
                                <Info size={14} className="text-textMuted" />
                            </Tooltip>
                        </label>
                        
                        <label className="flex items-center gap-2 text-sm text-textMain">
                            <Toggle
                                checked={config.parallel_processing}
                                onChange={() => updateConfig('parallel_processing', !config.parallel_processing)}
                                size="sm"
                            />
                            Parallel Processing
                            <Tooltip content="Process STT/LLM/TTS in parallel">
                                <Info size={14} className="text-textMuted" />
                            </Tooltip>
                        </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-textMain mb-2">Turn End Silence (ms)</label>
                            <input
                                type="number"
                                value={config.turn_end_silence_ms}
                                onChange={(e) => updateConfig('turn_end_silence_ms', parseInt(e.target.value) || 700)}
                                min={200}
                                max={2000}
                                step={100}
                                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                </div>
            </ConfigSection>
            
            {/* Session Settings Section */}
            <ConfigSection
                title="Session Settings"
                description="Configure greeting, farewell, and session limits"
                icon={Sliders}
                expanded={expandedSections.has('session')}
                onToggle={() => toggleSection('session')}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                        <label className="flex items-center gap-2 text-sm text-textMain">
                            <Toggle
                                checked={config.greeting_enabled}
                                onChange={() => updateConfig('greeting_enabled', !config.greeting_enabled)}
                                size="sm"
                            />
                            Enable Greeting
                        </label>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Greeting Delay (ms)</label>
                        <input
                            type="number"
                            value={config.greeting_delay_ms}
                            onChange={(e) => updateConfig('greeting_delay_ms', parseInt(e.target.value) || 500)}
                            min={0}
                            max={5000}
                            step={100}
                            disabled={!config.greeting_enabled}
                            className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary disabled:opacity-50"
                        />
                    </div>
                    
                    <div className="flex items-center">
                        <label className="flex items-center gap-2 text-sm text-textMain">
                            <Toggle
                                checked={config.farewell_enabled}
                                onChange={() => updateConfig('farewell_enabled', !config.farewell_enabled)}
                                size="sm"
                            />
                            Enable Farewell
                        </label>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">Farewell Phrase</label>
                        <input
                            type="text"
                            value={config.farewell_phrase}
                            onChange={(e) => updateConfig('farewell_phrase', e.target.value)}
                            disabled={!config.farewell_enabled}
                            placeholder="Goodbye! Have a great day."
                            className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-textMain focus:outline-none focus:border-primary disabled:opacity-50"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Max Session Duration
                            <span className="text-textMuted ml-2">{Math.round(config.max_session_duration_ms / 60000)} min</span>
                        </label>
                        <input
                            type="range"
                            value={config.max_session_duration_ms}
                            onChange={(e) => updateConfig('max_session_duration_ms', parseInt(e.target.value))}
                            min={60000}
                            max={7200000}
                            step={60000}
                            className="w-full accent-primary"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Idle Timeout
                            <span className="text-textMuted ml-2">{Math.round(config.idle_timeout_ms / 1000)} sec</span>
                        </label>
                        <input
                            type="range"
                            value={config.idle_timeout_ms}
                            onChange={(e) => updateConfig('idle_timeout_ms', parseInt(e.target.value))}
                            min={10000}
                            max={300000}
                            step={10000}
                            className="w-full accent-primary"
                        />
                    </div>
                </div>
            </ConfigSection>
        </div>
    );
}

// ============================================
// CONFIG SECTION COMPONENT
// ============================================

interface ConfigSectionProps {
    title: string;
    description: string;
    icon: React.ComponentType<{ size?: number; weight?: 'bold' | 'fill'; className?: string }>;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

function ConfigSection({ title, description, icon: Icon, expanded, onToggle, children }: ConfigSectionProps) {
    return (
        <div className="bg-surface/50 border border-white/5 rounded-xl overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon size={20} weight="bold" className="text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-medium text-textMain">{title}</h3>
                        <p className="text-xs text-textMuted">{description}</p>
                    </div>
                </div>
                <CaretDown
                    size={18}
                    className={`text-textMuted transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>
            
            {expanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    );
}

export default VoiceAgentTab;
