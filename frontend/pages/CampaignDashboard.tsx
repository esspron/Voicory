import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    Pause,
    UploadSimple,
    PencilSimple,
    Gear
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
    CampaignStats, 
    LeadTable, 
    LeadDetailPanel, 
    LeadUploadModal 
} from '../components/campaigns';
import type { OutboundCampaign, CampaignLead, DialerStatus, LeadImportResult } from '../types';
import * as campaignService from '../services/campaignService';

type Tab = 'overview' | 'leads' | 'settings';

export default function CampaignDashboard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [campaign, setCampaign] = useState<OutboundCampaign | null>(null);
    const [leads, setLeads] = useState<CampaignLead[]>([]);
    const [dialerStatus, setDialerStatus] = useState<DialerStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [selectedLead, setSelectedLead] = useState<CampaignLead | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Load campaign data
    const loadCampaign = useCallback(async () => {
        if (!id) return;
        
        try {
            setIsLoading(true);
            const [campaignData, leadsData] = await Promise.all([
                campaignService.getCampaign(id),
                campaignService.getLeads(id),
            ]);
            
            setCampaign(campaignData);
            setLeads(leadsData.leads || []);
        } catch (err) {
            console.error('Failed to load campaign:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadCampaign();

        // Subscribe to real-time updates
        if (!id) return;
        
        const unsubCampaign = campaignService.subscribeToCampaignUpdates(id, (updatedCampaign) => {
            setCampaign(updatedCampaign);
        });

        const unsubLeads = campaignService.subscribeToLeadUpdates(id, (lead, eventType) => {
            if (eventType === 'INSERT') {
                setLeads(prev => [lead, ...prev]);
            } else if (eventType === 'UPDATE') {
                setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
            } else if (eventType === 'DELETE') {
                setLeads(prev => prev.filter(l => l.id !== lead.id));
            }
        });

        return () => {
            unsubCampaign();
            unsubLeads();
        };
    }, [id, loadCampaign]);

    // Poll dialer status when campaign is active
    useEffect(() => {
        if (!id || campaign?.status !== 'active') return;

        const pollStatus = async () => {
            try {
                const status = await campaignService.getDialerStatus(id);
                setDialerStatus(status);
            } catch (err) {
                console.error('Failed to get dialer status:', err);
            }
        };

        pollStatus();
        const interval = setInterval(pollStatus, 5000);
        return () => clearInterval(interval);
    }, [id, campaign?.status]);

    const handleStartCampaign = async () => {
        if (!id) return;
        setIsActionLoading(true);
        try {
            await campaignService.startCampaign(id);
            loadCampaign();
        } catch (err) {
            console.error('Failed to start campaign:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePauseCampaign = async () => {
        if (!id) return;
        setIsActionLoading(true);
        try {
            await campaignService.pauseCampaign(id);
            loadCampaign();
        } catch (err) {
            console.error('Failed to pause campaign:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleResumeCampaign = async () => {
        if (!id) return;
        setIsActionLoading(true);
        try {
            await campaignService.resumeCampaign(id);
            loadCampaign();
        } catch (err) {
            console.error('Failed to resume campaign:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleImportLeads = async (
        file: File, 
        columnMapping: Record<string, string>
    ): Promise<LeadImportResult> => {
        if (!id) throw new Error('Campaign ID is required');
        
        // Read and parse the file
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0]?.split(',').map(h => h.trim().replace(/^["']|["']$/g, '')) || [];
        
        // Parse data rows
        const leadsData: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i]?.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((header, idx) => {
                if (columnMapping[header] && values[idx]) {
                    row[columnMapping[header]] = values[idx];
                }
            });
            if (Object.keys(row).length > 0) {
                leadsData.push(row);
            }
        }
        
        const result = await campaignService.importLeads(id, leadsData, columnMapping);
        loadCampaign();
        return result;
    };

    const handleUpdateLead = async (updates: Partial<CampaignLead>) => {
        if (!selectedLead) return;
        try {
            await campaignService.updateLead(selectedLead.id, updates);
            setLeads(prev => prev.map(l => 
                l.id === selectedLead.id ? { ...l, ...updates } : l
            ));
            setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
        } catch (err) {
            console.error('Failed to update lead:', err);
        }
    };

    const handleAddToDNC = async () => {
        if (!selectedLead) return;
        try {
            await campaignService.addToDNC(selectedLead.phoneNumber, 'Added from campaign');
            await campaignService.updateLead(selectedLead.id, { status: 'dnc' });
            setLeads(prev => prev.map(l => 
                l.id === selectedLead.id ? { ...l, status: 'dnc' as const } : l
            ));
            setSelectedLead(null);
        } catch (err) {
            console.error('Failed to add to DNC:', err);
        }
    };

    const handleBulkAction = async (action: string, leadIds: string[]) => {
        try {
            if (action === 'skip') {
                await campaignService.bulkUpdateLeads(leadIds, { status: 'completed' });
            } else if (action === 'priority') {
                await campaignService.bulkUpdateLeads(leadIds, { priority: 1 });
            } else if (action === 'dnc') {
                for (const leadId of leadIds) {
                    const lead = leads.find(l => l.id === leadId);
                    if (lead) {
                        await campaignService.addToDNC(lead.phoneNumber, 'Bulk DNC');
                    }
                }
                await campaignService.bulkUpdateLeads(leadIds, { status: 'dnc' });
            }
            loadCampaign();
            setSelectedLeads([]);
        } catch (err) {
            console.error('Failed bulk action:', err);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'paused': return 'warning';
            case 'scheduled': return 'info';
            case 'completed': return 'default';
            case 'draft': return 'default';
            default: return 'default';
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 animate-pulse space-y-6">
                <div className="h-8 w-64 bg-white/10 rounded" />
                <div className="h-32 bg-white/5 rounded-xl" />
                <div className="h-64 bg-white/5 rounded-xl" />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="p-6 text-center">
                <p className="text-textMuted">Campaign not found</p>
                <Button variant="outline" onClick={() => navigate('/campaigns')} className="mt-4">
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Campaigns
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/campaigns')}
                        className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold text-textMain">{campaign.name}</h1>
                            <Badge variant={getStatusBadgeVariant(campaign.status) as 'default'}>
                                {campaign.status}
                            </Badge>
                        </div>
                        {campaign.description && (
                            <p className="text-textMuted mt-1">{campaign.description}</p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                        <Button onClick={handleStartCampaign} loading={isActionLoading}>
                            <Play size={18} className="mr-2" weight="fill" />
                            Start Campaign
                        </Button>
                    ) : campaign.status === 'active' ? (
                        <Button variant="secondary" onClick={handlePauseCampaign} loading={isActionLoading}>
                            <Pause size={18} className="mr-2" weight="fill" />
                            Pause
                        </Button>
                    ) : campaign.status === 'paused' ? (
                        <Button onClick={handleResumeCampaign} loading={isActionLoading}>
                            <Play size={18} className="mr-2" weight="fill" />
                            Resume
                        </Button>
                    ) : null}
                    
                    <Button variant="outline" onClick={() => navigate(`/campaigns/${id}/edit`)}>
                        <PencilSimple size={18} className="mr-2" />
                        Edit
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
                {(['overview', 'leads', 'settings'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm rounded-lg capitalize transition-all ${
                            activeTab === tab
                                ? 'bg-primary text-black font-medium'
                                : 'text-textMuted hover:text-textMain hover:bg-white/5'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <CampaignStats campaign={campaign} dialerStatus={dialerStatus || undefined} />
            )}

            {activeTab === 'leads' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                            <UploadSimple size={18} className="mr-2" />
                            Import Leads
                        </Button>
                    </div>
                    
                    <LeadTable
                        leads={leads}
                        onLeadSelect={setSelectedLead}
                        selectedLeads={selectedLeads}
                        onSelectionChange={setSelectedLeads}
                        onBulkAction={handleBulkAction}
                    />
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-medium text-textMain mb-4">Campaign Settings</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-textMuted">Call Hours</label>
                            <p className="text-textMain">{campaign.callStartTime} - {campaign.callEndTime}</p>
                        </div>
                        <div>
                            <label className="text-sm text-textMuted">Timezone</label>
                            <p className="text-textMain">{campaign.timezone}</p>
                        </div>
                        <div>
                            <label className="text-sm text-textMuted">Max Attempts per Lead</label>
                            <p className="text-textMain">{campaign.maxAttempts}</p>
                        </div>
                        <div>
                            <label className="text-sm text-textMuted">Concurrent Calls</label>
                            <p className="text-textMain">{campaign.maxConcurrentCalls}</p>
                        </div>
                    </div>
                    <div className="mt-6">
                        <Button variant="outline" onClick={() => navigate(`/campaigns/${id}/edit`)}>
                            <Gear size={18} className="mr-2" />
                            Edit Settings
                        </Button>
                    </div>
                </div>
            )}

            {/* Lead Detail Panel */}
            {selectedLead && (
                <LeadDetailPanel
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={handleUpdateLead}
                    onAddToDNC={handleAddToDNC}
                />
            )}

            {/* Upload Modal */}
            <LeadUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onUpload={handleImportLeads}
            />
        </div>
    );
}
