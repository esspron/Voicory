import { DotsThree, Copy, Star, Check, CurrencyDollar, Lightning, Sparkle, Clock } from '@phosphor-icons/react';
import React from 'react';

import { Voice } from '../types';

import VoiceSamplePlayer from './VoiceSamplePlayer';

// Voicory pricing tier colors and labels
const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    fusion: { label: 'Fusion', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30', icon: Sparkle },
    boost: { label: 'Boost', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', icon: Lightning },
    spark: { label: 'Spark', color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: Clock },
};

interface VoiceCardProps {
    voice: Voice;
    onSelect?: (voice: Voice) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ voice, onSelect }) => {
    const [copied, setCopied] = React.useState(false);
    
    const copyVoiceId = () => {
        navigator.clipboard.writeText(voice.elevenlabsVoiceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group relative bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 hover:border-primary/30 hover:bg-white/[0.02] transition-all duration-300">
            {/* Featured Badge */}
            {voice.isFeatured && (
                <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-yellow-500/25">
                    <Star size={10} weight="fill" />
                    Featured
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-textMain text-lg truncate group-hover:text-primary transition-colors">{voice.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-textMuted mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{voice.gender}</span>
                        <span className="text-white/20">•</span>
                        <span>{voice.accent}</span>
                        {/* Pricing Tier Badge */}
                        {voice.pricingTier && TIER_CONFIG[voice.pricingTier] ? (
                            <>
                                <span className="text-white/20">•</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${TIER_CONFIG[voice.pricingTier]?.color || ''}`}>
                                    {TIER_CONFIG[voice.pricingTier]?.label || voice.pricingTier}
                                </span>
                            </>
                        ) : null}
                    </div>
                </div>
                <button className="p-1.5 rounded-lg text-textMuted hover:text-textMain hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                    <DotsThree size={20} weight="bold" />
                </button>
            </div>

            {/* Description */}
            {voice.description && (
                <p className="text-xs text-textMuted/80 mb-4 line-clamp-2 leading-relaxed">
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
                        className="text-[10px] font-medium bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full text-primary/80"
                    >
                        {tag}
                    </span>
                ))}
                {voice.tags.length > 3 && (
                    <span className="text-[10px] text-textMuted px-1">
                        +{voice.tags.length - 3}
                    </span>
                )}
            </div>

            {/* Supported Languages */}
            <div className="text-[10px] text-textMuted/60 mb-4">
                <span className="font-medium text-textMuted">Languages: </span>
                {voice.supportedLanguages.slice(0, 3).join(', ')}
                {voice.supportedLanguages.length > 3 && ` +${voice.supportedLanguages.length - 3}`}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-1">
                    <CurrencyDollar size={16} weight="bold" className="text-primary" />
                    <span className="text-base font-bold text-primary">
                        {voice.costPerMin.toFixed(2)}
                    </span>
                    <span className="text-xs text-textMuted">/min</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={copyVoiceId}
                        className={`p-2 rounded-lg transition-all ${
                            copied 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'hover:bg-white/5 text-textMuted hover:text-textMain opacity-0 group-hover:opacity-100'
                        }`}
                        title="Copy Voice ID"
                    >
                        {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                    </button>
                    <button 
                        onClick={() => onSelect?.(voice)}
                        className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black text-xs font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5"
                    >
                        Select
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceCard;
