/**
 * Integration Types
 * 
 * Type definitions for assistant integrations including:
 * - CRM integrations (Follow Up Boss, LionDesk, etc.)
 * - Custom HTTPS webhooks
 * - LiveKit real-time communication
 */

// ============================================
// CUSTOM HTTP REQUEST TYPES
// ============================================

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HTTPAuthType = 'none' | 'bearer' | 'api_key' | 'basic' | 'custom_header';

export type HTTPTrigger = 
  | 'call_started'      // When a call begins
  | 'call_ended'        // When a call ends
  | 'appointment_booked' // When AI books an appointment
  | 'transfer_requested' // When transfer to human is requested
  | 'lead_qualified'    // When lead score exceeds threshold
  | 'custom_trigger';   // Custom tool trigger during call

export interface HTTPHeader {
  key: string;
  value: string;
  isSecret?: boolean;   // If true, value is stored encrypted
}

export interface HTTPAuthConfig {
  type: HTTPAuthType;
  // For bearer token
  bearerToken?: string;
  // For API key
  apiKeyHeader?: string;
  apiKeyValue?: string;
  // For basic auth
  username?: string;
  password?: string;
  // For custom header
  customHeaders?: HTTPHeader[];
}

export interface CustomHTTPRequest {
  id: string;
  name: string;
  description?: string;
  
  // HTTP Configuration
  url: string;
  method: HTTPMethod;
  headers?: HTTPHeader[];
  
  // Authentication
  auth: HTTPAuthConfig;
  
  // Request Body (for POST/PUT/PATCH)
  bodyTemplate?: string;  // JSON template with {{variables}}
  contentType?: 'application/json' | 'application/x-www-form-urlencoded' | 'text/plain';
  
  // Trigger Configuration
  trigger: HTTPTrigger;
  customTriggerPhrase?: string;  // For custom_trigger: what phrase triggers this
  
  // Response Handling
  parseResponse?: boolean;        // Whether to parse JSON response
  responseVariableMapping?: Record<string, string>;  // Map response fields to variables
  
  // Settings
  isEnabled: boolean;
  timeout?: number;               // Timeout in ms (default 10000)
  retryOnFail?: boolean;
  retryCount?: number;
  
  // Metadata
  lastTriggeredAt?: string;
  successCount?: number;
  failureCount?: number;
}

// ============================================
// LIVEKIT INTEGRATION TYPES
// ============================================

export interface LiveKitConfig {
  isEnabled: boolean;
  
  // LiveKit Server Configuration
  serverUrl?: string;             // e.g., wss://your-livekit-server.com
  apiKey?: string;
  apiSecret?: string;
  
  // Room Configuration
  roomPrefix?: string;            // Prefix for room names
  maxParticipants?: number;
  
  // Audio Settings
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  
  // Recording
  recordCalls: boolean;
  recordingBucket?: string;       // S3/GCS bucket for recordings
  
  // Real-time Features
  transcriptionEnabled: boolean;
  liveTranscriptUrl?: string;     // Webhook URL for live transcripts
  
  // Advanced
  customRoomConfig?: Record<string, unknown>;
}

// ============================================
// CRM INTEGRATION (ASSISTANT-LEVEL)
// ============================================

// Which CRM integration to use for this assistant
export interface AssistantCRMConfig {
  integrationId?: string;         // Reference to user's crm_integrations.id
  
  // Override sync settings for this assistant
  syncCalls?: boolean;
  syncContacts?: boolean;
  syncNotes?: boolean;
  autoCreateContacts?: boolean;
  
  // Field mapping for this assistant
  customFieldMapping?: Record<string, string>;
  
  // Lead routing
  assignToUserId?: string;        // CRM user to assign leads to
  assignToTeamId?: string;        // CRM team to assign leads to
  tagWithIds?: string[];          // Tags to apply in CRM
  
  // Post-call actions
  createTaskOnEnd?: boolean;
  taskAssignee?: string;
  taskDueDays?: number;
}

// ============================================
// WEBHOOK INTEGRATION
// ============================================

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  
  // Events to send
  events: HTTPTrigger[];
  
  // Security
  secret?: string;                // HMAC signing secret
  
  // Settings
  isEnabled: boolean;
  retryOnFail: boolean;
  
  // Metadata
  lastTriggeredAt?: string;
  successCount?: number;
  failureCount?: number;
}

// ============================================
// ASSISTANT INTEGRATIONS CONFIG
// ============================================

export interface AssistantIntegrations {
  // Custom HTTP requests that can be triggered
  httpRequests: CustomHTTPRequest[];
  
  // LiveKit configuration
  livekit?: LiveKitConfig;
  
  // CRM configuration for this assistant
  crm?: AssistantCRMConfig;
  
  // Webhooks for external systems
  webhooks: WebhookConfig[];
  
  // Calendar integration (for appointment booking)
  calendar?: {
    provider?: 'google' | 'outlook' | 'calendly' | 'cal_com';
    calendarId?: string;
    defaultDuration?: number;     // minutes
    bufferBefore?: number;        // minutes before appointment
    bufferAfter?: number;         // minutes after appointment
  };
}

// Default empty integrations config
export const DEFAULT_INTEGRATIONS: AssistantIntegrations = {
  httpRequests: [],
  webhooks: [],
  livekit: {
    isEnabled: false,
    audioEnabled: true,
    videoEnabled: false,
    screenShareEnabled: false,
    recordCalls: false,
    transcriptionEnabled: false,
  },
  crm: undefined,
  calendar: undefined,
};

// ============================================
// HTTP REQUEST TEMPLATES
// ============================================

export interface HTTPRequestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'notification' | 'calendar' | 'custom';
  template: Partial<CustomHTTPRequest>;
}

// Pre-built HTTP request templates
export const HTTP_REQUEST_TEMPLATES: HTTPRequestTemplate[] = [
  {
    id: 'slack_notification',
    name: 'Slack Notification',
    description: 'Send a message to a Slack channel when triggered',
    category: 'notification',
    template: {
      method: 'POST',
      contentType: 'application/json',
      bodyTemplate: JSON.stringify({
        text: '📞 Call Update: {{call_summary}}',
        channel: '#sales-calls',
      }, null, 2),
      auth: { type: 'bearer' },
    },
  },
  {
    id: 'zapier_webhook',
    name: 'Zapier Webhook',
    description: 'Trigger a Zapier automation',
    category: 'custom',
    template: {
      method: 'POST',
      contentType: 'application/json',
      bodyTemplate: JSON.stringify({
        lead_name: '{{customer_name}}',
        phone: '{{phone_number}}',
        call_outcome: '{{disposition}}',
        notes: '{{call_summary}}',
      }, null, 2),
      auth: { type: 'none' },
    },
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets (via Apps Script)',
    description: 'Add a row to Google Sheets',
    category: 'custom',
    template: {
      method: 'POST',
      contentType: 'application/json',
      bodyTemplate: JSON.stringify({
        values: ['{{customer_name}}', '{{phone_number}}', '{{call_date}}', '{{disposition}}'],
      }, null, 2),
      auth: { type: 'none' },
    },
  },
  {
    id: 'hubspot_contact',
    name: 'HubSpot Create Contact',
    description: 'Create or update a contact in HubSpot',
    category: 'crm',
    template: {
      url: 'https://api.hubapi.com/crm/v3/objects/contacts',
      method: 'POST',
      contentType: 'application/json',
      bodyTemplate: JSON.stringify({
        properties: {
          firstname: '{{first_name}}',
          lastname: '{{last_name}}',
          phone: '{{phone_number}}',
          email: '{{email}}',
          lifecyclestage: 'lead',
        },
      }, null, 2),
      auth: { type: 'bearer' },
    },
  },
  {
    id: 'custom_api',
    name: 'Custom API',
    description: 'Call any REST API endpoint',
    category: 'custom',
    template: {
      method: 'POST',
      contentType: 'application/json',
      bodyTemplate: JSON.stringify({}, null, 2),
      auth: { type: 'api_key' },
    },
  },
];

// Available variables for HTTP request body templates
export const HTTP_TEMPLATE_VARIABLES = [
  { name: 'customer_name', description: 'Full name of the customer' },
  { name: 'first_name', description: 'Customer first name' },
  { name: 'last_name', description: 'Customer last name' },
  { name: 'phone_number', description: 'Customer phone number' },
  { name: 'email', description: 'Customer email address' },
  { name: 'call_id', description: 'Unique call identifier' },
  { name: 'call_date', description: 'Date/time of the call (ISO format)' },
  { name: 'call_duration', description: 'Call duration in seconds' },
  { name: 'call_summary', description: 'AI-generated call summary' },
  { name: 'disposition', description: 'Call disposition/outcome' },
  { name: 'lead_score', description: 'Lead qualification score (0-100)' },
  { name: 'appointment_date', description: 'Booked appointment date (if any)' },
  { name: 'property_address', description: 'Property address (RE scripts)' },
  { name: 'agent_name', description: 'Real estate agent name' },
  { name: 'transcript', description: 'Full call transcript' },
];
