/**
 * Appointment Booking System Types
 * 
 * TypeScript interfaces for calendar integrations, appointment types,
 * appointments, and availability management.
 */

// ============================================
// CALENDAR INTEGRATION TYPES
// ============================================

export type CalendarProvider = 'cal_com' | 'calendly' | 'google_calendar' | 'follow_up_boss';
export type CalendarProviderStatus = 'available' | 'coming_soon' | 'beta';

export interface CalendarProviderInfo {
  id: CalendarProvider;
  name: string;
  description: string;
  logo: string;
  authType: 'api_key' | 'oauth';
  docsUrl: string;
  features: string[];
  status: CalendarProviderStatus;
}

export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: CalendarProvider;
  providerName: string;
  
  // Credentials (masked on frontend)
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  
  // External IDs
  externalUserId?: string;
  externalCalendarId?: string;
  
  // Status
  isEnabled: boolean;
  isConnected: boolean;
  lastSyncAt?: string;
  lastError?: string;
  
  // Settings
  defaultMeetingDuration: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  timezone: string;
  
  // Webhook
  webhookUrl?: string;
  webhookSecret?: string;
  
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarIntegrationFormData {
  provider: CalendarProvider;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  externalCalendarId?: string;
  defaultMeetingDuration?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  timezone?: string;
  settings?: Record<string, unknown>;
}

// ============================================
// APPOINTMENT TYPE TYPES
// ============================================

export type AppointmentCategory = 
  | 'showing' 
  | 'listing_appointment' 
  | 'buyer_consultation'
  | 'seller_consultation'
  | 'market_analysis' 
  | 'property_tour'
  | 'open_house'
  | 'closing'
  | 'general';

export type LocationType = 'in_person' | 'phone' | 'video' | 'property';

export interface AppointmentType {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  category: AppointmentCategory;
  
  // Duration
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  
  // Availability
  isActive: boolean;
  requiresConfirmation: boolean;
  maxAdvanceDays: number;
  minNoticeHours: number;
  
  // Location
  defaultLocation?: LocationType;
  locationAddress?: string;
  videoLink?: string;
  
  // Notifications
  sendConfirmation: boolean;
  sendReminder24h: boolean;
  sendReminder1h: boolean;
  
  // Display
  color: string;
  
  // External sync
  calendarIntegrationId?: string;
  externalEventTypeId?: string;
  
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentTypeFormData {
  name: string;
  slug?: string;
  description?: string;
  category: AppointmentCategory;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  isActive?: boolean;
  requiresConfirmation?: boolean;
  maxAdvanceDays?: number;
  minNoticeHours?: number;
  defaultLocation?: LocationType;
  locationAddress?: string;
  videoLink?: string;
  sendConfirmation?: boolean;
  sendReminder24h?: boolean;
  sendReminder1h?: boolean;
  color?: string;
  calendarIntegrationId?: string;
  settings?: Record<string, unknown>;
}

// ============================================
// APPOINTMENT TYPES
// ============================================

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show' 
  | 'rescheduled';

export type AppointmentOutcome = 
  | 'hot' 
  | 'warm' 
  | 'cold' 
  | 'not_interested' 
  | 'needs_followup' 
  | 'converted';

export type BookedVia = 
  | 'manual' 
  | 'voice_agent' 
  | 'web_widget' 
  | 'api' 
  | 'calendar_link' 
  | 'crm';

export interface Appointment {
  id: string;
  userId: string;
  
  // Type
  appointmentTypeId?: string;
  appointmentTypeName: string;
  
  // Status
  status: AppointmentStatus;
  
  // Timing
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  endedAt?: string;
  
  // Attendee
  attendeeName: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  attendeeNotes?: string;
  
  // Linkage
  campaignId?: string;
  leadId?: string;
  callId?: string;
  assistantId?: string;
  
  // Location
  locationType: LocationType;
  locationAddress?: string;
  locationNotes?: string;
  videoLink?: string;
  
  // Property (Real Estate)
  propertyAddress?: string;
  propertyMlsId?: string;
  propertyPrice?: number;
  
  // Notes
  internalNotes?: string;
  outcome?: string;
  outcomeStatus?: AppointmentOutcome;
  
  // External sync
  calendarIntegrationId?: string;
  externalEventId?: string;
  externalEventLink?: string;
  
  // CRM sync
  crmIntegrationId?: string;
  crmEventId?: string;
  
  // Booking info
  bookedVia: BookedVia;
  bookedByAssistantId?: string;
  
  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  
  // Rescheduling
  rescheduledFromId?: string;
  rescheduledToId?: string;
  rescheduleCount: number;
  
  // Confirmation
  confirmationSentAt?: string;
  confirmedAt?: string;
  confirmedVia?: string;
  
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  
  // Joined relations (optional)
  appointmentType?: AppointmentType;
}

export interface AppointmentFormData {
  appointmentTypeId?: string;
  appointmentTypeName?: string;
  scheduledAt: string;
  durationMinutes?: number;
  timezone?: string;
  attendeeName: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  attendeeNotes?: string;
  campaignId?: string;
  leadId?: string;
  callId?: string;
  assistantId?: string;
  locationType?: LocationType;
  locationAddress?: string;
  locationNotes?: string;
  videoLink?: string;
  propertyAddress?: string;
  propertyMlsId?: string;
  propertyPrice?: number;
  internalNotes?: string;
  bookedVia?: BookedVia;
  settings?: Record<string, unknown>;
}

export interface RescheduleData {
  newScheduledAt: string;
  newDurationMinutes?: number;
  reason?: string;
  notifyAttendee?: boolean;
}

export interface CancelData {
  reason?: string;
  notifyAttendee?: boolean;
  cancelledBy?: string;
}

// ============================================
// REMINDER TYPES
// ============================================

export type ReminderType = '24h' | '1h' | '15m' | 'custom';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface AppointmentReminder {
  id: string;
  appointmentId: string;
  userId: string;
  reminderType: ReminderType;
  scheduledFor: string;
  sendEmail: boolean;
  sendSms: boolean;
  sendPush: boolean;
  status: ReminderStatus;
  sentAt?: string;
  errorMessage?: string;
  emailSent: boolean;
  smsSent: boolean;
  pushSent: boolean;
  createdAt: string;
}

// ============================================
// AVAILABILITY TYPES
// ============================================

export interface AvailabilitySlot {
  id: string;
  userId: string;
  appointmentTypeId?: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlotFormData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  appointmentTypeId?: string;
  isActive?: boolean;
}

export type OverrideType = 'block' | 'open';

export interface AvailabilityOverride {
  id: string;
  userId: string;
  startDatetime: string;
  endDatetime: string;
  overrideType: OverrideType;
  reason?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: string;
}

export interface AvailabilityOverrideFormData {
  startDatetime: string;
  endDatetime: string;
  overrideType: OverrideType;
  reason?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

// ============================================
// AVAILABILITY CHECK TYPES
// ============================================

export interface TimeSlot {
  start: string;  // ISO datetime
  end: string;    // ISO datetime
}

export interface AvailableSlot {
  datetime: string;
  time: string;      // HH:MM format for display
  duration: number;
  appointmentTypeId?: string;
}

export interface AvailabilityCheckParams {
  appointmentTypeId?: string;
  startDate: string;
  endDate?: string;
  timezone?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface AvailabilityResponse {
  slots: AvailableSlot[];
  timezone: string;
  appointmentType?: AppointmentType;
}

// ============================================
// VOICE AGENT BOOKING TYPES
// ============================================

export interface VoiceAgentBookingParams {
  appointmentType: AppointmentCategory;
  preferredDate: string;        // ISO date string
  preferredTime: string;        // HH:MM format
  propertyAddress?: string;
  attendeeName?: string;
  attendeePhone?: string;
  notes?: string;
}

export interface VoiceAgentBookingResult {
  success: boolean;
  appointmentId?: string;
  scheduledAt?: string;
  message: string;
  alternativeSlots?: AvailableSlot[];
}

// ============================================
// CALENDAR PROVIDER SPECIFIC TYPES
// ============================================

// Cal.com
export interface CalComEvent {
  id: number;
  uid: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: Array<{
    email: string;
    name: string;
    timeZone: string;
  }>;
  location?: string;
  status: string;
}

export interface CalComEventType {
  id: number;
  slug: string;
  title: string;
  description?: string;
  length: number;
  hidden: boolean;
}

// Calendly
export interface CalendlyEvent {
  uri: string;
  name: string;
  status: 'active' | 'canceled';
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type: string;
    location?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
}

export interface CalendlyEventType {
  uri: string;
  name: string;
  slug: string;
  active: boolean;
  duration: number;
  description_plain?: string;
  color: string;
}

// Google Calendar
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status: string;
  htmlLink: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AppointmentTypeListResponse {
  appointmentTypes: AppointmentType[];
}

export interface CalendarIntegrationListResponse {
  integrations: CalendarIntegration[];
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  data?: {
    email?: string;
    name?: string;
    calendars?: Array<{ id: string; name: string }>;
  };
}

// ============================================
// PROVIDER INFO CONSTANT
// ============================================

export const CALENDAR_PROVIDERS_LIST: CalendarProviderInfo[] = [
  {
    id: 'cal_com',
    name: 'Cal.com',
    description: 'Open-source scheduling infrastructure. Self-hostable and highly customizable.',
    logo: '/integrations/cal-com.svg',
    authType: 'api_key',
    docsUrl: 'https://cal.com/docs/api-reference/v1',
    features: ['Two-way Sync', 'Custom Event Types', 'Team Scheduling', 'Webhooks'],
    status: 'available',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Popular scheduling platform with powerful automation features.',
    logo: '/integrations/calendly.svg',
    authType: 'oauth',
    docsUrl: 'https://developer.calendly.com/',
    features: ['Event Types', 'Team Scheduling', 'Integrations', 'Analytics'],
    status: 'available',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Direct integration with Google Calendar for availability and event sync.',
    logo: '/integrations/google-calendar.svg',
    authType: 'oauth',
    docsUrl: 'https://developers.google.com/calendar',
    features: ['Real-time Availability', 'Event Sync', 'Multiple Calendars'],
    status: 'available',
  },
  {
    id: 'follow_up_boss',
    name: 'Follow Up Boss Calendar',
    description: 'Native calendar integration with Follow Up Boss CRM.',
    logo: '/integrations/followupboss.svg',
    authType: 'api_key',
    docsUrl: 'https://docs.followupboss.com/',
    features: ['CRM Integration', 'Task Sync', 'Contact Linking'],
    status: 'coming_soon',
  },
];

// ============================================
// APPOINTMENT CATEGORY OPTIONS
// ============================================

export const APPOINTMENT_CATEGORIES: Array<{
  value: AppointmentCategory;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: 'showing',
    label: 'Property Showing',
    description: 'Schedule a property viewing',
    color: '#10B981', // emerald
  },
  {
    value: 'listing_appointment',
    label: 'Listing Appointment',
    description: 'Meet to discuss listing your property',
    color: '#6366F1', // indigo
  },
  {
    value: 'buyer_consultation',
    label: 'Buyer Consultation',
    description: 'Initial meeting for home buyers',
    color: '#F59E0B', // amber
  },
  {
    value: 'seller_consultation',
    label: 'Seller Consultation',
    description: 'Meet with potential sellers',
    color: '#EF4444', // red
  },
  {
    value: 'market_analysis',
    label: 'Market Analysis',
    description: 'Free comparative market analysis',
    color: '#EC4899', // pink
  },
  {
    value: 'property_tour',
    label: 'Property Tour',
    description: 'Guided tour of multiple properties',
    color: '#14B8A6', // teal
  },
  {
    value: 'open_house',
    label: 'Open House',
    description: 'Open house event attendance',
    color: '#F97316', // orange
  },
  {
    value: 'closing',
    label: 'Closing Meeting',
    description: 'Final closing meeting',
    color: '#22C55E', // green
  },
  {
    value: 'general',
    label: 'General Meeting',
    description: 'General appointment',
    color: '#8B5CF6', // violet
  },
];

// Day of week labels
export const DAY_OF_WEEK_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
// ============================================
// TYPE ALIASES (for component compatibility)
// ============================================

// Alias for location types used in components
export type AppointmentLocation = LocationType;

// Day of week type
export type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

// Create input types
export interface CreateAppointmentInput {
  appointmentTypeId?: string;
  scheduledAt: string;
  duration: number;
  attendeeName: string;
  attendeePhone?: string;
  attendeeEmail?: string;
  location?: AppointmentLocation;
  propertyAddress?: string;
  meetingUrl?: string;
  notes?: string;
  leadId?: string;
  sendConfirmation?: boolean;
  scheduleReminders?: boolean;
}

export interface CreateCalendarIntegrationInput {
  provider: CalendarProvider;
  credentials: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  settings?: {
    defaultCalendarId?: string;
    syncDirection?: 'one_way' | 'two_way';
    bufferBefore?: number;
    bufferAfter?: number;
  };
}

export interface CreateAvailabilitySlotInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  integrationId?: string;
}