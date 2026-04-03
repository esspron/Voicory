/**
 * CRM Service Index
 * 
 * Central module for CRM integrations. Handles routing to the appropriate
 * CRM provider service and common functionality.
 */

const followupboss = require('./followupboss');
const liondesk = require('./liondesk');
const { supabase } = require('../../config');
const { encrypt, decrypt } = require('../../lib/crypto');

// Provider Services Map
const PROVIDERS = {
    followupboss,
    liondesk,
};

/**
 * Decrypt sensitive fields in an integration record
 */
function decryptIntegrationCredentials(integration) {
    if (!integration) return integration;
    
    const decrypted = { ...integration };
    
    if (integration.api_key) {
        decrypted.api_key = decrypt(integration.api_key) || integration.api_key;
    }
    if (integration.access_token) {
        decrypted.access_token = decrypt(integration.access_token) || integration.access_token;
    }
    if (integration.refresh_token) {
        decrypted.refresh_token = decrypt(integration.refresh_token) || integration.refresh_token;
    }
    if (integration.client_secret) {
        decrypted.client_secret = decrypt(integration.client_secret) || integration.client_secret;
    }
    
    return decrypted;
}

/**
 * Encrypt sensitive fields before storing
 */
function encryptIntegrationCredentials(data) {
    const encrypted = { ...data };
    
    if (data.api_key) {
        encrypted.api_key = encrypt(data.api_key);
    }
    if (data.access_token) {
        encrypted.access_token = encrypt(data.access_token);
    }
    if (data.refresh_token) {
        encrypted.refresh_token = encrypt(data.refresh_token);
    }
    if (data.client_secret) {
        encrypted.client_secret = encrypt(data.client_secret);
    }
    
    return encrypted;
}

/**
 * Get the service for a specific provider
 */
function getProviderService(provider) {
    const service = PROVIDERS[provider];
    if (!service) {
        throw new Error(`Unsupported CRM provider: ${provider}`);
    }
    return service;
}

/**
 * Test connection to a CRM provider
 * Implemented for: followupboss (Basic auth with API key), liondesk (OAuth Bearer token)
 * All failures are caught and returned as { success: false } — never throws.
 */
async function testConnection(provider, credentials) {
    try {
        const service = getProviderService(provider);

        switch (provider) {
            case 'followupboss':
                return service.testConnection(credentials.apiKey);
            case 'liondesk':
                return service.testConnection(credentials.accessToken);
            default:
                console.warn(`[CRM] testConnection: unsupported provider "${provider}"`);
                return { success: false, message: `Provider not supported: ${provider}` };
        }
    } catch (error) {
        console.warn(`[CRM] testConnection failed for ${provider}:`, error.message);
        return { success: false, message: error.message || 'Connection test failed' };
    }
}

/**
 * Push a call log to the appropriate CRM
 * Handles token refresh for LionDesk before making API calls.
 * All failures are caught and returned as { success: false } — never throws.
 */
async function pushCallToCRM(integration, callLog) {
    try {
        const service = getProviderService(integration.provider);
    
        // Decrypt credentials
        const decrypted = decryptIntegrationCredentials(integration);
        
        // Refresh token if needed (LionDesk OAuth)
        let activeIntegration = decrypted;
        if (integration.provider === 'liondesk') {
            try {
                activeIntegration = await refreshTokenIfNeeded(decrypted);
            } catch (error) {
                console.warn('[CRM] Token refresh failed for LionDesk:', error.message);
                return { success: false, message: 'LionDesk authentication expired. Please reconnect.' };
            }
        }
        
        const options = {
            autoCreateContact: activeIntegration.auto_create_contacts,
        };
        
        switch (activeIntegration.provider) {
            case 'followupboss':
                return service.pushCallToFUB(activeIntegration.api_key, callLog, options);
            case 'liondesk':
                return service.pushCallToLionDesk(activeIntegration.access_token, callLog, options);
            default:
                console.warn(`[CRM] pushCallToCRM: unsupported provider "${activeIntegration.provider}"`);
                return { success: false, message: `Provider not supported: ${activeIntegration.provider}` };
        }
    } catch (error) {
        console.warn(`[CRM] pushCallToCRM failed for ${integration.provider}:`, error.message);
        return { success: false, message: error.message || 'Failed to push call to CRM' };
    }
}

/**
 * Get all enabled CRM integrations for a user
 */
async function getUserIntegrations(userId) {
    const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_enabled', true)
        .eq('is_connected', true);
    
    if (error) {
        throw new Error(`Failed to get user integrations: ${error.message}`);
    }
    
    return data || [];
}

/**
 * Get a specific integration by ID
 */
async function getIntegration(integrationId) {
    const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();
    
    if (error) {
        throw new Error(`Failed to get integration: ${error.message}`);
    }
    
    return data;
}

/**
 * Create a new CRM integration (encrypts sensitive fields)
 */
async function createIntegration(userId, integrationData) {
    // Encrypt sensitive credentials before storage
    const encryptedData = encryptIntegrationCredentials(integrationData);
    
    const { data, error } = await supabase
        .from('crm_integrations')
        .insert({
            user_id: userId,
            ...encryptedData,
        })
        .select()
        .single();
    
    if (error) {
        throw new Error(`Failed to create integration: ${error.message}`);
    }
    
    return data;
}

/**
 * Update a CRM integration (encrypts sensitive fields)
 */
async function updateIntegration(integrationId, updateData) {
    // Encrypt sensitive credentials before storage
    const encryptedData = encryptIntegrationCredentials(updateData);
    
    const { data, error } = await supabase
        .from('crm_integrations')
        .update(encryptedData)
        .eq('id', integrationId)
        .select()
        .single();
    
    if (error) {
        throw new Error(`Failed to update integration: ${error.message}`);
    }
    
    return data;
}

/**
 * Delete a CRM integration
 */
async function deleteIntegration(integrationId) {
    const { error } = await supabase
        .from('crm_integrations')
        .delete()
        .eq('id', integrationId);
    
    if (error) {
        throw new Error(`Failed to delete integration: ${error.message}`);
    }
    
    return { success: true };
}

/**
 * Log a sync operation
 */
async function logSync(logData) {
    const { error } = await supabase
        .from('crm_sync_logs')
        .insert(logData);
    
    if (error) {
        console.error('Failed to log CRM sync:', error);
    }
}

/**
 * Push call to all enabled CRM integrations for a user
 * This is the main function called after a call ends
 */
async function pushCallToAllCRMs(userId, callLog) {
    const integrations = await getUserIntegrations(userId);
    const results = [];
    
    for (const integration of integrations) {
        if (!integration.sync_calls) {
            continue;
        }
        
        try {
            const result = await pushCallToCRM(integration, callLog);
            
            // Log success
            await logSync({
                integration_id: integration.id,
                user_id: userId,
                sync_type: 'call',
                direction: 'outbound',
                local_entity_type: 'call_log',
                local_entity_id: callLog.id,
                remote_entity_type: integration.provider === 'followupboss' ? 'call' : 'task',
                remote_entity_id: result.remoteCallId,
                status: 'success',
                request_payload: { callLog },
                response_payload: result,
            });
            
            results.push({
                provider: integration.provider,
                success: true,
                ...result,
            });
        } catch (error) {
            console.error(`Failed to push call to ${integration.provider}:`, error);
            
            // Log failure
            await logSync({
                integration_id: integration.id,
                user_id: userId,
                sync_type: 'call',
                direction: 'outbound',
                local_entity_type: 'call_log',
                local_entity_id: callLog.id,
                status: 'failed',
                error_message: error.message,
                request_payload: { callLog },
            });
            
            // Update integration with last error
            await updateIntegration(integration.id, {
                last_error: error.message,
            });
            
            results.push({
                provider: integration.provider,
                success: false,
                error: error.message,
            });
        }
    }
    
    return results;
}

/**
 * Refresh OAuth tokens if needed (for LionDesk)
 * Takes decrypted integration, returns updated integration with decrypted tokens
 */
async function refreshTokenIfNeeded(integration) {
    if (integration.provider !== 'liondesk') {
        return integration;
    }
    
    if (!integration.token_expires_at || !integration.refresh_token) {
        return integration;
    }
    
    const expiresAt = new Date(integration.token_expires_at);
    const now = new Date();
    
    // Refresh if token expires in less than 5 minutes
    if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        return integration;
    }
    
    console.log('Refreshing LionDesk token (expires:', expiresAt.toISOString(), ')');
    
    try {
        const tokens = await liondesk.refreshAccessToken(
            integration.client_id,
            integration.client_secret,
            integration.refresh_token
        );
        
        // Store encrypted tokens in database
        const encryptedUpdate = {
            access_token: encrypt(tokens.access_token),
            refresh_token: encrypt(tokens.refresh_token),
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        };
        
        await updateIntegrationRaw(integration.id, encryptedUpdate);
        
        // Return decrypted tokens for immediate use
        return {
            ...integration,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: encryptedUpdate.token_expires_at,
        };
    } catch (error) {
        console.error('Failed to refresh LionDesk token:', error);
        await updateIntegrationRaw(integration.id, {
            is_connected: false,
            last_error: 'Token refresh failed: ' + error.message,
        });
        throw error;
    }
}

/**
 * Raw update without encryption (for internal use with already encrypted data)
 */
async function updateIntegrationRaw(integrationId, updateData) {
    const { data, error } = await supabase
        .from('crm_integrations')
        .update(updateData)
        .eq('id', integrationId)
        .select()
        .single();
    
    if (error) {
        throw new Error(`Failed to update integration: ${error.message}`);
    }
    
    return data;
}

module.exports = {
    // Provider Services
    getProviderService,
    followupboss,
    liondesk,
    
    // Connection
    testConnection,
    
    // Integration CRUD
    getUserIntegrations,
    getIntegration,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    
    // Sync
    pushCallToCRM,
    pushCallToAllCRMs,
    logSync,
    
    // OAuth
    refreshTokenIfNeeded,
};
