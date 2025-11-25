import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, ChevronDown } from 'lucide-react';
import { VoiceSample } from '../types';

interface VoiceSamplePlayerProps {
    samples?: VoiceSample[];
    previewUrl?: string; // Direct preview URL fallback
    defaultLanguage?: string;
    compact?: boolean;
}

const VoiceSamplePlayer: React.FC<VoiceSamplePlayerProps> = ({ 
    samples = [], 
    previewUrl,
    defaultLanguage,
    compact = false 
}) => {
    const [selectedLanguage, setSelectedLanguage] = useState<string>(
        defaultLanguage || samples[0]?.language || 'English'
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get current sample based on selected language, or use previewUrl as fallback
    const currentSample = samples.find(s => s.language === selectedLanguage) || samples[0];
    const audioUrl = currentSample?.audioUrl || previewUrl;

    // Available languages from samples
    const availableLanguages = samples.map(s => s.language);
    const hasSamples = samples.length > 0;

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset player when sample changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            setProgress(0);
        }
    }, [audioUrl]);

    const togglePlay = () => {
        if (!audioUrl) return;

        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
            
            audioRef.current.addEventListener('loadedmetadata', () => {
                setDuration(audioRef.current?.duration || 0);
            });
            
            audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current) {
                    const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                    setProgress(percent);
                }
            });
            
            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
                setProgress(0);
            });

            audioRef.current.addEventListener('error', () => {
                console.error('Error loading audio');
                setIsPlaying(false);
            });
        }

        // Update source if it changed
        if (audioRef.current.src !== audioUrl) {
            audioRef.current.src = audioUrl;
            audioRef.current.load();
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                console.error('Error playing audio:', err);
            });
        }
        setIsPlaying(!isPlaying);
    };

    const selectLanguage = (language: string) => {
        // Stop current playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setProgress(0);
        setSelectedLanguage(language);
        setShowDropdown(false);
        
        // Load new audio
        const newSample = samples.find(s => s.language === language);
        if (newSample?.audioUrl && audioRef.current) {
            audioRef.current.src = newSample.audioUrl;
            audioRef.current.load();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!audioUrl) {
        return (
            <div className="text-xs text-textMuted">No preview available</div>
        );
    }

    return (
        <div className={`${compact ? 'space-y-2' : 'space-y-3'}`}>
            {/* Language Selector - only show if we have multiple samples */}
            {hasSamples && <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-textMain hover:border-primary/50 transition-colors w-full justify-between"
                >
                    <span className="flex items-center gap-2">
                        <span className="text-xs">🌐</span>
                        <span>{selectedLanguage}</span>
                    </span>
                    <ChevronDown size={14} className={`text-textMuted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                        {availableLanguages.map(lang => (
                            <button
                                key={lang}
                                onClick={() => selectLanguage(lang)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-surfaceHover transition-colors ${
                                    lang === selectedLanguage ? 'bg-primary/10 text-primary' : 'text-textMain'
                                }`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                )}
            </div>}

            {/* Player Controls */}
            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    disabled={!audioUrl}
                    className="w-9 h-9 rounded-full bg-surfaceHover flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                    {isPlaying ? (
                        <Pause size={16} fill="currentColor" />
                    ) : (
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                    )}
                </button>

                {/* Progress Bar */}
                <div className="flex-1">
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-100"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {!compact && duration > 0 && (
                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-textMuted">
                                {formatTime((progress / 100) * duration)}
                            </span>
                            <span className="text-[10px] text-textMuted">
                                {formatTime(duration)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceSamplePlayer;
