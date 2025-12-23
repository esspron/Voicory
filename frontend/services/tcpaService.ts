/**
 * TCPA Compliance Service
 *
 * Frontend service for TCPA compliance management including:
 * - DNC (Do Not Call) list management
 * - Consent management
 * - Compliance checking
 * - Settings management
 */

import { authFetch } from '@/lib/api';

// ===========================================
// TYPES
// ===========================================

export interface ComplianceCheckResult {
  compliant: boolean;
  blocked: boolean;
  checks: {
    time_check?: TimeCheckResult;
    dnc_check?: DNCCheckResult;
    consent_check?: ConsentCheckResult;
    state_rules?: StateRulesCheckResult;
    error?: { passed: boolean; error: string };
  };
  failureReason: string | null;
  timestamp: string;
}

export interface TimeCheckResult {
  passed: boolean;
  localTime: string;
  timezone: string;
  allowedStart: string;
  allowedEnd: string;
  checkedAt: string;
  stateCode: string | null;
}

export interface DNCCheckResult {
  passed: boolean;
  onDNC: boolean;
  dncId?: string;
  reason?: string;
  source?: string;
  addedAt?: string;
  checkedAt: string;
  error?: string;
}

export interface ConsentCheckResult {
  passed: boolean;
  hasConsent: boolean;
  consentId?: string;
  consentType?: string;
  consentDate?: string;
  consentSource?: string;
  contactName?: string;
  checkedAt: string;
  skipped?: boolean;
  reason?: string;
}

export interface StateRulesCheckResult {
  passed: boolean;
  stateCode: string;
  rules_applied: string[];
  warnings: string[];
  checkedAt: string;
  requiresRecordingDisclosure?: boolean;
  additionalRules?: Record<string, unknown>;
  skipped?: boolean;
  reason?: string;
}

export interface DNCEntry {
  id: string;
  user_id: string;
  phone_number: string;
  reason: string;
  source: string;
  added_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DNCListResponse {
  entries: DNCEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  phone_number: string;
  consent_type: 'written' | 'verbal' | 'implied' | 'web_form';
  consent_source: string;
  consent_date: string;
  consent_text: string | null;
  consent_proof_path: string | null;
  consent_proof_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConsentListResponse {
  consents: ConsentRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface TCPASettings {
  id?: string;
  user_id?: string;
  enforce_time_restrictions: boolean;
  enforce_dnc_check: boolean;
  require_consent: boolean;
  default_call_start_time: string;
  default_call_end_time: string;
  default_timezone: string;
  play_recording_disclosure: boolean;
  recording_disclosure_text: string;
  enable_opt_out_prompt: boolean;
  opt_out_phrase: string;
  auto_dnc_on_opt_out: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StateRule {
  id: string;
  state_code: string;
  state_name: string;
  call_start_time: string;
  call_end_time: string;
  requires_written_consent: boolean;
  requires_call_recording_disclosure: boolean;
  max_calls_per_day: number | null;
  max_calls_per_week: number | null;
  additional_rules: Record<string, unknown>;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimezoneInfo {
  id: string;
  name: string;
  states: string;
  currentTime: string;
  canCallNow: boolean;
}

export interface ComplianceStats {
  total_checks: number;
  compliant: number;
  non_compliant: number;
  blocked: number;
  compliance_rate: string;
  failure_reasons: Record<string, number>;
}

export interface DNCStats {
  total: number;
  by_reason: Record<string, number>;
  by_source: Record<string, number>;
}

export interface ConsentStats {
  total: number;
  active: number;
  revoked: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
}

// ===========================================
// COMPLIANCE CHECK FUNCTIONS
// ===========================================

/**
 * Perform full TCPA compliance check before making a call
 */
export async function checkCompliance(params: {
  phoneNumber: string;
  recipientTimezone?: string;
  stateCode?: string;
  campaignId?: string;
  requireConsent?: boolean;
}): Promise<ComplianceCheckResult> {
  const response = await authFetch('/api/tcpa/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to perform compliance check');
  }

  return response.json();
}

/**
 * Check multiple phone numbers at once
 */
export async function checkComplianceBulk(params: {
  phoneNumbers: string[];
  recipientTimezone?: string;
}): Promise<{ results: ComplianceCheckResult[]; summary: { total: number; compliant: number; blocked: number } }> {
  const response = await authFetch('/api/tcpa/check-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to perform bulk compliance check');
  }

  return response.json();
}

// ===========================================
// DNC LIST FUNCTIONS
// ===========================================

/**
 * Get user's DNC list with pagination
 */
export async function getDNCList(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<DNCListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.search) searchParams.set('search', params.search);

  const response = await authFetch(`/api/tcpa/dnc?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to get DNC list');
  }

  return response.json();
}

/**
 * Check if a phone number is on DNC
 */
export async function checkDNC(phoneNumber: string): Promise<DNCCheckResult> {
  const response = await authFetch('/api/tcpa/dnc/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });

  if (!response.ok) {
    throw new Error('Failed to check DNC status');
  }

  return response.json();
}

/**
 * Check multiple phone numbers against DNC
 */
export async function checkDNCBulk(phoneNumbers: string[]): Promise<Record<string, { onDNC: boolean; reason?: string; source?: string }>> {
  const response = await authFetch('/api/tcpa/dnc/check-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumbers }),
  });

  if (!response.ok) {
    throw new Error('Failed to check DNC status');
  }

  return response.json();
}

/**
 * Add phone number to DNC list
 */
export async function addToDNC(params: {
  phoneNumber: string;
  reason?: string;
  source?: string;
  notes?: string;
}): Promise<DNCEntry> {
  const response = await authFetch('/api/tcpa/dnc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to add to DNC list');
  }

  return response.json();
}

/**
 * Bulk add phone numbers to DNC list
 */
export async function addToDNCBulk(params: {
  phoneNumbers: string[];
  reason?: string;
  source?: string;
}): Promise<{ added: number; total: number; records: DNCEntry[] }> {
  const response = await authFetch('/api/tcpa/dnc/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to bulk add to DNC list');
  }

  return response.json();
}

/**
 * Remove phone number from DNC list
 */
export async function removeFromDNC(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  const response = await authFetch(`/api/tcpa/dnc/${encodeURIComponent(phoneNumber)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to remove from DNC list');
  }

  return response.json();
}

/**
 * Get DNC statistics
 */
export async function getDNCStats(): Promise<DNCStats> {
  const response = await authFetch('/api/tcpa/dnc/stats');

  if (!response.ok) {
    throw new Error('Failed to get DNC stats');
  }

  return response.json();
}

/**
 * Export DNC list
 */
export async function exportDNCList(): Promise<DNCEntry[]> {
  const response = await authFetch('/api/tcpa/dnc/export');

  if (!response.ok) {
    throw new Error('Failed to export DNC list');
  }

  return response.json();
}

// ===========================================
// CONSENT MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Get active consents with pagination
 */
export async function getConsents(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<ConsentListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.search) searchParams.set('search', params.search);

  const response = await authFetch(`/api/tcpa/consent?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to get consents');
  }

  return response.json();
}

/**
 * Check if there's active consent for a phone number
 */
export async function checkConsent(phoneNumber: string): Promise<ConsentCheckResult> {
  const response = await authFetch('/api/tcpa/consent/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });

  if (!response.ok) {
    throw new Error('Failed to check consent');
  }

  return response.json();
}

/**
 * Record new consent
 */
export async function recordConsent(params: {
  phoneNumber: string;
  consentType: 'written' | 'verbal' | 'implied' | 'web_form';
  consentSource: string;
  consentText?: string;
  contactName?: string;
  contactEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<ConsentRecord> {
  const response = await authFetch('/api/tcpa/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to record consent');
  }

  return response.json();
}

/**
 * Upload consent proof document
 */
export async function uploadConsentProof(consentId: string, file: File): Promise<{ path: string; type: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await authFetch(`/api/tcpa/consent/${consentId}/proof`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload consent proof');
  }

  return response.json();
}

/**
 * Get consent proof download URL
 */
export async function getConsentProofUrl(consentId: string): Promise<string | null> {
  const response = await authFetch(`/api/tcpa/consent/${consentId}/proof`);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.url;
}

/**
 * Get consent history for a phone number
 */
export async function getConsentHistory(phoneNumber: string): Promise<ConsentRecord[]> {
  const response = await authFetch(`/api/tcpa/consent/history/${encodeURIComponent(phoneNumber)}`);

  if (!response.ok) {
    throw new Error('Failed to get consent history');
  }

  return response.json();
}

/**
 * Revoke consent
 */
export async function revokeConsent(consentId: string, reason?: string): Promise<ConsentRecord> {
  const response = await authFetch(`/api/tcpa/consent/${consentId}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error('Failed to revoke consent');
  }

  return response.json();
}

/**
 * Bulk import consents
 */
export async function importConsents(consents: Array<{
  phoneNumber: string;
  consentType?: string;
  consentDate?: string;
  contactName?: string;
  contactEmail?: string;
}>): Promise<{ imported: number; total: number }> {
  const response = await authFetch('/api/tcpa/consent/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consents }),
  });

  if (!response.ok) {
    throw new Error('Failed to import consents');
  }

  return response.json();
}

/**
 * Get consent statistics
 */
export async function getConsentStats(): Promise<ConsentStats> {
  const response = await authFetch('/api/tcpa/consent/stats');

  if (!response.ok) {
    throw new Error('Failed to get consent stats');
  }

  return response.json();
}

/**
 * Get consent text template
 */
export async function getConsentTemplate(companyName?: string, purpose?: string): Promise<string> {
  const searchParams = new URLSearchParams();
  if (companyName) searchParams.set('companyName', companyName);
  if (purpose) searchParams.set('purpose', purpose);

  const response = await authFetch(`/api/tcpa/consent/template?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to get consent template');
  }

  const data = await response.json();
  return data.template;
}

// ===========================================
// SETTINGS FUNCTIONS
// ===========================================

/**
 * Get user's TCPA settings
 */
export async function getTCPASettings(): Promise<TCPASettings> {
  const response = await authFetch('/api/tcpa/settings');

  if (!response.ok) {
    throw new Error('Failed to get TCPA settings');
  }

  return response.json();
}

/**
 * Update user's TCPA settings
 */
export async function updateTCPASettings(settings: Partial<TCPASettings>): Promise<TCPASettings> {
  const response = await authFetch('/api/tcpa/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error('Failed to update TCPA settings');
  }

  return response.json();
}

// ===========================================
// STATE RULES FUNCTIONS
// ===========================================

/**
 * Get all state rules
 */
export async function getAllStateRules(): Promise<StateRule[]> {
  const response = await authFetch('/api/tcpa/state-rules');

  if (!response.ok) {
    throw new Error('Failed to get state rules');
  }

  return response.json();
}

/**
 * Get rules for a specific state
 */
export async function getStateRules(stateCode: string): Promise<StateRule> {
  const response = await authFetch(`/api/tcpa/state-rules/${stateCode}`);

  if (!response.ok) {
    throw new Error('Failed to get state rules');
  }

  return response.json();
}

/**
 * Get recording disclosure requirements for a state
 */
export async function getRecordingDisclosureRequirements(stateCode: string): Promise<{
  required: boolean;
  twoPartyConsent: boolean;
  disclosureText: string;
  timing: string;
}> {
  const response = await authFetch(`/api/tcpa/state-rules/${stateCode}/recording-disclosure`);

  if (!response.ok) {
    throw new Error('Failed to get recording disclosure requirements');
  }

  return response.json();
}

// ===========================================
// TIMEZONE FUNCTIONS
// ===========================================

/**
 * Get all US timezones with current call status
 */
export async function getUSTimezones(): Promise<TimezoneInfo[]> {
  const response = await authFetch('/api/tcpa/timezones');

  if (!response.ok) {
    throw new Error('Failed to get timezones');
  }

  return response.json();
}

/**
 * Check if current time allows calling in a timezone
 */
export async function checkCallTime(timezone: string, stateCode?: string): Promise<TimeCheckResult> {
  const response = await authFetch('/api/tcpa/check-time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timezone, stateCode }),
  });

  if (!response.ok) {
    throw new Error('Failed to check call time');
  }

  return response.json();
}

/**
 * Get next allowed call time for a timezone
 */
export async function getNextCallTime(timezone: string, stateCode?: string): Promise<{ canCallAt: string; waitMinutes: number }> {
  const response = await authFetch('/api/tcpa/next-call-time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timezone, stateCode }),
  });

  if (!response.ok) {
    throw new Error('Failed to get next call time');
  }

  return response.json();
}

// ===========================================
// STATISTICS FUNCTIONS
// ===========================================

/**
 * Get overall compliance statistics
 */
export async function getComplianceStats(days?: number): Promise<ComplianceStats> {
  const searchParams = new URLSearchParams();
  if (days) searchParams.set('days', days.toString());

  const response = await authFetch(`/api/tcpa/stats?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to get compliance stats');
  }

  return response.json();
}

// ===========================================
// OPT-OUT HANDLING
// ===========================================

/**
 * Handle opt-out request from call
 */
export async function handleOptOut(params: {
  phoneNumber: string;
  callId?: string;
  source?: string;
}): Promise<{ success: boolean; dncRecord: DNCEntry }> {
  const response = await authFetch('/api/tcpa/opt-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to process opt-out');
  }

  return response.json();
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Convert DNC list to CSV string for download
 */
export function dncListToCSV(entries: DNCEntry[]): string {
  const headers = ['Phone Number', 'Reason', 'Source', 'Notes', 'Added Date'];
  const rows = entries.map(e => [
    e.phone_number,
    e.reason,
    e.source,
    e.notes || '',
    new Date(e.created_at).toLocaleDateString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

/**
 * Download string as file
 */
export function downloadAsFile(content: string, filename: string, mimeType = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
