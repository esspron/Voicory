// ============================================
// HTTP INTEGRATION EXECUTOR
// ============================================
// Fires custom HTTP triggers configured per-assistant in the
// assistant_integrations table. Supports call_started, call_ended,
// appointment_booked, transfer_requested, lead_qualified, custom_trigger.
//
// All executions are fire-and-forget (non-blocking).
// Results are logged to integration_logs table.
// ============================================

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { supabase } = require('../config');

// ============================================
// LOAD INTEGRATIONS
// ============================================

/**
 * Fetch all enabled HTTP integrations for an assistant.
 * Returns the http_requests JSONB array filtered to isEnabled=true.
 */
async function loadAssistantIntegrations(assistantId) {
    if (!assistantId) return [];
    try {
        const { data, error } = await supabase
            .from('assistant_integrations')
            .select('http_requests')
            .eq('assistant_id', assistantId)
            .single();

        if (error || !data) return [];

        const requests = data.http_requests || [];
        return requests.filter(r => r.isEnabled === true || r.is_enabled === true);
    } catch (err) {
        console.error('[httpIntegrationExecutor] loadAssistantIntegrations error:', err.message);
        return [];
    }
}

// ============================================
// TEMPLATE VARIABLE SUBSTITUTION
// ============================================

/**
 * Replace {{variable}} patterns in a string with values from vars object.
 * Unknown variables are left as-is.
 */
function substituteTemplateVars(str, vars) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? String(vars[key]) : match;
    });
}

/**
 * Deep-substitute template vars in an object/array (recurse into values).
 */
function substituteInObject(obj, vars) {
    if (typeof obj === 'string') return substituteTemplateVars(obj, vars);
    if (Array.isArray(obj)) return obj.map(item => substituteInObject(item, vars));
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = substituteInObject(v, vars);
        }
        return result;
    }
    return obj;
}

// ============================================
// LOG TO integration_logs
// ============================================

async function logIntegration({ assistantId, trigger, url, statusCode, responseTimeMs, error }) {
    try {
        await supabase.from('integration_logs').insert({
            assistant_id: assistantId || null,
            trigger,
            url,
            status_code: statusCode || null,
            response_time_ms: responseTimeMs || null,
            error: error || null,
        });
    } catch (err) {
        // Never throw from logging
        console.error('[httpIntegrationExecutor] log error:', err.message);
    }
}

// ============================================
// BUILD HEADERS FROM AUTH CONFIG
// ============================================

function buildHeaders(integration, templateVars) {
    const headers = {
        'Content-Type': integration.contentType || 'application/json',
        'User-Agent': 'Voicory-Webhook/1.0',
    };

    // Additional headers from integration config
    if (Array.isArray(integration.headers)) {
        for (const h of integration.headers) {
            if (h.key) {
                headers[substituteTemplateVars(h.key, templateVars)] =
                    substituteTemplateVars(h.value || '', templateVars);
            }
        }
    }

    const auth = integration.auth || {};
    const authType = auth.type || 'none';

    switch (authType) {
        case 'bearer':
            if (auth.bearerToken) {
                headers['Authorization'] = `Bearer ${substituteTemplateVars(auth.bearerToken, templateVars)}`;
            }
            break;
        case 'api_key':
            if (auth.apiKeyHeader && auth.apiKeyValue) {
                headers[substituteTemplateVars(auth.apiKeyHeader, templateVars)] =
                    substituteTemplateVars(auth.apiKeyValue, templateVars);
            }
            break;
        case 'basic':
            if (auth.username || auth.password) {
                const credentials = Buffer.from(
                    `${substituteTemplateVars(auth.username || '', templateVars)}:${substituteTemplateVars(auth.password || '', templateVars)}`
                ).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }
            break;
        case 'custom_header':
            if (Array.isArray(auth.customHeaders)) {
                for (const h of auth.customHeaders) {
                    if (h.key) {
                        headers[substituteTemplateVars(h.key, templateVars)] =
                            substituteTemplateVars(h.value || '', templateVars);
                    }
                }
            }
            break;
        case 'none':
        default:
            break;
    }

    return headers;
}

// ============================================
// FIRE A SINGLE HTTP REQUEST
// ============================================

function fireHTTPRequest(integration, templateVars, assistantId, trigger) {
    const timeoutMs = integration.timeout || 10000;
    const method = (integration.method || 'POST').toUpperCase();
    const rawUrl = substituteTemplateVars(integration.url || '', templateVars);
    const startTime = Date.now();

    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl);
    } catch (e) {
        console.error(`[httpIntegrationExecutor] Invalid URL "${rawUrl}":`, e.message);
        logIntegration({ assistantId, trigger, url: rawUrl, error: `Invalid URL: ${e.message}` });
        return;
    }

    const headers = buildHeaders(integration, templateVars);

    // Build body
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method) && integration.bodyTemplate) {
        const substituted = substituteTemplateVars(integration.bodyTemplate, templateVars);
        body = substituted;
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(body);
    }

    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
        timeout: timeoutMs,
    };

    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.request(options, (res) => {
        const responseTimeMs = Date.now() - startTime;
        // Drain the response body to avoid memory leaks
        res.resume();
        res.on('end', () => {
            console.log(`[httpIntegrationExecutor] ✅ ${trigger} → ${rawUrl} [${res.statusCode}] ${responseTimeMs}ms`);
            logIntegration({ assistantId, trigger, url: rawUrl, statusCode: res.statusCode, responseTimeMs });
        });
    });

    req.on('timeout', () => {
        req.destroy();
        const responseTimeMs = Date.now() - startTime;
        console.warn(`[httpIntegrationExecutor] ⏱ Timeout: ${trigger} → ${rawUrl}`);
        logIntegration({ assistantId, trigger, url: rawUrl, responseTimeMs, error: 'Request timed out' });
    });

    req.on('error', (err) => {
        const responseTimeMs = Date.now() - startTime;
        console.error(`[httpIntegrationExecutor] ❌ ${trigger} → ${rawUrl}: ${err.message}`);
        logIntegration({ assistantId, trigger, url: rawUrl, responseTimeMs, error: err.message });
    });

    if (body) {
        req.write(body);
    }

    req.end();
}

// ============================================
// MAIN ENTRY POINT
// ============================================

/**
 * Fire all enabled HTTP integrations matching the trigger.
 * Non-blocking — returns immediately, executions happen in background.
 *
 * @param {string} assistantId - UUID of the assistant
 * @param {string} trigger - One of: call_started, call_ended, appointment_booked,
 *                           transfer_requested, lead_qualified, custom_trigger, on_message
 * @param {Object} payload - Template variables available in URL/body/headers
 */
function executeHTTPTrigger(assistantId, trigger, payload = {}) {
    // Intentionally not awaited — fire-and-forget
    _executeAsync(assistantId, trigger, payload).catch(err => {
        console.error('[httpIntegrationExecutor] Unexpected error:', err.message);
    });
}

async function _executeAsync(assistantId, trigger, payload) {
    const integrations = await loadAssistantIntegrations(assistantId);
    if (!integrations.length) return;

    const matchingIntegrations = integrations.filter(i => {
        const intTrigger = i.trigger;
        if (intTrigger === trigger) return true;
        // For custom_trigger, match against customTriggerPhrase in AI response
        if (trigger === 'custom_trigger' && intTrigger === 'custom_trigger') return true;
        return false;
    });

    if (!matchingIntegrations.length) return;

    const templateVars = {
        assistant_id: assistantId || '',
        call_id: payload.callSid || payload.call_id || '',
        call_sid: payload.callSid || payload.call_sid || '',
        customer_name: payload.customerName || payload.customer_name || '',
        first_name: payload.firstName || payload.first_name || '',
        last_name: payload.lastName || payload.last_name || '',
        phone_number: payload.phoneNumber || payload.phone_number || payload.from || '',
        email: payload.email || '',
        call_date: payload.callDate || payload.call_date || new Date().toISOString(),
        call_duration: payload.duration || payload.call_duration || '',
        call_summary: payload.summary || payload.call_summary || '',
        transcript: payload.transcript || '',
        disposition: payload.disposition || '',
        lead_score: payload.leadScore || payload.lead_score || '',
        appointment_date: payload.appointmentDate || payload.appointment_date || '',
        ai_response: payload.aiResponse || payload.ai_response || '',
        trigger,
        ...payload, // allow callers to pass arbitrary extra vars
    };

    console.log(`[httpIntegrationExecutor] Firing ${matchingIntegrations.length} integration(s) for trigger "${trigger}" on assistant ${assistantId}`);

    for (const integration of matchingIntegrations) {
        // For custom_trigger: only fire if AI response contains the trigger phrase
        if (
            trigger === 'custom_trigger' &&
            integration.customTriggerPhrase &&
            payload.aiResponse
        ) {
            const phrase = integration.customTriggerPhrase.toLowerCase();
            const response = payload.aiResponse.toLowerCase();
            if (!response.includes(phrase)) continue;
        }

        fireHTTPRequest(integration, templateVars, assistantId, trigger);
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    executeHTTPTrigger,
    loadAssistantIntegrations,
    substituteTemplateVars,
};
