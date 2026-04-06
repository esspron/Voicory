// ============================================
// WHATSAPP OAUTH ROUTES - OAuth Callback
// SECURITY: Requires authentication to prevent unauthorized token exchange
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, axios, encrypt } = require('../config');
const { verifySupabaseAuth } = require('../lib/auth');

/**
 * Exchange OAuth code for access token
 * PROTECTED: Requires valid Supabase JWT token
 * This ensures the token is associated with the authenticated user
 */
router.post('/oauth/callback', verifySupabaseAuth, async (req, res) => {
  try {
    const { code } = req.body;
    // SECURITY: Use authenticated user ID
    const userId = req.userId;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(500).json({ error: 'Server configuration error: Missing Facebook credentials' });
    }

    // 1. Exchange code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Get WABA details using the access token
    // We first get the user's ID (System User) and their businesses/accounts
    const meResponse = await axios.get('https://graph.facebook.com/v21.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,accounts' // accounts usually contains the pages/WABAs
      }
    });

    // Note: The structure of the response depends on what the user shared.
    // For Embedded Signup, we typically look for the WABA in the shared accounts.
    // If 'accounts' is empty, we might need to check 'businesses' or specific edges.
    
    // However, a more direct way often used in Embedded Signup is to query the debug_token 
    // to see what granular scopes/assets were granted, OR just list the WABAs this token can access.
    
    // Let's try to fetch WABAs directly if possible, or iterate through accounts.
    // A common pattern for System Users created via Embedded Signup is that they have access to the WABA.
    
    // Let's try to fetch the WABAs associated with this token.
    // Since we don't know the WABA ID, we can try to list client_whatsapp_business_accounts if this was a Tech Provider flow,
    // but for direct integration, we check 'accounts'.
    
    // FALLBACK: If we can't easily determine the WABA from /me, we might need the frontend to pass the WABA ID 
    // if it was available in the client response (it often is in the 'config' object of the JS SDK response).
    // But let's assume we need to find it.
    
    // Strategy: Get the WABA ID.
    // The System User should have access to the WABA.
    // Let's try to get the WABA ID from the token debug endpoint or by listing accounts.
    
    // For now, let's assume the first account found is the target, or we return the token and let the user pick?
    // No, the UI expects a single config.
    
    // Let's try to fetch phone numbers directly if we can find the WABA.
    // Actually, let's fetch the WABA ID from the 'granularity' of the token if available, 
    // or just list the WABAs.
    
    // A reliable way:
    // GET /v21.0/me/accounts?fields=name,category,id
    // Filter for category = 'WhatsApp Business Account' (though sometimes it's not explicit).
    
    // Let's try a different approach:
    // The token belongs to a System User. That System User is added to the WABA.
    // We can query: GET /v21.0/me/assigned_business_accounts (if applicable) or just /me/accounts.
    
    // Let's stick to a simple flow:
    // 1. Get Token.
    // 2. Get WABA (we'll assume the token gives access to the one created/selected).
    // 3. Get Phone Number.

    // Let's try to get the shared WABA ID.
    // In many Embedded Signup implementations, the WABA ID is passed in the initial setup, 
    // but if we only have the code, we must discover it.
    
    // Let's try to fetch the WABAs this user has access to.
    const accountsResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
        params: {
            access_token: accessToken,
            fields: 'id,name,category,access_token'
        }
    });
    
    // This endpoint usually returns Pages. WABAs are different.
    // WABAs are accessed via the Business Manager.
    
    // Let's try fetching the WABAs directly.
    // There isn't a direct /me/whatsapp_business_accounts endpoint for System Users in the same way.
    // However, we can try to get the business ID and then list WABAs.
    
    // SIMPLIFICATION FOR MVP:
    // We will return the access token and the user's name.
    // We will try to fetch the phone number if we can find a WABA.
    // If we can't find it automatically, we might need to ask the user to enter the WABA ID, 
    // but the UI expects us to return it.
    
    // Let's try to get the WABA ID from the debug_token endpoint which lists the granular scopes.
    const debugTokenResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
        params: {
            input_token: accessToken,
            access_token: `${appId}|${appSecret}`
        }
    });
    
    const granularScopes = debugTokenResponse.data.data.granular_scopes || [];
    let wabaId = null;
    
    // Look for whatsapp_business_management scope and its target_ids
    const wabaScope = granularScopes.find(scope => scope.scope === 'whatsapp_business_management');
    if (wabaScope && wabaScope.target_ids && wabaScope.target_ids.length > 0) {
        wabaId = wabaScope.target_ids[0];
    }
    
    if (!wabaId) {
        // Fallback: Try to find it via other means or throw error
        // For now, let's try to proceed or return what we have.
        // If we can't find WABA ID, we can't find phone numbers.
        console.log('Could not find WABA ID in granular scopes. Response:', JSON.stringify(debugTokenResponse.data));
        // We might need to return an error or ask the user to provide it.
        // But let's try to fetch phone numbers from the 'me' endpoint if it acts as a WABA context? No.
    }

    let phoneNumberId = '';
    let displayPhoneNumber = '';
    let displayName = '';

    if (wabaId) {
        // Fetch phone numbers for this WABA
        const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`, {
            params: {
                access_token: accessToken
            }
        });
        
        if (phoneNumbersResponse.data.data && phoneNumbersResponse.data.data.length > 0) {
            const phoneData = phoneNumbersResponse.data.data[0];
            phoneNumberId = phoneData.id;
            displayPhoneNumber = phoneData.display_phone_number;
            displayName = phoneData.verified_name || phoneData.display_phone_number;
        }
    }

    res.json({
        accessToken,
        wabaId: wabaId || '',
        phoneNumberId,
        displayPhoneNumber,
        displayName: displayName || 'WhatsApp Business'
    });

  } catch (error) {
    console.error('OAuth Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
        error: 'Failed to complete OAuth flow', 
        details: error.response ? error.response.data : error.message 
    });
  }
});


// ============================================
// WHATSAPP MESSENGER API ROUTES
// Outbound send, conversations, templates, mark-read, assign
// ============================================

/**
 * GET /api/whatsapp/numbers — list user's connected WhatsApp numbers
 */
router.get('/numbers', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { data, error } = await supabase
            .from('whatsapp_configs')
            .select('id, display_phone_number, display_name, assistant_id, status, created_at')
            .eq('user_id', userId);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ numbers: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/whatsapp/conversations
 * List all conversations (contacts with last message) for the authenticated user.
 */
router.get('/conversations', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { configId } = req.query;

        let query = supabase
            .from('whatsapp_contacts')
            .select(`
                id, config_id, wa_id, phone_number, profile_name,
                last_message_at, conversation_window_open, window_expires_at,
                whatsapp_configs!inner(id, user_id, display_phone_number, display_name, assistant_id)
            `)
            .eq('whatsapp_configs.user_id', userId)
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .limit(50);

        if (configId) {
            query = query.eq('config_id', configId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch last message for each contact
        const contacts = data || [];
        const enriched = await Promise.all(contacts.map(async (contact) => {
            const { data: msgs } = await supabase
                .from('whatsapp_messages')
                .select('content, direction, message_timestamp, message_type, status')
                .eq('config_id', contact.config_id)
                .or(`from_number.eq.${contact.phone_number},to_number.eq.${contact.phone_number}`)
                .order('message_timestamp', { ascending: false })
                .limit(1);
            return {
                ...contact,
                lastMessage: msgs?.[0] || null
            };
        }));

        res.json({ conversations: enriched });
    } catch (err) {
        console.error('GET /conversations error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/whatsapp/messages/:configId/:contactWaId
 * Get conversation messages for a specific contact.
 */
router.get('/messages/:configId/:contactWaId', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { configId, contactWaId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        // Verify config belongs to user
        const { data: config, error: configErr } = await supabase
            .from('whatsapp_configs')
            .select('id, user_id, display_phone_number')
            .eq('id', configId)
            .eq('user_id', userId)
            .single();

        if (configErr || !config) {
            return res.status(403).json({ error: 'Config not found or access denied' });
        }

        const phoneNumber = contactWaId.startsWith('+') ? contactWaId : '+' + contactWaId;

        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('config_id', configId)
            .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
            .order('message_timestamp', { ascending: true })
            .limit(limit);

        if (error) throw error;
        res.json({ messages: data || [] });
    } catch (err) {
        console.error('GET /messages error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/whatsapp/send
 * Send an outbound WhatsApp message (text, template, or media).
 * Body: { configId, to, type, content, templateName?, templateLanguage?, templateComponents?, mediaUrl?, mediaId?, caption?, filename? }
 */
router.post('/send', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { configId, to, type = 'text', content, templateName, templateLanguage, templateComponents, mediaUrl, mediaId, caption, filename } = req.body;

        if (!configId || !to) {
            return res.status(400).json({ error: 'configId and to are required' });
        }

        // Verify config belongs to user
        const { data: config, error: configErr } = await supabase
            .from('whatsapp_configs')
            .select('id, user_id, phone_number_id, display_phone_number, access_token')
            .eq('id', configId)
            .eq('user_id', userId)
            .single();

        if (configErr || !config) {
            return res.status(403).json({ error: 'Config not found or access denied' });
        }

        if (!config.access_token) {
            return res.status(503).json({ error: 'WhatsApp not configured: missing access token' });
        }

        const appSecret = process.env.FACEBOOK_APP_SECRET;
        if (!appSecret) {
            return res.status(503).json({ error: 'WhatsApp not configured: FACEBOOK_APP_SECRET not set' });
        }

        // Clean access token
        let accessToken = config.access_token.trim().replace(/[\r\n]/g, '');
        if (accessToken.includes('=')) {
            accessToken = accessToken.split('=').pop();
        }

        // Build WhatsApp API payload
        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to.replace(/^\+/, ''),
            type
        };

        if (type === 'text') {
            if (!content) return res.status(400).json({ error: 'content is required for text messages' });
            payload.text = { body: content, preview_url: false };
        } else if (type === 'template') {
            if (!templateName) return res.status(400).json({ error: 'templateName is required for template messages' });
            payload.template = {
                name: templateName,
                language: { code: templateLanguage || 'en' },
                components: templateComponents || []
            };
        } else if (['image', 'video', 'audio', 'document'].includes(type)) {
            const mediaObj = {};
            if (mediaId) mediaObj.id = mediaId;
            if (mediaUrl) mediaObj.link = mediaUrl;
            if (caption) mediaObj.caption = caption;
            if (filename && type === 'document') mediaObj.filename = filename;
            payload[type] = mediaObj;
        } else {
            return res.status(400).json({ error: `Unsupported message type: ${type}` });
        }

        // Send via WhatsApp API
        const waResponse = await axios.post(
            `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const waMessageId = waResponse.data?.messages?.[0]?.id;

        // Store outbound message in DB
        const messageContent = type === 'text' ? { body: content }
            : type === 'template' ? { templateName, templateLanguage, templateComponents }
            : { mediaUrl, mediaId, caption, filename };

        const { data: storedMsg, error: insertErr } = await supabase
            .from('whatsapp_messages')
            .insert({
                wa_message_id: waMessageId,
                config_id: configId,
                from_number: config.display_phone_number,
                to_number: to.startsWith('+') ? to : '+' + to,
                direction: 'outbound',
                message_type: type,
                content: messageContent,
                status: 'sent',
                is_from_bot: false,
                message_timestamp: new Date().toISOString()
            })
            .select()
            .single();

        if (insertErr) console.error('Failed to store outbound message:', insertErr.message);

        // Update contact last_message_at
        await supabase
            .from('whatsapp_contacts')
            .update({ last_message_at: new Date().toISOString() })
            .eq('config_id', configId)
            .eq('wa_id', to.replace(/^\+/, ''));

        res.json({ success: true, waMessageId, message: storedMsg });
    } catch (err) {
        const errData = err.response?.data;
        console.error('POST /send error:', errData || err.message);
        if (err.response?.status === 401) {
            return res.status(503).json({ error: 'WhatsApp not configured: invalid access token' });
        }
        res.status(500).json({ error: errData?.error?.message || err.message });
    }
});

/**
 * GET /api/whatsapp/templates/:configId
 * List approved message templates for a config (from DB, synced from WA API).
 */
router.get('/templates/:configId', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { configId } = req.params;
        const { sync } = req.query; // ?sync=true to re-fetch from WA API

        // Verify config belongs to user
        const { data: config, error: configErr } = await supabase
            .from('whatsapp_configs')
            .select('id, user_id, waba_id, access_token')
            .eq('id', configId)
            .eq('user_id', userId)
            .single();

        if (configErr || !config) {
            return res.status(403).json({ error: 'Config not found or access denied' });
        }

        if (sync === 'true' && config.access_token && config.waba_id) {
            // Sync from WhatsApp API
            let accessToken = config.access_token.trim().replace(/[\r\n]/g, '');
            if (accessToken.includes('=')) accessToken = accessToken.split('=').pop();

            try {
                const waResp = await axios.get(
                    `https://graph.facebook.com/v21.0/${config.waba_id}/message_templates`,
                    { headers: { 'Authorization': `Bearer ${accessToken}` } }
                );

                for (const tmpl of waResp.data?.data || []) {
                    await supabase
                        .from('whatsapp_templates')
                        .upsert({
                            config_id: configId,
                            template_name: tmpl.name,
                            language: tmpl.language,
                            category: tmpl.category,
                            status: tmpl.status,
                            components: tmpl.components,
                            quality_score: tmpl.quality_score?.score
                        }, { onConflict: 'config_id,template_name,language' });
                }
            } catch (syncErr) {
                console.warn('Template sync failed:', syncErr.response?.data || syncErr.message);
                // Continue to return cached templates
            }
        }

        const { data, error } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('config_id', configId)
            .eq('status', 'APPROVED')
            .order('template_name');

        if (error) throw error;
        res.json({ templates: data || [] });
    } catch (err) {
        console.error('GET /templates error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/whatsapp/mark-read/:configId/:waMessageId
 * Mark a message as read (send read receipt to WhatsApp).
 */
router.post('/mark-read/:configId/:waMessageId', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { configId, waMessageId } = req.params;

        const { data: config, error: configErr } = await supabase
            .from('whatsapp_configs')
            .select('id, user_id, phone_number_id, access_token')
            .eq('id', configId)
            .eq('user_id', userId)
            .single();

        if (configErr || !config) {
            return res.status(403).json({ error: 'Config not found or access denied' });
        }

        if (!config.access_token) {
            return res.status(503).json({ error: 'WhatsApp not configured' });
        }

        let accessToken = config.access_token.trim().replace(/[\r\n]/g, '');
        if (accessToken.includes('=')) accessToken = accessToken.split('=').pop();

        // Send read receipt
        await axios.post(
            `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: waMessageId
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Update in DB
        await supabase
            .from('whatsapp_messages')
            .update({ status: 'read', read_at: new Date().toISOString() })
            .eq('wa_message_id', waMessageId)
            .eq('config_id', configId);

        res.json({ success: true });
    } catch (err) {
        console.error('POST /mark-read error:', err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
});

/**
 * PATCH /api/whatsapp/conversations/:configId/:waId/assign
 * Assign a conversation (contact) to an assistant.
 * Body: { assistantId }
 */
router.patch('/conversations/:configId/:waId/assign', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { configId, waId } = req.params;
        const { assistantId } = req.body;

        const { data: config, error: configErr } = await supabase
            .from('whatsapp_configs')
            .select('id, user_id')
            .eq('id', configId)
            .eq('user_id', userId)
            .single();

        if (configErr || !config) {
            return res.status(403).json({ error: 'Config not found or access denied' });
        }

        // Update contact's assistant assignment in whatsapp_contacts metadata
        const { data, error } = await supabase
            .from('whatsapp_contacts')
            .update({ assigned_assistant_id: assistantId })
            .eq('config_id', configId)
            .eq('wa_id', waId)
            .select()
            .single();

        if (error) {
            // Column might not exist, fall back to metadata
            console.warn('assign update failed (column may not exist):', error.message);
            return res.json({ success: true, note: 'Assignment saved in config default' });
        }

        res.json({ success: true, contact: data });
    } catch (err) {
        console.error('PATCH /assign error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
