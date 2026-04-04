/**
 * Outbound Dialer / Campaign Service
 * Handles all campaign and lead management operations
 */

import { authFetch } from '../lib/api';
import { supabase } from './supabase';
import type {
    OutboundCampaign,
    CampaignLead,
    CampaignCallLog,
    UserDialerSettings,
    CampaignInput,
    LeadInput,
    LeadImportResult,
    CampaignStats,
    DialerStatus,
    DNCEntry
} from '../types';

// ============================================
// HELPER: Map snake_case to camelCase
// ============================================

function mapCampaign(data: Record<string, unknown>): OutboundCampaign {
    return {
        id: data['id'] as string,
        userId: data['user_id'] as string,
        assistantId: data['assistant_id'] as string | undefined,
        phoneNumberId: data['phone_number_id'] as string | undefined,
        name: data['name'] as string,
        description: data['description'] as string | undefined,
        campaignType: data['campaign_type'] as OutboundCampaign['campaignType'],
        status: data['status'] as OutboundCampaign['status'],
        startDate: data['start_date'] as string | undefined,
        endDate: data['end_date'] as string | undefined,
        callDays: data['call_days'] as number[],
        callStartTime: data['call_start_time'] as string,
        callEndTime: data['call_end_time'] as string,
        timezone: data['timezone'] as string,
        maxCallsPerHour: data['max_calls_per_hour'] as number,
        maxCallsPerDay: data['max_calls_per_day'] as number,
        maxConcurrentCalls: data['max_concurrent_calls'] as number,
        maxAttempts: data['max_attempts'] as number,
        retryDelayHours: data['retry_delay_hours'] as number,
        ringTimeoutSeconds: data['ring_timeout_seconds'] as number,
        totalLeads: data['total_leads'] as number,
        leadsPending: data['leads_pending'] as number,
        leadsCompleted: data['leads_completed'] as number,
        callsMade: data['calls_made'] as number,
        callsAnswered: data['calls_answered'] as number,
        callsVoicemail: data['calls_voicemail'] as number,
        callsNoAnswer: data['calls_no_answer'] as number,
        callsFailed: data['calls_failed'] as number,
        appointmentsBooked: data['appointments_booked'] as number,
        totalTalkTimeSeconds: data['total_talk_time_seconds'] as number,
        startedAt: data['started_at'] as string | undefined,
        completedAt: data['completed_at'] as string | undefined,
        createdAt: data['created_at'] as string,
        updatedAt: data['updated_at'] as string,
        assistant: data['assistant'] as OutboundCampaign['assistant'],
        phoneNumber: data['phone_number'] as OutboundCampaign['phoneNumber']
    };
}

function mapLead(data: Record<string, unknown>): CampaignLead {
    return {
        id: data['id'] as string,
        campaignId: data['campaign_id'] as string,
        userId: data['user_id'] as string,
        phoneNumber: data['phone_number'] as string,
        firstName: data['first_name'] as string | undefined,
        lastName: data['last_name'] as string | undefined,
        email: data['email'] as string | undefined,
        company: data['company'] as string | undefined,
        propertyAddress: data['property_address'] as string | undefined,
        propertyCity: data['property_city'] as string | undefined,
        propertyState: data['property_state'] as string | undefined,
        propertyZip: data['property_zip'] as string | undefined,
        leadSource: data['lead_source'] as string | undefined,
        daysOnMarket: data['days_on_market'] as number | undefined,
        listingPrice: data['listing_price'] as number | undefined,
        originalListDate: data['original_list_date'] as string | undefined,
        expirationDate: data['expiration_date'] as string | undefined,
        status: data['status'] as CampaignLead['status'],
        callAttempts: data['call_attempts'] as number,
        lastCallAt: data['last_call_at'] as string | undefined,
        nextCallAt: data['next_call_at'] as string | undefined,
        outcome: data['outcome'] as CampaignLead['outcome'],
        disposition: data['disposition'] as CampaignLead['disposition'],
        leadScore: data['lead_score'] as number | undefined,
        notes: data['notes'] as string | undefined,
        appointmentDate: data['appointment_date'] as string | undefined,
        callbackDate: data['callback_date'] as string | undefined,
        customFields: (data['custom_fields'] as Record<string, string>) || {},
        importBatchId: data['import_batch_id'] as string | undefined,
        priority: data['priority'] as number,
        createdAt: data['created_at'] as string,
        updatedAt: data['updated_at'] as string
    };
}

function mapSettings(data: Record<string, unknown>): UserDialerSettings {
    return {
        id: data['id'] as string | undefined,
        userId: data['user_id'] as string | undefined,
        concurrentCallSlots: data['concurrent_call_slots'] as number,
        defaultTimezone: data['default_timezone'] as string,
        defaultCallStartHour: data['default_call_start_hour'] as number,
        defaultCallEndHour: data['default_call_end_hour'] as number,
        defaultMaxAttempts: data['default_max_attempts'] as number,
        defaultRetryDelayHours: data['default_retry_delay_hours'] as number,
        respectDnc: data['respect_dnc'] as boolean,
        requireConsent: data['require_consent'] as boolean,
        defaultCallerId: data['default_caller_id'] as string | undefined
    };
}

// ============================================
// CAMPAIGN OPERATIONS
// ============================================

export async function getCampaigns(options?: {
    status?: string;
    campaignType?: string;
}): Promise<OutboundCampaign[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.campaignType) params.append('campaignType', options.campaignType);
    
    const response = await authFetch(`/api/outbound-dialer/campaigns?${params}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaigns');
    }
    
    return (data.campaigns || []).map(mapCampaign);
}

export async function getCampaign(id: string): Promise<OutboundCampaign> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaign');
    }
    
    return mapCampaign(data.campaign);
}

export async function createCampaign(input: CampaignInput): Promise<OutboundCampaign> {
    const response = await authFetch('/api/outbound-dialer/campaigns', {
        method: 'POST',
        body: JSON.stringify(input)
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign');
    }
    
    return mapCampaign(data.campaign);
}

export async function updateCampaign(id: string, input: Partial<CampaignInput>): Promise<OutboundCampaign> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input)
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update campaign');
    }
    
    return mapCampaign(data.campaign);
}

export async function deleteCampaign(id: string): Promise<void> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete campaign');
    }
}

export async function getCampaignStats(id: string): Promise<CampaignStats> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}/stats`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaign stats');
    }
    
    return data.stats;
}

// ============================================
// DIALER CONTROL
// ============================================

export async function startCampaign(id: string): Promise<{ campaign: OutboundCampaign; dialer: DialerStatus }> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}/start`, {
        method: 'POST'
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to start campaign');
    }
    
    return {
        campaign: mapCampaign(data.campaign),
        dialer: data.dialer
    };
}

export async function pauseCampaign(id: string): Promise<OutboundCampaign> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}/pause`, {
        method: 'POST'
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to pause campaign');
    }
    
    return mapCampaign(data.campaign);
}

export async function resumeCampaign(id: string): Promise<{ campaign: OutboundCampaign; dialer: DialerStatus }> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}/resume`, {
        method: 'POST'
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to resume campaign');
    }
    
    return {
        campaign: mapCampaign(data.campaign),
        dialer: data.dialer
    };
}

export async function stopCampaign(id: string, complete = false): Promise<OutboundCampaign> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}/stop?complete=${complete}`, {
        method: 'POST'
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to stop campaign');
    }
    
    return mapCampaign(data.campaign);
}

export async function duplicateCampaign(id: string): Promise<OutboundCampaign> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}/duplicate`, {
        method: 'POST'
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to duplicate campaign');
    }
    
    return mapCampaign(data.campaign);
}

export async function exportCampaignCSV(id: string, campaignName: string): Promise<void> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${id}/export`);
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export campaign');
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function getDialerStatus(campaignId: string): Promise<DialerStatus> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${campaignId}/dialer-status`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get dialer status');
    }
    
    return data.status;
}

export async function getActiveDialers(): Promise<Array<DialerStatus & { campaignId: string }>> {
    const response = await authFetch('/api/outbound-dialer/active-dialers');
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get active dialers');
    }
    
    return data.dialers || [];
}

// ============================================
// LEAD OPERATIONS
// ============================================

export async function getLeads(
    campaignId: string,
    options?: {
        status?: string;
        disposition?: string;
        search?: string;
        sortField?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }
): Promise<{
    leads: CampaignLead[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.disposition) params.append('disposition', options.disposition);
    if (options?.search) params.append('search', options.search);
    if (options?.sortField) params.append('sortField', options.sortField);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const response = await authFetch(`/api/outbound-dialer/campaigns/${campaignId}/leads?${params}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leads');
    }
    
    return {
        leads: (data.leads || []).map(mapLead),
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages
    };
}

export async function createLead(campaignId: string, input: LeadInput): Promise<CampaignLead> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${campaignId}/leads`, {
        method: 'POST',
        body: JSON.stringify(input)
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to create lead');
    }
    
    return mapLead(data.lead);
}

export async function importLeads(
    campaignId: string,
    csvData: Record<string, string>[],
    mappings?: Record<string, string>
): Promise<LeadImportResult> {
    const response = await authFetch(`/api/outbound-dialer/campaigns/${campaignId}/leads/import`, {
        method: 'POST',
        body: JSON.stringify({ data: csvData, mappings })
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to import leads');
    }
    
    return data;
}

export async function updateLead(leadId: string, updates: Partial<LeadInput & {
    status?: CampaignLead['status'];
    disposition?: CampaignLead['disposition'];
    leadScore?: number;
    appointmentDate?: string;
    callbackDate?: string;
}>): Promise<CampaignLead> {
    const response = await authFetch(`/api/outbound-dialer/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update lead');
    }
    
    return mapLead(data.lead);
}

export async function deleteLead(leadId: string): Promise<void> {
    const response = await authFetch(`/api/outbound-dialer/leads/${leadId}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete lead');
    }
}

export async function bulkUpdateLeads(
    leadIds: string[],
    updates: { status?: CampaignLead['status']; disposition?: CampaignLead['disposition']; priority?: number }
): Promise<{ updated: number }> {
    const response = await authFetch('/api/outbound-dialer/leads/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ leadIds, updates })
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to bulk update leads');
    }
    
    return data;
}

export async function bulkDeleteLeads(leadIds: string[]): Promise<{ deleted: number }> {
    const response = await authFetch('/api/outbound-dialer/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ leadIds })
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to bulk delete leads');
    }
    
    return data;
}

export async function getLeadCallHistory(leadId: string): Promise<CampaignCallLog[]> {
    const response = await authFetch(`/api/outbound-dialer/leads/${leadId}/calls`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch call history');
    }
    
    return data.calls || [];
}

// ============================================
// SETTINGS
// ============================================

export async function getDialerSettings(): Promise<UserDialerSettings> {
    const response = await authFetch('/api/outbound-dialer/settings');
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settings');
    }
    
    return mapSettings(data.settings);
}

export async function updateDialerSettings(settings: Partial<UserDialerSettings>): Promise<UserDialerSettings> {
    const response = await authFetch('/api/outbound-dialer/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
    }
    
    return mapSettings(data.settings);
}

// ============================================
// DNC OPERATIONS
// ============================================

export async function getDNCList(limit = 100): Promise<DNCEntry[]> {
    const response = await authFetch(`/api/outbound-dialer/dnc?limit=${limit}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch DNC list');
    }
    
    return (data.list || []).map((item: Record<string, unknown>) => ({
        id: item['id'] as string,
        phoneNumber: item['phone_number'] as string,
        reason: item['reason'] as string | undefined,
        source: item['source'] as string,
        addedAt: item['added_at'] as string
    }));
}

export async function addToDNC(phoneNumber: string, reason?: string): Promise<DNCEntry> {
    const response = await authFetch('/api/outbound-dialer/dnc', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, reason })
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to add to DNC');
    }
    
    return {
        id: data.entry.id,
        phoneNumber: data.entry.phone_number,
        reason: data.entry.reason,
        source: data.entry.source,
        addedAt: data.entry.added_at
    };
}

export async function removeFromDNC(phoneNumber: string): Promise<void> {
    const response = await authFetch(`/api/outbound-dialer/dnc/${encodeURIComponent(phoneNumber)}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove from DNC');
    }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToCampaignUpdates(
    campaignId: string,
    onUpdate: (campaign: OutboundCampaign) => void
) {
    const channel = supabase
        .channel(`campaign:${campaignId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'outbound_campaigns',
                filter: `id=eq.${campaignId}`
            },
            (payload) => {
                onUpdate(mapCampaign(payload.new as Record<string, unknown>));
            }
        )
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    };
}

export function subscribeToLeadUpdates(
    campaignId: string,
    onUpdate: (lead: CampaignLead, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
    const channel = supabase
        .channel(`leads:${campaignId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'campaign_leads',
                filter: `campaign_id=eq.${campaignId}`
            },
            (payload) => {
                const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
                const data = eventType === 'DELETE' ? payload.old : payload.new;
                onUpdate(mapLead(data as Record<string, unknown>), eventType);
            }
        )
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    };
}

export function subscribeToCallLogs(
    campaignId: string,
    onNewCall: (callLog: CampaignCallLog) => void
) {
    const channel = supabase
        .channel(`calls:${campaignId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'campaign_call_logs',
                filter: `campaign_id=eq.${campaignId}`
            },
            (payload) => {
                onNewCall(payload.new as unknown as CampaignCallLog);
            }
        )
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    };
}
