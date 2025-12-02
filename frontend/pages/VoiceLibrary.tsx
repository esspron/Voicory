import React, { useEffect, useState, useMemo } from 'react';
import { MagnifyingGlass, Star, Microphone, Sparkle, FunnelSimple, X, SpeakerHigh, GenderIntersex, Translate, CircleNotch } from '@phosphor-icons/react';
import VoiceCard from '../components/VoiceCard';
import { getVoices } from '../services/voicoryService';
import { Voice } from '../types';
import Select, { type SelectOption } from '../components/ui/Select';
import { FadeIn } from '../components/ui/FadeIn';

// Skeleton loader component
const VoiceCardSkeleton = () => (
    <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
                <div className="h-5 w-32 bg-white/10 rounded-lg mb-2" />
                <div className="h-3 w-24 bg-white/5 rounded" />
            </div>
            <div className="w-8 h-8 bg-white/5 rounded-lg" />
        </div>
        <div className="h-3 w-full bg-white/5 rounded mb-2" />
        <div className="h-3 w-3/4 bg-white/5 rounded mb-4" />
        <div className="h-12 w-full bg-white/5 rounded-xl mb-4" />
        <div className="flex gap-2 mb-4">
            <div className="h-5 w-16 bg-white/5 rounded-full" />
            <div className="h-5 w-20 bg-white/5 rounded-full" />
        </div>
        <div className="h-px w-full bg-white/5 mb-3" />
        <div className="flex justify-between">
            <div className="h-5 w-20 bg-white/10 rounded" />
            <div className="h-7 w-16 bg-white/10 rounded-lg" />
        </div>
    </div>
);

const VoiceLibrary: React.FC = () => {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [selectedLanguage, setSelectedLanguage] = useState<SelectOption>({ value: 'All', label: 'All Languages' });
    const [selectedGender, setSelectedGender] = useState<SelectOption>({ value: 'All', label: 'All Genders' });
    const [selectedTag, setSelectedTag] = useState<SelectOption>({ value: 'All', label: 'All Tags' });

    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getVoices();
            setVoices(data);
        } catch (err) {
            console.error('Error loading voices:', err);
            setError('Failed to load voices. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Extract unique values for filters
    const filterOptions = useMemo(() => {
        const languages = new Set<string>();
        const tags = new Set<string>();

        voices.forEach(voice => {
            voice.supportedLanguages.forEach(lang => languages.add(lang));
            voice.tags.forEach(tag => tags.add(tag));
        });

        return {
            languages: ['All', ...Array.from(languages).sort()],
            genders: ['All', 'Male', 'Female'],
            tags: ['All', ...Array.from(tags).sort()]
        };
    }, [voices]);

    // Filter voices
    const filteredVoices = useMemo(() => {
        return voices.filter(voice => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    voice.name.toLowerCase().includes(query) ||
                    voice.description?.toLowerCase().includes(query) ||
                    voice.tags.some(tag => tag.toLowerCase().includes(query)) ||
                    voice.supportedLanguages.some(lang => lang.toLowerCase().includes(query));
                if (!matchesSearch) return false;
            }

            // Language filter
            if (selectedLanguage.value !== 'All' && !voice.supportedLanguages.includes(selectedLanguage.value)) {
                return false;
            }

            // Gender filter
            if (selectedGender.value !== 'All' && voice.gender !== selectedGender.value) {
                return false;
            }

            // Tag filter
            if (selectedTag.value !== 'All' && !voice.tags.includes(selectedTag.value)) {
                return false;
            }

            return true;
        });
    }, [voices, searchQuery, selectedLanguage, selectedGender, selectedTag]);

    // Separate featured and regular voices
    const featuredVoices = filteredVoices.filter(v => v.isFeatured);
    const regularVoices = filteredVoices.filter(v => !v.isFeatured);

    const handleSelectVoice = (voice: Voice) => {
        console.log('Selected voice:', voice);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedLanguage({ value: 'All', label: 'All Languages' });
        setSelectedGender({ value: 'All', label: 'All Genders' });
        setSelectedTag({ value: 'All', label: 'All Tags' });
    };

    const hasActiveFilters = searchQuery || selectedLanguage.value !== 'All' || selectedGender.value !== 'All' || selectedTag.value !== 'All';

    return (
        <div className="min-h-screen bg-background relative">
            {/* Ambient background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-white/10">
                            <Microphone size={20} weight="duotone" className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-textMain">Voice Library</h1>
                            <p className="text-sm text-textMuted">
                                Explore premium AI voices optimized for Indian languages
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search & Filters Bar */}
                <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 mb-8">
                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <MagnifyingGlass size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input
                            type="text"
                            placeholder="Search voices by name, language, or tag..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-background/50 border border-white/10 rounded-xl text-textMain placeholder-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-textMuted text-sm shrink-0">
                            <FunnelSimple size={16} weight="bold" />
                            <span>Filters:</span>
                        </div>

                        {/* Filter Dropdowns Container */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Language Filter */}
                            <Select
                                value={selectedLanguage}
                                onChange={setSelectedLanguage}
                                options={filterOptions.languages.map(lang => ({
                                    value: lang,
                                    label: lang === 'All' ? 'All Languages' : lang
                                }))}
                                className="w-44"
                            />

                            {/* Gender Filter */}
                            <Select
                                value={selectedGender}
                                onChange={setSelectedGender}
                                options={filterOptions.genders.map(gender => ({
                                    value: gender,
                                    label: gender === 'All' ? 'All Genders' : gender
                                }))}
                                className="w-40"
                            />

                            {/* Tag Filter */}
                            <Select
                                value={selectedTag}
                                onChange={setSelectedTag}
                                options={filterOptions.tags.map(tag => ({
                                    value: tag,
                                    label: tag === 'All' ? 'All Tags' : tag
                                }))}
                                className="w-36"
                            />

                            {/* Clear Filters */}
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary hover:text-white hover:bg-primary/20 rounded-xl transition-all shrink-0"
                                >
                                    <X size={14} weight="bold" />
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Results Count */}
                        <div className="ml-auto flex items-center gap-2 text-sm text-textMuted shrink-0">
                            <SpeakerHigh size={14} weight="fill" className="text-primary" />
                            <span>
                                <span className="font-semibold text-textMain">{filteredVoices.length}</span> voice{filteredVoices.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="space-y-8">
                        <div>
                            <div className="h-6 w-40 bg-white/10 rounded-lg mb-4 animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {[1, 2, 3].map(i => <VoiceCardSkeleton key={i} />)}
                            </div>
                        </div>
                        <div>
                            <div className="h-6 w-32 bg-white/10 rounded-lg mb-4 animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <VoiceCardSkeleton key={i} />)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <Microphone size={32} weight="duotone" className="text-red-400" />
                        </div>
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={loadVoices}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-medium rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5"
                        >
                            <CircleNotch size={18} weight="bold" />
                            Try Again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredVoices.length === 0 && (
                    <div className="text-center py-20 relative">
                        {/* Floating sparkles */}
                        <Sparkle size={16} weight="fill" className="absolute top-8 left-1/4 text-primary/40 animate-pulse" />
                        <Sparkle size={12} weight="fill" className="absolute top-16 right-1/4 text-violet-400/40 animate-pulse" style={{ animationDelay: '0.5s' }} />

                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-surface to-surface/80 border border-white/10 flex items-center justify-center mx-auto mb-4">
                            <SpeakerHigh size={40} weight="duotone" className="text-textMuted" />
                        </div>
                        <p className="text-xl font-semibold text-textMain mb-2">No voices found</p>
                        <p className="text-sm text-textMuted mb-4">Try adjusting your search or filters</p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-textMain rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                <X size={14} weight="bold" />
                                Clear filters
                            </button>
                        )}
                    </div>
                )}

                {/* Voices Grid */}
                {!loading && !error && filteredVoices.length > 0 && (
                    <FadeIn delay={0.2}>
                        {/* Featured Section */}
                        {featuredVoices.length > 0 && (
                            <div className="mb-10">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
                                        <Star size={16} weight="fill" className="text-yellow-500" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-textMain">Featured Voices</h2>
                                    <span className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                        {featuredVoices.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {featuredVoices.map(voice => (
                                        <VoiceCard
                                            key={voice.id}
                                            voice={voice}
                                            onSelect={handleSelectVoice}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Voices Section */}
                        {regularVoices.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                        <Microphone size={16} weight="fill" className="text-primary" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-textMain">
                                        {featuredVoices.length > 0 ? 'All Voices' : 'Voices'}
                                    </h2>
                                    <span className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                        {regularVoices.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {regularVoices.map(voice => (
                                        <VoiceCard
                                            key={voice.id}
                                            voice={voice}
                                            onSelect={handleSelectVoice}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </FadeIn>
                )}
            </div>
        </div>
    );
};

export default VoiceLibrary;
