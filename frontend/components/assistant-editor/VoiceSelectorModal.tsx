import { X, MagnifyingGlass, Play, Pause, Check, Lightning, Clock, Sparkle, CaretDown, Globe, Microphone } from '@phosphor-icons/react';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Voice, TTSProvider } from '../../types';

// ============================================
// PROVIDER-SPECIFIC MODEL CONFIGURATIONS
// ============================================

// ElevenLabs Voice Quality Tiers (Voicory pricing tiers)
const ELEVENLABS_TIERS = [
    { 
        id: 'fusion', 
        backendId: 'eleven_multilingual_v2',
        name: 'Fusion', 
        quality: 'Premium',
        latency: '~200ms',
        description: 'Ultra-realistic, 29+ languages',
        icon: Sparkle,
        color: 'text-purple-400'
    },
    { 
        id: 'boost', 
        backendId: 'eleven_turbo_v2_5',
        name: 'Boost', 
        quality: 'High',
        latency: '~150ms',
        description: 'Great quality, faster response',
        icon: Lightning,
        color: 'text-yellow-400'
    },
    { 
        id: 'spark', 
        backendId: 'eleven_flash_v2_5',
        name: 'Spark', 
        quality: 'Good',
        latency: '~100ms',
        description: 'Budget-friendly, high volume',
        icon: Clock,
        color: 'text-green-400'
    }
];

// OpenAI TTS Models
// Supports 57+ languages (auto-detected from input text)
const OPENAI_MODELS = [
    {
        id: 'hd',
        backendId: 'tts-1-hd',
        name: 'HD Quality',
        quality: 'Premium',
        latency: '~300ms',
        description: 'Best quality, 57+ languages',
        icon: Sparkle,
        color: 'text-purple-400'
    },
    {
        id: 'standard',
        backendId: 'tts-1',
        name: 'Standard',
        quality: 'Good',
        latency: '~150ms',
        description: 'Fast, 57+ languages',
        icon: Lightning,
        color: 'text-yellow-400'
    }
];

// Google Chirp3-HD - single high quality model
// Supports 24+ languages with multilingual voices
const GOOGLE_MODEL = {
    id: 'chirp3-hd',
    backendId: 'chirp3-hd',
    name: 'Chirp3 HD',
    quality: 'Premium',
    latency: '~200ms',
    description: 'High quality, 24+ languages',
    icon: Globe,
    color: 'text-blue-400'
};

// Provider info for display
const PROVIDER_INFO: Record<TTSProvider, { name: string; icon: typeof Microphone; languages: string }> = {
    elevenlabs: { name: 'ElevenLabs', icon: Microphone, languages: '29+ languages' },
    openai: { name: 'OpenAI', icon: Lightning, languages: '57+ languages' },
    google: { name: 'Google', icon: Globe, languages: '24+ languages' },
    deepgram: { name: 'Deepgram', icon: Microphone, languages: '36+ languages' },
    cartesia: { name: 'Cartesia', icon: Microphone, languages: 'English' },
    azure: { name: 'Azure', icon: Globe, languages: '140+ languages' },
};

// Helper to get model options based on provider
const getModelOptionsForProvider = (provider: TTSProvider) => {
    switch (provider) {
        case 'elevenlabs':
            return ELEVENLABS_TIERS;
        case 'openai':
            return OPENAI_MODELS;
        case 'google':
            return [GOOGLE_MODEL];
        default:
            return ELEVENLABS_TIERS;  // Default to ElevenLabs
    }
};

// Helper to get backend ID based on provider and tier ID
const getBackendIdForProvider = (provider: TTSProvider, tierId: string): string => {
    const models = getModelOptionsForProvider(provider);
    const model = models.find(m => m.id === tierId);
    return model?.backendId || models[0]?.backendId || 'eleven_turbo_v2_5';
};

// Helper to get tier ID from backend ID for a provider
const getTierIdFromBackendId = (provider: TTSProvider, backendId: string): string => {
    const models = getModelOptionsForProvider(provider);
    const model = models.find(m => m.backendId === backendId);
    return model?.id || models[0]?.id || 'boost';
};

interface VoiceSelectorModalProps {
    voices: Voice[];
    selectedVoice: Voice | null;
    onSelect: (voice: Voice) => void;
    onClose: () => void;
    elevenlabsModelId: string;
    onModelChange: (modelId: string) => void;
}

const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
    voices,
    selectedVoice,
    onSelect,
    onClose,
    elevenlabsModelId,
    onModelChange,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
    const [languageFilter, setLanguageFilter] = useState<string>('all');
    const [providerFilter, setProviderFilter] = useState<TTSProvider | 'all'>('all');
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const genderDropdownRef = useRef<HTMLDivElement>(null);
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    const providerDropdownRef = useRef<HTMLDivElement>(null);

    // Get unique languages from voices
    const availableLanguages = useMemo(() => {
        const langs = new Set<string>();
        voices.forEach(v => {
            langs.add(v.primaryLanguage);
            v.supportedLanguages?.forEach(l => langs.add(l));
        });
        return Array.from(langs).sort();
    }, [voices]);

    // Get available providers from voices
    const availableProviders = useMemo(() => {
        const providers = new Set<TTSProvider>();
        voices.forEach(v => providers.add(v.ttsProvider));
        return Array.from(providers);
    }, [voices]);

    // Get the currently selected voice's provider for model selection
    const currentProvider = selectedVoice?.ttsProvider || 'elevenlabs';
    const modelOptions = getModelOptionsForProvider(currentProvider);
    const currentTierId = getTierIdFromBackendId(currentProvider, elevenlabsModelId);

    // Filter voices
    const filteredVoices = useMemo(() => {
        return voices.filter(voice => {
            const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                voice.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                voice.accent.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesGender = genderFilter === 'all' || voice.gender === genderFilter;
            
            const matchesLanguage = languageFilter === 'all' || 
                voice.primaryLanguage === languageFilter ||
                voice.supportedLanguages?.includes(languageFilter);

            const matchesProvider = providerFilter === 'all' || voice.ttsProvider === providerFilter;
            
            return matchesSearch && matchesGender && matchesLanguage && matchesProvider;
        });
    }, [voices, searchQuery, genderFilter, languageFilter, providerFilter]);

    // Handle voice preview
    const togglePreview = (voice: Voice) => {
        if (playingVoiceId === voice.id) {
            // Stop playing
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setPlayingVoiceId(null);
        } else {
            // Start playing
            if (audioRef.current) {
                audioRef.current.pause();
            }
            
            if (voice.previewUrl) {
                audioRef.current = new Audio(voice.previewUrl);
                audioRef.current.play().catch(console.error);
                audioRef.current.onended = () => setPlayingVoiceId(null);
                setPlayingVoiceId(voice.id);
            }
        }
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (genderDropdownRef.current && !genderDropdownRef.current.contains(e.target as Node)) {
                setShowGenderDropdown(false);
            }
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target as Node)) {
                setShowLanguageDropdown(false);
            }
            if (providerDropdownRef.current && !providerDropdownRef.current.contains(e.target as Node)) {
                setShowProviderDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-semibold text-textMain">Select Voice</h2>
                        <p className="text-sm text-textMuted mt-1">Choose a voice for your agent</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-surfaceHover rounded-lg text-textMuted hover:text-textMain transition-colors"
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                {/* Model/Tier Selection - adapts based on selected voice's provider */}
                <div className="px-6 py-4 border-b border-border bg-surface/30">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightning size={16} weight="fill" className="text-primary" />
                        <span className="text-sm font-medium text-textMain">Voice Tier (Quality vs Speed)</span>
                    </div>
                    <div className={`grid gap-3 ${modelOptions.length === 1 ? 'grid-cols-1 max-w-xs' : modelOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {modelOptions.map((model) => {
                            const Icon = model.icon;
                            const isSelected = currentTierId === model.id;
                            return (
                                <button
                                    key={model.id}
                                    onClick={() => onModelChange(getBackendIdForProvider(currentProvider, model.id))}
                                    className={`
                                        relative p-3 rounded-xl border transition-all text-left
                                        ${isSelected 
                                            ? 'border-primary bg-primary/10' 
                                            : 'border-border hover:border-primary/50 bg-surface'
                                        }
                                    `}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2">
                                            <Check size={14} weight="bold" className="text-primary" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon size={14} className={model.color} />
                                        <span className="text-sm font-medium text-textMain">{model.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-textMuted">{model.quality}</span>
                                        <span className="text-textMuted">•</span>
                                        <span className="text-primary font-mono">{model.latency}</span>
                                    </div>
                                    <p className="text-[10px] text-textMuted mt-1">{model.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} weight="bold" />
                            <input
                                type="text"
                                placeholder="Search voices..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-textMain outline-none focus:border-primary transition-colors"
                            />
                        </div>

                        {/* Gender Filter - Custom Dropdown */}
                        <div ref={genderDropdownRef} className="relative">
                            <button
                                onClick={() => {
                                    setShowGenderDropdown(!showGenderDropdown);
                                    setShowLanguageDropdown(false);
                                }}
                                className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-textMain hover:border-primary/50 transition-colors min-w-[140px] justify-between"
                            >
                                <span>{genderFilter === 'all' ? 'All Genders' : genderFilter}</span>
                                <CaretDown size={14} weight="bold" className={`text-textMuted transition-transform ${showGenderDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showGenderDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
                                    {[
                                        { value: 'all', label: 'All Genders' },
                                        { value: 'Male', label: 'Male' },
                                        { value: 'Female', label: 'Female' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setGenderFilter(option.value as typeof genderFilter);
                                                setShowGenderDropdown(false);
                                            }}
                                            className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between ${
                                                genderFilter === option.value
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-textMain hover:bg-white/5'
                                            }`}
                                        >
                                            {option.label}
                                            {genderFilter === option.value && <Check size={14} weight="bold" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Language Filter - Custom Dropdown */}
                        <div ref={languageDropdownRef} className="relative">
                            <button
                                onClick={() => {
                                    setShowLanguageDropdown(!showLanguageDropdown);
                                    setShowGenderDropdown(false);
                                }}
                                className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-textMain hover:border-primary/50 transition-colors min-w-[150px] justify-between"
                            >
                                <span className="truncate">{languageFilter === 'all' ? 'All Languages' : languageFilter}</span>
                                <CaretDown size={14} weight="bold" className={`text-textMuted transition-transform flex-shrink-0 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showLanguageDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                                    <button
                                        onClick={() => {
                                            setLanguageFilter('all');
                                            setShowLanguageDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between ${
                                            languageFilter === 'all'
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-textMain hover:bg-white/5'
                                        }`}
                                    >
                                        All Languages
                                        {languageFilter === 'all' && <Check size={14} weight="bold" />}
                                    </button>
                                    {availableLanguages.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => {
                                                setLanguageFilter(lang);
                                                setShowLanguageDropdown(false);
                                            }}
                                            className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between ${
                                                languageFilter === lang
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-textMain hover:bg-white/5'
                                            }`}
                                        >
                                            {lang}
                                            {languageFilter === lang && <Check size={14} weight="bold" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Voice Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredVoices.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-textMuted">No voices found matching your criteria</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredVoices.map((voice) => {
                                const isSelected = selectedVoice?.id === voice.id;
                                const isPlaying = playingVoiceId === voice.id;
                                
                                return (
                                    <div
                                        key={voice.id}
                                        className={`
                                            relative p-4 rounded-xl border transition-all cursor-pointer group
                                            ${isSelected 
                                                ? 'border-primary bg-primary/5' 
                                                : 'border-border hover:border-primary/50 bg-surface'
                                            }
                                        `}
                                        onClick={() => onSelect(voice)}
                                    >
                                        {/* Selected Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                <Check size={12} weight="bold" className="text-black" />
                                            </div>
                                        )}

                                        {/* Voice Info */}
                                        <div className="flex items-start gap-3">
                                            {/* Play Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePreview(voice);
                                                }}
                                                className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors
                                                    ${isPlaying 
                                                        ? 'bg-primary text-black' 
                                                        : 'bg-surfaceHover text-primary hover:bg-primary hover:text-black'
                                                    }
                                                `}
                                            >
                                                {isPlaying ? (
                                                    <Pause size={16} fill="currentColor" />
                                                ) : (
                                                    <Play size={16} fill="currentColor" className="ml-0.5" />
                                                )}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-textMain truncate">{voice.name}</h3>
                                                    {voice.isFeatured && (
                                                        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-medium rounded">
                                                            Featured
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-xs text-textMuted mb-2">
                                                    <span>{voice.gender}</span>
                                                    <span>•</span>
                                                    <span>{voice.accent}</span>
                                                    <span>•</span>
                                                    <span>{voice.primaryLanguage}</span>
                                                </div>

                                                {voice.description && (
                                                    <p className="text-xs text-textMuted line-clamp-2 mb-2">
                                                        {voice.description}
                                                    </p>
                                                )}

                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-1">
                                                    {voice.tags?.slice(0, 3).map(tag => (
                                                        <span 
                                                            key={tag}
                                                            className="px-1.5 py-0.5 bg-background text-textMuted text-[10px] rounded"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="absolute bottom-3 right-3 text-xs font-mono text-primary">
                                            ${voice.costPerMin?.toFixed(2)}/min
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border bg-surface/30">
                    <div className="text-sm text-textMuted">
                        {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''} available
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-textMain hover:bg-surfaceHover rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onClose}
                            disabled={!selectedVoice}
                            className="px-4 py-2 bg-primary text-black font-medium text-sm rounded-lg hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Selection
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VoiceSelectorModal;
