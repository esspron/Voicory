/**
 * CRM Integration Service
 * 
 * Frontend service for managing CRM integrations.
 * Communicates with backend /api/crm/* endpoints.
 */

import { authFetch } from '@/lib/api';
import type {
  CRMIntegration,
  CRMProvider,
  CRMIntegrationFormData,
  CRMConnectionTestResult,
  CRMSyncLog,
  CRMProviderInfo,
} from '@/types/crm';

// Re-export types and constants
export type { CRMIntegration, CRMProvider, CRMIntegrationFormData, CRMConnectionTestResult, CRMSyncLog, CRMProviderInfo };

// Database record type (snake_case)
interface CRMIntegrationRecord {
  id: string;
  user_id: string;
  provider: CRMProvider;
  provider_name: string;
  api_key?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  client_id?: string;
  client_secret?: string;
  is_enabled: boolean;
  is_connected: boolean;
  last_sync_at?: string;
  last_error?: string;
  sync_calls: boolean;
  sync_contacts: boolean;
  sync_notes: boolean;
  auto_create_contacts: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Provider metadata
export const CRM_PROVIDERS_LIST: CRMProviderInfo[] = [
  {
    id: 'followupboss',
    name: 'Follow Up Boss',
    description: '#1 Real Estate CRM. Sync calls, contacts, and notes automatically.',
    logo: '/integrations/followupboss.svg',
    authType: 'api_key',
    docsUrl: 'https://docs.followupboss.com/reference/getting-started',
    features: ['Call Logging', 'Contact Sync', 'Notes', 'Webhooks', 'Lead Creation'],
    status: 'available',
  },
  {
    id: 'liondesk',
    name: 'LionDesk',
    description: 'Popular Real Estate CRM with powerful automation features.',
    logo: '/integrations/liondesk.svg',
    authType: 'oauth',
    docsUrl: 'https://developers.liondesk.com/docs/getting-started',
    features: ['Contact Sync', 'Task Creation', 'Tags', 'Lead Routing'],
    status: 'available',
  },
  {
    id: 'kvcore',
    name: 'kvCORE',
    description: 'All-in-one real estate platform by Inside Real Estate.',
    logo: '/integrations/kvcore.svg',
    authType: 'api_key',
    docsUrl: 'https://support.insiderealestate.com/',
    features: ['Contact Sync', 'Lead Management'],
    status: 'coming_soon',
  },
  {
    id: 'chime',
    name: 'Chime',
    description: 'AI-powered real estate CRM and lead generation.',
    logo: '/integrations/chime.svg',
    authType: 'api_key',
    docsUrl: 'https://help.chime.me/',
    features: ['Contact Sync', 'Lead Management'],
    status: 'coming_soon',
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'All-in-one marketing and CRM platform.',
    logo: '/integrations/gohighlevel.svg',
    authType: 'api_key',
    docsUrl: 'https://highlevel.stoplight.io/',
    features: ['Contact Sync', 'Pipeline Management', 'Automation'],
    status: 'coming_soon',
  },
];

// Database to frontend field mapping
function mapIntegration(data: CRMIntegrationRecord): CRMIntegration {
  return {
    id: data.id,
    userId: data.user_id,
    provider: data.provider,
    providerName: data.provider_name,
    apiKey: data.api_key,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.token_expires_at,
    clientId: data.client_id,
    clientSecret: data.client_secret,
    isEnabled: data.is_enabled,
    isConnected: data.is_connected,
    lastSyncAt: data.last_sync_at,
    lastError: data.last_error,
    syncCalls: data.sync_calls,
    syncContacts: data.sync_contacts,
    syncNotes: data.sync_notes,
    autoCreateContacts: data.auto_create_contacts,
    webhookUrl: data.webhook_url,
    webhookSecret: data.webhook_secret,
    settings: data.settings || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ============================================
// Integration CRUD
// ============================================

/**
 * Get all CRM integrations for the current user
 */
export async function getIntegrations(): Promise<CRMIntegration[]> {
  const response = await authFetch('/api/crm/integrations');
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch integrations');
  }
  
  const data = await response.json();
  return ((data.integrations || []) as CRMIntegrationRecord[]).map(mapIntegration);
}

/**
 * Get a specific integration by ID
 */
export async function getIntegration(id: string): Promise<CRMIntegration> {
  const response = await authFetch(`/api/crm/integrations/${id}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch integration');
  }
  
  const data = await response.json();
  return mapIntegration(data.integration as CRMIntegrationRecord);
}

/**
 * Create a new CRM integration
 */
export async function createIntegration(
  formData: CRMIntegrationFormData
): Promise<{ integration: CRMIntegration; connectionTest: CRMConnectionTestResult }> {
  const response = await authFetch('/api/crm/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: formData.provider,
      api_key: formData.apiKey,
      access_token: formData.accessToken,
      refresh_token: formData.refreshToken,
      client_id: formData.clientId,
      client_secret: formData.clientSecret,
      sync_calls: formData.syncCalls ?? true,
      sync_contacts: formData.syncContacts ?? true,
      sync_notes: formData.syncNotes ?? true,
      auto_create_contacts: formData.autoCreateContacts ?? true,
      settings: formData.settings || {},
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.details || 'Failed to create integration');
  }
  
  const data = await response.json();
  return {
    integration: mapIntegration(data.integration as CRMIntegrationRecord),
    connectionTest: data.connectionTest,
  };
}

/**
 * Update an existing integration
 */
export async function updateIntegration(
  id: string,
  updates: Partial<CRMIntegrationFormData> & {
    isEnabled?: boolean;
  }
): Promise<CRMIntegration> {
  const response = await authFetch(`/api/crm/integrations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: updates.apiKey,
      access_token: updates.accessToken,
      refresh_token: updates.refreshToken,
      client_id: updates.clientId,
      client_secret: updates.clientSecret,
      is_enabled: updates.isEnabled,
      sync_calls: updates.syncCalls,
      sync_contacts: updates.syncContacts,
      sync_notes: updates.syncNotes,
      auto_create_contacts: updates.autoCreateContacts,
      settings: updates.settings,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.details || 'Failed to update integration');
  }
  
  const data = await response.json();
  return mapIntegration(data.integration as CRMIntegrationRecord);
}

/**
 * Delete an integration
 */
export async function deleteIntegration(id: string): Promise<void> {
  const response = await authFetch(`/api/crm/integrations/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete integration');
  }
}

// ============================================
// Connection Testing
// ============================================

/**
 * Test connection for an existing integration
 */
export async function testConnection(integrationId: string): Promise<CRMConnectionTestResult> {
  const response = await authFetch(`/api/crm/integrations/${integrationId}/test`, {
    method: 'POST',
  });
  
  const data = await response.json();
  return data as CRMConnectionTestResult;
}

/**
 * Test credentials before saving (for new integration setup)
 */
export async function testCredentials(
  provider: CRMProvider,
  credentials: { apiKey?: string; accessToken?: string }
): Promise<CRMConnectionTestResult> {
  const response = await authFetch('/api/crm/test-credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      api_key: credentials.apiKey,
      access_token: credentials.accessToken,
    }),
  });
  
  const data = await response.json();
  return data as CRMConnectionTestResult;
}

// ============================================
// OAuth
// ============================================

/**
 * Get OAuth authorization URL for LionDesk
 */
export async function getLionDeskAuthUrl(): Promise<string> {
  const response = await authFetch('/api/crm/oauth/liondesk/authorize');
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to get authorization URL');
  }
  
  const data = await response.json();
  return data.authUrl;
}

// ============================================
// Sync Operations
// ============================================

/**
 * Trigger a manual sync for an integration
 */
export async function triggerSync(
  integrationId: string,
  syncType: 'calls' | 'contacts' | 'all' = 'all'
): Promise<{ success: boolean; message: string }> {
  const response = await authFetch(`/api/crm/integrations/${integrationId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sync_type: syncType }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to trigger sync');
  }
  
  return response.json();
}

/**
 * Get sync logs for the current user
 */
export async function getSyncLogs(options: {
  integrationId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<CRMSyncLog[]> {
  const params = new URLSearchParams();
  if (options.integrationId) params.set('integration_id', options.integrationId);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  
  const response = await authFetch(`/api/crm/sync-logs?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch sync logs');
  }
  
  const data = await response.json();
  return data.logs || [];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get provider info by ID
 */
export function getProviderInfo(providerId: CRMProvider): CRMProviderInfo | undefined {
  return CRM_PROVIDERS_LIST.find(p => p.id === providerId);
}

/**
 * Check if a provider is available (not coming soon)
 */
export function isProviderAvailable(providerId: CRMProvider): boolean {
  const provider = getProviderInfo(providerId);
  return provider?.status === 'available';
}

/**
 * Get user-friendly provider name
 */
export function getProviderName(providerId: CRMProvider): string {
  return getProviderInfo(providerId)?.name || providerId;
}
