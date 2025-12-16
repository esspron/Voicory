import { X, MagnifyingGlass, Play, Pause, Check, Lightning, Clock, Sparkle, Funnel } from '@phosphor-icons/react';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Voice } from '../../types';

// Voice Model Options
const VOICE_MODELS = [
    { 
        id: 'eleven_multilingual_v2', 
        name: 'Multilingual v2', 
        quality: 'Best',
        latency: '~500ms',
        description: 'Highest quality, supports 29 languages',
        icon: Sparkle,
        color: 'text-purple-400'
    },
    { 
        id: 'eleven_turbo_v2_5', 
        name: 'Turbo v2.5', 
        quality: 'High',
        latency: '~300ms',
        description: 'Balanced quality and speed',
        icon: Lightning,
        color: 'text-yellow-400'
    },
    { 
        id: 'eleven_flash_v2_5', 
        name: 'Flash v2.5', 
        quality: 'Good',
        latency: '~150ms',
        description: 'Fastest, ideal for real-time',
        icon: Clock,
        color: 'text-green-400'
    }
];

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
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Get unique languages from voices
    const availableLanguages = useMemo(() => {
        const langs = new Set<string>();
        voices.forEach(v => {
            langs.add(v.primaryLanguage);
            v.supportedLanguages?.forEach(l => langs.add(l));
        });
        return Array.from(langs).sort();
    }, [voices]);

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
            
            return matchesSearch && matchesGender && matchesLanguage;
        });
    }, [voices, searchQuery, genderFilter, languageFilter]);

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

                {/* Model Selection */}
                <div className="px-6 py-4 border-b border-border bg-surface/30">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightning size={16} weight="fill" className="text-primary" />
                        <span className="text-sm font-medium text-textMain">Voice Model (Latency vs Quality)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {VOICE_MODELS.map((model) => {
                            const Icon = model.icon;
                            const isSelected = elevenlabsModelId === model.id;
                            return (
                                <button
                                    key={model.id}
                                    onClick={() => onModelChange(model.id)}
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
                                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-textMain outline-none focus:border-primary"
                            />
                        </div>

                        {/* Gender Filter */}
                        <select
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
                            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                        >
                            <option value="all">All Genders</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>

                        {/* Language Filter */}
                        <select
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                        >
                            <option value="all">All Languages</option>
                            {availableLanguages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
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
