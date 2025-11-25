import React, { useEffect, useState, useMemo } from 'react';
import { Search, Star } from 'lucide-react';
import VoiceCard from '../components/VoiceCard';
import { getVoices } from '../services/callyyService';
import { Voice } from '../types';

const VoiceLibrary: React.FC = () => {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filters
    const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
    const [selectedGender, setSelectedGender] = useState<string>('All');
    const [selectedTag, setSelectedTag] = useState<string>('All');

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
            if (selectedLanguage !== 'All' && !voice.supportedLanguages.includes(selectedLanguage)) {
                return false;
            }

            // Gender filter
            if (selectedGender !== 'All' && voice.gender !== selectedGender) {
                return false;
            }

            // Tag filter
            if (selectedTag !== 'All' && !voice.tags.includes(selectedTag)) {
                return false;
            }

            return true;
        });
    }, [voices, searchQuery, selectedLanguage, selectedGender, selectedTag]);

    // Separate featured and regular voices
    const featuredVoices = filteredVoices.filter(v => v.isFeatured);
    const regularVoices = filteredVoices.filter(v => !v.isFeatured);

    const handleSelectVoice = (voice: Voice) => {
        // TODO: Navigate to assistant creation or open modal
        console.log('Selected voice:', voice);
        // You can store selected voice in context or navigate to assistant editor
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedLanguage('All');
        setSelectedGender('All');
        setSelectedTag('All');
    };

    const hasActiveFilters = searchQuery || selectedLanguage !== 'All' || selectedGender !== 'All' || selectedTag !== 'All';

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-textMain">Voice Library</h1>
                <p className="text-textMuted text-sm mt-1">
                    Explore premium AI voices optimized for Indian languages. Listen to samples and select the perfect voice for your assistant.
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                <input
                    type="text"
                    placeholder="Search voices by name, language, or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:border-primary transition-colors"
                />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 mb-6">
                {/* Language Filter */}
                <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                    {filterOptions.languages.map(lang => (
                        <option key={lang} value={lang}>{lang === 'All' ? 'All Languages' : lang}</option>
                    ))}
                </select>

                {/* Gender Filter */}
                <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                    {filterOptions.genders.map(gender => (
                        <option key={gender} value={gender}>{gender === 'All' ? 'All Genders' : gender}</option>
                    ))}
                </select>

                {/* Tag Filter */}
                <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                    {filterOptions.tags.map(tag => (
                        <option key={tag} value={tag}>{tag === 'All' ? 'All Tags' : tag}</option>
                    ))}
                </select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm text-primary hover:text-primaryHover transition-colors"
                    >
                        Clear filters
                    </button>
                )}

                {/* Results Count */}
                <div className="ml-auto flex items-center text-sm text-textMuted">
                    {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''} found
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-textMuted text-center py-20">
                    <div className="animate-pulse">Loading voices...</div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="text-center py-20">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={loadVoices}
                        className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primaryHover transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredVoices.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-textMuted mb-2">No voices found</p>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-primary hover:text-primaryHover transition-colors text-sm"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* Voices Grid */}
            {!loading && !error && filteredVoices.length > 0 && (
                <>
                    {/* Featured Section */}
                    {featuredVoices.length > 0 && (
                        <div className="mb-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Star size={18} className="text-yellow-500" fill="currentColor" />
                                <h2 className="text-lg font-semibold text-textMain">Featured Voices</h2>
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
                            <h2 className="text-lg font-semibold text-textMain mb-4">
                                {featuredVoices.length > 0 ? 'All Voices' : `Voices (${regularVoices.length})`}
                            </h2>
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
                </>
            )}
        </div>
    );
};

export default VoiceLibrary;
