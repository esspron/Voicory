/**
 * Application constants and configuration.
 * Centralizes all magic numbers, strings, and config values.
 *
 * @module lib/constants
 */

/**
 * Backend URLs by region for geo-routing
 */
const BACKEND_URLS = {
  INDIA: 'https://backendvoicory-732127099858.asia-south1.run.app',
  USA: 'https://backendvoicory-us-732127099858.us-central1.run.app',
  EUROPE: 'https://backendvoicory-eu-732127099858.europe-west1.run.app',
} as const;

/**
 * Get the nearest backend URL based on user's timezone
 */
const getGeoBackendUrl = (): string => {
  // Allow override via env var (but ignore localhost in production)
  const envUrl = import.meta.env['VITE_BACKEND_URL'] as string | undefined;
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  // In production, ignore localhost URLs - use geo-routing instead
  if (envUrl && envUrl !== 'auto' && !(isProduction && envUrl.includes('localhost'))) {
    return envUrl;
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // India/Asia timezones
    if (timezone.startsWith('Asia/') || timezone.startsWith('Indian/')) {
      return BACKEND_URLS.INDIA;
    }
    
    // Americas timezones
    if (timezone.startsWith('America/') || timezone.startsWith('US/') || timezone.startsWith('Canada/')) {
      return BACKEND_URLS.USA;
    }
    
    // Europe/Africa timezones
    if (timezone.startsWith('Europe/') || timezone.startsWith('Africa/')) {
      return BACKEND_URLS.EUROPE;
    }
    
    // Default to India for unknown
    return BACKEND_URLS.INDIA;
  } catch {
    return BACKEND_URLS.INDIA;
  }
};

/**
 * API endpoints and URLs
 */
export const API = {
  /** Backend service URL - auto-selected based on user location */
  BACKEND_URL: getGeoBackendUrl(),
  /** All backend URLs for manual selection */
  BACKEND_URLS,
  /** Supabase project URL */
  SUPABASE_URL: import.meta.env['VITE_SUPABASE_URL'],
  /** Supabase anonymous key */
  SUPABASE_ANON_KEY: import.meta.env['VITE_SUPABASE_ANON_KEY'],
} as const;

/**
 * Application routes
 */
export const ROUTES = {
  // Auth
  LOGIN: '/login',
  SIGNUP: '/signup',
  CHECK_EMAIL: '/check-email',

  // Dashboard
  OVERVIEW: '/',
  ASSISTANTS: '/assistants',
  ASSISTANT_EDITOR: '/assistants/:id',
  PHONE_NUMBERS: '/phone-numbers',
  CALL_LOGS: '/call-logs',
  BILLING: '/billing',
  KNOWLEDGE_BASE: '/knowledge-base',
  VOICE_LIBRARY: '/voice-library',
  API_KEYS: '/api-keys',
  REFERRAL: '/referral',

  // WhatsApp
  WHATSAPP_MESSENGER: '/messenger/whatsapp',

  // Settings
  SETTINGS: '/settings',
  SETTINGS_TEAM: '/settings/team',
  SETTINGS_BILLING: '/settings/billing',
  SETTINGS_WEBHOOKS: '/settings/webhooks',
} as const;

/**
 * Feature flags
 */
export const FEATURES = {
  /** Enable WhatsApp integration */
  WHATSAPP_ENABLED: true,
  /** Enable voice calls */
  VOICE_CALLS_ENABLED: true,
  /** Enable referral program */
  REFERRAL_PROGRAM_ENABLED: true,
  /** Enable knowledge base */
  KNOWLEDGE_BASE_ENABLED: true,
  /** Enable welcome bonus for new users */
  WELCOME_BONUS_ENABLED: true,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CALL_LOGS_PAGE_SIZE: 50,
} as const;

/**
 * Cache durations (in milliseconds)
 */
export const CACHE = {
  /** How long to cache voice data */
  VOICES_TTL: 5 * 60 * 1000, // 5 minutes
  /** How long to cache assistant data */
  ASSISTANTS_TTL: 2 * 60 * 1000, // 2 minutes
  /** How long to cache user preferences */
  PREFERENCES_TTL: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * UI debounce/throttle timings (in milliseconds)
 */
export const TIMING = {
  /** Search input debounce */
  SEARCH_DEBOUNCE: 300,
  /** API call debounce */
  API_DEBOUNCE: 500,
  /** Toast auto-dismiss duration */
  TOAST_DURATION: 5000,
  /** Modal animation duration */
  MODAL_ANIMATION: 200,
} as const;

/**
 * Validation limits
 */
export const LIMITS = {
  /** Maximum assistant name length */
  ASSISTANT_NAME_MAX: 100,
  /** Maximum system prompt length */
  SYSTEM_PROMPT_MAX: 10000,
  /** Maximum first message length */
  FIRST_MESSAGE_MAX: 500,
  /** Maximum knowledge base file size (10MB) */
  KB_FILE_SIZE_MAX: 10 * 1024 * 1024,
  /** Maximum API key description length */
  API_KEY_DESC_MAX: 200,
} as const;

/**
 * Supported file types for knowledge base
 */
export const SUPPORTED_FILE_TYPES = {
  documents: ['.pdf', '.doc', '.docx', '.txt', '.md'],
  data: ['.csv', '.json', '.xlsx'],
  images: ['.png', '.jpg', '.jpeg', '.webp'],
} as const;

/**
 * Error messages
 */
export const ERRORS = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
} as const;

/**
 * Success messages
 */
export const SUCCESS = {
  ASSISTANT_CREATED: 'Assistant created successfully!',
  ASSISTANT_UPDATED: 'Assistant updated successfully!',
  ASSISTANT_DELETED: 'Assistant deleted successfully!',
  COPIED_TO_CLIPBOARD: 'Copied to clipboard!',
  SETTINGS_SAVED: 'Settings saved successfully!',
} as const;
