/**
 * CRM Integration Types
 * 
 * TypeScript interfaces for CRM integrations with Follow Up Boss and LionDesk.
 */

// Supported CRM Providers
export type CRMProvider = 'followupboss' | 'liondesk' | 'kvcore' | 'chime' | 'gohighlevel';

export type SyncType = 'call' | 'contact' | 'note' | 'lead';
export type SyncDirection = 'outbound' | 'inbound';
export type SyncStatus = 'pending' | 'success' | 'failed';

// CRM Provider Metadata
export interface CRMProviderInfo {
  id: CRMProvider;
  name: string;
  description: string;
  logo: string;
  authType: 'api_key' | 'oauth';
  docsUrl: string;
  features: string[];
  status: 'available' | 'coming_soon' | 'beta';
}

// CRM Integration (matches database schema)
export interface CRMIntegration {
  id: string;
  userId: string;
  provider: CRMProvider;
  providerName: string;
  
  // Credentials
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  clientId?: string;
  clientSecret?: string;
  
  // Connection Status
  isEnabled: boolean;
  isConnected: boolean;
  lastSyncAt?: string;
  lastError?: string;
  
  // Sync Settings
  syncCalls: boolean;
  syncContacts: boolean;
  syncNotes: boolean;
  autoCreateContacts: boolean;
  
  // Webhook
  webhookUrl?: string;
  webhookSecret?: string;
  
  // Provider-specific settings
  settings: Record<string, unknown>;
  
  createdAt: string;
  updatedAt: string;
}

// Form data for creating/updating CRM integration
export interface CRMIntegrationFormData {
  provider: CRMProvider;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  syncCalls?: boolean;
  syncContacts?: boolean;
  syncNotes?: boolean;
  autoCreateContacts?: boolean;
  settings?: Record<string, unknown>;
}

// CRM Sync Log
export interface CRMSyncLog {
  id: string;
  integrationId: string;
  userId: string;
  syncType: SyncType;
  direction: SyncDirection;
  localEntityType?: string;
  localEntityId?: string;
  remoteEntityType?: string;
  remoteEntityId?: string;
  status: SyncStatus;
  errorMessage?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// Follow Up Boss Specific Types
// ============================================

export interface FUBPerson {
  id?: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  emails?: Array<{ value: string; isPrimary?: boolean }>;
  phones?: Array<{ value: string; type?: string; isPrimary?: boolean }>;
  stage?: string;
  stageId?: number;
  source?: string;
  sourceUrl?: string;
  tags?: string[];
  assignedTo?: string;
  assignedUserId?: number;
  background?: string;
  price?: number;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    code?: string;
    country?: string;
  }>;
  created?: string;
  updated?: string;
}

export interface FUBCall {
  id?: number;
  personId: number;
  userId?: number;
  duration?: number; // in seconds
  outcome?: string;
  note?: string;
  isIncoming?: boolean;
  phone?: string;
  recording?: string; // URL to recording
  created?: string;
}

export interface FUBNote {
  id?: number;
  personId: number;
  userId?: number;
  subject?: string;
  body: string;
  created?: string;
}

export interface FUBEvent {
  system: string;
  type: string;
  source?: string;
  message?: string;
  description?: string;
  person?: Partial<FUBPerson>;
  property?: {
    street?: string;
    city?: string;
    state?: string;
    code?: string;
    price?: number;
    mlsNumber?: string;
    forRent?: boolean;
  };
}

export interface FUBWebhookPayload {
  eventId: string;
  eventCreated: string;
  event: string;
  resourceIds: number[];
  uri: string;
  data?: Record<string, unknown>;
}

// ============================================
// LionDesk Specific Types
// ============================================

export interface LionDeskContact {
  id?: number;
  owner_user_id?: number;
  assigned_user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_phone?: string;
  home_phone?: string;
  office_phone?: string;
  fax?: string;
  company?: string;
  birthday?: string;
  anniversary?: string;
  spouse_name?: string;
  spouse_email?: string;
  spouse_phone?: string;
  spouse_birthday?: string;
  tags?: string;
  created_at?: string;
  modified_at?: string;
  hotness_id?: number;
  source_id?: number;
  addresses?: Array<{
    id?: number;
    type?: string;
    street_address_1?: string;
    street_address_2?: string;
    zip?: string;
    city?: string;
    state?: string;
  }>;
  hotness?: {
    name?: string;
    rank?: number;
    color?: string;
  };
  source?: {
    id?: number;
    name?: string;
  };
  custom_fields?: Array<{
    id?: number;
    name?: string;
    value?: unknown;
  }>;
}

export interface LionDeskTask {
  id?: number;
  contact_id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'completed';
  created_at?: string;
}

// ============================================
// API Response Types
// ============================================

export interface CRMConnectionTestResult {
  success: boolean;
  provider: CRMProvider;
  message: string;
  error?: string;
  accountInfo?: {
    id?: string | number;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
  userInfo?: {
    id?: string | number;
    name?: string;
    email?: string;
  };
}

export interface CRMSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors?: string[];
}

export interface PushCallToCRMRequest {
  integrationId: string;
  callLog: {
    id: string;
    customerId?: string;
    customerPhone: string;
    customerName?: string;
    customerEmail?: string;
    duration: number; // seconds
    direction: 'inbound' | 'outbound';
    outcome?: string;
    summary?: string;
    transcript?: string;
    recordingUrl?: string;
    startedAt: string;
    endedAt: string;
  };
}

export interface PushCallToCRMResponse {
  success: boolean;
  remoteCallId?: string;
  remoteContactId?: string;
  createdContact?: boolean;
  error?: string;
}

// ============================================
// Provider Configuration Constants
// ============================================

export const CRM_PROVIDERS: CRMProviderInfo[] = [
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
