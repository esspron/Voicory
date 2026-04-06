// ============================================
// EXOTEL ROUTES — BYOK Phone Import + ExoML Webhook + WebSocket Audio
//
// Architecture:
// - TTS routed through voice library (voices table) via services/tts.js
// - STT: Deepgram (preferred) or OpenAI Whisper fallback
// - GPT: assistant.system_prompt + RAG + memory
// - VAD: silence detection via chunk threshold (~500ms @ 8kHz μ-law)
//
// WebSocket flow (Exotel bidirectional stream):
//   connected → start → media* → stop
//
// Endpoints:
//   POST /api/exotel/verify-import
//   POST /api/exotel/import-number
//   GET  /api/exotel/phone-numbers
//   DELETE /api/exotel/phone-numbers/:id
//   PUT /api/exotel/phone-numbers/:id/assign
//   POST /api/webhooks/exotel/:userId/voice
//   POST /api/webhooks/exotel/:userId/status
//
// WebSocket handler exported as: handleExotelWebSocket
// ============================================

const express = require('express');
const router = express.Router();
const axios = require('axios').default || require('axios');
const FormData = require('form-data');
const { supabase } = require('../config');
const { verifySupabaseAuth } = require('../lib/auth');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');
const { formatMemoryForPrompt, trimAndSaveMemory } = require('../services/memory');
const billing = require('../services/billing');
const { pushCallToAllCRMs } = require('../services/crm');
const { calculateCallCost, logCostToSupabase } = require('../services/costTracking');
const { generateTTSForCall } = require('../services/tts');
const { executeHTTPTrigger } = require('../services/httpIntegrationExecutor');

// ============================================
// CONSTANTS & HELPERS
// ============================================

const BACKEND_URL = process.env.BACKEND_URL || 'https://voicory-backend-783942490798.asia-south1.run.app';

// VAD threshold: ~500ms of silence at 8kHz μ-law (160 bytes/chunk @ 20ms = 25 chunks)
const VAD_SILENCE_CHUNKS = 25;

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ============================================
// BYOK — VERIFY EXOTEL CREDENTIALS
// POST /api/exotel/verify-import
// ============================================
router.post('/verify-import', verifySupabaseAuth, async (req, res) => {
    try {
        const { accountSid, apiKey, apiToken, phoneNumber } = req.body;

        if (!accountSid || !apiKey || !apiToken || !phoneNumber) {
            return res.status(400).json({
                error: 'accountSid, apiKey, apiToken, and phoneNumber are required'
            });
        }

        let normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');
        if (!normalizedNumber.startsWith('+')) {
            normalizedNumber = '+' + normalizedNumber;
        }

        // Verify credentials against Exotel API
        // Exotel API base: https://<accountSid>:<apiKey>:<apiToken>@api.exotel.com
        const exotelBase = `https://api.exotel.com/v2/accounts/${accountSid}`;
        let verifyResp;
        try {
            verifyResp = await axios.get(`${exotelBase}/numbers`, {
                auth: { username: `${accountSid}:${apiKey}`, password: apiToken },
                timeout: 10000
            });
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                return res.status(401).json({ error: 'Invalid Exotel credentials.' });
            }
            return res.status(502).json({ error: 'Could not reach Exotel API. Check credentials.' });
        }

        // Look for the phone number in the list
        const numbers = verifyResp.data?.items || verifyResp.data?.Numbers || [];
        const found = numbers.find(n => {
            const num = n.phone_number || n.Number || '';
            return num.replace(/[^\d+]/g, '') === normalizedNumber.replace(/[^\d+]/g, '');
        });

        if (!found) {
            return res.status(404).json({
                error: `Phone number ${normalizedNumber} not found in this Exotel account.`
            });
        }

        return res.json({
            success: true,
            phoneNumber: normalizedNumber,
            accountSid,
            message: 'Exotel credentials verified successfully.'
        });

    } catch (err) {
        console.error('[Exotel] verify-import error:', err.message);
        return res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

// ============================================
// BYOK — IMPORT EXOTEL NUMBER
// POST /api/exotel/import-number
// ============================================
router.post('/import-number', verifySupabaseAuth, async (req, res) => {
    try {
        const { accountSid, apiKey, apiToken, phoneNumber, label } = req.body;
        const userId = req.userId;

        if (!accountSid || !apiKey || !apiToken || !phoneNumber) {
            return res.status(400).json({ error: 'accountSid, apiKey, apiToken, and phoneNumber are required' });
        }

        let normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');
        if (!normalizedNumber.startsWith('+')) normalizedNumber = '+' + normalizedNumber;

        // Check for duplicate
        const { data: existing } = await supabase
            .from('phone_numbers')
            .select('id')
            .eq('user_id', userId)
            .eq('phone_number', normalizedNumber)
            .eq('provider', 'exotel')
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ error: 'This Exotel number is already imported.' });
        }

        const webhookUrl = `${BACKEND_URL}/api/webhooks/exotel/${userId}/voice`;
        const statusCallbackUrl = `${BACKEND_URL}/api/webhooks/exotel/${userId}/status`;

        const { data: inserted, error: insertErr } = await supabase
            .from('phone_numbers')
            .insert({
                user_id: userId,
                phone_number: normalizedNumber,
                label: label || normalizedNumber,
                provider: 'exotel',
                provider_account_sid: accountSid,
                provider_api_key: apiKey,
                provider_api_token: apiToken,
                webhook_url: webhookUrl,
                status_callback_url: statusCallbackUrl,
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertErr) {
            console.error('[Exotel] import-number DB error:', insertErr.message);
            return res.status(500).json({ error: 'Failed to save phone number.' });
        }

        return res.status(201).json({
            success: true,
            id: inserted.id,
            phoneNumber: normalizedNumber,
            webhookUrl,
            statusCallbackUrl,
            message: `Number imported. Set your Exotel app webhook to: ${webhookUrl}`
        });

    } catch (err) {
        console.error('[Exotel] import-number error:', err.message);
        return res.status(500).json({ error: 'Import failed. Please try again.' });
    }
});

// ============================================
// LIST EXOTEL PHONE NUMBERS
// GET /api/exotel/phone-numbers
// ============================================
router.get('/phone-numbers', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;

        const { data, error } = await supabase
            .from('phone_numbers')
            .select('id, phone_number, label, provider, status, assistant_id, created_at, last_call_at')
            .eq('user_id', userId)
            .eq('provider', 'exotel')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json({ phoneNumbers: data || [] });

    } catch (err) {
        console.error('[Exotel] list phone-numbers error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch phone numbers.' });
    }
});

// ============================================
// SOFT DELETE EXOTEL PHONE NUMBER
// DELETE /api/exotel/phone-numbers/:id
// ============================================
router.delete('/phone-numbers/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const { data: existing } = await supabase
            .from('phone_numbers')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .eq('provider', 'exotel')
            .maybeSingle();

        if (!existing) {
            return res.status(404).json({ error: 'Phone number not found.' });
        }

        const { error } = await supabase
            .from('phone_numbers')
            .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return res.json({ success: true, message: 'Phone number removed.' });

    } catch (err) {
        console.error('[Exotel] delete phone-number error:', err.message);
        return res.status(500).json({ error: 'Failed to delete phone number.' });
    }
});

// ============================================
// ASSIGN ASSISTANT TO EXOTEL NUMBER
// PUT /api/exotel/phone-numbers/:id/assign
// ============================================
router.put('/phone-numbers/:id/assign', verifySupabaseAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { assistantId } = req.body;
        const userId = req.userId;

        if (!assistantId) {
            return res.status(400).json({ error: 'assistantId is required.' });
        }

        const { data: existing } = await supabase
            .from('phone_numbers')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .eq('provider', 'exotel')
            .maybeSingle();

        if (!existing) {
            return res.status(404).json({ error: 'Phone number not found.' });
        }

        const { error } = await supabase
            .from('phone_numbers')
            .update({ assistant_id: assistantId })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return res.json({ success: true, message: 'Assistant assigned.' });

    } catch (err) {
        console.error('[Exotel] assign assistant error:', err.message);
        return res.status(500).json({ error: 'Failed to assign assistant.' });
    }
});

// ============================================
// INCOMING CALL WEBHOOK — EXOML RESPONSE
// POST /api/webhooks/exotel/:userId/voice
// ============================================
router.post('/:userId/voice', async (req, res) => {
    try {
        const { userId } = req.params;
        const { CallSid, From, To } = req.body;

        // Validate required Exotel fields
        if (!CallSid || !From || !To) {
            console.warn('[Exotel] Missing required fields — CallSid, From, To');
            res.type('text/xml');
            return res.send(`<Response><Say>This number is not configured.</Say></Response>`);
        }

        console.log(`[Exotel] Incoming call: ${From} → ${To} | CallSid: ${CallSid}`);

        // Look up phone_number by To number (Exotel provider)
        const { data: phoneConfig, error: phoneErr } = await supabase
            .from('phone_numbers')
            .select(`
                id, user_id, phone_number, assistant_id,
                assistants:assistant_id (
                    id, name, system_prompt, first_message, voice_id, language, rag_enabled, llm_model
                )
            `)
            .eq('phone_number', To)
            .eq('provider', 'exotel')
            .is('deleted_at', null)
            .maybeSingle();

        if (phoneErr || !phoneConfig) {
            console.warn('[Exotel] Phone number not found for To:', To);
            res.type('text/xml');
            return res.send(`<Response><Say>This number is not currently in service.</Say></Response>`);
        }

        const assistant = phoneConfig.assistants;
        if (!assistant) {
            console.warn('[Exotel] No assistant assigned to phone number:', To);
            res.type('text/xml');
            return res.send(`<Response><Say>This service is not yet configured. Please try again later.</Say></Response>`);
        }

        // Billing guard
        const { hasCredits } = await billing.checkBalance(phoneConfig.user_id);
        if (!hasCredits) {
            console.warn(`[Exotel] Zero balance for user=${phoneConfig.user_id}, blocking call`);
            res.type('text/xml');
            return res.send(`<Response><Say>This service is currently unavailable. Please contact the business.</Say></Response>`);
        }

        // WebSocket stream URL
        const wsUrl = `wss://voicory-backend-783942490798.asia-south1.run.app/ws/exotel/${userId}/${CallSid}`;

        console.log(`[Exotel] Returning ExoML with WebSocket stream: ${wsUrl}`);

        res.type('text/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(wsUrl)}" bidirectional="true" sampleRate="8000"/>
  </Connect>
</Response>`);

    } catch (err) {
        console.error('[Exotel] voice webhook error:', err.message);
        res.type('text/xml');
        return res.send(`<Response><Say>We are experiencing technical difficulties. Please try again later.</Say></Response>`);
    }
});

// ============================================
// STATUS CALLBACK
// POST /api/webhooks/exotel/:userId/status
//
// Exotel POSTs call result with fields:
//   CallSid, Status, Duration (seconds), RecordingUrl, From, To
// ============================================
router.post('/:userId/status', async (req, res) => {
    // Always respond 200 immediately — Exotel retries on non-2xx
    res.sendStatus(200);

    try {
        const { userId } = req.params;
        // Exotel uses 'Duration' (not 'CallDuration') and 'Status' (not 'CallStatus')
        const { CallSid, Status, Duration, RecordingUrl, From, To } = req.body;

        console.log(`[Exotel] Status callback: CallSid=${CallSid}, Status=${Status}, Duration=${Duration}`);

        if (!CallSid) return;

        // Map Exotel status values → internal status
        const statusMap = {
            'completed':   'completed',
            'busy':        'busy',
            'no-answer':   'no-answer',
            'no_answer':   'no-answer',
            'failed':      'failed',
            'canceled':    'failed',
            'in-progress': 'in_progress',
        };
        const mappedStatus = statusMap[Status?.toLowerCase()] || Status?.toLowerCase() || 'unknown';

        // Parse duration (Exotel sends it as a string of seconds)
        const durationSecs = parseInt(Duration, 10) || 0;

        // Build update payload for call_logs
        const updateData = {
            status: mappedStatus,
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        if (durationSecs > 0) updateData.duration_seconds = durationSecs;
        if (RecordingUrl)     updateData.recording_url = RecordingUrl;

        // Fetch and update the call_logs row (upsert-style: if WS already closed it, this is
        // the authoritative final status from Exotel)
        const { data: callLog, error: updateErr } = await supabase
            .from('call_logs')
            .update(updateData)
            .eq('call_sid', CallSid)
            .select(`*, assistant:assistants(id, name)`)
            .maybeSingle();

        if (updateErr) {
            console.warn('[Exotel] Failed to update call_logs:', updateErr.message);
        }

        // If the WebSocket 'start' event never fired (e.g. call was rejected before stream),
        // there may be no call_logs row. Insert one now so billing/CRM still fire.
        let log = callLog;
        if (!log && From && To) {
            // Look up the phone number record to get assistantId / phoneNumberId
            const { data: phoneConfig } = await supabase
                .from('phone_numbers')
                .select('id, assistant_id, user_id')
                .eq('phone_number', To)
                .eq('provider', 'exotel')
                .is('deleted_at', null)
                .maybeSingle();

            const insertPayload = {
                call_sid:        CallSid,
                user_id:         phoneConfig?.user_id || userId,
                phone_number_id: phoneConfig?.id || null,
                assistant_id:    phoneConfig?.assistant_id || null,
                from_number:     From,
                to_number:       To,
                direction:       'inbound',
                provider:        'exotel',
                status:          mappedStatus,
                started_at:      new Date().toISOString(),
                ended_at:        new Date().toISOString(),
                duration_seconds: durationSecs,
                recording_url:   RecordingUrl || null,
            };

            const { data: inserted } = await supabase
                .from('call_logs')
                .insert(insertPayload)
                .select(`*, assistant:assistants(id, name)`)
                .maybeSingle();

            log = inserted;
            console.log(`[Exotel] Inserted missing call_logs row for CallSid=${CallSid}`);
        }

        const terminalStatuses = ['completed', 'busy', 'no-answer', 'failed'];
        if (!terminalStatuses.includes(mappedStatus)) return;

        const effectiveUserId = log?.user_id || userId;

        // ── Billing: deduct voice cost ─────────────────────────────────────────
        if (durationSecs > 0 && effectiveUserId) {
            billing.deductVoiceCost(effectiveUserId, {
                durationMinutes: durationSecs / 60,
                channel:         'exotel',
                callSid:         CallSid,
                callLogId:       log?.id || null,
            }).then(billingResult => {
                if (billingResult?.cost_usd > 0) {
                    supabase
                        .from('call_logs')
                        .update({ cost: billingResult.cost_usd })
                        .eq('call_sid', CallSid)
                        .catch(e => console.warn('[Exotel] cost write-back error:', e.message));
                }
                console.log(`[Exotel] Billing deducted for user=${effectiveUserId}, duration=${durationSecs}s`);
            }).catch(e => console.warn('[Exotel] Billing deduction failed:', e.message));
        }

        if (!log) return; // Nothing more to do without a log row

        // ── CRM push (non-blocking) ────────────────────────────────────────────
        if (mappedStatus === 'completed') {
            const callDataForCRM = {
                phoneNumber:   From || log.from_number,
                direction:     log.direction || 'inbound',
                duration:      durationSecs,
                outcome:       mappedStatus,
                summary:       log.summary || null,
                transcript:    log.transcript || null,
                startedAt:     log.started_at,
                endedAt:       updateData.ended_at,
                callSid:       CallSid,
                assistantName: log.assistant?.name || 'AI Assistant',
                recordingUrl:  RecordingUrl || null,
            };

            pushCallToAllCRMs(effectiveUserId, callDataForCRM)
                .then(results => {
                    const ok  = results.filter(r => r.success).length;
                    const bad = results.filter(r => !r.success);
                    if (ok > 0)  console.log(`[Exotel] CRM sync: ${ok} CRM(s) updated for ${CallSid}`);
                    if (bad.length > 0) console.warn(`[Exotel] CRM sync failed: ${bad.map(r => r.provider).join(', ')}`);
                })
                .catch(e => console.warn('[Exotel] CRM push error:', e.message));

            // ── HTTP trigger: call_ended (non-blocking) ────────────────────────
            if (log.assistant_id) {
                executeHTTPTrigger(log.assistant_id, 'call_ended', {
                    callSid:     CallSid,
                    phoneNumber: From || log.from_number,
                    duration:    durationSecs,
                    transcript:  log.transcript || '',
                    summary:     log.summary || '',
                    disposition: mappedStatus,
                    call_date:   log.started_at,
                    provider:    'exotel',
                });
            }
        }

        // ── Update phone_numbers.last_call_at ────────────────────────────────
        if (log.phone_number_id) {
            supabase
                .from('phone_numbers')
                .update({ last_call_at: updateData.ended_at })
                .eq('id', log.phone_number_id)
                .catch(e => console.warn('[Exotel] last_call_at update failed:', e.message));
        }

    } catch (err) {
        console.error('[Exotel] status callback error:', err.message);
        // Response already sent (200) — no further action needed
    }
});

// ============================================
// WEBSOCKET HANDLER — EXOTEL BIDIRECTIONAL STREAM
// ws://host/ws/exotel/:userId/:callSid
//
// Session state per connection:
//   { userId, callSid, streamSid, assistantId, assistant,
//     audioBuffer[], silenceCount, conversationHistory[],
//     callLogId, isProcessing }
// ============================================

async function handleExotelWebSocket(ws, req) {
    const urlParts = req.url.split('/').filter(Boolean);
    // URL pattern: /ws/exotel/:userId/:callSid
    const userId = urlParts[urlParts.length - 2];
    const callSid = urlParts[urlParts.length - 1];

    console.log(`[Exotel WS] Connected: userId=${userId}, callSid=${callSid}`);

    // Per-connection session state
    const session = {
        userId,
        callSid,
        streamSid: null,
        assistant: null,
        assistantId: null,
        phoneNumberId: null,
        callLogId: null,
        audioBuffer: [],
        silenceCount: 0,
        conversationHistory: [],
        isProcessing: false
    };

    ws.on('message', async (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            return; // Ignore non-JSON frames
        }

        const event = msg.event;

        // ─── connected ───────────────────────────────────────────────
        if (event === 'connected') {
            console.log(`[Exotel WS] Stream connected: callSid=${callSid}`);
        }

        // ─── start ───────────────────────────────────────────────────
        else if (event === 'start') {
            session.streamSid = msg.streamSid || msg.start?.streamSid;
            const startData = msg.start || {};
            console.log(`[Exotel WS] Stream started: streamSid=${session.streamSid}`);

            // Resolve phone number + assistant from DB
            const { data: phoneConfig } = await supabase
                .from('phone_numbers')
                .select(`
                    id, assistant_id,
                    assistants:assistant_id (
                        id, name, system_prompt, first_message, voice_id, language, rag_enabled, llm_model
                    )
                `)
                .eq('user_id', userId)
                .eq('provider', 'exotel')
                .is('deleted_at', null)
                .maybeSingle();

            if (phoneConfig?.assistants) {
                session.assistant = phoneConfig.assistants;
                session.assistantId = phoneConfig.assistant_id;
                session.phoneNumberId = phoneConfig.id;
            }

            // Create call_logs row
            const { data: callLog } = await supabase
                .from('call_logs')
                .insert({
                    call_sid: callSid,
                    stream_sid: session.streamSid,
                    phone_number_id: session.phoneNumberId,
                    assistant_id: session.assistantId,
                    user_id: userId,
                    direction: 'inbound',
                    status: 'in-progress',
                    started_at: new Date().toISOString(),
                    provider: 'exotel'
                })
                .select()
                .single();

            if (callLog) {
                session.callLogId = callLog.id;
                console.log(`[Exotel WS] Call logged: id=${callLog.id}`);
            }

            // Send greeting if assistant has a first_message
            if (session.assistant?.first_message && ws.readyState === 1 /* OPEN */) {
                try {
                    const greetingAudio = await generateTTSForCall(
                        session.assistant.first_message,
                        session.assistant.voice_id
                    );
                    if (greetingAudio) {
                        ws.send(JSON.stringify({
                            event: 'media',
                            media: { payload: greetingAudio.toString('base64') }
                        }));
                    }
                } catch (greetErr) {
                    console.warn('[Exotel WS] Greeting TTS failed:', greetErr.message);
                }
            }
        }

        // ─── media ───────────────────────────────────────────────────
        else if (event === 'media') {
            const track = msg.media?.track;
            // Only process inbound audio (caller's voice)
            if (track && track !== 'inbound') return;

            const payload = msg.media?.payload;
            if (!payload) return;

            const chunk = Buffer.from(payload, 'base64');
            session.audioBuffer.push(chunk);

            // VAD: detect silence by monitoring chunk energy
            // μ-law encoded silence = repeated 0xFF bytes
            const isSilent = isSilentChunk(chunk);
            if (isSilent) {
                session.silenceCount++;
            } else {
                session.silenceCount = 0; // Reset on speech
            }

            // Trigger processing after VAD silence threshold
            if (
                session.silenceCount >= VAD_SILENCE_CHUNKS &&
                session.audioBuffer.length > 5 && // at least some speech
                !session.isProcessing
            ) {
                session.isProcessing = true;
                const capturedBuffer = [...session.audioBuffer];
                session.audioBuffer = [];
                session.silenceCount = 0;

                // Process async (non-blocking)
                processExotelTurn(ws, session, capturedBuffer).finally(() => {
                    session.isProcessing = false;
                });
            }
        }

        // ─── stop ────────────────────────────────────────────────────
        else if (event === 'stop') {
            console.log(`[Exotel WS] Stream stopped: callSid=${callSid}`);
            await finalizeExotelCall(session);
        }
    });

    ws.on('close', () => {
        console.log(`[Exotel WS] WebSocket closed: callSid=${callSid}`);
        finalizeExotelCall(session).catch(e => console.warn('[Exotel WS] finalize on close error:', e.message));
    });

    ws.on('error', (err) => {
        console.error(`[Exotel WS] WebSocket error: callSid=${callSid}`, err.message);
    });
}

// ─── Silence detection helper ─────────────────────────────────────────────────
// μ-law: 0xFF = silence. Consider chunk "silent" if >80% of bytes are 0xFF.
function isSilentChunk(chunk) {
    if (!chunk || chunk.length === 0) return true;
    let silentBytes = 0;
    for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0xFF || chunk[i] === 0x7F) silentBytes++;
    }
    return (silentBytes / chunk.length) > 0.8;
}

// ─── Process one conversation turn ───────────────────────────────────────────
async function processExotelTurn(ws, session, audioChunks) {
    try {
        const assistant = session.assistant;
        if (!assistant) {
            console.warn('[Exotel WS] No assistant in session, skipping turn');
            return;
        }

        // Combine audio chunks into single buffer
        const audioBuffer = Buffer.concat(audioChunks);
        if (audioBuffer.length < 100) return; // Too short, likely noise

        // ─── STT ──────────────────────────────────────────────────────
        let transcribedText = '';
        try {
            if (process.env.DEEPGRAM_API_KEY) {
                transcribedText = await transcribeWithDeepgram(audioBuffer, assistant.language);
            } else {
                transcribedText = await transcribeWithWhisper(audioBuffer);
            }
        } catch (sttErr) {
            console.warn('[Exotel WS] STT failed:', sttErr.message);
            return;
        }

        if (!transcribedText || transcribedText.trim().length < 2) {
            console.log('[Exotel WS] STT returned empty/short result, skipping');
            return;
        }

        console.log(`[Exotel WS] STT: "${transcribedText}"`);
        session.conversationHistory.push({ role: 'user', content: transcribedText });

        // ─── RAG context ──────────────────────────────────────────────
        let ragContext = '';
        if (assistant.rag_enabled) {
            try {
                const ragResults = await searchKnowledgeBase(assistant.id, transcribedText);
                ragContext = formatRAGContext(ragResults);
            } catch (ragErr) {
                console.warn('[Exotel WS] RAG failed:', ragErr.message);
            }
        }

        // ─── Memory ───────────────────────────────────────────────────
        let memoryContext = '';
        try {
            memoryContext = await formatMemoryForPrompt(session.userId, assistant.id);
        } catch (memErr) {
            console.warn('[Exotel WS] Memory fetch failed:', memErr.message);
        }

        // ─── Build system prompt ──────────────────────────────────────
        let systemPrompt = assistant.system_prompt || `You are ${assistant.name || 'an AI assistant'} helping callers over the phone. Keep responses concise and conversational.`;
        if (ragContext) systemPrompt += `\n\nKnowledge Base:\n${ragContext}`;
        if (memoryContext) systemPrompt += `\n\nMemory from past interactions:\n${memoryContext}`;
        // Hindi / Indian language support
        const isHindi = assistant.language === 'hi' || assistant.language === 'hi-IN';
        if (isHindi) {
            systemPrompt += '\n\nPlease respond in Hindi. The caller is speaking in Hindi. Use simple, clear Hindi suitable for a phone call.';
        }
        systemPrompt += '\n\nKeep responses under 2 sentences for voice calls. Be natural and conversational.';

        // ─── GPT ──────────────────────────────────────────────────────
        const messages = [
            { role: 'system', content: systemPrompt },
            ...session.conversationHistory.slice(-10) // Last 10 turns
        ];

        const openaiResp = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: assistant.llm_model || 'gpt-4o-mini',
                messages,
                max_tokens: 150,
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 8000
            }
        );

        const aiResponse = openaiResp.data.choices?.[0]?.message?.content?.trim();
        if (!aiResponse) {
            console.warn('[Exotel WS] GPT returned empty response');
            return;
        }

        console.log(`[Exotel WS] GPT: "${aiResponse}"`);
        session.conversationHistory.push({ role: 'assistant', content: aiResponse });

        // Per-turn memory save (fire and forget)
        trimAndSaveMemory(session.userId, assistant.id, session.conversationHistory)
            .catch(e => console.warn('[Exotel WS] Memory save failed:', e.message));

        // ─── TTS ──────────────────────────────────────────────────────
        let ttsAudio = null;
        try {
            ttsAudio = await generateTTSForCall(aiResponse, assistant.voice_id);
        } catch (ttsErr) {
            console.warn('[Exotel WS] TTS failed:', ttsErr.message);
        }

        if (!ttsAudio) {
            console.warn('[Exotel WS] TTS returned null, cannot send audio response');
            return;
        }

        // ─── Send audio back to Exotel ────────────────────────────────
        if (ws.readyState === 1 /* OPEN */) {
            ws.send(JSON.stringify({
                event: 'media',
                media: { payload: ttsAudio.toString('base64') }
            }));
            console.log(`[Exotel WS] Sent TTS audio: ${ttsAudio.length} bytes`);
        }

    } catch (err) {
        console.error('[Exotel WS] processExotelTurn error:', err.message);
    }
}

// ─── Finalize call — save conversation + trigger memory ──────────────────────
async function finalizeExotelCall(session) {
    if (session._finalized) return;
    session._finalized = true;

    try {
        if (!session.callLogId) return;

        const history = session.conversationHistory;
        const transcript = history.map(m => `${m.role === 'user' ? 'Caller' : 'Assistant'}: ${m.content}`).join('\n');

        // Generate call summary
        let summary = '';
        if (history.length > 0 && process.env.OPENAI_API_KEY) {
            try {
                const sumResp = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'Summarize this phone call in 1-2 sentences. Be concise.' },
                            { role: 'user', content: transcript }
                        ],
                        max_tokens: 100
                    },
                    {
                        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
                        timeout: 8000
                    }
                );
                summary = sumResp.data.choices?.[0]?.message?.content?.trim() || '';
            } catch (sumErr) {
                console.warn('[Exotel WS] Summary generation failed:', sumErr.message);
            }
        }

        // Update call_logs with transcript + summary
        await supabase
            .from('call_logs')
            .update({
                transcript,
                summary,
                conversation_history: history,
                status: 'completed',
                ended_at: new Date().toISOString()
            })
            .eq('id', session.callLogId);

        // Save memory after call ends
        if (history.length > 0 && session.userId && session.assistantId) {
            trimAndSaveMemory(session.userId, session.assistantId, history)
                .catch(e => console.warn('[Exotel WS] Post-call memory save failed:', e.message));
        }

        console.log(`[Exotel WS] Call finalized: callLogId=${session.callLogId}`);

    } catch (err) {
        console.error('[Exotel WS] finalizeExotelCall error:', err.message);
    }
}

// ─── STT: Deepgram ────────────────────────────────────────────────────────────
async function transcribeWithDeepgram(audioBuffer, language) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    const lang = language || 'en';
    // Deepgram language codes: Hindi = 'hi', English = 'en-US', etc.
    // Do NOT append -US to non-English languages
    const langCode = lang === 'hi' || lang === 'hi-IN' ? 'hi'
        : lang.includes('-') ? lang : `${lang}-US`;

    const resp = await axios.post(
        `https://api.deepgram.com/v1/listen?model=nova-2&language=${langCode}&encoding=mulaw&sample_rate=8000`,
        audioBuffer,
        {
            headers: {
                Authorization: `Token ${apiKey}`,
                'Content-Type': 'audio/mulaw'
            },
            timeout: 10000
        }
    );

    return resp.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';
}

// ─── STT: OpenAI Whisper fallback ─────────────────────────────────────────────
async function transcribeWithWhisper(audioBuffer) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return '';

    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.wav', contentType: 'audio/wav' });
    form.append('model', 'whisper-1');
    form.append('response_format', 'text');

    const resp = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        form,
        {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${apiKey}`
            },
            timeout: 15000
        }
    );

    return (typeof resp.data === 'string' ? resp.data : resp.data?.text || '').trim();
}

module.exports = router;
module.exports.handleExotelWebSocket = handleExotelWebSocket;
