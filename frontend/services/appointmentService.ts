/**
 * Appointment Booking Service
 * 
 * Frontend service for managing calendar integrations, appointment types,
 * appointments, and availability.
 */

import { authFetch } from '@/lib/api';
import type {
  CalendarIntegration,
  CalendarIntegrationFormData,
  CalendarProvider,
  AppointmentType,
  AppointmentTypeFormData,
  Appointment,
  AppointmentFormData,
  RescheduleData,
  CancelData,
  AvailabilitySlot,
  AvailabilitySlotFormData,
  AvailabilityOverride,
  AvailabilityOverrideFormData,
  AvailabilityCheckParams,
  AvailabilityResponse,
  ConnectionTestResult,
  VoiceAgentBookingParams,
  VoiceAgentBookingResult,
  AppointmentListResponse,
  CALENDAR_PROVIDERS_LIST,
} from '@/types/appointments';

// Re-export types and constants
export type {
  CalendarIntegration,
  CalendarIntegrationFormData,
  CalendarProvider,
  AppointmentType,
  AppointmentTypeFormData,
  Appointment,
  AppointmentFormData,
  RescheduleData,
  CancelData,
  AvailabilitySlot,
  AvailabilitySlotFormData,
  AvailabilityOverride,
  AvailabilityOverrideFormData,
  AvailabilityCheckParams,
  AvailabilityResponse,
  ConnectionTestResult,
  VoiceAgentBookingParams,
  VoiceAgentBookingResult,
};

export { CALENDAR_PROVIDERS_LIST };

// ============================================
// HELPER: Map snake_case to camelCase
// ============================================

function mapCalendarIntegration(data: Record<string, unknown>): CalendarIntegration {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    provider: data.provider as CalendarProvider,
    providerName: data.provider_name as string,
    apiKey: data.api_key as string | undefined,
    accessToken: data.access_token as string | undefined,
    refreshToken: data.refresh_token as string | undefined,
    tokenExpiresAt: data.token_expires_at as string | undefined,
    externalUserId: data.external_user_id as string | undefined,
    externalCalendarId: data.external_calendar_id as string | undefined,
    isEnabled: data.is_enabled as boolean,
    isConnected: data.is_connected as boolean,
    lastSyncAt: data.last_sync_at as string | undefined,
    lastError: data.last_error as string | undefined,
    defaultMeetingDuration: data.default_meeting_duration as number,
    bufferBeforeMinutes: data.buffer_before_minutes as number,
    bufferAfterMinutes: data.buffer_after_minutes as number,
    timezone: data.timezone as string,
    webhookUrl: data.webhook_url as string | undefined,
    webhookSecret: data.webhook_secret as string | undefined,
    settings: (data.settings as Record<string, unknown>) || {},
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapAppointmentType(data: Record<string, unknown>): AppointmentType {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    name: data.name as string,
    slug: data.slug as string,
    description: data.description as string | undefined,
    category: data.category as AppointmentType['category'],
    durationMinutes: data.duration_minutes as number,
    bufferBeforeMinutes: data.buffer_before_minutes as number,
    bufferAfterMinutes: data.buffer_after_minutes as number,
    isActive: data.is_active as boolean,
    requiresConfirmation: data.requires_confirmation as boolean,
    maxAdvanceDays: data.max_advance_days as number,
    minNoticeHours: data.min_notice_hours as number,
    defaultLocation: data.default_location as AppointmentType['defaultLocation'],
    locationAddress: data.location_address as string | undefined,
    videoLink: data.video_link as string | undefined,
    sendConfirmation: data.send_confirmation as boolean,
    sendReminder24h: data.send_reminder_24h as boolean,
    sendReminder1h: data.send_reminder_1h as boolean,
    color: data.color as string,
    calendarIntegrationId: data.calendar_integration_id as string | undefined,
    externalEventTypeId: data.external_event_type_id as string | undefined,
    settings: (data.settings as Record<string, unknown>) || {},
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapAppointment(data: Record<string, unknown>): Appointment {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    appointmentTypeId: data.appointment_type_id as string | undefined,
    appointmentTypeName: data.appointment_type_name as string,
    status: data.status as Appointment['status'],
    scheduledAt: data.scheduled_at as string,
    durationMinutes: data.duration_minutes as number,
    timezone: data.timezone as string,
    endedAt: data.ended_at as string | undefined,
    attendeeName: data.attendee_name as string,
    attendeeEmail: data.attendee_email as string | undefined,
    attendeePhone: data.attendee_phone as string | undefined,
    attendeeNotes: data.attendee_notes as string | undefined,
    campaignId: data.campaign_id as string | undefined,
    leadId: data.lead_id as string | undefined,
    callId: data.call_id as string | undefined,
    assistantId: data.assistant_id as string | undefined,
    locationType: data.location_type as Appointment['locationType'],
    locationAddress: data.location_address as string | undefined,
    locationNotes: data.location_notes as string | undefined,
    videoLink: data.video_link as string | undefined,
    propertyAddress: data.property_address as string | undefined,
    propertyMlsId: data.property_mls_id as string | undefined,
    propertyPrice: data.property_price as number | undefined,
    internalNotes: data.internal_notes as string | undefined,
    outcome: data.outcome as string | undefined,
    outcomeStatus: data.outcome_status as Appointment['outcomeStatus'],
    calendarIntegrationId: data.calendar_integration_id as string | undefined,
    externalEventId: data.external_event_id as string | undefined,
    externalEventLink: data.external_event_link as string | undefined,
    crmIntegrationId: data.crm_integration_id as string | undefined,
    crmEventId: data.crm_event_id as string | undefined,
    bookedVia: data.booked_via as Appointment['bookedVia'],
    bookedByAssistantId: data.booked_by_assistant_id as string | undefined,
    cancelledAt: data.cancelled_at as string | undefined,
    cancelledBy: data.cancelled_by as string | undefined,
    cancellationReason: data.cancellation_reason as string | undefined,
    rescheduledFromId: data.rescheduled_from_id as string | undefined,
    rescheduledToId: data.rescheduled_to_id as string | undefined,
    rescheduleCount: data.reschedule_count as number,
    confirmationSentAt: data.confirmation_sent_at as string | undefined,
    confirmedAt: data.confirmed_at as string | undefined,
    confirmedVia: data.confirmed_via as string | undefined,
    settings: (data.settings as Record<string, unknown>) || {},
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    appointmentType: data.appointment_types
      ? mapAppointmentType(data.appointment_types as Record<string, unknown>)
      : undefined,
  };
}

function mapAvailabilitySlot(data: Record<string, unknown>): AvailabilitySlot {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    appointmentTypeId: data.appointment_type_id as string | undefined,
    dayOfWeek: data.day_of_week as number,
    startTime: data.start_time as string,
    endTime: data.end_time as string,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapAvailabilityOverride(data: Record<string, unknown>): AvailabilityOverride {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    startDatetime: data.start_datetime as string,
    endDatetime: data.end_datetime as string,
    overrideType: data.override_type as AvailabilityOverride['overrideType'],
    reason: data.reason as string | undefined,
    isRecurring: data.is_recurring as boolean,
    recurrenceRule: data.recurrence_rule as string | undefined,
    createdAt: data.created_at as string,
  };
}

// ============================================
// CALENDAR INTEGRATION OPERATIONS
// ============================================

export async function getCalendarIntegrations(): Promise<CalendarIntegration[]> {
  const response = await authFetch('/api/appointments/integrations');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch calendar integrations');
  }

  return (data.integrations || []).map(mapCalendarIntegration);
}

export async function getCalendarIntegration(id: string): Promise<CalendarIntegration> {
  const response = await authFetch(`/api/appointments/integrations/${id}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch calendar integration');
  }

  return mapCalendarIntegration(data.integration);
}

export async function createCalendarIntegration(
  formData: CalendarIntegrationFormData
): Promise<CalendarIntegration> {
  const response = await authFetch('/api/appointments/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: formData.provider,
      api_key: formData.apiKey,
      access_token: formData.accessToken,
      refresh_token: formData.refreshToken,
      external_calendar_id: formData.externalCalendarId,
      default_meeting_duration: formData.defaultMeetingDuration,
      buffer_before_minutes: formData.bufferBeforeMinutes,
      buffer_after_minutes: formData.bufferAfterMinutes,
      timezone: formData.timezone,
      settings: formData.settings,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.details || 'Failed to create integration');
  }

  return mapCalendarIntegration(data.integration);
}

export async function updateCalendarIntegration(
  id: string,
  updates: Partial<CalendarIntegrationFormData>
): Promise<CalendarIntegration> {
  const response = await authFetch(`/api/appointments/integrations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: updates.apiKey,
      access_token: updates.accessToken,
      refresh_token: updates.refreshToken,
      external_calendar_id: updates.externalCalendarId,
      default_meeting_duration: updates.defaultMeetingDuration,
      buffer_before_minutes: updates.bufferBeforeMinutes,
      buffer_after_minutes: updates.bufferAfterMinutes,
      timezone: updates.timezone,
      settings: updates.settings,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update integration');
  }

  return mapCalendarIntegration(data.integration);
}

export async function deleteCalendarIntegration(id: string): Promise<void> {
  const response = await authFetch(`/api/appointments/integrations/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete integration');
  }
}

export async function testCalendarIntegration(id: string): Promise<ConnectionTestResult> {
  const response = await authFetch(`/api/appointments/integrations/${id}/test`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to test integration');
  }

  return data;
}

// ============================================
// APPOINTMENT TYPE OPERATIONS
// ============================================

export async function getAppointmentTypes(active?: boolean): Promise<AppointmentType[]> {
  const params = new URLSearchParams();
  if (active !== undefined) {
    params.append('active', String(active));
  }

  const response = await authFetch(`/api/appointments/types?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch appointment types');
  }

  return (data.appointmentTypes || []).map(mapAppointmentType);
}

export async function getAppointmentType(id: string): Promise<AppointmentType> {
  const response = await authFetch(`/api/appointments/types/${id}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch appointment type');
  }

  return mapAppointmentType(data.appointmentType);
}

export async function createAppointmentType(
  formData: AppointmentTypeFormData
): Promise<AppointmentType> {
  const response = await authFetch('/api/appointments/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      category: formData.category,
      duration_minutes: formData.durationMinutes,
      buffer_before_minutes: formData.bufferBeforeMinutes,
      buffer_after_minutes: formData.bufferAfterMinutes,
      is_active: formData.isActive,
      requires_confirmation: formData.requiresConfirmation,
      max_advance_days: formData.maxAdvanceDays,
      min_notice_hours: formData.minNoticeHours,
      default_location: formData.defaultLocation,
      location_address: formData.locationAddress,
      video_link: formData.videoLink,
      send_confirmation: formData.sendConfirmation,
      send_reminder_24h: formData.sendReminder24h,
      send_reminder_1h: formData.sendReminder1h,
      color: formData.color,
      calendar_integration_id: formData.calendarIntegrationId,
      settings: formData.settings,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create appointment type');
  }

  return mapAppointmentType(data.appointmentType);
}

export async function updateAppointmentType(
  id: string,
  updates: Partial<AppointmentTypeFormData>
): Promise<AppointmentType> {
  const response = await authFetch(`/api/appointments/types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: updates.name,
      slug: updates.slug,
      description: updates.description,
      category: updates.category,
      duration_minutes: updates.durationMinutes,
      buffer_before_minutes: updates.bufferBeforeMinutes,
      buffer_after_minutes: updates.bufferAfterMinutes,
      is_active: updates.isActive,
      requires_confirmation: updates.requiresConfirmation,
      max_advance_days: updates.maxAdvanceDays,
      min_notice_hours: updates.minNoticeHours,
      default_location: updates.defaultLocation,
      location_address: updates.locationAddress,
      video_link: updates.videoLink,
      send_confirmation: updates.sendConfirmation,
      send_reminder_24h: updates.sendReminder24h,
      send_reminder_1h: updates.sendReminder1h,
      color: updates.color,
      calendar_integration_id: updates.calendarIntegrationId,
      settings: updates.settings,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update appointment type');
  }

  return mapAppointmentType(data.appointmentType);
}

export async function deleteAppointmentType(id: string): Promise<void> {
  const response = await authFetch(`/api/appointments/types/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete appointment type');
  }
}

// ============================================
// APPOINTMENT OPERATIONS
// ============================================

export async function getAppointments(options?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  leadId?: string;
  campaignId?: string;
  page?: number;
  pageSize?: number;
}): Promise<AppointmentListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  if (options?.leadId) params.append('leadId', options.leadId);
  if (options?.campaignId) params.append('campaignId', options.campaignId);
  if (options?.page) params.append('page', String(options.page));
  if (options?.pageSize) params.append('pageSize', String(options.pageSize));

  const response = await authFetch(`/api/appointments?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch appointments');
  }

  return {
    appointments: (data.appointments || []).map(mapAppointment),
    total: data.total || 0,
    page: data.page || 1,
    pageSize: data.pageSize || 20,
  };
}

export async function getAppointment(id: string): Promise<Appointment> {
  const response = await authFetch(`/api/appointments/${id}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch appointment');
  }

  return mapAppointment(data.appointment);
}

export async function createAppointment(formData: AppointmentFormData): Promise<Appointment> {
  const response = await authFetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appointment_type_id: formData.appointmentTypeId,
      appointment_type_name: formData.appointmentTypeName,
      scheduled_at: formData.scheduledAt,
      duration_minutes: formData.durationMinutes,
      timezone: formData.timezone,
      attendee_name: formData.attendeeName,
      attendee_email: formData.attendeeEmail,
      attendee_phone: formData.attendeePhone,
      attendee_notes: formData.attendeeNotes,
      campaign_id: formData.campaignId,
      lead_id: formData.leadId,
      call_id: formData.callId,
      assistant_id: formData.assistantId,
      location_type: formData.locationType,
      location_address: formData.locationAddress,
      location_notes: formData.locationNotes,
      video_link: formData.videoLink,
      property_address: formData.propertyAddress,
      property_mls_id: formData.propertyMlsId,
      property_price: formData.propertyPrice,
      internal_notes: formData.internalNotes,
      booked_via: formData.bookedVia,
      settings: formData.settings,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create appointment');
  }

  return mapAppointment(data.appointment);
}

export async function updateAppointment(
  id: string,
  updates: Partial<AppointmentFormData>
): Promise<Appointment> {
  const response = await authFetch(`/api/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appointment_type_id: updates.appointmentTypeId,
      appointment_type_name: updates.appointmentTypeName,
      scheduled_at: updates.scheduledAt,
      duration_minutes: updates.durationMinutes,
      timezone: updates.timezone,
      attendee_name: updates.attendeeName,
      attendee_email: updates.attendeeEmail,
      attendee_phone: updates.attendeePhone,
      attendee_notes: updates.attendeeNotes,
      location_type: updates.locationType,
      location_address: updates.locationAddress,
      location_notes: updates.locationNotes,
      video_link: updates.videoLink,
      property_address: updates.propertyAddress,
      property_mls_id: updates.propertyMlsId,
      property_price: updates.propertyPrice,
      internal_notes: updates.internalNotes,
      settings: updates.settings,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update appointment');
  }

  return mapAppointment(data.appointment);
}

export async function rescheduleAppointment(
  id: string,
  rescheduleData: RescheduleData
): Promise<Appointment> {
  const response = await authFetch(`/api/appointments/${id}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      new_scheduled_at: rescheduleData.newScheduledAt,
      new_duration_minutes: rescheduleData.newDurationMinutes,
      reason: rescheduleData.reason,
      notify_attendee: rescheduleData.notifyAttendee,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to reschedule appointment');
  }

  return mapAppointment(data.appointment);
}

export async function cancelAppointment(id: string, cancelData?: CancelData): Promise<Appointment> {
  const response = await authFetch(`/api/appointments/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: cancelData?.reason,
      cancelled_by: cancelData?.cancelledBy,
      notify_attendee: cancelData?.notifyAttendee,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to cancel appointment');
  }

  return mapAppointment(data.appointment);
}

export async function confirmAppointment(
  id: string,
  confirmedVia = 'manual'
): Promise<Appointment> {
  const response = await authFetch(`/api/appointments/${id}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmed_via: confirmedVia }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to confirm appointment');
  }

  return mapAppointment(data.appointment);
}

export async function completeAppointment(
  id: string,
  outcome?: { outcome?: string; outcomeStatus?: string; notes?: string }
): Promise<Appointment> {
  const response = await authFetch(`/api/appointments/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      outcome: outcome?.outcome,
      outcome_status: outcome?.outcomeStatus,
      notes: outcome?.notes,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to complete appointment');
  }

  return mapAppointment(data.appointment);
}

export async function markAppointmentNoShow(id: string): Promise<Appointment> {
  const response = await authFetch(`/api/appointments/${id}/no-show`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to mark as no-show');
  }

  return mapAppointment(data.appointment);
}

// ============================================
// AVAILABILITY OPERATIONS
// ============================================

export async function getAvailability(params: AvailabilityCheckParams): Promise<AvailabilityResponse> {
  const urlParams = new URLSearchParams();
  if (params.appointmentTypeId) {
    urlParams.append('appointment_type_id', params.appointmentTypeId);
  }
  urlParams.append('start_date', params.startDate);
  urlParams.append('end_date', params.endDate);
  if (params.timezone) {
    urlParams.append('timezone', params.timezone);
  }

  const response = await authFetch(`/api/appointments/availability?${urlParams}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get availability');
  }

  return data;
}

export async function getAvailabilitySlots(): Promise<AvailabilitySlot[]> {
  const response = await authFetch('/api/appointments/availability/slots');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch availability slots');
  }

  return (data.slots || []).map(mapAvailabilitySlot);
}

export async function createAvailabilitySlot(
  formData: AvailabilitySlotFormData
): Promise<AvailabilitySlot> {
  const response = await authFetch('/api/appointments/availability/slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      day_of_week: formData.dayOfWeek,
      start_time: formData.startTime,
      end_time: formData.endTime,
      appointment_type_id: formData.appointmentTypeId,
      is_active: formData.isActive,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create availability slot');
  }

  return mapAvailabilitySlot(data.slot);
}

export async function updateAvailabilitySlot(
  id: string,
  updates: Partial<AvailabilitySlotFormData>
): Promise<AvailabilitySlot> {
  const response = await authFetch(`/api/appointments/availability/slots/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      day_of_week: updates.dayOfWeek,
      start_time: updates.startTime,
      end_time: updates.endTime,
      appointment_type_id: updates.appointmentTypeId,
      is_active: updates.isActive,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update availability slot');
  }

  return mapAvailabilitySlot(data.slot);
}

export async function deleteAvailabilitySlot(id: string): Promise<void> {
  const response = await authFetch(`/api/appointments/availability/slots/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete availability slot');
  }
}

export async function getAvailabilityOverrides(
  startDate?: string,
  endDate?: string
): Promise<AvailabilityOverride[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await authFetch(`/api/appointments/availability/overrides?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch availability overrides');
  }

  return (data.overrides || []).map(mapAvailabilityOverride);
}

export async function createAvailabilityOverride(
  formData: AvailabilityOverrideFormData
): Promise<AvailabilityOverride> {
  const response = await authFetch('/api/appointments/availability/overrides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_datetime: formData.startDatetime,
      end_datetime: formData.endDatetime,
      override_type: formData.overrideType,
      reason: formData.reason,
      is_recurring: formData.isRecurring,
      recurrence_rule: formData.recurrenceRule,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create availability override');
  }

  return mapAvailabilityOverride(data.override);
}

export async function deleteAvailabilityOverride(id: string): Promise<void> {
  const response = await authFetch(`/api/appointments/availability/overrides/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete override');
  }
}

// ============================================
// VOICE AGENT BOOKING
// ============================================

export async function bookViaVoiceAgent(
  params: VoiceAgentBookingParams
): Promise<VoiceAgentBookingResult> {
  const response = await authFetch('/api/appointments/book-via-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appointment_type: params.appointmentType,
      preferred_date: params.preferredDate,
      preferred_time: params.preferredTime,
      property_address: params.propertyAddress,
      attendee_name: params.attendeeName,
      attendee_phone: params.attendeePhone,
      notes: params.notes,
    }),
  });

  const data = await response.json();

  return {
    success: data.success,
    appointmentId: data.appointmentId,
    scheduledAt: data.scheduledAt,
    message: data.message,
    alternativeSlots: data.alternativeSlots,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format appointment date/time for display
 */
export function formatAppointmentDateTime(
  scheduledAt: string,
  timezone?: string
): string {
  const date = new Date(scheduledAt);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

/**
 * Get appointment status badge color
 */
export function getAppointmentStatusColor(status: Appointment['status']): string {
  const colors: Record<Appointment['status'], string> = {
    scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    no_show: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    rescheduled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

/**
 * Get appointment status label
 */
export function getAppointmentStatusLabel(status: Appointment['status']): string {
  const labels: Record<Appointment['status'], string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
    rescheduled: 'Rescheduled',
  };
  return labels[status] || status;
}

/**
 * Check if appointment can be cancelled
 */
export function canCancelAppointment(appointment: Appointment): boolean {
  return ['scheduled', 'confirmed'].includes(appointment.status);
}

/**
 * Check if appointment can be rescheduled
 */
export function canRescheduleAppointment(appointment: Appointment): boolean {
  return ['scheduled', 'confirmed', 'rescheduled'].includes(appointment.status);
}

/**
 * Get upcoming appointments (next 7 days)
 */
export async function getUpcomingAppointments(): Promise<Appointment[]> {
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const result = await getAppointments({
    startDate: now.toISOString(),
    endDate: weekLater.toISOString(),
    status: 'scheduled',
  });

  return result.appointments;
}

/**
 * Get today's appointments
 */
export async function getTodayAppointments(): Promise<Appointment[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

  const result = await getAppointments({
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  });

  return result.appointments;
}
// ============================================
// ADDITIONAL HELPER EXPORTS (for components)
// ============================================

/**
 * Format date for input element
 */
export function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Format time for input element
 */
export function formatTimeForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toTimeString().slice(0, 5); // HH:MM format
}

/**
 * Connect a calendar (alias for createCalendarIntegration)
 */
export async function connectCalendar(
  input: CalendarIntegrationFormData
): Promise<CalendarIntegration> {
  return createCalendarIntegration(input);
}

/**
 * Test calendar connection
 */
export async function testCalendarConnection(
  provider: CalendarProvider,
  credentials: { apiKey?: string; accessToken?: string }
): Promise<ConnectionTestResult> {
  const response = await authFetch('/api/appointments/integrations/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, ...credentials }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error || 'Connection test failed' };
  }

  return response.json();
}