/**
 * LiveKit Routes
 * ==============
 * Handles LiveKit token generation and webhook processing for voice agents.
 * 
 * Security Features:
 * - User authentication via Supabase JWT
 * - Usage limits per user (voice minutes)
 * - Rate limiting per user
 * - Concurrent session limits
 * - Token scoping with short TTL
 * 
 * Endpoints:
 * - POST /api/livekit/token - Generate room access token
 * - POST /api/livekit/webhook - Process LiveKit webhooks
 * - GET /api/livekit/usage - Get user's voice usage stats
 */

const express = require('express');
const router = express.Router();
const { AccessToken, WebhookReceiver, RoomServiceClient, AgentDispatchClient } = require('livekit-server-sdk');
const { supabase, redis } = require('../config');
const { v4: uuidv4 } = require('uuid');
const rateEngine = require('../services/voiceRateEngine');

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.error('❌ LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required — LiveKit routes will fail');
}
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekit.voicory.com';

// Pricing configuration (USD)
const PRICING = {
    // VOICE_CALL_PER_MINUTE is now DYNAMIC — computed by voiceRateEngine per assistant config
    // Kept here only for pre-flight minimum balance check (use cheapest possible rate)
    VOICE_CALL_PER_MINUTE_MIN: 0.07,       // minimum possible rate (OpenAI tts-1 + gpt-4o-mini)
    MIN_CREDITS_REQUIRED: 0.07,            // Minimum to start a call (1 min at cheapest rate)
    DEFAULT_CONCURRENT_LINES: 1,           // Default concurrent calls (free)
    RESERVED_LINE_COST_MONTHLY: 10.00,     // $10/mo per reserved line
    TOKEN_TTL_MINUTES: 30,                 // Token expires in 30 min
    RATE_LIMIT_REQUESTS: 10,               // Max token requests per minute
    RATE_LIMIT_WINDOW: 60,                 // Rate limit window (seconds)
};

/**
 * Check user's credits and concurrent call limits
 * @param {string} userId - User ID
 * @returns {Object} - { allowed: boolean, credits: number, concurrentLimit: number, error?: string }
 */
async function checkUserCreditsAndLimits(userId) {
    try {
        // Get user profile with credits
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('credits_balance')
            .eq('user_id', userId)
            .single();
        
        if (profileError) {
            console.error('Failed to get user profile:', profileError);
            return { allowed: false, error: 'Failed to verify account. Please try again.' };
        }
        
        const creditsBalance = profile?.credits_balance || 0;
        
        // Check minimum credits requirement
        if (creditsBalance < PRICING.MIN_CREDITS_REQUIRED) {
            return {
                allowed: false,
                error: `Insufficient credits. You need at least $${PRICING.MIN_CREDITS_REQUIRED.toFixed(2)} to start a voice call. Current balance: $${creditsBalance.toFixed(2)}`,
                credits: creditsBalance,
            };
        }
        
        // Get user's reserved concurrent call lines from add-ons
        const { data: addon } = await supabase
            .from('user_addons')
            .select('quantity')
            .eq('user_id', userId)
            .eq('addon_type', 'reserved_concurrency')
            .eq('status', 'active')
            .single();
        
        // Default 1 concurrent line + any reserved lines
        const concurrentLimit = PRICING.DEFAULT_CONCURRENT_LINES + (addon?.quantity || 0);
        
        // Auto-expire stale sessions older than 5 minutes stuck in created/connecting
        // 'created'/'connecting' sessions older than 30s never became active — expire them
        const createdStaleThreshold = new Date(Date.now() - 30 * 1000).toISOString();
        // 'active' sessions older than 1 hour are zombies — expire them
        const activeStaleThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        await supabase
            .from('voice_sessions')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('user_id', userId)
            .in('status', ['created', 'connecting'])
            .lt('created_at', createdStaleThreshold);
        await supabase
            .from('voice_sessions')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active')
            .lt('created_at', activeStaleThreshold);

        // Check current active sessions
        const { count: activeSessions } = await supabase
            .from('voice_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['created', 'active', 'connecting']);
        
        if (activeSessions >= concurrentLimit) {
            return {
                allowed: false,
                error: `Maximum concurrent calls reached (${concurrentLimit}). End an existing call or upgrade your Reserved Concurrency in Settings > Billing.`,
                credits: creditsBalance,
                concurrentLimit,
                activeSessions,
            };
        }
        
        return {
            allowed: true,
            credits: creditsBalance,
            concurrentLimit,
            activeSessions: activeSessions || 0,
        };
        
    } catch (error) {
        console.error('Credits check error:', error);
        return { allowed: false, error: 'Failed to verify account' };
    }
}

/**
 * Deduct credits for voice call — uses voiceRateEngine for accurate per-provider cost
 * @param {string} userId
 * @param {number} durationSeconds — actual call duration in seconds
 * @param {string} sessionId
 * @param {Object} assistantConfig — { llmModel, ttsProvider, ttsModel, callLogId }
 */
async function deductVoiceCredits(userId, durationSeconds, sessionId, assistantConfig = {}) {
    try {
        const durationMinutes = durationSeconds / 60;

        // Load DB pricing (cached in Redis)
        const pricing = await rateEngine.loadPricing(supabase, redis);

        // Resolve TTS provider key
        const ttsKey = rateEngine.resolveTtsProviderKey(
            assistantConfig.ttsProvider || 'elevenlabs',
            assistantConfig.ttsModel || ''
        );
        const llmModel = assistantConfig.llmModel || 'gpt-4o-mini';

        // Compute exact cost
        const result = rateEngine.computeCallCost(pricing, {
            durationSeconds,
            llmModel,
            ttsProvider: ttsKey,
            actualTtsChars:      assistantConfig.actualTtsChars      || null,
            actualInputTokens:   assistantConfig.actualInputTokens   || null,
            actualOutputTokens:  assistantConfig.actualOutputTokens  || null,
        });

        const amount = result.totalCostUsd;

        console.log(`[livekit] billing | user=${userId} dur=${durationMinutes.toFixed(2)}min llm=${llmModel} tts=${ttsKey} rate=$${result.ratePerMin.toFixed(4)}/min total=$${amount}`);

        const { data, error } = await supabase.rpc('deduct_credits', {
            p_user_id: userId,
            p_amount: amount,
            p_transaction_type: 'voice_call',
            p_description: `Voice call ${Math.ceil(durationMinutes)}min | ${llmModel} + ${ttsKey} TTS @ $${result.ratePerMin.toFixed(4)}/min`,
            p_reference_type: 'voice_session',
            p_reference_id: assistantConfig.callLogId || sessionId,
            p_metadata: {
                source: 'livekit',
                durationMinutes,
                llmModel,
                ttsProvider: ttsKey,
                ratePerMin: result.ratePerMin,
                breakdown: result.breakdown,
            },
        });

        if (error) {
            console.error('[livekit] deductVoiceCredits RPC error:', error);
            // Fallback: direct update
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('credits_balance')
                .eq('user_id', userId)
                .single();

            const newBalance = Math.max(0, (profile?.credits_balance || 0) - amount);
            await supabase
                .from('user_profiles')
                .update({ credits_balance: newBalance })
                .eq('user_id', userId);

            return { success: true, amountDeducted: amount, newBalance };
        }

        return { success: true, amountDeducted: amount, newBalance: data, breakdown: result.breakdown };

    } catch (error) {
        console.error('[livekit] deductVoiceCredits error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Rate limit check using Redis
 * @param {string} userId - User ID
 * @returns {boolean} - true if allowed, false if rate limited
 */
async function checkRateLimit(userId) {
    if (!redis) return true; // Skip if Redis not available
    
    try {
        const key = `livekit_rate:${userId}`;
        const current = await redis.incr(key);
        
        if (current === 1) {
            // First request in window, set expiry
            await redis.expire(key, PRICING.RATE_LIMIT_WINDOW);
        }
        
        return current <= PRICING.RATE_LIMIT_REQUESTS;
    } catch (error) {
        console.error('Rate limit check error:', error);
        return true; // Fail open
    }
}

/**
 * POST /api/livekit/token
 * Generate a LiveKit access token for a voice session
 * 
 * Security:
 * - Requires valid Supabase JWT
 * - Enforces per-user usage limits
 * - Rate limited per user
 * - Scoped token with short TTL
 * 
 * Body:
 * - assistantId: UUID of the assistant
 * - customerId: Optional customer UUID for context
 * - sessionType: 'widget' | 'phone' | 'test'
 * 
 * Headers:
 * - Authorization: Bearer <supabase_token>
 */
router.post('/token', async (req, res) => {
    try {
        // Get user from auth header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }
        
        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
        }
        
        // Rate limit check
        const rateLimitAllowed = await checkRateLimit(user.id);
        if (!rateLimitAllowed) {
            return res.status(429).json({ 
                error: 'Too many requests. Please wait a moment before trying again.',
                retryAfter: PRICING.RATE_LIMIT_WINDOW,
            });
        }
        
        // Check credits and concurrent call limits
        const creditsCheck = await checkUserCreditsAndLimits(user.id);
        if (!creditsCheck.allowed) {
            return res.status(403).json({ 
                error: creditsCheck.error,
                credits: creditsCheck.credits,
                concurrentLimit: creditsCheck.concurrentLimit,
                activeSessions: creditsCheck.activeSessions,
            });
        }
        
        const { assistantId, customerId, sessionType = 'widget' } = req.body;
        
        if (!assistantId) {
            return res.status(400).json({ error: 'assistantId is required' });
        }
        
        // Verify user owns the assistant
        const { data: assistant, error: assistantError } = await supabase
            .from('assistants')
            .select('id, name, user_id')
            .eq('id', assistantId)
            .eq('user_id', user.id)
            .single();
        
        if (assistantError || !assistant) {
            return res.status(404).json({ error: 'Assistant not found or access denied' });
        }
        
        // Generate unique room name with user scope
        // Format: voice_{userId}_{assistantId}_{timestamp}
        const roomName = `voice_${user.id}_${assistantId}_${Date.now()}`;
        
        // Generate participant identity with user ID
        const participantIdentity = `user_${user.id}_${uuidv4().slice(0, 8)}`;
        
        // Create access token with limited permissions
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: participantIdentity,
            name: user.email?.split('@')[0] || 'User',
            // Short TTL for security
            ttl: `${PRICING.TOKEN_TTL_MINUTES}m`,
            // Metadata accessible in agent (verified server-side)
            metadata: JSON.stringify({
                assistantId,
                userId: user.id,
                customerId,
                sessionType,
                roomName, // Include for verification
            }),
        });
        
        // Grant limited room permissions
        at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,          // Can publish audio
            canPublishData: true,      // Can send data messages
            canSubscribe: true,        // Can receive agent audio
            // canPublishSources omitted — SDK v2 requires TrackSource enum, string 'microphone' throws
            hidden: false,
        });
        
        const accessToken = await at.toJwt();
        
        // Create session record in database
        const { data: session, error: sessionError } = await supabase
            .from('voice_sessions')
            .insert({
                user_id: user.id,
                assistant_id: assistantId,
                customer_id: customerId,
                session_type: sessionType,
                transport: 'livekit',
                status: 'created',
                room_name: roomName,
                participant_identity: participantIdentity,
            })
            .select()
            .single();
        
        if (sessionError) {
            console.error('Failed to create session record:', sessionError);
            // Continue anyway - token is valid
        }
        
        console.log(`[LiveKit] Token generated for room: ${roomName}`);

        // Dispatch AI agent into the room
        try {
        // AgentDispatchClient requires https:// URL (not wss://)
        const dispatchUrl = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
        const agentDispatch = new AgentDispatchClient(dispatchUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
            await agentDispatch.createDispatch(roomName, 'voicory-agent', {
                metadata: JSON.stringify({ assistantId, userId: user.id }),
            });
            console.log(`[LiveKit] Agent dispatched to room: ${roomName}`);
        } catch (dispatchErr) {
            // Non-fatal — user can still join, but agent won't respond
            console.error('[LiveKit] Agent dispatch failed:', dispatchErr.message);
        }

        return res.json({
            token: accessToken,
            roomName,
            livekitUrl: LIVEKIT_URL,
            sessionId: session?.id,
            billing: await rateEngine.getRateForAssistant(supabase, redis, assistantId),
        });
        
    } catch (error) {
        console.error('[LiveKit] Token generation error:', error);
        return res.status(500).json({ error: 'Failed to generate token' });
    }
});

/**
 * POST /api/livekit/webhook
 * Process LiveKit server webhooks
 * 
 * Events:
 * - room_started: Room created
 * - room_finished: Room ended
 * - participant_joined: User joined
 * - participant_left: User left
 * - track_published: Audio/video track published
 */
router.post('/webhook', express.raw({ type: 'application/webhook+json' }), async (req, res) => {
    try {
        // Verify webhook signature using WebhookReceiver (uses JWT + body hash)
        // LiveKit sends a JWT in the Authorization header signed with LIVEKIT_API_SECRET
        const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        const authHeader = req.headers['authorization'];
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
        
        let event;
        try {
            event = await webhookReceiver.receive(rawBody, authHeader);
        } catch (verifyErr) {
            console.warn('[LiveKit Webhook] Signature verification failed:', verifyErr.message);
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }
        
        const eventType = event.event;
        
        console.log(`[LiveKit Webhook] ${eventType}:`, JSON.stringify(event).slice(0, 200));
        
        switch (eventType) {
            case 'room_started': {
                const roomName = event.room?.name;
                if (roomName) {
                    // Update session status
                    await supabase
                        .from('voice_sessions')
                        .update({ 
                            status: 'active',
                            connected_at: new Date().toISOString(),
                        })
                        .eq('room_name', roomName);
                }
                break;
            }
            
            case 'room_finished': {
                const roomName = event.room?.name;
                if (roomName) {
                    // Fetch session + assistant config for accurate billing
                    const { data: session } = await supabase
                        .from('voice_sessions')
                        .select('id, connected_at, user_id, assistant_id, room_name')
                        .eq('room_name', roomName)
                        .single();

                    const durationSeconds = session?.connected_at
                        ? Math.floor((Date.now() - new Date(session.connected_at).getTime()) / 1000)
                        : 0;

                    // Resolve assistant's LLM + TTS config for accurate billing
                    let llmModel = 'gpt-4o-mini';
                    let ttsProvider = 'elevenlabs';
                    let ttsModel = '';
                    if (session?.assistant_id) {
                        const { data: asst } = await supabase
                            .from('assistants')
                            .select('llm_model, voice_id')
                            .eq('id', session.assistant_id)
                            .single();
                        if (asst?.llm_model) llmModel = asst.llm_model;
                        if (asst?.voice_id) {
                            const { data: voice } = await supabase
                                .from('voices')
                                .select('tts_provider, model')
                                .eq('id', asst.voice_id)
                                .single();
                            if (voice) { ttsProvider = voice.tts_provider || 'elevenlabs'; ttsModel = voice.model || ''; }
                        }
                    }

                    // Compute accurate cost via rate engine (DB-driven pricing)
                    const pricing = await rateEngine.loadPricing(supabase, redis);
                    const ttsKey = rateEngine.resolveTtsProviderKey(ttsProvider, ttsModel);
                    const costResult = rateEngine.computeCallCost(pricing, { durationSeconds, llmModel, ttsProvider: ttsKey });
                    const costUsd = costResult.totalCostUsd;

                    // Update session
                    await supabase
                        .from('voice_sessions')
                        .update({
                            status: 'completed',
                            ended_at: new Date().toISOString(),
                            duration_ms: durationSeconds * 1000,
                            cost_usd: costUsd,
                        })
                        .eq('room_name', roomName);

                    // Write to call_logs
                    if (session?.user_id) {
                        const durationFormatted = `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
                        await supabase.from('call_logs').insert({
                            user_id: session.user_id,
                            assistant_id: session.assistant_id,
                            call_sid: roomName,
                            provider: 'livekit',
                            direction: 'inbound',
                            status: durationSeconds > 0 ? 'completed' : 'no-answer',
                            duration: durationFormatted,
                            cost: costUsd,
                            started_at: session.connected_at,
                            ended_at: new Date().toISOString(),
                        });
                    }

                    // Deduct credits using dynamic rate
                    if (session?.user_id && durationSeconds > 0) {
                        const deduction = await deductVoiceCredits(
                            session.user_id,
                            durationSeconds,
                            session.id,
                            { llmModel, ttsProvider, ttsModel }
                        );
                        console.log(`[LiveKit] room_finished | user=${session.user_id} dur=${(durationSeconds/60).toFixed(2)}min llm=${llmModel} tts=${ttsKey} cost=$${costUsd.toFixed(4)} deducted=${deduction.success}`);
                    }
                }
                break;
            }
            
            case 'participant_joined': {
                const participant = event.participant;
                const roomName = event.room?.name;
                
                // Log participant join
                console.log(`[LiveKit] Participant joined: ${participant?.identity} in ${roomName}`);
                break;
            }
            
            case 'participant_left': {
                const participant = event.participant;
                const roomName = event.room?.name;
                
                // If user left, end the session
                if (participant?.identity?.startsWith('user_')) {
                    await supabase
                        .from('voice_sessions')
                        .update({ status: 'user_disconnected' })
                        .eq('room_name', roomName);
                }
                break;
            }
            
            default:
                // Log other events
                console.log(`[LiveKit Webhook] Unhandled event: ${eventType}`);
        }
        
        // Always respond 200 to acknowledge webhook
        return res.status(200).json({ received: true });
        
    } catch (error) {
        console.error('[LiveKit Webhook] Error:', error);
        // Still return 200 to prevent retries
        return res.status(200).json({ received: true, error: error.message });
    }
});

/**
 * GET /api/livekit/rooms
 * List active LiveKit rooms (admin/debug endpoint)
 */
router.get('/rooms', async (req, res) => {
    try {
        // This would require the LiveKit server SDK for room listing
        // For now, return active sessions from database
        const { data: sessions, error } = await supabase
            .from('voice_sessions')
            .select('*')
            .in('status', ['created', 'active', 'connecting'])
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) {
            throw error;
        }
        
        return res.json({
            rooms: sessions || [],
            count: sessions?.length || 0,
        });
        
    } catch (error) {
        console.error('[LiveKit] Failed to list rooms:', error);
        return res.status(500).json({ error: 'Failed to list rooms' });
    }
});

/**
 * DELETE /api/livekit/rooms/:roomName
 * Force end a room (admin endpoint)
 */
router.delete('/rooms/:roomName', async (req, res) => {
    try {
        const { roomName } = req.params;
        
        // Update session status
        await supabase
            .from('voice_sessions')
            .update({
                status: 'force_ended',
                ended_at: new Date().toISOString(),
            })
            .eq('room_name', roomName);
        
        // Use LiveKit SDK to actually close the room
        // RoomServiceClient requires https:// URL (not wss://)
        const roomServiceUrl = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
        const roomService = new RoomServiceClient(roomServiceUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        await roomService.deleteRoom(roomName);
        
        return res.json({ success: true, roomName });
        
    } catch (error) {
        console.error('[LiveKit] Failed to end room:', error);
        return res.status(500).json({ error: 'Failed to end room' });
    }
});

/**
 * GET /api/livekit/usage
 * Get authenticated user's voice usage and billing statistics
 */
router.get('/usage', async (req, res) => {
    try {
        // Get user from auth header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }
        
        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        // Get user profile with credits
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('credits_balance')
            .eq('user_id', user.id)
            .single();
        
        if (profileError) {
            return res.status(500).json({ error: 'Failed to get account data' });
        }
        
        const creditsBalance = profile?.credits_balance || 0;
        
        // Get user's reserved concurrent lines
        const { data: addon } = await supabase
            .from('user_addons')
            .select('quantity')
            .eq('user_id', user.id)
            .eq('addon_type', 'reserved_concurrency')
            .eq('status', 'active')
            .single();
        
        const reservedLines = addon?.quantity || 0;
        const concurrentLimit = PRICING.DEFAULT_CONCURRENT_LINES + reservedLines;
        
        // Get active sessions count
        const { count: activeSessions } = await supabase
            .from('voice_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', ['created', 'active', 'connecting']);
        
        // Get session history for this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: monthlyStats } = await supabase
            .from('voice_sessions')
            .select('duration_ms, cost_usd')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .gte('created_at', startOfMonth.toISOString());
        
        // Calculate monthly totals
        const totalMinutes = monthlyStats?.reduce((sum, s) => sum + Math.ceil(((s.duration_ms || 0) / 1000) / 60), 0) || 0;
        const totalCost = monthlyStats?.reduce((sum, s) => sum + (s.cost_usd || 0), 0) || 0;
        
        // Get recent sessions
        const { data: recentSessions } = await supabase
            .from('voice_sessions')
            .select('id, duration_ms, cost_usd, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        // Calculate estimated minutes from current balance
        const estimatedMinutes = Math.floor(creditsBalance / PRICING.VOICE_CALL_PER_MINUTE);
        
        return res.json({
            balance: {
                credits: creditsBalance,
                estimatedMinutes,
                minRequired: PRICING.MIN_CREDITS_REQUIRED,
            },
            pricing: {
                perMinute: PRICING.VOICE_CALL_PER_MINUTE,
                reservedLineMonthly: PRICING.RESERVED_LINE_COST_MONTHLY,
            },
            concurrency: {
                active: activeSessions || 0,
                limit: concurrentLimit,
                reservedLines,
                available: concurrentLimit - (activeSessions || 0),
            },
            thisMonth: {
                totalMinutes,
                totalCost,
                sessionCount: monthlyStats?.length || 0,
            },
            recentSessions: recentSessions?.map(s => ({
                id: s.id,
                durationMinutes: Math.ceil(((s.duration_ms || 0) / 1000) / 60),
                cost: s.cost_usd || 0,
                status: s.status,
                createdAt: s.created_at,
            })) || [],
        });
        
    } catch (error) {
        console.error('[LiveKit] Failed to get usage:', error);
        return res.status(500).json({ error: 'Failed to get usage data' });
    }
});

// ─── End session (called by frontend on disconnect) ───────────────────────────
router.post('/session/:sessionId/end', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

        const { sessionId } = req.params;
        const { data: session } = await supabase
            .from('voice_sessions')
            .select('id, user_id, status, created_at, connected_at, assistant_id, room_name')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (session.status === 'ended') return res.json({ ok: true, already: 'ended' });

        const startTime = session.connected_at || session.created_at;
        const durationSeconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);

        // Resolve assistant's LLM + TTS config for accurate billing
        let llmModel = 'gpt-4o-mini';
        let ttsProvider = 'elevenlabs';
        let ttsModel = '';
        if (session.assistant_id) {
            const { data: asst } = await supabase
                .from('assistants')
                .select('llm_model, voice_id')
                .eq('id', session.assistant_id)
                .single();
            if (asst?.llm_model) llmModel = asst.llm_model;
            if (asst?.voice_id) {
                const { data: voice } = await supabase
                    .from('voices')
                    .select('tts_provider, model')
                    .eq('id', asst.voice_id)
                    .single();
                if (voice) { ttsProvider = voice.tts_provider || 'elevenlabs'; ttsModel = voice.model || ''; }
            }
        }

        const ttsKey = rateEngine.resolveTtsProviderKey(ttsProvider, ttsModel);
        const pricing = await rateEngine.loadPricing(supabase, redis);
        const costResult = rateEngine.computeCallCost(pricing, { durationSeconds, llmModel, ttsProvider: ttsKey });
        const costUsd = costResult.totalCostUsd;
        const durationMinutes = costResult.durationMinutes;

        await supabase
            .from('voice_sessions')
            .update({ status: 'ended', ended_at: new Date().toISOString(), duration_ms: durationSeconds * 1000, cost_usd: costUsd })
            .eq('id', sessionId);

        // Write to call_logs so dashboard shows it
        if (durationSeconds > 0) {
            const durationFormatted = `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
            await supabase.from('call_logs').insert({
                user_id: user.id,
                assistant_id: session.assistant_id,
                call_sid: session.room_name || sessionId,
                provider: 'livekit',
                direction: 'inbound',
                status: 'completed',
                duration: durationFormatted,
                cost: costUsd,
                started_at: startTime,
                ended_at: new Date().toISOString(),
            });
            // Deduct credits
            if (durationSeconds > 0) {
                await deductVoiceCredits(user.id, durationSeconds, sessionId, { llmModel, ttsProvider, ttsModel });
            }
        }

        console.log(`[LiveKit] Session ${sessionId} ended by client after ${durationSeconds}s`);
        return res.json({ ok: true, durationSeconds });
    } catch (error) {
        console.error('[LiveKit] End session error:', error);
        return res.status(500).json({ error: 'Failed to end session' });
    }
});

module.exports = router;
