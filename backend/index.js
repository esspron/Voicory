const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const OpenAI = require('openai');

// Only load .env file in development (Railway injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration for production
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://callyy.vercel.app',
        'https://callyy.in',
        /\.vercel\.app$/,
        /\.railway\.app$/
    ],
    credentials: true
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for backend operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'Callyy Backend',
        timestamp: new Date().toISOString()
    });
});

// Health check for Railway
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// WhatsApp OAuth Callback
app.post('/api/whatsapp/oauth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
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
// WHATSAPP WEBHOOK ENDPOINTS
// ============================================

// Webhook Verification (GET) - Meta will call this to verify your webhook
app.get('/api/webhooks/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification request:', { mode, token, challenge });

    if (mode === 'subscribe') {
        // Look up the verify token in our database
        const { data: config, error } = await supabase
            .from('whatsapp_configs')
            .select('id, webhook_verify_token')
            .eq('webhook_verify_token', token)
            .single();

        if (config) {
            console.log('Webhook verified for config:', config.id);
            res.status(200).send(challenge);
        } else {
            console.log('Invalid verify token');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

// Webhook Events (POST) - Meta sends message/call events here
app.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
        const body = req.body;
        console.log('Webhook received:', JSON.stringify(body, null, 2));

        // Always respond 200 quickly to acknowledge receipt
        res.sendStatus(200);

        // Process the webhook asynchronously
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                const wabaId = entry.id;
                
                // Find the config for this WABA
                const { data: config } = await supabase
                    .from('whatsapp_configs')
                    .select('*')
                    .eq('waba_id', wabaId)
                    .single();

                if (!config) {
                    console.log('No config found for WABA:', wabaId);
                    continue;
                }

                for (const change of entry.changes || []) {
                    const field = change.field;
                    const value = change.value;

                    if (field === 'messages') {
                        // Handle incoming messages
                        await handleIncomingMessages(config, value);
                    } else if (field === 'message_status') {
                        // Handle message status updates
                        await handleMessageStatus(config, value);
                    } else if (field === 'calls') {
                        // Handle call events
                        await handleCallEvents(config, value);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Already sent 200, so just log the error
    }
});

// Handle incoming WhatsApp messages
async function handleIncomingMessages(config, value) {
    const messages = value.messages || [];
    const contacts = value.contacts || [];
    const metadata = value.metadata || {};

    for (const message of messages) {
        const contact = contacts.find(c => c.wa_id === message.from) || {};
        
        // Upsert contact
        await supabase
            .from('whatsapp_contacts')
            .upsert({
                config_id: config.id,
                wa_id: message.from,
                phone_number: '+' + message.from,
                profile_name: contact.profile?.name,
                last_message_at: new Date().toISOString(),
                conversation_window_open: true,
                window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'config_id,wa_id' });

        // Store message
        const content = {};
        if (message.type === 'text') {
            content.body = message.text?.body;
        } else if (message.type === 'image') {
            content.mediaId = message.image?.id;
            content.caption = message.image?.caption;
        } else if (message.type === 'audio') {
            content.mediaId = message.audio?.id;
        } else if (message.type === 'video') {
            content.mediaId = message.video?.id;
            content.caption = message.video?.caption;
        } else if (message.type === 'document') {
            content.mediaId = message.document?.id;
            content.filename = message.document?.filename;
        } else if (message.type === 'location') {
            content.latitude = message.location?.latitude;
            content.longitude = message.location?.longitude;
            content.name = message.location?.name;
            content.address = message.location?.address;
        }

        await supabase
            .from('whatsapp_messages')
            .insert({
                wa_message_id: message.id,
                config_id: config.id,
                from_number: '+' + message.from,
                to_number: metadata.display_phone_number,
                direction: 'inbound',
                message_type: message.type,
                content: content,
                status: 'received',
                context_message_id: message.context?.id,
                message_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
            });

        console.log('Stored incoming message:', message.id);

        // If chatbot is enabled, process with AI and send response
        if (config.chatbot_enabled && config.assistant_id && message.type === 'text') {
            await processWithAI(config, message, contact);
        }
    }
}

// ============================================
// AI CHATBOT PROCESSING
// ============================================

// Process incoming message with AI and send response
async function processWithAI(config, message, contact) {
    try {
        console.log('Processing message with AI for assistant:', config.assistant_id);

        // 1. Fetch assistant configuration
        const { data: assistant, error: assistantError } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', config.assistant_id)
            .single();

        if (assistantError || !assistant) {
            console.error('Failed to fetch assistant:', assistantError);
            return;
        }

        console.log('Using assistant:', assistant.name, 'Model:', assistant.llm_model);

        // 2. Get conversation history (last 20 messages for context)
        const { data: history } = await supabase
            .from('whatsapp_messages')
            .select('direction, content, message_type, message_timestamp')
            .eq('config_id', config.id)
            .or(`from_number.eq.+${message.from},to_number.eq.+${message.from}`)
            .order('message_timestamp', { ascending: true })
            .limit(20);

        // 3. Build messages array for OpenAI
        const messages = [];

        // System prompt
        const systemPrompt = assistant.system_prompt || 
            'You are a helpful, friendly AI assistant. Be conversational and helpful.';
        
        messages.push({
            role: 'system',
            content: systemPrompt
        });

        // Add conversation history
        if (history && history.length > 0) {
            for (const msg of history) {
                if (msg.message_type === 'text' && msg.content?.body) {
                    messages.push({
                        role: msg.direction === 'inbound' ? 'user' : 'assistant',
                        content: msg.content.body
                    });
                }
            }
        }

        // Add current message (if not already in history)
        const currentMsgText = message.text?.body;
        if (currentMsgText) {
            // Check if last message in history is the same
            const lastHistoryMsg = history?.[history.length - 1];
            if (!lastHistoryMsg || lastHistoryMsg.content?.body !== currentMsgText) {
                messages.push({
                    role: 'user',
                    content: currentMsgText
                });
            }
        }

        console.log('Sending to OpenAI with', messages.length, 'messages');

        // 4. Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: assistant.llm_model || 'gpt-4o',
            messages: messages,
            temperature: parseFloat(assistant.temperature) || 0.7,
            max_tokens: assistant.max_tokens || 1024
        });

        const aiResponse = completion.choices[0]?.message?.content;

        if (!aiResponse) {
            console.error('No response from OpenAI');
            return;
        }

        console.log('AI Response:', aiResponse.substring(0, 100) + '...');

        // 5. Send reply via WhatsApp API
        await sendWhatsAppReply(config, message.from, aiResponse);

    } catch (error) {
        console.error('AI processing error:', error);
    }
}

// Send WhatsApp reply message
async function sendWhatsAppReply(config, toNumber, text) {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toNumber,
                type: 'text',
                text: {
                    body: text,
                    preview_url: false
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const waMessageId = response.data?.messages?.[0]?.id;
        console.log('WhatsApp reply sent:', waMessageId);

        // Store outbound message in database
        await supabase
            .from('whatsapp_messages')
            .insert({
                wa_message_id: waMessageId,
                config_id: config.id,
                from_number: config.display_phone_number,
                to_number: '+' + toNumber,
                direction: 'outbound',
                message_type: 'text',
                content: { body: text },
                status: 'sent',
                is_from_bot: true,
                assistant_id: config.assistant_id,
                message_timestamp: new Date().toISOString()
            });

        return waMessageId;
    } catch (error) {
        console.error('Failed to send WhatsApp reply:', error.response?.data || error.message);
        throw error;
    }
}

// Handle message status updates (sent, delivered, read)
async function handleMessageStatus(config, value) {
    const statuses = value.statuses || [];

    for (const status of statuses) {
        const updateData = {
            status: status.status
        };

        if (status.status === 'delivered') {
            updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        } else if (status.status === 'read') {
            updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        }

        await supabase
            .from('whatsapp_messages')
            .update(updateData)
            .eq('wa_message_id', status.id);

        console.log('Updated message status:', status.id, status.status);
    }
}

// Handle WhatsApp call events
async function handleCallEvents(config, value) {
    const calls = value.calls || [];

    for (const call of calls) {
        // Upsert call record
        await supabase
            .from('whatsapp_calls')
            .upsert({
                wa_call_id: call.id,
                config_id: config.id,
                from_number: '+' + call.from,
                to_number: '+' + call.to,
                direction: call.direction || 'inbound',
                status: call.status,
                started_at: call.timestamp ? new Date(parseInt(call.timestamp) * 1000).toISOString() : null,
                duration_seconds: call.duration
            }, { onConflict: 'config_id,wa_call_id' });

        console.log('Processed call event:', call.id, call.status);
    }
}

app.get('/test-db', async (req, res) => {
  try {
    // Just check if we can connect. Querying a table that might be empty is fine.
    // We'll query 'voices' table, limit 1.
    const { data, error } = await supabase.from('voices').select('*').limit(1);
    
    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }
    
    res.json({ message: 'Database connection successful', data });
  } catch (error) {
    console.error('Catch error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
