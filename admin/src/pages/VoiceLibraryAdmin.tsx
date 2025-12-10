import React, { useState, useEffect } from 'react';
import {
    Microphone,
    MagnifyingGlass,
    ArrowsClockwise,
    Plus,
    PencilSimple,
    Star,
    StarHalf,
    CurrencyDollar,
    Play,
    Pause,
    Export,
    ToggleRight,
    ToggleLeft,
    GenderMale,
    GenderFemale,
    GenderNonbinary,
    Globe
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Modal, Input, Select, Toggle } from '../components/ui';
import type { AdminVoice } from '../types/admin.types';

const VoiceLibraryAdmin: React.FC = () => {
    const [voices, setVoices] = useState<AdminVoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGender, setFilterGender] = useState<string>('all');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<AdminVoice | null>(null);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        gender: 'Male',
        accent: 'Indian',
        primary_language: 'Hindi',
        cost_per_min: 3,
        is_active: true,
        is_featured: false,
        is_premium: false,
        display_order: 0,
    });

    useEffect(() => {
        fetchVoices();
    }, []);

    const fetchVoices = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('voices')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;

            // Get usage count per voice from assistants
            const { data: assistantsData } = await supabase
                .from('assistants')
                .select('voice_id');

            const usageCounts = new Map<string, number>();
            assistantsData?.forEach(a => {
                if (a.voice_id) {
                    const count = usageCounts.get(a.voice_id) || 0;
                    usageCounts.set(a.voice_id, count + 1);
                }
            });

            setVoices(data?.map(v => ({
                ...v,
                usage_count: usageCounts.get(v.id) || 0,
            })) || []);
        } catch (error) {
            console.error('Error fetching voices:', error);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (voice?: AdminVoice) => {
        if (voice) {
            setSelectedVoice(voice);
            setEditForm({
                name: voice.name,
                description: voice.description || '',
                gender: voice.gender,
                accent: voice.accent || 'Indian',
                primary_language: voice.primary_language || 'Hindi',
                cost_per_min: voice.cost_per_min,
                is_active: voice.is_active,
                is_featured: voice.is_featured,
                is_premium: voice.is_premium,
                display_order: voice.display_order,
            });
        } else {
            setSelectedVoice(null);
            setEditForm({
                name: '',
                description: '',
                gender: 'Male',
                accent: 'Indian',
                primary_language: 'Hindi',
                cost_per_min: 3,
                is_active: true,
                is_featured: false,
                is_premium: false,
                display_order: 0,
            });
        }
        setShowEditModal(true);
    };

    const saveVoice = async () => {
        try {
            if (selectedVoice) {
                // Update existing voice
                const { error } = await supabase
                    .from('voices')
                    .update({
                        name: editForm.name,
                        description: editForm.description,
                        gender: editForm.gender,
                        accent: editForm.accent,
                        primary_language: editForm.primary_language,
                        cost_per_min: editForm.cost_per_min,
                        is_active: editForm.is_active,
                        is_featured: editForm.is_featured,
                        is_premium: editForm.is_premium,
                        display_order: editForm.display_order,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', selectedVoice.id);

                if (error) throw error;
            }
            // Note: Creating new voices would require ElevenLabs integration
            
            setShowEditModal(false);
            fetchVoices();
        } catch (error) {
            console.error('Error saving voice:', error);
        }
    };

    const toggleVoiceActive = async (voiceId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('voices')
                .update({ is_active: !currentStatus })
                .eq('id', voiceId);

            if (error) throw error;
            fetchVoices();
        } catch (error) {
            console.error('Error toggling voice:', error);
        }
    };

    const toggleFeatured = async (voiceId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('voices')
                .update({ is_featured: !currentStatus })
                .eq('id', voiceId);

            if (error) throw error;
            fetchVoices();
        } catch (error) {
            console.error('Error toggling featured:', error);
        }
    };

    const getGenderIcon = (gender: string) => {
        switch (gender) {
            case 'Male': return <GenderMale size={16} className="text-blue-400" />;
            case 'Female': return <GenderFemale size={16} className="text-pink-400" />;
            default: return <GenderNonbinary size={16} className="text-violet-400" />;
        }
    };

    const filteredVoices = voices.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGender = filterGender === 'all' || v.gender === filterGender;
        return matchesSearch && matchesGender;
    });

    const columns = [
        {
            key: 'name',
            header: 'Voice',
            sortable: true,
            render: (value: string, row: AdminVoice) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                        <Microphone size={20} className="text-violet-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-textMain">{value}</p>
                            {row.is_featured && <Star size={14} weight="fill" className="text-amber-400" />}
                            {row.is_premium && <Badge variant="primary" size="sm">Premium</Badge>}
                        </div>
                        <p className="text-xs text-textMuted">{row.description?.slice(0, 40) || 'No description'}...</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'gender',
            header: 'Gender',
            sortable: true,
            render: (value: string) => (
                <div className="flex items-center gap-2">
                    {getGenderIcon(value)}
                    <span className="text-textMain">{value}</span>
                </div>
            ),
        },
        {
            key: 'primary_language',
            header: 'Language',
            sortable: true,
            render: (value: string, row: AdminVoice) => (
                <div className="flex items-center gap-2">
                    <Globe size={14} className="text-textMuted" />
                    <span className="text-textMain">{value}</span>
                    <span className="text-textMuted text-xs">({row.accent})</span>
                </div>
            ),
        },
        {
            key: 'cost_per_min',
            header: 'Cost/Min',
            sortable: true,
            render: (value: number) => (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CurrencyDollar size={14} />
                    {value}
                </span>
            ),
        },
        {
            key: 'usage_count',
            header: 'Usage',
            sortable: true,
            render: (value: number) => (
                <span className="text-textMain">{value} assistants</span>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (value: boolean, row: AdminVoice) => (
                <button
                    onClick={() => toggleVoiceActive(row.id, value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        value 
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-surface text-textMuted hover:bg-white/10'
                    }`}
                >
                    {value ? <ToggleRight size={16} weight="fill" /> : <ToggleLeft size={16} />}
                    {value ? 'Active' : 'Inactive'}
                </button>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            width: '100px',
            render: (_: any, row: AdminVoice) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => toggleFeatured(row.id, row.is_featured)}
                        className={`p-2 rounded-lg transition-colors ${
                            row.is_featured 
                                ? 'text-amber-400 bg-amber-400/10' 
                                : 'text-textMuted hover:text-amber-400 hover:bg-amber-400/10'
                        }`}
                        title={row.is_featured ? 'Remove from featured' : 'Add to featured'}
                    >
                        <Star size={16} weight={row.is_featured ? 'fill' : 'regular'} />
                    </button>
                    <button
                        onClick={() => openEditModal(row)}
                        className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <PencilSimple size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center border border-white/10">
                        <Microphone size={28} weight="duotone" className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Voice Library</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Manage {voices.length} voices in the library
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Voices"
                    value={voices.length.toString()}
                    icon={<Microphone size={20} weight="bold" />}
                    color="violet"
                    loading={loading}
                />
                <StatsCard
                    title="Active"
                    value={voices.filter(v => v.is_active).length.toString()}
                    icon={<ToggleRight size={20} weight="bold" />}
                    color="emerald"
                    loading={loading}
                />
                <StatsCard
                    title="Featured"
                    value={voices.filter(v => v.is_featured).length.toString()}
                    icon={<Star size={20} weight="bold" />}
                    color="amber"
                    loading={loading}
                />
                <StatsCard
                    title="Premium"
                    value={voices.filter(v => v.is_premium).length.toString()}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="primary"
                    loading={loading}
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search voices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 text-sm"
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'Male', 'Female', 'Neutral'].map((gender) => (
                        <button
                            key={gender}
                            onClick={() => setFilterGender(gender)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                filterGender === gender
                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                    : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {gender !== 'all' && getGenderIcon(gender)}
                            {gender === 'all' ? 'All' : gender}
                        </button>
                    ))}
                </div>

                <button
                    onClick={fetchVoices}
                    className="p-2.5 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filteredVoices}
                loading={loading}
                rowKey="id"
                emptyMessage="No voices found"
                emptyIcon={<Microphone size={32} className="text-textMuted/50" />}
            />

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={selectedVoice ? 'Edit Voice' : 'Add Voice'}
                icon={<Microphone size={24} className="text-violet-400" />}
                glowColor="violet"
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={saveVoice}>
                            Save Changes
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                        <Select
                            label="Gender"
                            value={editForm.gender}
                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                            options={[
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' },
                                { value: 'Neutral', label: 'Neutral' },
                            ]}
                        />
                    </div>

                    <Input
                        label="Description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Primary Language"
                            value={editForm.primary_language}
                            onChange={(e) => setEditForm({ ...editForm, primary_language: e.target.value })}
                        />
                        <Input
                            label="Accent"
                            value={editForm.accent}
                            onChange={(e) => setEditForm({ ...editForm, accent: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Cost per Minute ($)"
                            type="number"
                            value={editForm.cost_per_min}
                            onChange={(e) => setEditForm({ ...editForm, cost_per_min: Number(e.target.value) })}
                        />
                        <Input
                            label="Display Order"
                            type="number"
                            value={editForm.display_order}
                            onChange={(e) => setEditForm({ ...editForm, display_order: Number(e.target.value) })}
                        />
                    </div>

                    <div className="flex gap-6 pt-4">
                        <Toggle
                            checked={editForm.is_active}
                            onChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                            label="Active"
                        />
                        <Toggle
                            checked={editForm.is_featured}
                            onChange={(checked) => setEditForm({ ...editForm, is_featured: checked })}
                            label="Featured"
                        />
                        <Toggle
                            checked={editForm.is_premium}
                            onChange={(checked) => setEditForm({ ...editForm, is_premium: checked })}
                            label="Premium"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default VoiceLibraryAdmin;
