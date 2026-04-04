import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Phone,
    Users,
    CalendarBlank,
    MagnifyingGlass,
    Megaphone
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { CampaignCard } from '../components/campaigns';
import type { OutboundCampaign } from '../types';
import * as campaignService from '../services/campaignService';

type FilterStatus = 'all' | 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';

export default function Campaigns() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<OutboundCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const loadCampaigns = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await campaignService.getCampaigns(
                filterStatus !== 'all' ? { status: filterStatus } : undefined
            );
            setCampaigns(data);
        } catch (err) {
            console.error('Failed to load campaigns:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        loadCampaigns();

        // Subscribe to real-time updates
        const channels: (() => void)[] = [];
        
        // We'd need campaign IDs to subscribe, so for now just reload periodically
        const interval = setInterval(loadCampaigns, 30000);
        
        return () => {
            clearInterval(interval);
            channels.forEach(unsub => unsub());
        };
    }, [loadCampaigns]);

    const handleStartCampaign = async (campaignId: string) => {
        try {
            await campaignService.startCampaign(campaignId);
            loadCampaigns();
        } catch (err) {
            console.error('Failed to start campaign:', err);
        }
    };

    const handlePauseCampaign = async (campaignId: string) => {
        try {
            await campaignService.pauseCampaign(campaignId);
            loadCampaigns();
        } catch (err) {
            console.error('Failed to pause campaign:', err);
        }
    };

    const handleStopCampaign = async (campaignId: string) => {
        if (!confirm('Stop this campaign? No more calls will be made.')) return;
        try {
            await campaignService.stopCampaign(campaignId, true);
            loadCampaigns();
        } catch (err) {
            console.error('Failed to stop campaign:', err);
        }
    };

    const handleDuplicateCampaign = async (campaignId: string) => {
        try {
            const newCampaign = await campaignService.duplicateCampaign(campaignId);
            navigate(`/campaigns/${newCampaign.id}/edit`);
        } catch (err) {
            console.error('Failed to duplicate campaign:', err);
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm('Delete this campaign permanently? This cannot be undone.')) return;
        try {
            await campaignService.deleteCampaign(campaignId);
            loadCampaigns();
        } catch (err) {
            console.error('Failed to delete campaign:', err);
        }
    };

    // Filter campaigns by search term
    const filteredCampaigns = campaigns.filter(campaign => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            campaign.name.toLowerCase().includes(search) ||
            campaign.description?.toLowerCase().includes(search)
        );
    });

    // Calculate summary stats
    const stats = {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
        totalLeads: campaigns.reduce((sum, c) => sum + c.totalLeads, 0),
        totalAppointments: campaigns.reduce((sum, c) => sum + c.appointmentsBooked, 0)
    };

    const filterTabs: { value: FilterStatus; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'paused', label: 'Paused' },
        { value: 'draft', label: 'Draft' },
        { value: 'completed', label: 'Completed' }
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-textMain">Campaigns</h1>
                    <p className="text-textMuted mt-1">Manage your outbound calling campaigns</p>
                </div>
                <Button onClick={() => navigate('/campaigns/new')}>
                    <Plus size={18} className="mr-2" />
                    New Campaign
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <Megaphone size={18} />
                        <span className="text-sm">Total Campaigns</span>
                    </div>
                    <p className="text-2xl font-semibold text-textMain">{stats.total}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <Phone size={18} className="text-green-400" />
                        <span className="text-sm">Active</span>
                    </div>
                    <p className="text-2xl font-semibold text-green-400">{stats.active}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <Users size={18} />
                        <span className="text-sm">Total Leads</span>
                    </div>
                    <p className="text-2xl font-semibold text-textMain">{stats.totalLeads.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <CalendarBlank size={18} className="text-primary" />
                        <span className="text-sm">Appointments</span>
                    </div>
                    <p className="text-2xl font-semibold text-primary">{stats.totalAppointments}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search campaigns..."
                        className="w-full pl-10 pr-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setFilterStatus(tab.value)}
                            className={`px-4 py-2 text-sm rounded-lg transition-all ${
                                filterStatus === tab.value
                                    ? 'bg-primary text-black font-medium'
                                    : 'text-textMuted hover:text-textMain hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Campaign Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/5 animate-pulse">
                            <div className="h-6 w-2/3 bg-white/10 rounded mb-4" />
                            <div className="h-4 w-full bg-white/5 rounded mb-6" />
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-12 bg-white/5 rounded" />
                                <div className="h-12 bg-white/5 rounded" />
                                <div className="h-12 bg-white/5 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-16">
                    <Megaphone size={64} className="mx-auto text-textMuted opacity-30 mb-4" />
                    <h3 className="text-lg font-medium text-textMain mb-2">No campaigns found</h3>
                    <p className="text-textMuted mb-6">
                        {searchTerm 
                            ? 'Try adjusting your search or filters'
                            : 'Get started by creating your first campaign'
                        }
                    </p>
                    {!searchTerm && (
                        <Button onClick={() => navigate('/campaigns/new')}>
                            <Plus size={18} className="mr-2" />
                            Create Campaign
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCampaigns.map(campaign => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            onStart={() => handleStartCampaign(campaign.id)}
                            onPause={() => handlePauseCampaign(campaign.id)}
                            onStop={() => handleStopCampaign(campaign.id)}
                            onDuplicate={() => handleDuplicateCampaign(campaign.id)}
                            onDelete={() => handleDeleteCampaign(campaign.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
