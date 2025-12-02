// ============================================
// TWILIO ROUTES - Phone Number Import & Webhooks
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, encrypt, decrypt, validateBody, twilioImportSchema } = require('../config');
const { getCachedPhoneConfig, getCachedAssistant, invalidatePhoneConfigCache } = require('../services/assistant');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
const { formatMemoryForPrompt } = require('../services/memory');

// ============================================
// TWILIO PHONE NUMBER IMPORT
// ============================================

/**
 * Import a Twilio phone number directly (ElevenLabs-style)
 * Validates credentials and phone number, then configures webhook
 * POST /api/twilio/import-direct
 * Body: { accountSid, authToken, phoneNumber, label, userId, smsEnabled }
 */
router.post('/api/twilio/import-direct', async (req, res) => {
    try {
        const { accountSid, authToken, phoneNumber, label, userId, smsEnabled } = req.body;

        if (!accountSid || !authToken || !phoneNumber || !userId) {
            return res.status(400).json({ 
                error: 'Account SID, Auth Token, Phone Number, and User ID are required' 
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

        // Configure Twilio webhook URL to point to our backend
        const webhookUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/voice`;
        const statusCallbackUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/status`;

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
 * Body: { accountSid, authToken, phoneNumberSid, phoneNumber, label, userId }
 */
router.post('/api/twilio/import-number', async (req, res) => {
    try {
        const { accountSid, authToken, phoneNumberSid, phoneNumber, label, userId, smsEnabled } = req.body;

        if (!accountSid || !authToken || !phoneNumberSid || !phoneNumber || !userId) {
            return res.status(400).json({ 
                error: 'Account SID, Auth Token, Phone Number SID, Phone Number, and User ID are required' 
            });
        }

        console.log('Importing Twilio number:', phoneNumber, 'for user:', userId);

        // Configure Twilio webhook URL to point to our backend
        // This URL will handle inbound calls
        const webhookUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/voice`;
        const statusCallbackUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/status`;

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
 * Twilio Voice Webhook - Handles inbound calls
 * POST /api/webhooks/twilio/voice
 */
router.post('/api/webhooks/twilio/voice', async (req, res) => {
    try {
        const callData = req.body;
        console.log('Twilio voice webhook received:', {
            callSid: callData.CallSid,
            from: callData.From,
            to: callData.To,
            status: callData.CallStatus
        });

        // Find the phone number configuration
        const { data: phoneConfig } = await supabase
            .from('phone_numbers')
            .select('*, assistants(*)')
            .eq('twilio_phone_number', callData.To)
            .single();

        if (!phoneConfig) {
            console.log('No configuration found for number:', callData.To);
            // Return basic TwiML to reject the call gracefully
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say>Sorry, this number is not configured. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // If no assistant configured, provide a basic response
        if (!phoneConfig.assistant_id) {
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say>Thank you for calling. No assistant has been configured for this number yet. Please try again later.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // TODO: Integrate with your AI voice calling system
        // For now, return a placeholder response
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">Hello! Thank you for calling. This line is powered by Voicory AI. An assistant will be with you shortly.</Say>
                <Pause length="2"/>
                <Say voice="Polly.Joanna">Goodbye!</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('Twilio voice webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say>We are experiencing technical difficulties. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Twilio Status Callback - Handles call status updates
 * POST /api/webhooks/twilio/status
 */
router.post('/api/webhooks/twilio/status', async (req, res) => {
    try {
        const statusData = req.body;
        console.log('Twilio status callback:', {
            callSid: statusData.CallSid,
            status: statusData.CallStatus,
            duration: statusData.CallDuration
        });

        // Log call to database if needed
        // For now, just acknowledge
        res.sendStatus(200);

    } catch (error) {
        console.error('Twilio status callback error:', error);
        res.sendStatus(500);
    }
});


module.exports = router;
