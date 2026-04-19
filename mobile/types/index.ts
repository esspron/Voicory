/**
 * @file types/index.ts
 * Core domain types for the Voicory Mobile app.
 *
 * These interfaces mirror the Supabase PostgreSQL schema exactly.
 * All optional fields match nullable DB columns.
 */

// ─── Call Logs ───────────────────────────────────────────────────────────────

/**
 * A single call record from the `call_logs` table.
 * Covers both inbound calls (customer → AI) and outbound calls (AI → customer).
 */
export interface CallLog {
  /** UUID primary key */
  id: string;
  /** Supabase Auth user ID (owner) */
  user_id: string;
  /** ID of the AI assistant that handled the call */
  assistant_id: string;
  /** Twilio / Exotel call SID */
  call_sid?: string;
  /** E.164-formatted phone number of the other party */
  phone_number: string;
  /** Whether the call was initiated by the customer or the AI */
  direction: 'inbound' | 'outbound';
  /** Final call status */
  status: 'completed' | 'failed' | 'busy' | 'no-answer' | 'in-progress' | 'queued' | 'ringing';
  /** Raw duration string from the telephony provider (e.g. "120") */
  duration?: string;
  /** Full conversation turn-by-turn history as JSONB */
  conversation_history?: unknown;
  /** Plain-text transcript of the conversation */
  transcript?: string;
  /** URL to the call recording audio file */
  recording_url?: string;
  /** Total cost of the call in USD */
  cost?: number;
  /** Arbitrary metadata JSONB (e.g. campaign ID, webhook payload) */
  metadata?: unknown;
  /** ISO 8601 timestamp when the call was answered */
  started_at?: string;
  /** ISO 8601 timestamp when the call ended */
  ended_at?: string;
  /** ISO 8601 timestamp when the record was created */
  created_at: string;
  /** ISO 8601 timestamp of last update */
  updated_at?: string;
  /** Telephony provider: "twilio" | "exotel" */
  provider?: string;
  /** The originating phone number (E.164) */
  from_number?: string;
  /** The destination phone number (E.164) */
  to_number?: string;
  /** AI-generated summary of the call */
  summary?: string;
  /** Number of text-to-speech characters used */
  tts_characters?: number;
  /** Speech-to-text usage in minutes */
  stt_minutes?: number;
  /** Foreign key to phone numbers table */
  phone_number_id?: string;
  /** Call duration in whole seconds */
  duration_seconds?: number;
  /** Joined assistant name (when queried with select) */
  assistant?: {
    name: string;
  };
}

// ─── Customers ───────────────────────────────────────────────────────────────

/**
 * A customer record from the `customers` table.
 * Represents a contact that has interacted with a Voicory assistant.
 */
export interface Customer {
  /** UUID primary key */
  id: string;
  /** Supabase Auth user ID (owner) */
  user_id: string;
  /** Customer full name */
  name: string;
  /** Customer email address */
  email?: string;
  /** E.164-formatted customer phone number */
  phone_number: string;
  /** Custom variables stored for this customer (used in assistant prompts) */
  variables?: unknown;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 last-updated timestamp */
  updated_at: string;
  /** Whether the customer has persistent AI memory stored */
  has_memory?: boolean;
  /** ISO 8601 timestamp of the most recent interaction */
  last_interaction?: string;
  /** Total number of interactions (calls + messages) */
  interaction_count: number;
  /** How the customer was added: "manual" | "import" | "inbound" */
  source?: string;
  /** ID in an external CRM system */
  external_crm_id?: string;
  /** Name of the CRM provider: "hubspot" | "salesforce" | etc. */
  crm_provider?: string;
  /** ISO 8601 timestamp of last CRM sync */
  last_synced_at?: string;
}

// ─── Assistants ──────────────────────────────────────────────────────────────

/**
 * A voice assistant configuration from the `assistants` table.
 */
export interface Assistant {
  /** UUID primary key */
  id: string;
  /** Supabase Auth user ID (owner) */
  user_id: string;
  /** Display name for the assistant */
  name: string;
  /** Legacy model field (use `llm_model` instead) */
  model?: string;
  /** ElevenLabs or PlayHT voice ID */
  voice_id?: string;
  /** Speech-to-text provider: "deepgram" | "whisper" | etc. */
  transcriber?: string;
  /** Assistant deployment status: "active" | "inactive" | "draft" */
  status?: string;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 last-updated timestamp */
  updated_at: string;
  /** System prompt / instructions for the assistant */
  instruction?: string;
  /** Short descriptive title (shown in UI) */
  title?: string;
  /** The assistant's opening message on call connect */
  first_message?: string;
  /** LLM provider: "openai" | "anthropic" | "google" | etc. */
  llm_provider?: string;
  /** LLM model name: "gpt-4o" | "claude-3-5-sonnet" | etc. */
  llm_model?: string;
  /** LLM sampling temperature (0–2) */
  temperature?: number;
  /** Maximum tokens per LLM response */
  max_tokens?: number;
  /** BCP-47 language code: "en" | "hi" | "es" | etc. */
  language?: string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

/**
 * A user profile record from the `profiles` table.
 * Extended metadata for a Supabase Auth user.
 */
export interface UserProfile {
  /** UUID primary key (same as `auth.users.id`) */
  id: string;
  /** Supabase Auth user ID */
  user_id: string;
  /** Business / organization name */
  organization_name?: string;
  /** Billing contact email */
  organization_email?: string;
  /** Current prepaid credit balance in USD */
  credits_balance: number;
  /** Subscription tier: "free" | "starter" | "pro" | "enterprise" */
  plan_type?: string;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 last-updated timestamp */
  updated_at: string;
  /** ISO 3166-1 alpha-2 country code */
  country?: string;
  /** ISO 4217 currency code (e.g. "USD", "INR") */
  currency?: string;
  /** Currency display symbol (e.g. "$", "₹") */
  currency_symbol?: string;
  /** Paddle customer ID for billing */
  paddle_customer_id?: string;
  /** Active Paddle subscription ID */
  paddle_subscription_id?: string;
  /** Voice minutes consumed in the current billing period */
  voice_minutes_used: number;
  /** Allotted voice minutes for the current billing period */
  voice_minutes_limit: number;
}

// ─── Phone Numbers ────────────────────────────────────────────────────────────

/**
 * A phone number record from the `phone_numbers` table.
 * Represents a Twilio or Exotel number owned by a user.
 */
export interface PhoneNumber {
  /** UUID primary key */
  id: string;
  /** Supabase Auth user ID (owner) */
  user_id: string;
  /** E.164-formatted phone number */
  number: string;
  /** Telephony provider: "twilio" | "exotel" */
  provider?: string;
  /** Assigned assistant ID for routing calls */
  assistant_id?: string;
  /** Human-readable label (e.g. "Support Line") */
  label?: string;
  /** Whether this number accepts inbound calls */
  inbound_enabled: boolean;
  /** Whether this number can place outbound calls */
  outbound_enabled: boolean;
  /** Whether the number is currently active (not released) */
  is_active: boolean;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 last-updated timestamp */
  updated_at: string;
  /** ISO 8601 soft-delete timestamp (null = not deleted) */
  deleted_at?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Aggregated stats displayed on the Dashboard screen.
 * Computed by `analyticsService.getDashboardStats()`.
 */
export interface DashboardStats {
  /** Total number of calls in the selected period */
  totalCalls: number;
  /** Average call duration in seconds */
  avgDuration: number;
  /** Total cost of all calls in USD */
  totalCost: number;
  /** Percentage of calls with status "completed" (0–100) */
  successRate: number;
  /** Current credit balance in USD */
  creditsBalance: number;
}
