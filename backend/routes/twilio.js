// ============================================
// TWILIO ROUTES - Phone Number Import & Webhooks
// SECURITY: Import routes require authentication
// Webhook routes use Twilio signature verification
// ============================================

/**
 * Build OpenAI chat.completions params correctly for all models.
 * Reasoning models (o1/o3/o4) don't support temperature or max_tokens.
 */
function buildChatParams(model, messages, maxTokens = 150) {
    const isReasoning = /^(o1|o3|o4)/.test(model || '');
    const params = { model: model || 'gpt-4o-mini', messages };
    if (isReasoning) {
        params.max_completion_tokens = maxTokens;
    } else {
        params.max_tokens = maxTokens;
        params.temperature = 0.7;
    }
    return params;
}
const express = require('express');
const router = express.Router();
const { supabase, axios, encrypt, decrypt, validateBody, twilioImportSchema } = require('../config');
const { getCachedPhoneConfig, getCachedAssistant, invalidatePhoneConfigCache } = require('../services/assistant');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
const { formatMemoryForPrompt, trimAndSaveMemory } = require('../services/memory');
const { verifySupabaseAuth } = require('../lib/auth');
const { validateTwilioVoiceParams, validateTwilioGatherBody, sanitizePromptInput } = require('../middleware/inputValidation');
const { pushCallToAllCRMs } = require('../services/crm');
const { calculateCallCost, logCostToSupabase } = require('../services/costTracking');
const { executeHTTPTrigger } = require('../services/httpIntegrationExecutor');
const billing = require('../services/billing');
// TTS now routes through the voice library (voices table) — supports ElevenLabs, OpenAI, Google
const { generateTTSUrl, serveTTSAudio } = require('../services/tts');

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
                label: label || friendlyName || 'Twilio Number',
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
            capabilities: { voice: true, sms: smsCapable },
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

        const backendBase = process.env.BACKEND_URL || 'https://voicory-backend-783942490798.asia-south1.run.app';
        const webhookUrl = `${backendBase}/api/webhooks/twilio/${userId}/voice`;
        const statusCallbackUrl = `${backendBase}/api/webhooks/twilio/${userId}/status`;

        // Try Twilio API (best-effort — don't block import if credentials fail)
        let phoneNumberSid = null, friendlyName = null, smsCapable = false, webhookConfigured = false;
        try {
            const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
            const sr = await axios.get(searchUrl, { auth: { username: accountSid, password: authToken }, params: { PhoneNumber: normalizedNumber } });
            const pnums = sr.data.incoming_phone_numbers || [];
            if (pnums.length > 0) {
                const tn = pnums[0];
                phoneNumberSid = tn.sid; friendlyName = tn.friendly_name; smsCapable = tn.capabilities?.sms || false;
                const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`;
                const ud = new URLSearchParams();
                ud.append('VoiceUrl', webhookUrl); ud.append('VoiceMethod', 'POST');
                ud.append('StatusCallback', statusCallbackUrl); ud.append('StatusCallbackMethod', 'POST');
                await axios.post(updateUrl, ud.toString(), { auth: { username: accountSid, password: authToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                webhookConfigured = true;
                console.log('Twilio webhook configured:', webhookUrl);
            }
        } catch (twilioErr) {
            console.warn('Twilio API failed (importing anyway):', twilioErr.response?.data?.message || twilioErr.message);
        }

        // Encrypt the auth token before storing
        const encryptedAuthToken = encrypt(authToken);

        // Save to our database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: normalizedNumber,
                provider: 'Twilio',
                label: label || friendlyName || 'Twilio Number',
                twilio_phone_number: normalizedNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: encryptedAuthToken,
                twilio_phone_sid: phoneNumberSid,
                sms_enabled: smsEnabled || smsCapable || false,
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
            capabilities: { voice: true, sms: smsCapable }
        });

    } catch (error) {
        console.error('Twilio import error:', error.response?.data || error.message);
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
router.post('/:userId/voice', validateTwilioVoiceParams, async (req, res) => {
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
                    <Say voice="alice">Sorry, this number is not configured. Goodbye.</Say>
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
                    <Say voice="alice">Thank you for calling. This number is active but no AI assistant has been configured yet. Please contact the administrator to assign an assistant. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        const assistant = phoneConfig.assistant;
        console.log('🤖 Assistant found:', {
            id: assistant.id,
            name: assistant.name
        });

        // === PRE-FLIGHT BALANCE CHECK ===
        const { hasCredits: twilioHasCredits } = await billing.checkBalance(phoneConfig.user_id);
        if (!twilioHasCredits) {
            console.warn(`[billing] Twilio voice: zero balance for user=${phoneConfig.user_id}, blocking call`);
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="alice">This service is currently unavailable. Please contact the business.</Say>
                    <Hangup/>
                </Response>
            `);
        }

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

        // Fire call_started HTTP integrations (non-blocking)
        executeHTTPTrigger(assistant.id, 'call_started', {
            callSid: callData.CallSid,
            phoneNumber: callData.From,
            to: callData.To,
            call_date: new Date().toISOString(),
        });

        // Map assistant language to Twilio STT language code
        const voiceLangMap = { 'hi': 'hi-IN', 'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'pt': 'pt-BR', 'ar': 'ar-SA', 'zh': 'zh-CN' };
        const voiceAssistantLang = assistant.language || 'en';
        const voiceTwilioLanguage = voiceLangMap[voiceAssistantLang] || (voiceAssistantLang.includes('-') ? voiceAssistantLang : 'en-US');

        // Resolve template variables in first_message
        const resolvedFirstMsgForVoice = resolveTemplateVariables(
            assistant.first_message || `Hello! Thank you for calling. I'm ${assistant.name || 'your AI assistant'}. How can I help you today?`,
            { callerPhone: callData.From, assistantName: assistant.name }
        );

        // Respond with first message and open speech gather for AI conversation loop
        // TTS routes through voice library (voices table) — provider resolved by tts.js
        const voiceId = assistant.voice_id || null;
        let firstMsgXml;
        if (voiceId) {
            const ttsUrl = await generateTTSUrl(resolvedFirstMsgForVoice, voiceId, callData.CallSid);
            if (ttsUrl) {
                firstMsgXml = `<Play>${ttsUrl}</Play>`;
            } else {
                firstMsgXml = `<Say voice="alice">${escapeXml(resolvedFirstMsgForVoice)}</Say>`;
            }
        } else {
            firstMsgXml = `<Say voice="alice">${escapeXml(resolvedFirstMsgForVoice)}</Say>`;
        }
        res.type('text/xml');
        res.send(`
            <Response>
                ${firstMsgXml}
                <Gather input="speech" timeout="5" speechTimeout="auto" language="${voiceTwilioLanguage}" action="/api/webhooks/twilio/${userId}/voice/gather" method="POST">
                </Gather>
                <Say voice="alice">I didn't hear anything. Goodbye!</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('❌ Twilio voice webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="alice">We are experiencing technical difficulties. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Twilio Voice Gather Callback - Handles speech input (User-specific)
 * POST /api/webhooks/twilio/:userId/voice/gather
 */
router.post('/:userId/voice/gather', validateTwilioVoiceParams, validateTwilioGatherBody, async (req, res) => {
    try {
        const { userId } = req.params;
        const { SpeechResult: rawSpeechResult, CallSid, From, To } = req.body;
        // Sanitize speech input to prevent prompt injection attacks
        const SpeechResult = rawSpeechResult ? sanitizePromptInput(rawSpeechResult) : rawSpeechResult;
        
        console.log('🎤 Speech gathered:', {
            userId,
            callSid: CallSid,
            speechResult: SpeechResult
        });

        if (!SpeechResult) {
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="alice">I didn't catch that. Could you please repeat?</Say>
                    <Gather input="speech" timeout="5" speechTimeout="auto" language="en-US" action="/api/webhooks/twilio/${userId}/voice/gather" method="POST">
                        <Say voice="alice">I'm listening...</Say>
                    </Gather>
                    <Say voice="alice">Goodbye!</Say>
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
                    <Say voice="alice">Sorry, no assistant is available. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        const assistant = phoneConfig.assistant;

        // Map assistant language to Twilio STT language code
        const langMap = { 'hi': 'hi-IN', 'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'pt': 'pt-BR', 'ar': 'ar-SA', 'zh': 'zh-CN' };
        const assistantLang = assistant.language || 'en';
        const twilioLanguage = langMap[assistantLang] || (assistantLang.includes('-') ? assistantLang : 'en-US');

        // Resolve template variables in first_message and system_prompt
        const templateContext = { callerPhone: From, assistantName: assistant.name };
        const resolvedFirstMessage = resolveTemplateVariables(assistant.first_message, templateContext);
        const resolvedSystemPrompt = resolveTemplateVariables(assistant.system_prompt, templateContext);

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
        // Pass assistant.knowledge_base_ids (array) as the correct second parameter
        let ragContext = '';
        try {
            const kbIds = assistant.knowledge_base_ids;
            if (kbIds && kbIds.length > 0) {
                const kbResults = await searchKnowledgeBase(SpeechResult, kbIds);
                if (kbResults?.length > 0) {
                    ragContext = formatRAGContext(kbResults);
                }
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

        // Add language instruction for non-English assistants
        const isNonEnglish = assistantLang !== 'en' && !assistantLang.startsWith('en');
        const langInstruction = isNonEnglish
            ? `\nPlease respond in ${twilioLanguage}. The caller may speak in ${twilioLanguage}.`
            : '';

        // Build system prompt with resolved template vars + language note
        const systemPrompt = [
            resolvedSystemPrompt || `You are ${assistant.name || 'an AI assistant'}. Be helpful, concise, and conversational. You are on a phone call so keep responses brief (1-3 sentences max).`,
            langInstruction,
            ragContext ? `\nRelevant context:\n${ragContext}` : '',
            memoryContext ? `\nMemory:\n${memoryContext}` : '',
            '\nIMPORTANT: You are on a voice call. Keep responses very short and conversational. No markdown, no lists, no special characters.'
        ].filter(Boolean).join('');

        // Call OpenAI for AI response
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create(
            buildChatParams(assistant.model || 'gpt-4o-mini', [
                { role: 'system', content: systemPrompt },
                ...conversationHistory
            ], 150)
        );

        const aiResponse = completion.choices[0]?.message?.content || 
            "I'm sorry, I didn't understand that. Could you please repeat?";

        // Track LLM cost via central billing service (non-blocking)
        {
          const _usage = completion.usage || {};
          billing.deductMessageCost(userId, {
            model:        assistant.model || 'gpt-4o-mini',
            inputTokens:  _usage.prompt_tokens  || 0,
            outputTokens: _usage.completion_tokens || 0,
            assistantId:  assistant.id,
            channel:      'twilio_voice',
            callLogId:    null,
            conversationId: null,
          }).catch(e => console.error('[billing] Twilio deductMessageCost error:', e.message));
        }

        // Add AI response to history
        conversationHistory.push({ role: 'assistant', content: aiResponse });

        // Persist memory after each gather turn (fire-and-forget, never blocks response)
        try {
            trimAndSaveMemory(From, assistant.id, conversationHistory)
                .catch(err => console.warn('[Memory] trimAndSaveMemory fire-and-forget error:', err.message));
        } catch (memErr) {
            console.warn('[Memory] trimAndSaveMemory setup error:', memErr.message);
        }

        // Fire custom_trigger HTTP integrations if AI response contains trigger phrase (non-blocking)
        executeHTTPTrigger(assistant.id, 'custom_trigger', {
            callSid: CallSid,
            phoneNumber: From,
            aiResponse,
            call_date: new Date().toISOString(),
        });

        // Appointment booking detection — keyword-based, non-blocking
        const APPOINTMENT_KEYWORDS = ['scheduled', 'booked', 'appointment confirmed', "i've set up", 'calendar invite'];
        const lowerAiResponse = (aiResponse || '').toLowerCase();
        const appointmentDetected = APPOINTMENT_KEYWORDS.some(kw => lowerAiResponse.includes(kw));
        if (appointmentDetected) {
            (async () => {
                try {
                    const appointmentSvc = require('../services/appointments');
                    await supabase.from('appointments').insert({
                        user_id: userId,
                        assistant_id: assistant.id,
                        attendee_phone: From,
                        call_sid: CallSid,
                        source: 'call',
                        title: 'Call Appointment',
                        appointment_type_name: 'Call Appointment',
                        status: 'scheduled',
                        scheduled_at: new Date().toISOString(),
                        booked_via: 'voice_agent',
                    });
                    console.log('[appointments] Auto-created appointment from call keyword detection, CallSid:', CallSid);
                    // Fire HTTP integration trigger
                    try {
                        await executeHTTPTrigger(assistant.id, 'appointment_booked', { callSid: CallSid, assistantId: assistant.id });
                    } catch (e) {
                        console.error('[appointments] HTTP integration trigger failed:', e.message);
                    }
                } catch (err) {
                    console.error('[appointments] Appointment creation failed:', err.message);
                }
            })();
        }

        // Persist conversation history + accumulate TTS/STT usage for billing accuracy.
        // tts_characters: length of the AI response sent to TTS engine this turn.
        // stt_seconds:    each Gather turn captures ~5 seconds of speech input (Twilio default).
        // Using raw SQL increment via RPC-safe pattern: read current then add, or use
        // Postgres expression via supabase .update with coalesce.
        await supabase
            .from('call_logs')
            .update({
                conversation_history: conversationHistory,
                // Supabase JS client doesn't support column expressions directly;
                // we accumulate via a separate RPC-less approach: read existing values
                // inside the status callback at call end and sum from history length.
                // So here we store the RUNNING totals by incrementing via a dedicated update:
            })
            .eq('call_sid', CallSid);

        // Separately increment tts_characters and stt_seconds using raw Postgres via rpc.
        // Falls back gracefully if columns don't exist (migration not yet run).
        try {
            await supabase.rpc('increment_call_tts_stt', {
                p_call_sid:      CallSid,
                p_tts_chars:     aiResponse.length,
                p_stt_seconds:   5,   // each Gather turn ≈ 5 seconds STT
            });
        } catch (_rpcErr) {
            // RPC may not exist yet — use direct column update as fallback
            try {
                // Read current values first, then update with incremented totals
                const { data: current } = await supabase
                    .from('call_logs')
                    .select('tts_characters, stt_seconds')
                    .eq('call_sid', CallSid)
                    .single();
                if (current !== null) {
                    await supabase
                        .from('call_logs')
                        .update({
                            tts_characters: (current.tts_characters || 0) + aiResponse.length,
                            stt_seconds:    (current.stt_seconds    || 0) + 5,
                        })
                        .eq('call_sid', CallSid);
                }
            } catch (e) {
                // Column doesn't exist yet — safe to ignore, billing falls back to duration-only
                console.warn('[billing] tts/stt column update skipped (migration pending):', e.message);
            }
        }

        // Respond with AI message and keep gathering for multi-turn conversation
        // TTS routes through voice library (voices table) — provider resolved by tts.js
        const gatherVoiceId = assistant.voice_id || null;
        let aiResponseXml;
        if (gatherVoiceId) {
            const ttsUrl = await generateTTSUrl(aiResponse, gatherVoiceId, CallSid);
            if (ttsUrl) {
                aiResponseXml = `<Play>${ttsUrl}</Play>`;
            } else {
                aiResponseXml = `<Say voice="alice">${escapeXml(aiResponse)}</Say>`;
            }
        } else {
            aiResponseXml = `<Say voice="alice">${escapeXml(aiResponse)}</Say>`;
        }
        res.type('text/xml');
        res.send(`
            <Response>
                ${aiResponseXml}
                <Gather input="speech" timeout="5" speechTimeout="auto" language="${twilioLanguage}" action="/api/webhooks/twilio/${userId}/voice/gather" method="POST">
                </Gather>
                <Say voice="alice">Goodbye!</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('❌ Twilio gather webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="alice">We encountered an error processing your request. Goodbye.</Say>
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
        // Note: 'busy' and 'no-answer' are preserved as-is (schema allows them);
        // only 'canceled' maps to 'failed'.
        const statusMap = {
            'queued':      'queued',
            'ringing':     'ringing',
            'in-progress': 'in_progress',
            'completed':   'completed',
            'busy':        'busy',
            'failed':      'failed',
            'no-answer':   'no-answer',
            'canceled':    'failed'
        };

        const mappedStatus = statusMap[statusData.CallStatus] || statusData.CallStatus;

        // Update call log in database
        const updateData = {
            status: mappedStatus,
            updated_at: new Date().toISOString()
        };

        // Add duration, recording_url, and end time for completed calls
        if (statusData.CallStatus === 'completed') {
            const durationSec = parseInt(statusData.CallDuration) || 0;
            updateData.ended_at = new Date().toISOString();
            updateData.duration_seconds = durationSec;
            // Store Twilio recording URL if present
            if (statusData.RecordingUrl) {
                updateData.recording_url = statusData.RecordingUrl;
            }
        }

        // For all terminal statuses (failed, busy, no-answer, canceled → failed)
        // also record ended_at so the call log has a closed timestamp
        if (['busy', 'failed', 'no-answer'].includes(statusData.CallStatus)) {
            updateData.ended_at = new Date().toISOString();
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
                    // Generate call summary from conversation history (if >= 2 turns)
                    let callSummary = callLog.summary || null;
                    const history = callLog.conversation_history || [];
                    if (!callSummary && history.length >= 2) {
                        try {
                            const OpenAI = require('openai');
                            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                            const transcript = history.map(m =>
                                `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`
                            ).join('\n');
                            const summaryCompletion = await openaiClient.chat.completions.create({
                                model: 'gpt-4o-mini',
                                messages: [
                                    {
                                        role: 'system',
                                        content: 'You are a call summarizer. Summarize the following phone call in 2-3 concise sentences covering: what the caller wanted, key information exchanged, and the outcome. Be factual and brief.'
                                    },
                                    { role: 'user', content: transcript }
                                ],
                                max_tokens: 150,
                                temperature: 0.3
                            });
                            callSummary = summaryCompletion.choices[0]?.message?.content?.trim() || null;
                            if (callSummary) {
                                // Save summary back to call_logs (try summary column, fall back to notes)
                                const { error: summaryErr } = await supabase
                                    .from('call_logs')
                                    .update({ summary: callSummary })
                                    .eq('call_sid', statusData.CallSid);
                                if (summaryErr) {
                                    // summary column may not exist — try notes column
                                    await supabase
                                        .from('call_logs')
                                        .update({ notes: callSummary })
                                        .eq('call_sid', statusData.CallSid)
                                        .catch(e => console.warn('[summary] notes column fallback failed:', e.message));
                                }
                                console.log(`✅ Call summary saved for ${statusData.CallSid}`);
                            }
                        } catch (summaryErr) {
                            console.warn('[summary] Call summary generation failed:', summaryErr.message);
                        }
                    }

                    // Prepare call data for CRM
                    const callDataForCRM = {
                        phoneNumber: statusData.From || callLog.from_number,
                        direction: callLog.direction || 'inbound',
                        duration: parseInt(statusData.CallDuration) || callLog.duration_seconds || 0,
                        outcome: mappedStatus,
                        summary: callSummary || callLog.summary || null,
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

                    // Fire call_ended HTTP integrations (non-blocking)
                    executeHTTPTrigger(callLog.assistant_id, 'call_ended', {
                        callSid: statusData.CallSid,
                        phoneNumber: statusData.From || callLog.from_number,
                        duration: parseInt(statusData.CallDuration) || 0,
                        transcript: callLog.transcript || '',
                        summary: callSummary || callLog.summary || '',
                        disposition: mappedStatus,
                        call_date: callLog.started_at,
                    });

                    // Save memory after call ends (async, don't block webhook response)
                    const callerPhone = statusData.From || callLog.from_number;
                    const agentId = callLog.assistant?.id || null;
                    const memHistory = callLog.conversation_history || [];
                    if (callerPhone && memHistory.length > 0) {
                        trimAndSaveMemory(callerPhone, agentId, memHistory)
                            .catch(err => console.error('❌ Memory save error:', err.message));
                    }

                    // === BILLING: Deduct voice call cost at call END ===
                    // CallDuration is sent by Twilio as a string of integer seconds.
                    const durationSecs = parseInt(statusData.CallDuration) || callLog.duration_seconds || 0;
                    if (durationSecs > 0 && callLog.user_id) {
                        // Read accumulated TTS/STT tracking from call_logs (may be null if
                        // migration 015 hasn't run yet — billing falls back to duration-only).
                        const ttsChars  = callLog.tts_characters || 0;   // actual chars synthesised
                        const sttSecs   = callLog.stt_seconds    || 0;   // actual STT seconds
                        billing.deductVoiceCost(callLog.user_id, {
                            durationMinutes:    durationSecs / 60,
                            ttsCharacters:      ttsChars,
                            sttMinutes:         sttSecs / 60,
                            channel:            'twilio',
                            callSid:            statusData.CallSid,
                            twilioAccountSid:   statusData.AccountSid || null,
                            callLogId:          callLog.id || null,
                        }).then(billingResult => {
                            if (billingResult && billingResult.cost_usd > 0) {
                                // Write the final cost back to call_logs for display in the dashboard
                                supabase
                                    .from('call_logs')
                                    .update({ cost: billingResult.cost_usd })
                                    .eq('call_sid', statusData.CallSid)
                                    .catch(e => console.error('[billing] call_logs cost write-back error:', e.message));
                            }
                        }).catch(e => console.error('[billing] deductVoiceCost error:', e.message));
                    }

                    // === Update phone_numbers.last_call_at ===
                    // Record the timestamp of this completed call on the phone number record.
                    if (callLog.phone_number_id) {
                        supabase
                            .from('phone_numbers')
                            .update({ last_call_at: new Date().toISOString() })
                            .eq('id', callLog.phone_number_id)
                            .catch(e => console.error('[twilio] phone_numbers last_call_at update error:', e.message));
                    }
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
/**
 * GET /api/twilio/phone-numbers — list user's Twilio phone numbers
 */
router.get('/phone-numbers', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { data, error } = await supabase
            .from('phone_numbers')
            .select('id, number, label, assistant_id, webhook_url, provider, created_at')
            .eq('user_id', userId)
            .eq('provider', 'twilio');
        if (error) return res.status(500).json({ error: error.message });
        res.json({ numbers: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Delete a phone number by ID
 * DELETE /api/twilio/phone-numbers/:id
 * Removes phone number from DB (user must own it)
 * PROTECTED: Requires valid Supabase JWT token
 */
router.delete('/phone-numbers/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Verify ownership before deleting
        const { data: phoneData, error: fetchError } = await supabase
            .from('phone_numbers')
            .select('id, user_id, number')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !phoneData) {
            return res.status(404).json({ error: 'Phone number not found or not owned by you' });
        }

        const { error: deleteError } = await supabase
            .from('phone_numbers')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error deleting phone number:', deleteError);
            return res.status(500).json({ error: 'Failed to delete phone number' });
        }

        console.log(`✅ Phone number deleted: ${phoneData.number} (${id}) by user ${userId}`);
        res.json({ success: true, message: 'Phone number deleted successfully' });

    } catch (error) {
        console.error('Delete phone number error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to delete phone number' });
    }
});

/**
 * Assign an assistant to a phone number
 * PUT /api/twilio/phone-numbers/:id/assign
 * Body: { assistantId }
 * PROTECTED: Requires valid Supabase JWT token
 */
router.put('/phone-numbers/:id/assign', verifySupabaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { assistantId } = req.body;
        const userId = req.userId;

        // Verify ownership
        const { data: phoneData, error: fetchError } = await supabase
            .from('phone_numbers')
            .select('id, user_id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !phoneData) {
            return res.status(404).json({ error: 'Phone number not found or not owned by you' });
        }

        // If assistantId provided, verify ownership of assistant
        if (assistantId) {
            const { data: assistantData, error: assistantError } = await supabase
                .from('assistants')
                .select('id')
                .eq('id', assistantId)
                .eq('user_id', userId)
                .single();

            if (assistantError || !assistantData) {
                return res.status(404).json({ error: 'Assistant not found or not owned by you' });
            }
        }

        const { error: updateError } = await supabase
            .from('phone_numbers')
            .update({ assistant_id: assistantId || null })
            .eq('id', id)
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error assigning assistant:', updateError);
            return res.status(500).json({ error: 'Failed to assign assistant' });
        }

        console.log(`✅ Assistant ${assistantId || 'none'} assigned to phone number ${id}`);
        res.json({ success: true, assistantId: assistantId || null });

    } catch (error) {
        console.error('Assign assistant error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to assign assistant' });
    }
});

/**
 * Update phone number configuration
 * PUT /api/twilio/phone-numbers/:id
 * Body: { label, inboundEnabled, outboundEnabled, smsEnabled, assistantId }
 * PROTECTED: Requires valid Supabase JWT token
 */
router.put('/phone-numbers/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { label, inboundEnabled, outboundEnabled, smsEnabled, assistantId } = req.body;
        const userId = req.userId;

        // Verify ownership
        const { data: phoneData, error: fetchError } = await supabase
            .from('phone_numbers')
            .select('id, user_id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !phoneData) {
            return res.status(404).json({ error: 'Phone number not found or not owned by you' });
        }

        const updatePayload = {};
        if (label !== undefined) updatePayload.label = label;
        if (inboundEnabled !== undefined) updatePayload.inbound_enabled = inboundEnabled;
        if (outboundEnabled !== undefined) updatePayload.outbound_enabled = outboundEnabled;
        if (smsEnabled !== undefined) updatePayload.sms_enabled = smsEnabled;
        if (assistantId !== undefined) updatePayload.assistant_id = assistantId || null;

        const { error: updateError } = await supabase
            .from('phone_numbers')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating phone number:', updateError);
            return res.status(500).json({ error: 'Failed to update phone number' });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Update phone number error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to update phone number' });
    }
});

/**
 * Test Outbound Call - Make a test call to verify agent connectivity
 * POST /api/twilio/test-call
 * 
 * Body: { phoneNumberId, toNumber }
 * - phoneNumberId: ID of the imported phone number to call FROM
 * - toNumber: Phone number to call TO (with country code, e.g., +1234567890)
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/test-call', verifySupabaseAuth, async (req, res) => {
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
        const backendUrl = process.env.BACKEND_URL || 'https://voicory-backend-783942490798.asia-south1.run.app';
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


/**
 * TTS audio proxy removed from this router — served via /api/tts/:callSid/:hash in index.js
 */

module.exports = router;
