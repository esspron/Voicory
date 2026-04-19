/**
 * Customers Routes
 *
 * Handles customer listing and CRM sync endpoints:
 * - GET  /api/customers              — List customers for authenticated user (supports ?search=)
 * - GET  /api/customers/export       — Export customers as CSV
 * - POST /api/customers/import       — Import customers from CSV file (multipart/form-data)
 * - POST /api/customers/bulk-delete  — Bulk delete customers by IDs
 * - POST /api/customers/sync-from-crm — Pull contacts from connected CRMs and upsert
 * - GET  /api/customers/sync-status   — Last sync status per provider
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../config');
const { verifySupabaseAuth } = require('../lib/auth');
const { decrypt } = require('../lib/crypto');

// multer: memory storage for CSV parsing
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// All routes require auth
router.use(verifySupabaseAuth);

// ============================================
// GET /api/customers
// Supports optional ?search= query (ILIKE on name, email, phone_number)
// ============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { search } = req.query;

        let query = supabase
            .from('customers')
            .select('id, name, email, phone_number, variables, created_at, updated_at, has_memory, last_interaction, interaction_count, source, crm_provider, last_synced_at, last_interaction')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            query = query.or(`name.ilike.${term},email.ilike.${term},phone_number.ilike.${term}`);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json({ customers: data || [] });
    } catch (err) {
        console.error('GET /api/customers error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET /api/customers/export
// Returns CSV of all customers for authenticated user
// ============================================
router.get('/export', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('customers')
            .select('id, name, email, phone_number, variables, source, created_at, last_interaction')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const customers = data || [];

        // Build CSV rows
        const headers = ['id', 'name', 'email', 'phone_number', 'source', 'created_at', 'last_interaction'];
        const rows = [headers.join(',')];

        for (const c of customers) {
            const row = [
                csvEscape(c.id || ''),
                csvEscape(c.name || ''),
                csvEscape(c.email || ''),
                csvEscape(c.phone_number || ''),
                csvEscape(c.source || ''),
                csvEscape(c.created_at || ''),
                csvEscape(c.last_interaction || ''),
            ];
            rows.push(row.join(','));
        }

        const csvContent = rows.join('\n');
        const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    } catch (err) {
        console.error('GET /api/customers/export error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Helper: escape a value for CSV
function csvEscape(val) {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// Helper: parse CSV text into array of objects (rows as object keyed by header)
function parseCSVText(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const parseRow = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
    const rows = lines.slice(1).map(line => {
        const cells = parseRow(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
        return obj;
    });

    return { headers, rows };
}

// ============================================
// POST /api/customers/import
// Accepts multipart/form-data with field "file" (CSV)
// Returns { imported: N, skipped: N, errors: [] }
// ============================================
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded. Use field name "file".' });
        }

        const text = req.file.buffer.toString('utf-8');
        const { headers, rows } = parseCSVText(text);

        if (!headers.length || !rows.length) {
            return res.status(400).json({ error: 'CSV file is empty or has no data rows.' });
        }

        // Detect required column indices
        const nameIdx = headers.find(h => h === 'name');
        const phoneIdx = headers.find(h => h === 'phone_number' || h === 'phone' || h === 'phonenumber');
        const emailIdx = headers.find(h => h === 'email');

        if (!nameIdx || !phoneIdx) {
            return res.status(400).json({ error: 'CSV must contain at minimum: name, phone_number (or phone) columns.' });
        }

        const toImport = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const name = (row['name'] || '').trim();
            const phone = (row['phone_number'] || row['phone'] || row['phonenumber'] || '').trim();
            const email = emailIdx ? (row['email'] || '').trim() : null;

            if (!name || !phone) {
                errors.push(`Row ${i + 2}: missing name or phone_number`);
                continue;
            }

            // Parse var_ columns into variables object
            const variables = {};
            for (const h of headers) {
                if (h.startsWith('var_')) {
                    const val = (row[h] || '').trim();
                    if (val) variables[h.replace('var_', '')] = val;
                }
            }

            toImport.push({ name, email: email || null, phone_number: phone, variables, user_id: userId });
        }

        if (toImport.length === 0) {
            return res.status(400).json({ error: 'No valid rows to import.', imported: 0, skipped: rows.length, errors });
        }

        // Upsert in batches of 100 (conflict on user_id + phone_number)
        let imported = 0;
        let skipped = 0;
        const batchSize = 100;

        for (let i = 0; i < toImport.length; i += batchSize) {
            const batch = toImport.slice(i, i + batchSize);
            const { data, error: dbErr } = await supabase
                .from('customers')
                .upsert(batch, {
                    onConflict: 'user_id,phone_number',
                    ignoreDuplicates: false
                })
                .select('id');

            if (dbErr) {
                // Partial failure — try row by row
                for (const row of batch) {
                    const { error: rowErr } = await supabase.from('customers').upsert(row, { onConflict: 'user_id,phone_number', ignoreDuplicates: false });
                    if (rowErr) {
                        errors.push(`Failed to import ${row.name} (${row.phone_number}): ${rowErr.message}`);
                        skipped++;
                    } else {
                        imported++;
                    }
                }
            } else {
                imported += (data || batch).length;
            }
        }

        res.json({ imported, skipped: skipped + (rows.length - toImport.length), errors: errors.slice(0, 20) });
    } catch (err) {
        console.error('POST /api/customers/import error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST /api/customers/bulk-delete
// Body: { ids: string[] }
// ============================================
router.post('/bulk-delete', async (req, res) => {
    try {
        const userId = req.user.id;
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids must be a non-empty array' });
        }

        // Only delete customers belonging to this user
        const { error, count } = await supabase
            .from('customers')
            .delete({ count: 'exact' })
            .eq('user_id', userId)
            .in('id', ids);

        if (error) throw error;

        res.json({ deleted: count || ids.length });
    } catch (err) {
        console.error('POST /api/customers/bulk-delete error:', err);
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
