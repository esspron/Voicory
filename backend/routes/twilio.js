// ============================================
// TWILIO ROUTES - Phone Number Import & Webhooks
// SECURITY: Import routes require authentication
// Webhook routes use Twilio signature verification
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, axios, encrypt, decrypt, validateBody, twilioImportSchema } = require('../config');
const { getCachedPhoneConfig, getCachedAssistant, invalidatePhoneConfigCache } = require('../services/assistant');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
const { formatMemoryForPrompt } = require('../services/memory');
const { verifySupabaseAuth } = require('../lib/auth');
const { pushCallToAllCRMs } = require('../services/crm');
const { calculateCallCost, logCostToSupabase } = require('../services/costTracking');

// ============================================
// TWILIO PHONE NUMBER IMPORT
// ============================================

/**
 * Verify & Import a Twilio phone number (NO auto-webhook config)
 * - Verifies user owns the number via Twilio API
 * - Stores credentials for outbound calls
 * - User manually configures webhook URL in Twilio Console
 * POST /api/twilio/verify-import
 * Body: { accountSid, authToken, phoneNumber, label }
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/verify-import', verifySupabaseAuth, async (req, res) => {
    try {
        const { accountSid, authToken, phoneNumber, label } = req.body;
        const userId = req.userId;

        if (!accountSid || !authToken || !phoneNumber) {
            return res.status(400).json({ 
                error: 'Account SID, Auth Token, and Phone Number are required' 
            });
        }

        // Validate Twilio Account SID format (AC + 32 hex characters)
        if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
            return res.status(400).json({ 
                error: 'Invalid Account SID format. It should start with "AC" and be 34 characters long.' 
            });
        }

        // Normalize phone number to E.164 format
        let normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');
        if (!normalizedNumber.startsWith('+')) {
            normalizedNumber = '+' + normalizedNumber;
        }

        console.log('Verifying Twilio number ownership:', normalizedNumber, 'for user:', userId);

        // Verify ownership: Search for phone number in user's Twilio account
        const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
        
        let searchResponse;
        try {
            searchResponse = await axios.get(searchUrl, {
                auth: {
                    username: accountSid,
                    password: authToken
                },
                params: {
                    PhoneNumber: normalizedNumber
                }
            });
        } catch (twilioError) {
            if (twilioError.response?.status === 401) {
                return res.status(401).json({ 
                    error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.' 
                });
            }
            throw twilioError;
        }

        const phoneNumbers = searchResponse.data.incoming_phone_numbers || [];
        
        if (phoneNumbers.length === 0) {
            return res.status(404).json({ 
                error: `Phone number ${normalizedNumber} not found in your Twilio account. Please verify you own this number.` 
            });
        }

        const twilioNumber = phoneNumbers[0];
        const phoneNumberSid = twilioNumber.sid;

        console.log('✓ Ownership verified! Twilio SID:', phoneNumberSid);

        // Encrypt the auth token before storing
        const encryptedAuthToken = encrypt(authToken);

        // Save to database (credentials stored for outbound calls)
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: normalizedNumber,
                provider: 'Twilio',
                label: label || twilioNumber.friendly_name || 'Twilio Number',
                twilio_phone_number: normalizedNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: encryptedAuthToken,
                twilio_phone_sid: phoneNumberSid,
                sms_enabled: twilioNumber.capabilities?.sms || false,
                inbound_enabled: true,
                outbound_enabled: true,
                is_active: true,
                user_id: userId
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error saving phone number:', dbError);
            return res.status(500).json({ 
                error: 'Failed to save phone number: ' + dbError.message 
            });
        }

        console.log('Phone number imported successfully:', phoneNumberData.id);

        res.json({
            success: true,
            phoneNumber: phoneNumberData,
            webhookConfigured: false, // User needs to configure manually
            capabilities: twilioNumber.capabilities,
            message: 'Phone number verified and imported. Please configure the webhook URL in your Twilio Console.'
        });

    } catch (error) {
        console.error('Twilio verify-import error:', error.response?.data || error.message);
        
        res.status(500).json({ 
            error: error.response?.data?.message || error.message || 'Failed to verify phone number' 
        });
    }
});

/**
 * Import a Twilio phone number directly (ElevenLabs-style)
 * Validates credentials and phone number, then configures webhook
 * POST /api/twilio/import-direct
 * Body: { accountSid, authToken, phoneNumber, label, smsEnabled }
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/import-direct', verifySupabaseAuth, async (req, res) => {
    try {
        const { accountSid, authToken, phoneNumber, label, smsEnabled } = req.body;
        // SECURITY: Use authenticated user ID
        const userId = req.userId;

        if (!accountSid || !authToken || !phoneNumber) {
            return res.status(400).json({ 
                error: 'Account SID, Auth Token, and Phone Number are required' 
            });
        }

        // Validate Twilio credentials format
        if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
            return res.status(400).json({ 
                error: 'Invalid Account SID format. It should start with "AC" and be 34 characters long.' 
            });
        }

        // Normalize phone number to E.164 format
        let normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');
        if (!normalizedNumber.startsWith('+')) {
            normalizedNumber = '+' + normalizedNumber;
        }

        console.log('Importing Twilio number directly:', normalizedNumber, 'for user:', userId);

        // First, find the phone number in Twilio to get its SID
        const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
        
        const searchResponse = await axios.get(searchUrl, {
            auth: {
                username: accountSid,
                password: authToken
            },
            params: {
                PhoneNumber: normalizedNumber
            }
        });

        const phoneNumbers = searchResponse.data.incoming_phone_numbers || [];
        
        if (phoneNumbers.length === 0) {
            return res.status(404).json({ 
                error: `Phone number ${normalizedNumber} not found in your Twilio account. Please make sure you own this number.` 
            });
        }

        const twilioNumber = phoneNumbers[0];
        const phoneNumberSid = twilioNumber.sid;

        console.log('Found Twilio number with SID:', phoneNumberSid);

        // Configure Twilio webhook URL to point to our backend with user-specific path
        // Each user gets their own webhook URL for security and isolation
        const webhookUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/${userId}/voice`;
        const statusCallbackUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/${userId}/status`;

        // Update the phone number in Twilio to use our webhook
        const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`;
        
        const updateData = new URLSearchParams();
        updateData.append('VoiceUrl', webhookUrl);
        updateData.append('VoiceMethod', 'POST');
        updateData.append('StatusCallback', statusCallbackUrl);
        updateData.append('StatusCallbackMethod', 'POST');

        await axios.post(updateUrl, updateData.toString(), {
            auth: {
                username: accountSid,
                password: authToken
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('Twilio number configured with webhook:', webhookUrl);

        // Encrypt the auth token before storing (SECURITY: Never store plain text secrets)
        const encryptedAuthToken = encrypt(authToken);

        // Save to our database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: normalizedNumber,
                provider: 'Twilio',
                label: label || twilioNumber.friendly_name || 'Twilio Number',
                twilio_phone_number: normalizedNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: encryptedAuthToken,
                twilio_phone_sid: phoneNumberSid,
                sms_enabled: smsEnabled || twilioNumber.capabilities?.sms || false,
                inbound_enabled: true,
                outbound_enabled: true,
                is_active: true,
                user_id: userId
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error saving phone number:', dbError);
            return res.status(500).json({ 
                error: 'Phone number configured in Twilio but failed to save to database: ' + dbError.message 
            });
        }

        console.log('Phone number imported successfully:', phoneNumberData.id);

        res.json({
            success: true,
            phoneNumber: phoneNumberData,
            webhookConfigured: true,
            webhookUrl,
            capabilities: twilioNumber.capabilities
        });

    } catch (error) {
        console.error('Twilio import error:', error.response?.data || error.message);
        
        // Handle specific Twilio errors
        if (error.response?.status === 401) {
            return res.status(401).json({ 
                error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.' 
            });
        }
        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Phone number not found in your Twilio account.' 
            });
        }
        
        res.status(500).json({ 
            error: error.response?.data?.message || error.message || 'Failed to import Twilio number' 
        });
    }
});

/**
 * Import a Twilio phone number and configure webhook
 * POST /api/twilio/import-number
 * Body: { accountSid, authToken, phoneNumberSid, phoneNumber, label }
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/import-number', verifySupabaseAuth, async (req, res) => {
    try {
        const { accountSid, authToken, phoneNumberSid, phoneNumber, label, smsEnabled } = req.body;
        // SECURITY: Use authenticated user ID
        const userId = req.userId;

        if (!accountSid || !authToken || !phoneNumberSid || !phoneNumber) {
            return res.status(400).json({ 
                error: 'Account SID, Auth Token, Phone Number SID, and Phone Number are required' 
            });
        }

        console.log('Importing Twilio number:', phoneNumber, 'for user:', userId);

        // Configure Twilio webhook URL to point to our backend with user-specific path
        // Each user gets their own webhook URL for security and isolation
        const webhookUrl = `https://api.voicory.com/api/webhooks/twilio/${userId}/voice`;
        const statusCallbackUrl = `https://api.voicory.com/api/webhooks/twilio/${userId}/status`;

        // Update the phone number in Twilio to use our webhook
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`;
        
        const updateData = new URLSearchParams();
        updateData.append('VoiceUrl', webhookUrl);
        updateData.append('VoiceMethod', 'POST');
        updateData.append('StatusCallback', statusCallbackUrl);
        updateData.append('StatusCallbackMethod', 'POST');

        const twilioResponse = await axios.post(twilioUrl, updateData.toString(), {
            auth: {
                username: accountSid,
                password: authToken
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('Twilio number configured with webhook:', webhookUrl);

        // Encrypt the auth token before storing (SECURITY: Never store plain text secrets)
        const encryptedAuthToken = encrypt(authToken);

        // Save to our database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: phoneNumber,
                provider: 'Twilio',
                label: label || 'Twilio Number',
                twilio_phone_number: phoneNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: encryptedAuthToken, // Encrypted - use decrypt() to retrieve
                twilio_phone_sid: phoneNumberSid,
                sms_enabled: smsEnabled || false,
                inbound_enabled: true,
                outbound_enabled: true,
                is_active: true,
                user_id: userId
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error saving phone number:', dbError);
            return res.status(500).json({ 
                error: 'Phone number configured in Twilio but failed to save to database: ' + dbError.message 
            });
        }

        console.log('Phone number saved to database:', phoneNumberData.id);

        res.json({
            success: true,
            phoneNumber: {
                id: phoneNumberData.id,
                number: phoneNumberData.number,
                provider: phoneNumberData.provider,
                label: phoneNumberData.label,
                twilioPhoneNumber: phoneNumberData.twilio_phone_number,
                twilioAccountSid: phoneNumberData.twilio_account_sid,
                smsEnabled: phoneNumberData.sms_enabled,
                inboundEnabled: phoneNumberData.inbound_enabled,
                outboundEnabled: phoneNumberData.outbound_enabled,
                isActive: phoneNumberData.is_active
            },
            webhookConfigured: true,
            webhookUrl
        });

    } catch (error) {
        console.error('Twilio import error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            return res.status(401).json({ 
                error: 'Invalid Twilio credentials' 
            });
        }
        
        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Phone number not found in your Twilio account' 
            });
        }
        
        res.status(500).json({ 
            error: error.response?.data?.message || error.message || 'Failed to import Twilio number' 
        });
    }
});

/**
 * Twilio Voice Webhook - Handles inbound calls (User-specific)
 * POST /api/webhooks/twilio/:userId/voice
 * 
 * This webhook is called by Twilio when someone calls a number configured with our webhook URL.
 * Each user has their own unique webhook URL for security and isolation.
 * It looks up the phone number configuration and assigned assistant, then responds with TwiML.
 */
router.post('/:userId/voice', async (req, res) => {
    try {
        const { userId } = req.params;
        const callData = req.body;
        console.log('📞 Twilio voice webhook received:', {
            userId,
            callSid: callData.CallSid,
            from: callData.From,
            to: callData.To,
            status: callData.CallStatus
        });

        // Find the phone number configuration with joined assistant data
        // Must match both the phone number AND the user ID for security
        const { data: phoneConfig, error: phoneError } = await supabase
            .from('phone_numbers')
            .select(`
                *,
                assistant:assistants(
                    id, 
                    name, 
                    system_prompt, 
                    first_message,
                    voice_id,
                    language,
                    language_settings,
                    style_settings
                )
            `)
            .eq('twilio_phone_number', callData.To)
            .eq('user_id', userId)
            .single();

        if (phoneError || !phoneConfig) {
            console.log('⚠️ No configuration found for number:', callData.To);
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">Sorry, this number is not configured. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        console.log('📱 Phone config found:', {
            phoneId: phoneConfig.id,
            label: phoneConfig.label,
            hasAssistant: !!phoneConfig.assistant_id
        });

        // If no assistant is assigned, provide a helpful message
        if (!phoneConfig.assistant_id || !phoneConfig.assistant) {
            console.log('⚠️ No assistant assigned to number:', phoneConfig.number);
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">Thank you for calling. This number is active but no AI assistant has been configured yet. Please contact the administrator to assign an assistant. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        const assistant = phoneConfig.assistant;
        console.log('🤖 Assistant found:', {
            id: assistant.id,
            name: assistant.name
        });

        // Use the assistant's configured first_message, or fall back to a generated greeting
        const firstMessage = assistant.first_message || 
            `Hello! Thank you for calling. I'm ${assistant.name || 'your AI assistant'}. How can I help you today?`;

        // Log the incoming call to the database
        const { data: callLog, error: logError } = await supabase
            .from('call_logs')
            .insert({
                call_sid: callData.CallSid,
                phone_number_id: phoneConfig.id,
                assistant_id: assistant.id,
                user_id: phoneConfig.user_id,
                from_number: callData.From,
                to_number: callData.To,
                direction: 'inbound',
                status: 'ringing',
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (logError) {
            console.warn('⚠️ Failed to log call:', logError.message);
        } else {
            console.log('📝 Call logged:', callLog?.id);
        }

        // Respond with first message and open speech gather for AI conversation loop
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">${escapeXml(firstMessage)}</Say>
                <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/webhooks/twilio/${userId}/voice/gather" method="POST">
                </Gather>
                <Say voice="Polly.Joanna">I didn't hear anything. Goodbye!</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('❌ Twilio voice webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">We are experiencing technical difficulties. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Twilio Voice Gather Callback - Handles speech input (User-specific)
 * POST /api/webhooks/twilio/:userId/voice/gather
 */
router.post('/:userId/voice/gather', async (req, res) => {
    try {
        const { userId } = req.params;
        const { SpeechResult, CallSid, From, To } = req.body;
        
        console.log('🎤 Speech gathered:', {
            userId,
            callSid: CallSid,
            speechResult: SpeechResult
        });

        if (!SpeechResult) {
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">I didn't catch that. Could you please repeat?</Say>
                    <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/webhooks/twilio/${userId}/voice/gather" method="POST">
                        <Say voice="Polly.Joanna">I'm listening...</Say>
                    </Gather>
                    <Say voice="Polly.Joanna">Goodbye!</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // Get phone config to find the assistant (with user validation)
        const { data: phoneConfig } = await supabase
            .from('phone_numbers')
            .select(`
                *,
                assistant:assistants(*)
            `)
            .eq('twilio_phone_number', To)
            .eq('user_id', userId)
            .single();

        if (!phoneConfig?.assistant) {
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">Sorry, no assistant is available. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        const assistant = phoneConfig.assistant;

        // Build conversation history from call log if available
        let conversationHistory = [];
        const { data: callLog } = await supabase
            .from('call_logs')
            .select('conversation_history')
            .eq('call_sid', CallSid)
            .single();

        if (callLog?.conversation_history) {
            conversationHistory = callLog.conversation_history;
        }

        // Add user's speech to history
        conversationHistory.push({ role: 'user', content: SpeechResult });

        // Build RAG context if knowledge base is available
        let ragContext = '';
        try {
            const kbResults = await searchKnowledgeBase(assistant.id, SpeechResult);
            if (kbResults?.length > 0) {
                ragContext = formatRAGContext(kbResults);
            }
        } catch (e) {
            console.warn('⚠️ RAG search failed:', e.message);
        }

        // Build memory context
        let memoryContext = '';
        try {
            memoryContext = await formatMemoryForPrompt(assistant.id, CallSid);
        } catch (e) {
            console.warn('⚠️ Memory fetch failed:', e.message);
        }

        // Build system prompt
        const systemPrompt = [
            assistant.system_prompt || `You are ${assistant.name || 'an AI assistant'}. Be helpful, concise, and conversational. You are on a phone call so keep responses brief (1-3 sentences max).`,
            ragContext ? `\nRelevant context:\n${ragContext}` : '',
            memoryContext ? `\nMemory:\n${memoryContext}` : '',
            '\nIMPORTANT: You are on a voice call. Keep responses very short and conversational. No markdown, no lists, no special characters.'
        ].filter(Boolean).join('');

        // Call OpenAI for AI response
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: assistant.model || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory
            ],
            max_tokens: 150,
            temperature: 0.7
        });

        const aiResponse = completion.choices[0]?.message?.content || 
            "I'm sorry, I didn't understand that. Could you please repeat?";

        // Track LLM cost for P&L
        try {
          const _usage = completion.usage || {};
          const _costData = calculateCallCost({
            model: assistant.model || 'gpt-4o-mini',
            inputTokens: _usage.prompt_tokens || 0,
            outputTokens: _usage.completion_tokens || 0,
            creditsCharged: 0,
          });
          logCostToSupabase(null, CallSid || null, {
            ..._costData,
            model: assistant.model || 'gpt-4o-mini',
            inputTokens: _usage.prompt_tokens || 0,
            outputTokens: _usage.completion_tokens || 0,
          }).catch(e => console.error('[costTracking] async log error:', e.message));
        } catch (_costErr) {
          console.error('[costTracking] calculation error:', _costErr.message);
        }

        // Add AI response to history
        conversationHistory.push({ role: 'assistant', content: aiResponse });

        // Persist conversation history to call log
        await supabase
            .from('call_logs')
            .update({ conversation_history: conversationHistory })
            .eq('call_sid', CallSid);

        // Respond with AI message and keep gathering for multi-turn conversation
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">${escapeXml(aiResponse)}</Say>
                <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/webhooks/twilio/${userId}/voice/gather" method="POST">
                </Gather>
                <Say voice="Polly.Joanna">Goodbye!</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('❌ Twilio gather webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">We encountered an error processing your request. Goodbye.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Helper function to escape XML special characters
 */
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Twilio Status Callback - Handles call status updates (User-specific)
 * POST /api/webhooks/twilio/:userId/status
 */
router.post('/:userId/status', async (req, res) => {
    try {
        const { userId } = req.params;
        const statusData = req.body;
        console.log('📊 Twilio status callback:', {
            userId,
            callSid: statusData.CallSid,
            status: statusData.CallStatus,
            duration: statusData.CallDuration
        });

        // Map Twilio status to our status
        const statusMap = {
            'queued': 'queued',
            'ringing': 'ringing',
            'in-progress': 'in_progress',
            'completed': 'completed',
            'busy': 'failed',
            'failed': 'failed',
            'no-answer': 'failed',
            'canceled': 'failed'
        };

        const mappedStatus = statusMap[statusData.CallStatus] || statusData.CallStatus;

        // Update call log in database
        const updateData = {
            status: mappedStatus,
            updated_at: new Date().toISOString()
        };

        // Add duration and end time for completed calls
        if (statusData.CallStatus === 'completed') {
            updateData.ended_at = new Date().toISOString();
            updateData.duration_seconds = parseInt(statusData.CallDuration) || 0;
        }

        const { data: callLog, error } = await supabase
            .from('call_logs')
            .update(updateData)
            .eq('call_sid', statusData.CallSid)
            .select(`
                *,
                assistant:assistants(id, name)
            `)
            .single();

        if (error) {
            console.warn('⚠️ Failed to update call status:', error.message);
        } else {
            console.log('✅ Call status updated:', statusData.CallSid, '->', mappedStatus);

            // Push completed calls to CRM integrations
            if (statusData.CallStatus === 'completed' && callLog) {
                try {
                    // Prepare call data for CRM
                    const callDataForCRM = {
                        phoneNumber: statusData.From || callLog.from_number,
                        direction: callLog.direction || 'inbound',
                        duration: parseInt(statusData.CallDuration) || callLog.duration_seconds || 0,
                        outcome: mappedStatus,
                        summary: callLog.summary || null,
                        transcript: callLog.transcript || null,
                        startedAt: callLog.started_at,
                        endedAt: updateData.ended_at,
                        callSid: statusData.CallSid,
                        assistantName: callLog.assistant?.name || 'AI Assistant'
                    };

                    // Push to all enabled CRM integrations (async, don't wait)
                    pushCallToAllCRMs(userId, callDataForCRM)
                        .then(results => {
                            const successful = results.filter(r => r.success);
                            const failed = results.filter(r => !r.success);
                            if (successful.length > 0) {
                                console.log(`✅ CRM sync: ${successful.length} CRMs updated for call ${statusData.CallSid}`);
                            }
                            if (failed.length > 0) {
                                console.warn(`⚠️ CRM sync failed for: ${failed.map(r => r.provider).join(', ')}`);
                            }
                        })
                        .catch(err => {
                            console.error('❌ CRM sync error:', err.message);
                        });
                } catch (crmError) {
                    // Don't fail the webhook if CRM sync fails
                    console.error('❌ CRM sync error:', crmError.message);
                }
            }
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('❌ Twilio status callback error:', error);
        res.sendStatus(500);
    }
});

/**
 * Test Outbound Call - Make a test call to verify agent connectivity
 * POST /api/twilio/test-call
 * 
 * Body: { phoneNumberId, toNumber }
 * - phoneNumberId: ID of the imported phone number to call FROM
 * - toNumber: Phone number to call TO (with country code, e.g., +1234567890)
 */
router.post('/test-call', async (req, res) => {
    try {
        const { phoneNumberId, toNumber } = req.body;

        if (!phoneNumberId || !toNumber) {
            return res.status(400).json({ 
                error: 'Missing required fields: phoneNumberId and toNumber' 
            });
        }

        // Validate toNumber format (must start with + and have digits)
        if (!/^\+[1-9]\d{6,14}$/.test(toNumber)) {
            return res.status(400).json({ 
                error: 'Invalid phone number format. Use E.164 format (e.g., +14155551234)' 
            });
        }

        // Fetch phone number with credentials
        const { data: phoneData, error: fetchError } = await supabase
            .from('phone_numbers')
            .select('*')
            .eq('id', phoneNumberId)
            .single();

        if (fetchError || !phoneData) {
            return res.status(404).json({ error: 'Phone number not found' });
        }

        if (!phoneData.outbound_enabled) {
            return res.status(400).json({ error: 'Outbound calls are disabled for this number' });
        }

        // Get decrypted credentials
        const accountSid = phoneData.twilio_account_sid;
        const authToken = decrypt(phoneData.twilio_auth_token);

        if (!accountSid || !authToken) {
            return res.status(400).json({ 
                error: 'Missing Twilio credentials. Please re-import the phone number.' 
            });
        }

        // Create Twilio client with user's credentials
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);

        // Build webhook URL for this user
        const backendUrl = process.env.BACKEND_URL || 'https://backendvoicory-732127099858.asia-south1.run.app';
        const webhookUrl = `${backendUrl}/api/twilio/${phoneData.user_id}/voice`;
        const statusCallbackUrl = `${backendUrl}/api/twilio/${phoneData.user_id}/status`;

        console.log('📞 Initiating test call:', {
            from: phoneData.twilio_phone_number,
            to: toNumber,
            webhookUrl
        });

        // Initiate the call
        const call = await client.calls.create({
            from: phoneData.twilio_phone_number,
            to: toNumber,
            url: webhookUrl,
            statusCallback: statusCallbackUrl,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
            machineDetection: 'Enable', // Detect voicemail
            timeout: 30 // 30 seconds to answer
        });

        console.log('✅ Test call initiated:', call.sid);

        res.json({
            success: true,
            callSid: call.sid,
            status: call.status,
            from: phoneData.twilio_phone_number,
            to: toNumber,
            message: 'Test call initiated. Your phone should ring shortly.'
        });

    } catch (error) {
        console.error('❌ Test call error:', error.message);
        
        // Handle specific Twilio errors
        if (error.code === 21211) {
            return res.status(400).json({ error: 'Invalid "To" phone number' });
        }
        if (error.code === 21214) {
            return res.status(400).json({ error: 'The "To" number is not a valid phone number' });
        }
        if (error.code === 21606) {
            return res.status(400).json({ error: 'This phone number is not verified for outbound calls' });
        }
        
        res.status(500).json({ 
            error: error.message || 'Failed to initiate test call' 
        });
    }
});


module.exports = router;
