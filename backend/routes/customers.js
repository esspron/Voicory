/**
 * Customers Routes
 *
 * Handles customer listing and CRM sync endpoints:
 * - GET  /api/customers          — List customers for authenticated user
 * - POST /api/customers/sync-from-crm — Pull contacts from connected CRMs and upsert
 * - GET  /api/customers/sync-status   — Last sync status per provider
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { verifySupabaseAuth } = require('../lib/auth');
const { decrypt } = require('../lib/crypto');

// All routes require auth
router.use(verifySupabaseAuth);

// ============================================
// GET /api/customers
// ============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, email, phone_number, variables, created_at, updated_at, has_memory, last_interaction, interaction_count, source, crm_provider, last_synced_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ customers: data || [] });
    } catch (err) {
        console.error('GET /api/customers error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST /api/customers/sync-from-crm
// ============================================
router.post('/sync-from-crm', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all active CRM integrations for this user
        const { data: integrations, error: intErr } = await supabase
            .from('crm_integrations')
            .select('*')
            .eq('user_id', userId)
            .eq('is_enabled', true)
            .eq('is_connected', true);

        if (intErr) throw intErr;
        if (!integrations || integrations.length === 0) {
            return res.json({ synced: 0, failed: 0, providers: [], message: 'No active CRM integrations found.' });
        }

        let totalSynced = 0;
        let totalFailed = 0;
        const providers = [];

        for (const integration of integrations) {
            const provider = integration.provider; // 'followupboss' | 'liondesk'
            let syncedCount = 0;
            let failedCount = 0;
            let syncError = null;

            try {
                const contacts = await fetchAllCRMContacts(integration);

                for (const contact of contacts) {
                    try {
                        await upsertCustomerFromCRM(userId, provider, contact);
                        syncedCount++;
                    } catch (e) {
                        console.error(`Failed to upsert contact from ${provider}:`, e.message);
                        failedCount++;
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch contacts from ${provider}:`, e.message);
                syncError = e.message;
                failedCount++;
            }

            // Log to crm_sync_logs
            await supabase.from('crm_sync_logs').insert({
                user_id: userId,
                provider,
                synced_count: syncedCount,
                failed_count: failedCount,
                status: syncError ? 'error' : 'success',
                error: syncError,
            });

            totalSynced += syncedCount;
            totalFailed += failedCount;
            providers.push({ provider, synced: syncedCount, failed: failedCount });
        }

        res.json({ synced: totalSynced, failed: totalFailed, providers });
    } catch (err) {
        console.error('POST /api/customers/sync-from-crm error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET /api/customers/sync-status
// ============================================
router.get('/sync-status', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get last sync per provider
        const { data, error } = await supabase
            .from('crm_sync_logs')
            .select('provider, synced_count, failed_count, status, error, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // De-dupe: keep only latest per provider
        const seen = new Set();
        const result = (data || []).filter(row => {
            if (seen.has(row.provider)) return false;
            seen.add(row.provider);
            return true;
        });

        res.json({ syncStatus: result });
    } catch (err) {
        console.error('GET /api/customers/sync-status error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Helpers
// ============================================

/**
 * Fetch all contacts from a CRM integration (paginated, up to 500)
 */
async function fetchAllCRMContacts(integration) {
    const provider = integration.provider;

    if (provider === 'followupboss') {
        const apiKey = integration.api_key ? decrypt(integration.api_key) : null;
        if (!apiKey) throw new Error('FUB api_key missing');
        return fetchFUBPeople(apiKey);
    }

    if (provider === 'liondesk') {
        const accessToken = integration.access_token ? decrypt(integration.access_token) : null;
        if (!accessToken) throw new Error('LionDesk access_token missing');
        return fetchLionDeskContacts(accessToken);
    }

    throw new Error(`Unsupported CRM provider: ${provider}`);
}

/**
 * Fetch up to 500 people from Follow Up Boss via GET /people (paginated)
 */
async function fetchFUBPeople(apiKey) {
    const FUB_BASE = 'https://api.followupboss.com/v1';
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');
    const headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'X-System': 'Voicory',
        'X-System-Key': process.env.FUB_SYSTEM_KEY || 'voicory-integration',
    };

    const allPeople = [];
    let offset = 0;
    const limit = 100;

    while (allPeople.length < 500) {
        const url = `${FUB_BASE}/people?limit=${limit}&offset=${offset}`;
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`FUB /people failed (${resp.status}): ${text}`);
        }
        const json = await resp.json();
        const people = json.people || [];
        allPeople.push(...people);
        if (people.length < limit) break;
        offset += limit;
    }

    return allPeople;
}

/**
 * Fetch up to 500 contacts from LionDesk via GET /contacts (paginated)
 */
async function fetchLionDeskContacts(accessToken) {
    const LD_BASE = 'https://api-v2.liondesk.com';
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    const allContacts = [];
    let skip = 0;
    const limit = 100;

    while (allContacts.length < 500) {
        const url = `${LD_BASE}/contacts?$limit=${limit}&$skip=${skip}`;
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`LionDesk /contacts failed (${resp.status}): ${text}`);
        }
        const json = await resp.json();
        const contacts = json.data || json.contacts || [];
        allContacts.push(...contacts);
        if (contacts.length < limit) break;
        skip += limit;
    }

    return allContacts;
}

/**
 * Upsert a CRM contact into public.customers
 */
async function upsertCustomerFromCRM(userId, provider, contact) {
    // Normalize fields across providers
    let externalId, name, email, phone;

    if (provider === 'followupboss') {
        externalId = String(contact.id);
        name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown';
        email = (contact.emails && contact.emails[0] && contact.emails[0].value) || null;
        phone = (contact.phones && contact.phones[0] && contact.phones[0].value) || null;
    } else if (provider === 'liondesk') {
        externalId = String(contact._id || contact.id);
        name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.name || 'Unknown';
        email = contact.email || (contact.emails && contact.emails[0]) || null;
        phone = contact.mobile_phone || contact.home_phone || contact.office_phone || null;
    } else {
        externalId = String(contact.id);
        name = contact.name || 'Unknown';
        email = contact.email || null;
        phone = contact.phone || contact.phone_number || null;
    }

    // Try to find existing record by user_id + external_crm_id + crm_provider
    const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .eq('external_crm_id', externalId)
        .eq('crm_provider', provider)
        .maybeSingle();

    const payload = {
        user_id: userId,
        name,
        email,
        phone_number: phone,
        source: provider,
        external_crm_id: externalId,
        crm_provider: provider,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    if (existing) {
        // Update existing
        const { error } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', existing.id);
        if (error) throw error;
    } else {
        // Check phone match as fallback
        let phoneMatch = null;
        if (phone) {
            const { data: phoneExisting } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', userId)
                .eq('phone_number', phone)
                .maybeSingle();
            phoneMatch = phoneExisting;
        }

        if (phoneMatch) {
            const { error } = await supabase
                .from('customers')
                .update(payload)
                .eq('id', phoneMatch.id);
            if (error) throw error;
        } else {
            // Insert new
            const { error } = await supabase
                .from('customers')
                .insert({ ...payload, created_at: new Date().toISOString() });
            if (error) throw error;
        }
    }
}

module.exports = router;
