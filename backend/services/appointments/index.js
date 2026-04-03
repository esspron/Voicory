/**
 * Appointment Booking Service
 * 
 * Provides appointment management functionality with integrations to:
 * - Cal.com (API key based)
 * - Calendly (OAuth)
 * - Google Calendar (OAuth)
 * - Follow Up Boss Calendar (API key)
 */

const axios = require('axios');

// ============================================
// PROVIDER CONFIGURATIONS
// ============================================

const PROVIDER_CONFIGS = {
    cal_com: {
        baseUrl: 'https://api.cal.com/v1',
        name: 'Cal.com',
    },
    calendly: {
        baseUrl: 'https://api.calendly.com',
        authUrl: 'https://auth.calendly.com',
        name: 'Calendly',
    },
    google_calendar: {
        baseUrl: 'https://www.googleapis.com/calendar/v3',
        authUrl: 'https://oauth2.googleapis.com',
        name: 'Google Calendar',
    },
    follow_up_boss: {
        baseUrl: 'https://api.followupboss.com/v1',
        name: 'Follow Up Boss',
    },
};

// ============================================
// CAL.COM SERVICE
// ============================================

const calComService = {
    /**
     * Test Cal.com connection
     */
    async testConnection(apiKey) {
        try {
            const response = await axios.get(`${PROVIDER_CONFIGS.cal_com.baseUrl}/me`, {
                params: { apiKey },
            });
            
            return {
                success: true,
                message: 'Successfully connected to Cal.com',
                data: {
                    email: response.data.user?.email,
                    name: response.data.user?.name,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to connect to Cal.com',
            };
        }
    },

    /**
     * Get available event types
     */
    async getEventTypes(apiKey) {
        try {
            const response = await axios.get(`${PROVIDER_CONFIGS.cal_com.baseUrl}/event-types`, {
                params: { apiKey },
            });
            return response.data.event_types || [];
        } catch (error) {
            console.error('Cal.com getEventTypes error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get availability for a date range
     */
    async getAvailability(apiKey, { eventTypeId, startDate, endDate, timezone }) {
        try {
            const response = await axios.get(`${PROVIDER_CONFIGS.cal_com.baseUrl}/availability`, {
                params: {
                    apiKey,
                    eventTypeId,
                    dateFrom: startDate,
                    dateTo: endDate,
                    timeZone: timezone || 'America/New_York',
                },
            });
            return response.data.slots || [];
        } catch (error) {
            console.error('Cal.com getAvailability error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Create a booking
     */
    async createBooking(apiKey, bookingData) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.cal_com.baseUrl}/bookings`,
                {
                    eventTypeId: bookingData.eventTypeId,
                    start: bookingData.startTime,
                    end: bookingData.endTime,
                    name: bookingData.attendeeName,
                    email: bookingData.attendeeEmail,
                    timeZone: bookingData.timezone || 'America/New_York',
                    language: 'en',
                    metadata: bookingData.metadata || {},
                    notes: bookingData.notes,
                    location: bookingData.location,
                },
                { params: { apiKey } }
            );
            return response.data;
        } catch (error) {
            console.error('Cal.com createBooking error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Cancel a booking
     */
    async cancelBooking(apiKey, bookingId, reason) {
        try {
            const response = await axios.delete(
                `${PROVIDER_CONFIGS.cal_com.baseUrl}/bookings/${bookingId}`,
                {
                    params: { apiKey },
                    data: { reason },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Cal.com cancelBooking error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Reschedule a booking
     */
    async rescheduleBooking(apiKey, bookingId, newData) {
        try {
            const response = await axios.patch(
                `${PROVIDER_CONFIGS.cal_com.baseUrl}/bookings/${bookingId}`,
                {
                    start: newData.startTime,
                    end: newData.endTime,
                    rescheduleReason: newData.reason,
                },
                { params: { apiKey } }
            );
            return response.data;
        } catch (error) {
            console.error('Cal.com rescheduleBooking error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get booking details
     */
    async getBooking(apiKey, bookingId) {
        try {
            const response = await axios.get(
                `${PROVIDER_CONFIGS.cal_com.baseUrl}/bookings/${bookingId}`,
                { params: { apiKey } }
            );
            return response.data;
        } catch (error) {
            console.error('Cal.com getBooking error:', error.response?.data || error.message);
            throw error;
        }
    },
};

// ============================================
// CALENDLY SERVICE
// ============================================

const calendlyService = {
    /**
     * Test Calendly connection
     */
    async testConnection(accessToken) {
        try {
            const response = await axios.get(`${PROVIDER_CONFIGS.calendly.baseUrl}/users/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            
            return {
                success: true,
                message: 'Successfully connected to Calendly',
                data: {
                    email: response.data.resource?.email,
                    name: response.data.resource?.name,
                    uri: response.data.resource?.uri,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to connect to Calendly',
            };
        }
    },

    /**
     * Get user's event types
     */
    async getEventTypes(accessToken, userUri) {
        try {
            const response = await axios.get(`${PROVIDER_CONFIGS.calendly.baseUrl}/event_types`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { user: userUri, active: true },
            });
            return response.data.collection || [];
        } catch (error) {
            console.error('Calendly getEventTypes error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get scheduled events
     */
    async getScheduledEvents(accessToken, userUri, { startTime, endTime, status }) {
        try {
            const response = await axios.get(`${PROVIDER_CONFIGS.calendly.baseUrl}/scheduled_events`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    user: userUri,
                    min_start_time: startTime,
                    max_start_time: endTime,
                    status: status || 'active',
                },
            });
            return response.data.collection || [];
        } catch (error) {
            console.error('Calendly getScheduledEvents error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get available times for an event type
     */
    async getAvailableTimes(accessToken, eventTypeUri, { startTime, endTime }) {
        try {
            const response = await axios.get(
                `${PROVIDER_CONFIGS.calendly.baseUrl}/event_type_available_times`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: {
                        event_type: eventTypeUri,
                        start_time: startTime,
                        end_time: endTime,
                    },
                }
            );
            return response.data.collection || [];
        } catch (error) {
            console.error('Calendly getAvailableTimes error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Cancel an event
     */
    async cancelEvent(accessToken, eventUuid, reason) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.calendly.baseUrl}/scheduled_events/${eventUuid}/cancellation`,
                { reason },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Calendly cancelEvent error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Create invitee no-show
     */
    async markNoShow(accessToken, inviteeUri) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.calendly.baseUrl}/invitee_no_shows`,
                { invitee: inviteeUri },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Calendly markNoShow error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Register webhook
     */
    async registerWebhook(accessToken, userUri, webhookUrl, events) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.calendly.baseUrl}/webhook_subscriptions`,
                {
                    url: webhookUrl,
                    events: events || ['invitee.created', 'invitee.canceled'],
                    user: userUri,
                    scope: 'user',
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Calendly registerWebhook error:', error.response?.data || error.message);
            throw error;
        }
    },
};

// ============================================
// GOOGLE CALENDAR SERVICE
// ============================================

const googleCalendarService = {
    /**
     * Test Google Calendar connection
     */
    async testConnection(accessToken) {
        try {
            const response = await axios.get(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/users/me/calendarList`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: { maxResults: 10 },
                }
            );
            
            const calendars = (response.data.items || []).map(cal => ({
                id: cal.id,
                name: cal.summary,
                primary: cal.primary || false,
            }));
            
            return {
                success: true,
                message: 'Successfully connected to Google Calendar',
                data: {
                    calendars,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.error?.message || 'Failed to connect to Google Calendar',
            };
        }
    },

    /**
     * Get calendar list
     */
    async getCalendarList(accessToken) {
        try {
            const response = await axios.get(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/users/me/calendarList`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return response.data.items || [];
        } catch (error) {
            console.error('Google getCalendarList error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get events from a calendar
     */
    async getEvents(accessToken, calendarId, { timeMin, timeMax, maxResults }) {
        try {
            const response = await axios.get(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: {
                        timeMin,
                        timeMax,
                        maxResults: maxResults || 100,
                        singleEvents: true,
                        orderBy: 'startTime',
                    },
                }
            );
            return response.data.items || [];
        } catch (error) {
            console.error('Google getEvents error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get free/busy information
     */
    async getFreeBusy(accessToken, calendarIds, { timeMin, timeMax, timezone }) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/freeBusy`,
                {
                    timeMin,
                    timeMax,
                    timeZone: timezone || 'America/New_York',
                    items: calendarIds.map(id => ({ id })),
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return response.data.calendars || {};
        } catch (error) {
            console.error('Google getFreeBusy error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Create an event
     */
    async createEvent(accessToken, calendarId, eventData) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
                {
                    summary: eventData.summary || eventData.title,
                    description: eventData.description,
                    start: {
                        dateTime: eventData.startTime,
                        timeZone: eventData.timezone || 'America/New_York',
                    },
                    end: {
                        dateTime: eventData.endTime,
                        timeZone: eventData.timezone || 'America/New_York',
                    },
                    location: eventData.location,
                    attendees: eventData.attendees?.map(a => ({
                        email: a.email,
                        displayName: a.name,
                    })),
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'email', minutes: 24 * 60 },
                            { method: 'popup', minutes: 60 },
                        ],
                    },
                    conferenceData: eventData.addVideoConference ? {
                        createRequest: {
                            requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            conferenceSolutionKey: { type: 'hangoutsMeet' },
                        },
                    } : undefined,
                },
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: {
                        sendUpdates: eventData.sendNotifications ? 'all' : 'none',
                        conferenceDataVersion: eventData.addVideoConference ? 1 : 0,
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Google createEvent error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Update an event
     */
    async updateEvent(accessToken, calendarId, eventId, eventData) {
        try {
            const response = await axios.patch(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
                {
                    summary: eventData.summary,
                    description: eventData.description,
                    start: eventData.startTime ? {
                        dateTime: eventData.startTime,
                        timeZone: eventData.timezone,
                    } : undefined,
                    end: eventData.endTime ? {
                        dateTime: eventData.endTime,
                        timeZone: eventData.timezone,
                    } : undefined,
                    location: eventData.location,
                },
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: { sendUpdates: eventData.sendNotifications ? 'all' : 'none' },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Google updateEvent error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Delete an event
     */
    async deleteEvent(accessToken, calendarId, eventId, sendNotifications = true) {
        try {
            await axios.delete(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: { sendUpdates: sendNotifications ? 'all' : 'none' },
                }
            );
            return { success: true };
        } catch (error) {
            console.error('Google deleteEvent error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Watch for changes (webhooks)
     */
    async watchCalendar(accessToken, calendarId, webhookUrl, channelId) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.google_calendar.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
                {
                    id: channelId,
                    type: 'web_hook',
                    address: webhookUrl,
                    expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Google watchCalendar error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Refresh OAuth token
     */
    async refreshToken(clientId, clientSecret, refreshToken) {
        try {
            const response = await axios.post(
                `${PROVIDER_CONFIGS.google_calendar.authUrl}/token`,
                new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            return {
                accessToken: response.data.access_token,
                expiresIn: response.data.expires_in,
            };
        } catch (error) {
            console.error('Google refreshToken error:', error.response?.data || error.message);
            throw error;
        }
    },
};

/**
 * Wraps a Google Calendar API call with automatic OAuth token refresh on 401.
 * If the access token is expired, refreshes it using the stored refresh_token,
 * persists the new token to the calendar_integrations table, and retries once.
 *
 * @param {object} integration - The calendar integration record from DB
 * @param {function} apiFn - Async function that takes (accessToken) and makes the API call
 * @param {object} [supabase] - Optional Supabase client to persist refreshed token
 * @returns {Promise<*>} Result of apiFn
 */
async function withGoogleTokenRefresh(integration, apiFn, supabase = null) {
    try {
        return await apiFn(integration.access_token);
    } catch (error) {
        // Only attempt refresh on 401 Unauthorized
        if (error.response?.status !== 401) throw error;

        if (!integration.refresh_token) {
            throw new Error('Google Calendar access token expired and no refresh_token available. Re-authenticate.');
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars missing — cannot refresh token.');
        }

        console.log(`[GoogleCalendar] Access token expired for integration ${integration.id}, refreshing...`);
        const refreshed = await googleCalendarService.refreshToken(clientId, clientSecret, integration.refresh_token);
        const newAccessToken = refreshed.accessToken;

        // Persist refreshed token to DB so future calls use it
        if (supabase && integration.id) {
            const { error: dbError } = await supabase
                .from('calendar_integrations')
                .update({
                    access_token: newAccessToken,
                    token_expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', integration.id);
            if (dbError) {
                console.warn('[GoogleCalendar] Failed to persist refreshed token:', dbError.message);
            }
        }

        // Retry with new token
        return await apiFn(newAccessToken);
    }
}

// ============================================
// MAIN APPOINTMENT SERVICE
// ============================================

/**
 * Test connection to a calendar provider
 */
async function testConnection(provider, credentials) {
    switch (provider) {
        case 'cal_com':
            return calComService.testConnection(credentials.apiKey);
        case 'calendly':
            return calendlyService.testConnection(credentials.accessToken);
        case 'google_calendar':
            return googleCalendarService.testConnection(credentials.accessToken);
        default:
            return { success: false, message: `Unsupported provider: ${provider}` };
    }
}

/**
 * Get available slots for booking
 */
async function getAvailableSlots(integration, options) {
    const { provider } = integration;
    const credentials = {
        apiKey: integration.api_key,
        accessToken: integration.access_token,
    };

    switch (provider) {
        case 'cal_com':
            return calComService.getAvailability(credentials.apiKey, options);
        
        case 'calendly':
            if (!options.eventTypeUri) {
                throw new Error('Event type URI required for Calendly availability');
            }
            return calendlyService.getAvailableTimes(credentials.accessToken, options.eventTypeUri, {
                startTime: options.startDate,
                endTime: options.endDate,
            });
        
        case 'google_calendar':
            const freeBusy = await googleCalendarService.getFreeBusy(
                credentials.accessToken,
                [integration.external_calendar_id || 'primary'],
                {
                    timeMin: options.startDate,
                    timeMax: options.endDate,
                    timezone: options.timezone,
                }
            );
            // Convert free/busy to available slots
            return convertFreeBusyToSlots(freeBusy, options);
        
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

/**
 * Create an appointment in the external calendar
 */
async function createExternalAppointment(integration, appointmentData) {
    const { provider } = integration;
    const credentials = {
        apiKey: integration.api_key,
        accessToken: integration.access_token,
    };

    const endTime = new Date(
        new Date(appointmentData.scheduledAt).getTime() + 
        appointmentData.durationMinutes * 60 * 1000
    ).toISOString();

    switch (provider) {
        case 'cal_com':
            if (!integration.settings?.eventTypeId) {
                throw new Error('Event type ID required for Cal.com booking');
            }
            return calComService.createBooking(credentials.apiKey, {
                eventTypeId: integration.settings.eventTypeId,
                startTime: appointmentData.scheduledAt,
                endTime,
                attendeeName: appointmentData.attendeeName,
                attendeeEmail: appointmentData.attendeeEmail,
                timezone: appointmentData.timezone,
                notes: appointmentData.attendeeNotes,
                location: appointmentData.locationAddress,
                metadata: {
                    appointmentId: appointmentData.id,
                    propertyAddress: appointmentData.propertyAddress,
                },
            });

        case 'google_calendar': {
            // Uses withGoogleTokenRefresh to handle expired access tokens automatically
            const calendarId = integration.external_calendar_id || 'primary';
            return withGoogleTokenRefresh(integration, (token) =>
                googleCalendarService.createEvent(token, calendarId, {
                    summary: `${appointmentData.appointmentTypeName} - ${appointmentData.attendeeName}`,
                    description: buildEventDescription(appointmentData),
                    startTime: appointmentData.scheduledAt,
                    endTime,
                    timezone: appointmentData.timezone,
                    location: appointmentData.locationAddress,
                    attendees: appointmentData.attendeeEmail ? [
                        { email: appointmentData.attendeeEmail, name: appointmentData.attendeeName },
                    ] : undefined,
                    sendNotifications: true,
                    addVideoConference: appointmentData.locationType === 'video',
                })
            );
        }

        default:
            console.warn(`External sync not implemented for provider: ${provider}`);
            return null;
    }
}

/**
 * Cancel an appointment in the external calendar
 */
async function cancelExternalAppointment(integration, externalEventId, reason) {
    const { provider } = integration;
    const credentials = {
        apiKey: integration.api_key,
        accessToken: integration.access_token,
    };

    switch (provider) {
        case 'cal_com':
            return calComService.cancelBooking(credentials.apiKey, externalEventId, reason);

        case 'calendly':
            return calendlyService.cancelEvent(credentials.accessToken, externalEventId, reason);

        case 'google_calendar': {
            // Uses withGoogleTokenRefresh to handle expired access tokens automatically
            const calendarId = integration.external_calendar_id || 'primary';
            return withGoogleTokenRefresh(integration, (token) =>
                googleCalendarService.deleteEvent(token, calendarId, externalEventId, true)
            );
        }

        default:
            console.warn(`External cancellation not implemented for provider: ${provider}`);
            return null;
    }
}

/**
 * Reschedule an appointment in the external calendar
 */
async function rescheduleExternalAppointment(integration, externalEventId, newData) {
    const { provider } = integration;
    const credentials = {
        apiKey: integration.api_key,
        accessToken: integration.access_token,
    };

    const endTime = newData.durationMinutes 
        ? new Date(
            new Date(newData.scheduledAt).getTime() + 
            newData.durationMinutes * 60 * 1000
          ).toISOString()
        : undefined;

    switch (provider) {
        case 'cal_com':
            return calComService.rescheduleBooking(credentials.apiKey, externalEventId, {
                startTime: newData.scheduledAt,
                endTime,
                reason: newData.reason,
            });

        case 'google_calendar': {
            // Uses withGoogleTokenRefresh to handle expired access tokens automatically
            const calendarId = integration.external_calendar_id || 'primary';
            return withGoogleTokenRefresh(integration, (token) =>
                googleCalendarService.updateEvent(token, calendarId, externalEventId, {
                    startTime: newData.scheduledAt,
                    endTime,
                    timezone: newData.timezone,
                    sendNotifications: newData.notifyAttendee !== false,
                })
            );
        }

        default:
            console.warn(`External reschedule not implemented for provider: ${provider}`);
            return null;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build event description from appointment data
 */
function buildEventDescription(appointment) {
    const lines = [];
    
    lines.push(`Appointment Type: ${appointment.appointmentTypeName}`);
    
    if (appointment.attendeePhone) {
        lines.push(`Phone: ${appointment.attendeePhone}`);
    }
    
    if (appointment.propertyAddress) {
        lines.push(`Property: ${appointment.propertyAddress}`);
    }
    
    if (appointment.attendeeNotes) {
        lines.push(`\nNotes from attendee:\n${appointment.attendeeNotes}`);
    }
    
    if (appointment.internalNotes) {
        lines.push(`\nInternal notes:\n${appointment.internalNotes}`);
    }
    
    return lines.join('\n');
}

/**
 * Convert Google Calendar free/busy data to available slots
 */
function convertFreeBusyToSlots(freeBusy, options) {
    const slots = [];
    const calendarId = Object.keys(freeBusy)[0];
    const busyPeriods = freeBusy[calendarId]?.busy || [];
    
    // This is a simplified implementation
    // In production, you'd want to intersect with user's availability settings
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);
    const slotDuration = options.durationMinutes || 30;
    
    let currentSlot = new Date(startDate);
    
    while (currentSlot < endDate) {
        const slotEnd = new Date(currentSlot.getTime() + slotDuration * 60 * 1000);
        
        // Check if slot overlaps with any busy period
        const isBusy = busyPeriods.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return currentSlot < busyEnd && slotEnd > busyStart;
        });
        
        if (!isBusy) {
            slots.push({
                datetime: currentSlot.toISOString(),
                duration: slotDuration,
            });
        }
        
        currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000); // 30 min increments
    }
    
    return slots;
}

/**
 * Calculate slot availability based on user's availability settings
 */
async function calculateAvailableSlots(supabase, userId, options) {
    const { appointmentTypeId, startDate, endDate, timezone = 'America/New_York' } = options;
    
    // Get user's availability slots
    const { data: availabilitySlots } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
    
    // Get availability overrides (blocks)
    const { data: overrides } = await supabase
        .from('availability_overrides')
        .select('*')
        .eq('user_id', userId)
        .gte('end_datetime', startDate)
        .lte('start_datetime', endDate);
    
    // Get existing appointments
    const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes')
        .eq('user_id', userId)
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate);
    
    // Get appointment type duration
    let duration = 30;
    if (appointmentTypeId) {
        const { data: appointmentType } = await supabase
            .from('appointment_types')
            .select('duration_minutes, buffer_before_minutes, buffer_after_minutes')
            .eq('id', appointmentTypeId)
            .single();
        
        if (appointmentType) {
            duration = appointmentType.duration_minutes;
        }
    }
    
    // Calculate available slots
    const slots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Iterate through each day
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
        const dayOfWeek = day.getDay();
        
        // Find availability slots for this day
        const daySlots = (availabilitySlots || []).filter(s => s.day_of_week === dayOfWeek);
        
        for (const slot of daySlots) {
            const [startHour, startMinute] = slot.start_time.split(':').map(Number);
            const [endHour, endMinute] = slot.end_time.split(':').map(Number);
            
            let slotStart = new Date(day);
            slotStart.setHours(startHour, startMinute, 0, 0);
            
            const slotEnd = new Date(day);
            slotEnd.setHours(endHour, endMinute, 0, 0);
            
            // Generate slots within this availability window
            while (slotStart.getTime() + duration * 60 * 1000 <= slotEnd.getTime()) {
                const slotEndTime = new Date(slotStart.getTime() + duration * 60 * 1000);
                
                // Check if blocked by override
                const isBlocked = (overrides || []).some(override => {
                    if (override.override_type !== 'block') return false;
                    const overrideStart = new Date(override.start_datetime);
                    const overrideEnd = new Date(override.end_datetime);
                    return slotStart < overrideEnd && slotEndTime > overrideStart;
                });
                
                // Check if conflicts with existing appointment
                const hasConflict = (existingAppointments || []).some(apt => {
                    const aptStart = new Date(apt.scheduled_at);
                    const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60 * 1000);
                    return slotStart < aptEnd && slotEndTime > aptStart;
                });
                
                if (!isBlocked && !hasConflict && slotStart > new Date()) {
                    slots.push({
                        datetime: slotStart.toISOString(),
                        duration,
                        appointmentTypeId,
                    });
                }
                
                slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 min increments
            }
        }
    }
    
    return { slots, timezone };
}

module.exports = {
    // Provider-specific services
    calComService,
    calendlyService,
    googleCalendarService,
    
    // Main service functions
    testConnection,
    getAvailableSlots,
    createExternalAppointment,
    cancelExternalAppointment,
    rescheduleExternalAppointment,
    
    // Helpers
    calculateAvailableSlots,
    buildEventDescription,
    
    // Constants
    PROVIDER_CONFIGS,
};
