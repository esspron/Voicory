import { MagnifyingGlass, Star, Microphone, Sparkle, FunnelSimple, X, SpeakerHigh, CircleNotch, Upload, CloudArrowUp, Check, Robot } from '@phosphor-icons/react';
import React, { useEffect, useState, useMemo, useRef } from 'react';

import { FadeIn } from '../components/ui/FadeIn';
import Select, { type SelectOption } from '../components/ui/Select';
import VoiceCard from '../components/VoiceCard';
import { getVoices, assignVoiceToAssistant, uploadCustomVoice, getAssistants } from '../services/voicoryService';
import { Voice, Assistant } from '../types';

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

// Voicory pricing tier display names
const TIER_LABELS: Record<string, string> = {
    'All': 'All Tiers',
    'fusion': 'Fusion',
    'boost': 'Boost',
    'spark': 'Spark',
};

// ─── Assign Voice Modal ──────────────────────────────────────────────────────
interface AssignVoiceModalProps {
    voice: Voice;
    onClose: () => void;
    onAssigned: (assistantName: string) => void;
}

const AssignVoiceModal: React.FC<AssignVoiceModalProps> = ({ voice, onClose, onAssigned }) => {
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getAssistants()
            .then(setAssistants)
            .catch(() => setError('Failed to load assistants'))
            .finally(() => setLoading(false));
    }, []);

    const handleAssign = async (assistant: Assistant) => {
        setAssigning(assistant.id);
        setError(null);
        try {
            await assignVoiceToAssistant(voice.id, assistant.id);
            onAssigned(assistant.name);
        } catch (err: any) {
            setError(err.message || 'Assignment failed');
            setAssigning(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-textMain">Assign Voice</h2>
                        <p className="text-xs text-textMuted mt-0.5">Select an assistant to use <span className="text-primary">{voice.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-textMuted hover:text-textMain transition-all">
                        <X size={18} weight="bold" />
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-10 text-textMuted">
                        <CircleNotch size={24} className="animate-spin mr-2" />
                        Loading assistants…
                    </div>
                )}

                {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

                {!loading && assistants.length === 0 && (
                    <p className="text-sm text-textMuted text-center py-8">No assistants found. Create one first.</p>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {assistants.map(a => (
                        <button
                            key={a.id}
                            onClick={() => handleAssign(a)}
                            disabled={!!assigning}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-primary/30 hover:bg-primary/5 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {assigning === a.id ? (
                                    <CircleNotch size={16} className="animate-spin text-primary" />
                                ) : (
                                    <Robot size={16} weight="duotone" className="text-primary" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-textMain truncate">{a.name}</p>
                                <p className="text-xs text-textMuted truncate">{a.description || 'No description'}</p>
                            </div>
                            {assigning === a.id && (
                                <span className="text-xs text-primary">Assigning…</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Custom Voice Upload Modal ────────────────────────────────────────────────
interface UploadVoiceModalProps {
    onClose: () => void;
    onUploaded: () => void;
}

const UploadVoiceModal: React.FC<UploadVoiceModalProps> = ({ onClose, onUploaded }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [gender, setGender] = useState<SelectOption>({ value: 'Neutral', label: 'Neutral' });
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        if (f && f.size > 20 * 1024 * 1024) {
            setError('File must be under 20 MB');
            return;
        }
        setFile(f);
        setError(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0] || null;
        if (f) {
            setFile(f);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!name.trim()) { setError('Please enter a name'); return; }
        if (!file) { setError('Please select an audio file'); return; }

        setUploading(true);
        setError(null);
        try {
            await uploadCustomVoice(file, name.trim(), description.trim() || undefined, gender.value);
            setSuccess(true);
            setTimeout(() => {
                onUploaded();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-textMain">Clone Custom Voice</h2>
                        <p className="text-xs text-textMuted mt-0.5">Upload a clear audio sample — ElevenLabs will clone it</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-textMuted hover:text-textMain transition-all">
                        <X size={18} weight="bold" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1.5">Voice Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Rahul Custom"
                            className="w-full px-4 py-2.5 bg-background/50 border border-white/10 rounded-xl text-textMain placeholder-textMuted/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1.5">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. My cloned voice for sales calls"
                            className="w-full px-4 py-2.5 bg-background/50 border border-white/10 rounded-xl text-textMain placeholder-textMuted/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1.5">Gender</label>
                        <Select
                            value={gender}
                            onChange={setGender}
                            options={[
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' },
                                { value: 'Neutral', label: 'Neutral' },
                            ]}
                            className="w-full"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1.5">Audio Sample * <span className="text-textMuted/50">(MP3, WAV, OGG · max 20 MB · 1–5 min recommended)</span></label>
                        <div
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${file ? 'border-primary/40 bg-primary/5' : 'border-white/10 hover:border-white/20'}`}
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input ref={fileRef} type="file" accept=".mp3,.wav,.ogg,.webm,.flac,.m4a,audio/*" className="hidden" onChange={handleFile} />
                            {file ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <SpeakerHigh size={16} weight="fill" className="text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm text-textMain font-medium">{file.name}</p>
                                        <p className="text-xs text-textMuted">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); setFile(null); }}
                                        className="ml-auto p-1 rounded hover:bg-white/10 text-textMuted"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <CloudArrowUp size={32} weight="duotone" className="text-textMuted mx-auto mb-2" />
                                    <p className="text-sm text-textMuted">Drag & drop or <span className="text-primary">browse</span></p>
                                </>
                            )}
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {success && (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <Check size={16} weight="bold" />
                            Voice cloned successfully! Refreshing…
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={uploading || success}
                        className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <><CircleNotch size={18} className="animate-spin" /> Cloning voice…</>
                        ) : (
                            <><Upload size={18} weight="bold" /> Clone Voice</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const VoiceLibrary: React.FC = () => {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [selectedLanguage, setSelectedLanguage] = useState<SelectOption>({ value: 'All', label: 'All Languages' });
    const [selectedGender, setSelectedGender] = useState<SelectOption>({ value: 'All', label: 'All Genders' });
    const [selectedTag, setSelectedTag] = useState<SelectOption>({ value: 'All', label: 'All Tags' });
    const [selectedTier, setSelectedTier] = useState<SelectOption>({ value: 'All', label: 'All Tiers' });

    // Modals
    const [assigningVoice, setAssigningVoice] = useState<Voice | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

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
        const tiers = new Set<string>();

        voices.forEach(voice => {
            voice.supportedLanguages.forEach(lang => languages.add(lang));
            voice.tags.forEach(tag => tags.add(tag));
            if (voice.pricingTier) tiers.add(voice.pricingTier);
        });

        return {
            languages: ['All', ...Array.from(languages).sort()],
            genders: ['All', 'Male', 'Female', 'Neutral'],
            tags: ['All', ...Array.from(tags).sort()],
            tiers: ['All', ...Array.from(tiers).sort()]
        };
    }, [voices]);

    // Filter voices
    const filteredVoices = useMemo(() => {
        return voices.filter(voice => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    voice.name.toLowerCase().includes(query) ||
                    voice.description?.toLowerCase().includes(query) ||
                    voice.tags.some(tag => tag.toLowerCase().includes(query)) ||
                    voice.supportedLanguages.some(lang => lang.toLowerCase().includes(query)) ||
                    (voice.pricingTier && voice.pricingTier.toLowerCase().includes(query));
                if (!matchesSearch) return false;
            }
            if (selectedLanguage.value !== 'All' && !voice.supportedLanguages.includes(selectedLanguage.value)) return false;
            if (selectedGender.value !== 'All' && voice.gender !== selectedGender.value) return false;
            if (selectedTag.value !== 'All' && !voice.tags.includes(selectedTag.value)) return false;
            if (selectedTier.value !== 'All' && voice.pricingTier !== selectedTier.value) return false;
            return true;
        });
    }, [voices, searchQuery, selectedLanguage, selectedGender, selectedTag, selectedTier]);

    const featuredVoices = filteredVoices.filter(v => v.isFeatured);
    const regularVoices = filteredVoices.filter(v => !v.isFeatured);

    const handleSelectVoice = (voice: Voice) => {
        setAssigningVoice(voice);
    };

    const handleAssigned = (assistantName: string) => {
        setAssigningVoice(null);
        setAssignSuccess(`Voice assigned to "${assistantName}" successfully!`);
        setTimeout(() => setAssignSuccess(null), 4000);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedLanguage({ value: 'All', label: 'All Languages' });
        setSelectedGender({ value: 'All', label: 'All Genders' });
        setSelectedTag({ value: 'All', label: 'All Tags' });
        setSelectedTier({ value: 'All', label: 'All Tiers' });
    };

    const hasActiveFilters = searchQuery || selectedLanguage.value !== 'All' || selectedGender.value !== 'All' || selectedTag.value !== 'All' || selectedTier.value !== 'All';

    return (
        <div className="min-h-screen bg-background relative">
            {/* Ambient background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
            </div>

            {/* Modals */}
            {assigningVoice && (
                <AssignVoiceModal
                    voice={assigningVoice}
                    onClose={() => setAssigningVoice(null)}
                    onAssigned={handleAssigned}
                />
            )}
            {showUploadModal && (
                <UploadVoiceModal
                    onClose={() => setShowUploadModal(false)}
                    onUploaded={loadVoices}
                />
            )}

            {/* Success toast */}
            {assignSuccess && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm">
                    <Check size={16} weight="bold" />
                    {assignSuccess}
                </div>
            )}

            <div className="relative p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
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
                        {/* Custom Voice Upload button */}
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-primary rounded-xl hover:from-primary hover:to-primary/80 hover:text-black hover:border-transparent font-medium text-sm transition-all hover:-translate-y-0.5"
                        >
                            <Upload size={16} weight="bold" />
                            Clone Custom Voice
                        </button>
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

                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={selectedLanguage}
                                onChange={setSelectedLanguage}
                                options={filterOptions.languages.map(lang => ({
                                    value: lang,
                                    label: lang === 'All' ? 'All Languages' : lang
                                }))}
                                className="w-44"
                            />
                            <Select
                                value={selectedGender}
                                onChange={setSelectedGender}
                                options={filterOptions.genders.map(gender => ({
                                    value: gender,
                                    label: gender === 'All' ? 'All Genders' : gender
                                }))}
                                className="w-40"
                            />
                            <Select
                                value={selectedTier}
                                onChange={setSelectedTier}
                                options={filterOptions.tiers.map(tier => ({
                                    value: tier,
                                    label: TIER_LABELS[tier] || tier
                                }))}
                                className="w-40"
                            />
                            <Select
                                value={selectedTag}
                                onChange={setSelectedTag}
                                options={filterOptions.tags.map(tag => ({
                                    value: tag,
                                    label: tag === 'All' ? 'All Tags' : tag
                                }))}
                                className="w-36"
                            />
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
