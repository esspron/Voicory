/**
 * CRM Integration Routes
 * 
 * Handles all CRM-related API endpoints:
 * - GET /api/crm/integrations - List user's integrations
 * - POST /api/crm/integrations - Create new integration
 * - GET /api/crm/integrations/:id - Get specific integration
 * - PUT /api/crm/integrations/:id - Update integration
 * - DELETE /api/crm/integrations/:id - Delete integration
 * - POST /api/crm/integrations/:id/test - Test connection
 * - POST /api/crm/integrations/:id/sync - Manual sync
 * - GET /api/crm/sync-logs - Get sync logs
 * - GET /api/crm/oauth/liondesk/callback - LionDesk OAuth callback
 * - POST /api/crm/webhooks/followupboss - FUB inbound webhook
 * - POST /api/crm/webhooks/liondesk - LionDesk inbound webhook
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const crmService = require('../services/crm');
const { verifySupabaseAuth } = require('../lib/auth');
const { generateOAuthState, verifyOAuthState } = require('../lib/oauthState');
const { encrypt, decrypt } = require('../lib/crypto');

// All routes require authentication (except webhooks)
router.use((req, res, next) => {
    // Skip auth for webhook endpoints and OAuth callbacks
    if (req.path.startsWith('/webhooks/') || req.path.includes('/callback')) {
        return next();
    }
    return verifySupabaseAuth(req, res, next);
});

// ============================================
// Integration CRUD
// ============================================

/**
 * GET /api/crm/integrations
 * List all CRM integrations for the authenticated user
 */
router.get('/integrations', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('crm_integrations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Don't expose sensitive credentials to frontend
        const sanitizedData = (data || []).map(integration => ({
            ...integration,
            api_key: integration.api_key ? '••••••••' : null,
            access_token: integration.access_token ? '••••••••' : null,
            refresh_token: integration.refresh_token ? '••••••••' : null,
            client_secret: integration.client_secret ? '••••••••' : null,
            webhook_secret: integration.webhook_secret ? '••••••••' : null,
        }));
        
        res.json({ integrations: sanitizedData });
    } catch (error) {
        console.error('Error fetching CRM integrations:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * POST /api/crm/integrations
 * Create a new CRM integration
 */
router.post('/integrations', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            provider, 
            api_key, 
            access_token,
            refresh_token,
            client_id,
            client_secret,
            token_expires_at,
            sync_calls = true,
            sync_contacts = true,
            sync_notes = true,
            auto_create_contacts = true,
            settings = {},
        } = req.body;
        
        // Validate provider
        const validProviders = ['followupboss', 'liondesk', 'kvcore', 'chime', 'gohighlevel'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: 'Invalid CRM provider' });
        }
        
        // Provider names map
        const providerNames = {
            followupboss: 'Follow Up Boss',
            liondesk: 'LionDesk',
            kvcore: 'kvCORE',
            chime: 'Chime',
            gohighlevel: 'GoHighLevel',
        };
        
        // Check if integration already exists
        const { data: existing } = await supabase
            .from('crm_integrations')
            .select('id')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'Integration for this provider already exists' });
        }
        
        // Test the connection before saving
        let testResult;
        try {
            const credentials = { apiKey: api_key, accessToken: access_token };
            testResult = await crmService.testConnection(provider, credentials);
        } catch (error) {
            return res.status(400).json({ 
                error: 'Failed to connect to CRM', 
                details: error.message 
            });
        }
        
        if (!testResult.success) {
            return res.status(400).json({ 
                error: 'Failed to connect to CRM', 
                details: testResult.message 
            });
        }
        
        // Create the integration
        const { data, error } = await supabase
            .from('crm_integrations')
            .insert({
                user_id: userId,
                provider,
                provider_name: providerNames[provider],
                api_key,
                access_token,
                refresh_token,
                client_id,
                client_secret,
                token_expires_at,
                is_enabled: true,
                is_connected: true,
                sync_calls,
                sync_contacts,
                sync_notes,
                auto_create_contacts,
                settings,
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Sanitize response
        const sanitized = {
            ...data,
            api_key: data.api_key ? '••••••••' : null,
            access_token: data.access_token ? '••••••••' : null,
            refresh_token: data.refresh_token ? '••••••••' : null,
            client_secret: data.client_secret ? '••••••••' : null,
        };
        
        res.status(201).json({ 
            integration: sanitized,
            connectionTest: testResult,
        });
    } catch (error) {
        console.error('Error creating CRM integration:', error);
        res.status(500).json({ error: 'Failed to create integration' });
    }
});

/**
 * GET /api/crm/integrations/:id
 * Get a specific integration
 */
router.get('/integrations/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('crm_integrations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (error || !data) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        // Sanitize
        const sanitized = {
            ...data,
            api_key: data.api_key ? '••••••••' : null,
            access_token: data.access_token ? '••••••••' : null,
            refresh_token: data.refresh_token ? '••••••••' : null,
            client_secret: data.client_secret ? '••••••••' : null,
        };
        
        res.json({ integration: sanitized });
    } catch (error) {
        console.error('Error fetching integration:', error);
        res.status(500).json({ error: 'Failed to fetch integration' });
    }
});

/**
 * PUT /api/crm/integrations/:id
 * Update an integration
 */
router.put('/integrations/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { 
            api_key, 
            access_token,
            refresh_token,
            client_id,
            client_secret,
            token_expires_at,
            is_enabled,
            sync_calls,
            sync_contacts,
            sync_notes,
            auto_create_contacts,
            settings,
        } = req.body;
        
        // Verify ownership
        const { data: existing } = await supabase
            .from('crm_integrations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (!existing) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        // Build update object (only include provided fields)
        const updateData = {};
        if (api_key !== undefined) updateData.api_key = api_key;
        if (access_token !== undefined) updateData.access_token = access_token;
        if (refresh_token !== undefined) updateData.refresh_token = refresh_token;
        if (client_id !== undefined) updateData.client_id = client_id;
        if (client_secret !== undefined) updateData.client_secret = client_secret;
        if (token_expires_at !== undefined) updateData.token_expires_at = token_expires_at;
        if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
        if (sync_calls !== undefined) updateData.sync_calls = sync_calls;
        if (sync_contacts !== undefined) updateData.sync_contacts = sync_contacts;
        if (sync_notes !== undefined) updateData.sync_notes = sync_notes;
        if (auto_create_contacts !== undefined) updateData.auto_create_contacts = auto_create_contacts;
        if (settings !== undefined) updateData.settings = settings;
        
        // If credentials changed, test connection
        if (api_key || access_token) {
            try {
                const credentials = { 
                    apiKey: api_key || existing.api_key, 
                    accessToken: access_token || existing.access_token 
                };
                const testResult = await crmService.testConnection(existing.provider, credentials);
                
                if (!testResult.success) {
                    return res.status(400).json({ 
                        error: 'Failed to connect with new credentials', 
                        details: testResult.message 
                    });
                }
                
                updateData.is_connected = true;
                updateData.last_error = null;
            } catch (error) {
                return res.status(400).json({ 
                    error: 'Failed to connect with new credentials', 
                    details: error.message 
                });
            }
        }
        
        const { data, error } = await supabase
            .from('crm_integrations')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        // Sanitize
        const sanitized = {
            ...data,
            api_key: data.api_key ? '••••••••' : null,
            access_token: data.access_token ? '••••••••' : null,
            refresh_token: data.refresh_token ? '••••••••' : null,
            client_secret: data.client_secret ? '••••••••' : null,
        };
        
        res.json({ integration: sanitized });
    } catch (error) {
        console.error('Error updating integration:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

/**
 * DELETE /api/crm/integrations/:id
 * Delete an integration
 */
router.delete('/integrations/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { error } = await supabase
            .from('crm_integrations')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({ success: true, message: 'Integration deleted' });
    } catch (error) {
        console.error('Error deleting integration:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

// ============================================
// Connection Testing
// ============================================

/**
 * POST /api/crm/integrations/:id/test
 * Test connection to a CRM
 */
router.post('/integrations/:id/test', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { data: integration, error } = await supabase
            .from('crm_integrations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (error || !integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        const credentials = { 
            apiKey: integration.api_key, 
            accessToken: integration.access_token 
        };
        
        const testResult = await crmService.testConnection(integration.provider, credentials);
        
        // Update connection status
        await supabase
            .from('crm_integrations')
            .update({
                is_connected: testResult.success,
                last_error: testResult.success ? null : testResult.message,
            })
            .eq('id', id);
        
        res.json(testResult);
    } catch (error) {
        console.error('Error testing CRM connection:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to test connection',
            message: error.message,
        });
    }
});

/**
 * POST /api/crm/test-credentials
 * Test credentials without saving (for new integration setup)
 */
router.post('/test-credentials', async (req, res) => {
    try {
        const { provider, api_key, access_token } = req.body;
        
        if (!provider) {
            return res.status(400).json({ error: 'Provider is required' });
        }
        
        const credentials = { apiKey: api_key, accessToken: access_token };
        const testResult = await crmService.testConnection(provider, credentials);
        
        res.json(testResult);
    } catch (error) {
        console.error('Error testing credentials:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to test credentials',
            message: error.message,
        });
    }
});

// ============================================
// Sync Operations
// ============================================

/**
 * POST /api/crm/integrations/:id/sync
 * Manually trigger a sync for an integration
 */
router.post('/integrations/:id/sync', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { sync_type } = req.body; // 'calls', 'contacts', 'all'
        
        const { data: integration, error } = await supabase
            .from('crm_integrations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (error || !integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        if (!integration.is_connected) {
            return res.status(400).json({ error: 'Integration is not connected' });
        }
        
        // Update last sync timestamp
        await supabase
            .from('crm_integrations')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', id);
        
        res.json({ 
            success: true, 
            message: 'Sync initiated',
            sync_type: sync_type || 'all',
        });
    } catch (error) {
        console.error('Error triggering sync:', error);
        res.status(500).json({ error: 'Failed to trigger sync' });
    }
});

/**
 * GET /api/crm/sync-logs
 * Get sync logs for the user
 */
router.get('/sync-logs', async (req, res) => {
    try {
        const userId = req.user.id;
        const { integration_id, limit = 50, offset = 0 } = req.query;
        
        let query = supabase
            .from('crm_sync_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (integration_id) {
            query = query.eq('integration_id', integration_id);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({ logs: data || [] });
    } catch (error) {
        console.error('Error fetching sync logs:', error);
        res.status(500).json({ error: 'Failed to fetch sync logs' });
    }
});

// ============================================
// OAuth Callbacks
// ============================================

/**
 * GET /api/crm/oauth/liondesk/authorize
 * Get LionDesk OAuth authorization URL
 * Requires authentication to ensure userId is valid
 */
router.get('/oauth/liondesk/authorize', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const clientId = process.env.LIONDESK_CLIENT_ID;
        const redirectUri = `${process.env.BACKEND_URL || 'https://api.voicory.com'}/api/crm/oauth/liondesk/callback`;
        
        if (!clientId) {
            return res.status(500).json({ error: 'LionDesk OAuth not configured' });
        }
        
        // Generate secure signed state with nonce and expiry
        const state = generateOAuthState(userId, 'liondesk');
        
        const authUrl = crmService.liondesk.getAuthorizationUrl(clientId, redirectUri, state);
        
        res.json({ authUrl });
    } catch (error) {
        console.error('Error generating OAuth URL:', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

/**
 * GET /api/crm/oauth/liondesk/callback
 * LionDesk OAuth callback handler
 * This endpoint doesn't require auth - it validates via the signed state token
 */
router.get('/oauth/liondesk/callback', async (req, res) => {
    try {
        const { code, state, error: oauthError } = req.query;
        
        if (oauthError) {
            console.warn('LionDesk OAuth error:', oauthError);
            return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=${encodeURIComponent(oauthError)}`);
        }
        
        if (!code || !state) {
            return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=missing_params`);
        }
        
        // Verify the signed state token (prevents CSRF and ensures valid session)
        const stateVerification = verifyOAuthState(state);
        
        if (!stateVerification.valid) {
            console.warn('LionDesk OAuth state verification failed:', stateVerification.error);
            return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=${encodeURIComponent(stateVerification.error || 'invalid_state')}`);
        }
        
        const { userId } = stateVerification;
        
        // Exchange code for tokens
        const clientId = process.env.LIONDESK_CLIENT_ID;
        const clientSecret = process.env.LIONDESK_CLIENT_SECRET;
        const redirectUri = `${process.env.BACKEND_URL || 'https://api.voicory.com'}/api/crm/oauth/liondesk/callback`;
        
        const tokens = await crmService.liondesk.exchangeCodeForToken(clientId, clientSecret, code, redirectUri);
        
        // Test connection with new token
        const testResult = await crmService.liondesk.testConnection(tokens.access_token);
        
        if (!testResult.success) {
            return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=connection_failed`);
        }
        
        // Encrypt tokens before storing
        const encryptedAccessToken = encrypt(tokens.access_token);
        const encryptedRefreshToken = encrypt(tokens.refresh_token);
        const encryptedClientSecret = encrypt(clientSecret);
        
        // Check if integration already exists
        const { data: existing } = await supabase
            .from('crm_integrations')
            .select('id')
            .eq('user_id', userId)
            .eq('provider', 'liondesk')
            .single();
        
        if (existing) {
            // Update existing integration
            await supabase
                .from('crm_integrations')
                .update({
                    access_token: encryptedAccessToken,
                    refresh_token: encryptedRefreshToken,
                    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    is_connected: true,
                    last_error: null,
                })
                .eq('id', existing.id);
        } else {
            // Create new integration
            await supabase
                .from('crm_integrations')
                .insert({
                    user_id: userId,
                    provider: 'liondesk',
                    provider_name: 'LionDesk',
                    access_token: encryptedAccessToken,
                    refresh_token: encryptedRefreshToken,
                    client_id: clientId,
                    client_secret: encryptedClientSecret,
                    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    is_enabled: true,
                    is_connected: true,
                    // Only sync_calls is implemented, others are false by default
                    sync_calls: true,
                    sync_contacts: false,
                    sync_notes: false,
                });
        }
        
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=liondesk_connected`);
    } catch (error) {
        console.error('LionDesk OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=${encodeURIComponent(error.message)}`);
    }
});

// ============================================
// Inbound Webhook Endpoints
// ============================================

/**
 * POST /api/crm/webhooks/followupboss
 * Receive webhook events from Follow Up Boss
 * 
 * FUB sends events like:
 * - person.created, person.updated
 * - note.created
 * - call.created
 * - task.created, task.completed
 * - appointment.created
 * 
 * Documentation: https://www.followupboss.com/api/webhooks
 */
router.post('/webhooks/followupboss', express.json(), async (req, res) => {
    try {
        const event = req.body;
        const signature = req.headers['x-fub-signature'];
        
        // Log the incoming webhook
        console.log('FUB webhook received:', {
            event_type: event.eventType,
            event_id: event.id,
            timestamp: event.createdAt,
        });
        
        // Find integration by matching webhook event
        // FUB includes personId in events - we need to find the right integration
        // For now, we'll log all events for debugging and future implementation
        
        // Store event for processing
        const { error: logError } = await supabase
            .from('crm_webhook_events')
            .insert({
                provider: 'followupboss',
                event_type: event.eventType || 'unknown',
                event_id: event.id,
                payload: event,
                received_at: new Date().toISOString(),
                processed: false,
            });
        
        if (logError) {
            // Table might not exist yet - just log
            console.log('Note: crm_webhook_events table may not exist yet:', logError.message);
        }
        
        // Process events based on type
        let processError = null;
        try {
            const eventType = event.eventType || '';
            const person = event.person || event.data?.person || {};
            const note = event.note || event.data?.note || {};
            const call = event.call || event.data?.call || {};

            if (eventType === 'person.created' || eventType === 'person.updated') {
                // Upsert contact into customers table
                const phone = person.phones?.[0]?.value || person.phone || null;
                const email = person.emails?.[0]?.value || person.email || null;
                const name = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || null;
                if (phone || email) {
                    const { error: upsertError } = await supabase
                        .from('customers')
                        .upsert({
                            phone,
                            email,
                            name,
                            source: 'followupboss',
                            updated_at: new Date().toISOString(),
                        }, { onConflict: phone ? 'phone' : 'email', ignoreDuplicates: false });
                    if (upsertError) {
                        console.error('FUB person upsert error:', upsertError.message);
                        processError = upsertError.message;
                    }
                }
            } else if (eventType === 'note.created') {
                // Try to insert into customer_notes; fall back to console log
                const noteText = note.body || note.text || JSON.stringify(note);
                const { error: noteError } = await supabase
                    .from('customer_notes')
                    .insert({
                        source: 'followupboss',
                        note: noteText,
                        external_id: note.id ? String(note.id) : null,
                        created_at: new Date().toISOString(),
                    });
                if (noteError) {
                    // Table may not exist — log and continue
                    console.log('FUB note.created (customer_notes unavailable):', noteText, noteError.message);
                }
            } else if (eventType === 'call.created') {
                const callSid = call.sid || call.callSid || null;
                // Check if this call_sid was a recent outbound from us
                let isOurOutbound = false;
                if (callSid) {
                    const { data: recentCall } = await supabase
                        .from('crm_sync_logs')
                        .select('id')
                        .eq('call_sid', callSid)
                        .limit(1)
                        .maybeSingle();
                    if (recentCall) isOurOutbound = true;
                }
                if (!isOurOutbound) {
                    await supabase.from('crm_sync_logs').insert({
                        provider: 'followupboss',
                        event_type: 'call.created',
                        call_sid: callSid,
                        payload: call,
                        created_at: new Date().toISOString(),
                    });
                } else {
                    console.log('FUB call.created: skipping outbound call already logged, sid:', callSid);
                }
            }

            // Mark event as processed
            if (logError === null || logError === undefined) {
                // Only mark if insert succeeded
            }
            // Regardless, attempt to mark processed using event_id
            if (event.id) {
                await supabase
                    .from('crm_webhook_events')
                    .update({ processed: true, processed_at: new Date().toISOString(), error: processError })
                    .eq('event_id', String(event.id))
                    .eq('provider', 'followupboss');
            }
        } catch (procErr) {
            console.error('FUB webhook processing error:', procErr.message);
        }

        // Always return 200 quickly to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('FUB webhook error:', error);
        // Still return 200 to prevent retries for now
        res.status(200).json({ received: true, error: 'processing_error' });
    }
});

/**
 * POST /api/crm/webhooks/liondesk
 * Receive webhook events from LionDesk
 * 
 * LionDesk sends events like:
 * - contact.created, contact.updated
 * - task.created, task.completed
 * - campaign events
 * 
 * Note: LionDesk webhooks require setup in their dashboard
 */
router.post('/webhooks/liondesk', express.json(), async (req, res) => {
    try {
        const event = req.body;
        const signature = req.headers['x-liondesk-signature'];
        
        // Log the incoming webhook
        console.log('LionDesk webhook received:', {
            event_type: event.event || event.type,
            payload_keys: Object.keys(event),
        });
        
        // Store event for processing
        const { error: logError } = await supabase
            .from('crm_webhook_events')
            .insert({
                provider: 'liondesk',
                event_type: event.event || event.type || 'unknown',
                event_id: event.id || `ld_${Date.now()}`,
                payload: event,
                received_at: new Date().toISOString(),
                processed: false,
            });
        
        if (logError) {
            console.log('Note: crm_webhook_events table may not exist yet:', logError.message);
        }
        
        // Process events based on type
        let ldProcessError = null;
        try {
            const eventType = event.event || event.type || '';
            const contact = event.contact || event.data?.contact || {};
            const task = event.task || event.data?.task || {};

            if (eventType === 'contact.created' || eventType === 'contact.updated') {
                const phone = contact.phone || contact.phone_number || contact.phones?.[0] || null;
                const email = contact.email || contact.email_address || null;
                const name = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || null;
                if (phone || email) {
                    const { error: upsertError } = await supabase
                        .from('customers')
                        .upsert({
                            phone,
                            email,
                            name,
                            source: 'liondesk',
                            updated_at: new Date().toISOString(),
                        }, { onConflict: phone ? 'phone' : 'email', ignoreDuplicates: false });
                    if (upsertError) {
                        console.error('LionDesk contact upsert error:', upsertError.message);
                        ldProcessError = upsertError.message;
                    }
                }
            } else if (eventType === 'task.completed') {
                await supabase.from('crm_sync_logs').insert({
                    provider: 'liondesk',
                    event_type: 'task.completed',
                    payload: task,
                    created_at: new Date().toISOString(),
                });
            }

            // Mark event as processed
            const eventId = event.id || `ld_${Date.now()}`;
            await supabase
                .from('crm_webhook_events')
                .update({ processed: true, processed_at: new Date().toISOString(), error: ldProcessError })
                .eq('event_id', String(eventId))
                .eq('provider', 'liondesk');
        } catch (procErr) {
            console.error('LionDesk webhook processing error:', procErr.message);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('LionDesk webhook error:', error);
        res.status(200).json({ received: true, error: 'processing_error' });
    }
});

// ============================================
// Background Webhook Processor (internal, no auth)
// ============================================

/**
 * POST /api/crm/webhooks/process-pending
 * Internal endpoint to re-process up to 50 unprocessed webhook events.
 * Call via cron or internal scheduler — no auth token required.
 */
router.post('/webhooks/process-pending', express.json(), async (req, res) => {
    try {
        const { data: events, error: fetchError } = await supabase
            .from('crm_webhook_events')
            .select('*')
            .eq('processed', false)
            .order('received_at', { ascending: true })
            .limit(50);

        if (fetchError) {
            return res.status(500).json({ error: fetchError.message });
        }

        let processed = 0;
        let failed = 0;

        for (const ev of (events || [])) {
            try {
                const payload = ev.payload || {};
                const provider = ev.provider;
                const eventType = ev.event_type;

                if (provider === 'followupboss') {
                    const person = payload.person || payload.data?.person || {};
                    const note = payload.note || payload.data?.note || {};
                    const call = payload.call || payload.data?.call || {};

                    if (eventType === 'person.created' || eventType === 'person.updated') {
                        const phone = person.phones?.[0]?.value || person.phone || null;
                        const email = person.emails?.[0]?.value || person.email || null;
                        const name = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || null;
                        if (phone || email) {
                            await supabase.from('customers').upsert(
                                { phone, email, name, source: 'followupboss', updated_at: new Date().toISOString() },
                                { onConflict: phone ? 'phone' : 'email', ignoreDuplicates: false }
                            );
                        }
                    } else if (eventType === 'note.created') {
                        const noteText = note.body || note.text || JSON.stringify(note);
                        const { error: noteErr } = await supabase.from('customer_notes').insert({
                            source: 'followupboss', note: noteText,
                            external_id: note.id ? String(note.id) : null,
                            created_at: new Date().toISOString(),
                        });
                        if (noteErr) console.log('process-pending note error:', noteErr.message);
                    } else if (eventType === 'call.created') {
                        const callSid = call.sid || call.callSid || null;
                        if (callSid) {
                            const { data: existing } = await supabase.from('crm_sync_logs')
                                .select('id').eq('call_sid', callSid).limit(1).maybeSingle();
                            if (!existing) {
                                await supabase.from('crm_sync_logs').insert({
                                    provider: 'followupboss', event_type: 'call.created',
                                    call_sid: callSid, payload: call, created_at: new Date().toISOString(),
                                });
                            }
                        }
                    }
                } else if (provider === 'liondesk') {
                    const contact = payload.contact || payload.data?.contact || {};
                    const task = payload.task || payload.data?.task || {};

                    if (eventType === 'contact.created' || eventType === 'contact.updated') {
                        const phone = contact.phone || contact.phone_number || null;
                        const email = contact.email || contact.email_address || null;
                        const name = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || null;
                        if (phone || email) {
                            await supabase.from('customers').upsert(
                                { phone, email, name, source: 'liondesk', updated_at: new Date().toISOString() },
                                { onConflict: phone ? 'phone' : 'email', ignoreDuplicates: false }
                            );
                        }
                    } else if (eventType === 'task.completed') {
                        await supabase.from('crm_sync_logs').insert({
                            provider: 'liondesk', event_type: 'task.completed',
                            payload: task, created_at: new Date().toISOString(),
                        });
                    }
                }

                // Mark processed
                await supabase.from('crm_webhook_events')
                    .update({ processed: true, processed_at: new Date().toISOString() })
                    .eq('id', ev.id);
                processed++;
            } catch (itemErr) {
                console.error(`process-pending error for event ${ev.id}:`, itemErr.message);
                await supabase.from('crm_webhook_events')
                    .update({ error: itemErr.message })
                    .eq('id', ev.id);
                failed++;
            }
        }

        res.json({ success: true, processed, failed, total: (events || []).length });
    } catch (error) {
        console.error('process-pending fatal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Push Call Endpoint (for internal use)
// ============================================

/**
 * POST /api/crm/push-call
 * Push a call log to all enabled CRM integrations
 * This is called internally after a call ends
 */
router.post('/push-call', async (req, res) => {
    try {
        const userId = req.user.id;
        const { callLog } = req.body;
        
        if (!callLog) {
            return res.status(400).json({ error: 'callLog is required' });
        }
        
        const results = await crmService.pushCallToAllCRMs(userId, callLog);
        
        res.json({ 
            success: true,
            results,
            syncedCount: results.filter(r => r.success).length,
            failedCount: results.filter(r => !r.success).length,
        });
    } catch (error) {
        console.error('Error pushing call to CRMs:', error);
        res.status(500).json({ error: 'Failed to push call to CRMs' });
    }
});

module.exports = router;
