import React from 'react';
import { MoreHorizontal, Copy, Star } from 'lucide-react';
import { Voice } from '../types';
import VoiceSamplePlayer from './VoiceSamplePlayer';

interface VoiceCardProps {
    voice: Voice;
    onSelect?: (voice: Voice) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ voice, onSelect }) => {
    const copyVoiceId = () => {
        navigator.clipboard.writeText(voice.elevenlabsVoiceId);
        // You could add a toast notification here
    };

    return (
        <div className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 transition-all group relative">
            {/* Featured Badge */}
            {voice.isFeatured && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={10} fill="currentColor" />
                    Featured
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-textMain text-lg">{voice.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-textMuted mt-0.5">
                        <span>{voice.gender}</span>
                        <span>•</span>
                        <span>{voice.accent}</span>
                    </div>
                </div>
                <button className="text-textMuted hover:text-textMain opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal size={18} />
                </button>
            </div>

            {/* Description */}
            {voice.description && (
                <p className="text-xs text-textMuted mb-3 line-clamp-2">
                    {voice.description}
                </p>
            )}

            {/* Sample Player */}
            <div className="mb-4">
                <VoiceSamplePlayer 
                    previewUrl={voice.previewUrl}
                    defaultLanguage={voice.primaryLanguage}
                    compact
                />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                {voice.tags.slice(0, 3).map(tag => (
                    <span 
                        key={tag} 
                        className="text-[10px] font-medium bg-background border border-border px-2 py-0.5 rounded text-gray-400"
                    >
                        {tag}
                    </span>
                ))}
                {voice.tags.length > 3 && (
                    <span className="text-[10px] text-textMuted">
                        +{voice.tags.length - 3}
                    </span>
                )}
            </div>

            {/* Supported Languages */}
            <div className="text-[10px] text-textMuted mb-3">
                <span className="font-medium">Languages: </span>
                {voice.supportedLanguages.slice(0, 3).join(', ')}
                {voice.supportedLanguages.length > 3 && ` +${voice.supportedLanguages.length - 3}`}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm font-mono text-primary font-semibold">
                    ₹{voice.costPerMin.toFixed(2)}/min
                </span>
                <div className="flex gap-2">
                    <button 
                        onClick={copyVoiceId}
                        className="p-1.5 hover:bg-surfaceHover rounded text-textMuted hover:text-textMain transition-colors opacity-0 group-hover:opacity-100" 
                        title="Copy Voice ID"
                    >
                        <Copy size={14} />
                    </button>
                    <button 
                        onClick={() => onSelect?.(voice)}
                        className="px-3 py-1.5 bg-primary text-black text-xs font-semibold rounded hover:bg-primaryHover transition-colors"
                    >
                        Select
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceCard;
