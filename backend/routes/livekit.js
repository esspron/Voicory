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

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.error('❌ LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required — LiveKit routes will fail');
}
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekit.voicory.com';

// Pricing configuration (USD)
const PRICING = {
    VOICE_CALL_PER_MINUTE: 0.03,        // $0.03/min for voice calls (Twilio+STT+TTS+margin)
    MIN_CREDITS_REQUIRED: 0.03,            // Minimum $0.10 credits to start a call
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
        // 'created'/'connecting' sessions older than 90s never became active — expire them
        const createdStaleThreshold = new Date(Date.now() - 90 * 1000).toISOString();
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
 * Deduct credits for voice call usage
 * @param {string} userId - User ID
 * @param {number} durationMinutes - Call duration in minutes
 * @param {string} sessionId - Voice session ID for reference
 * @returns {Object} - { success: boolean, amountDeducted: number, newBalance: number }
 */
async function deductVoiceCredits(userId, durationMinutes, sessionId) {
    try {
        const amount = durationMinutes * PRICING.VOICE_CALL_PER_MINUTE;
        
        // Use the deduct_credits RPC function
        const { data, error } = await supabase.rpc('deduct_credits', {
            p_user_id: userId,
            p_amount: amount,
            p_transaction_type: 'voice_call',
            p_description: `Voice call - ${durationMinutes} min @ $${PRICING.VOICE_CALL_PER_MINUTE}/min`,
            p_reference_type: 'voice_session',
            p_reference_id: sessionId,
        });
        
        if (error) {
            console.error('Failed to deduct credits:', error);
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
        
        return { success: true, amountDeducted: amount, newBalance: data };
        
    } catch (error) {
        console.error('Credit deduction error:', error);
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
                    // Calculate duration and update session
                    const { data: session } = await supabase
                        .from('voice_sessions')
                        .select('id, connected_at, user_id')
                        .eq('room_name', roomName)
                        .single();
                    
                    const durationSeconds = session?.connected_at
                        ? Math.floor((Date.now() - new Date(session.connected_at).getTime()) / 1000)
                        : 0;
                    
                    // Round up to nearest minute for billing
                    const durationMinutes = Math.ceil(durationSeconds / 60);
                    const costUsd = durationMinutes * PRICING.VOICE_CALL_PER_MINUTE;
                    
                    // Update session with duration and cost
                    await supabase
                        .from('voice_sessions')
                        .update({
                            status: 'completed',
                            ended_at: new Date().toISOString(),
                            duration_seconds: durationSeconds,
                            cost_usd: costUsd,
                        })
                        .eq('room_name', roomName);
                    
                    // Deduct credits from user's balance
                    if (session?.user_id && durationMinutes > 0) {
                        const deduction = await deductVoiceCredits(
                            session.user_id, 
                            durationMinutes, 
                            session.id
                        );
                        
                        console.log(`[LiveKit] Call ended - User: ${session.user_id}, Duration: ${durationMinutes}min, Cost: $${costUsd.toFixed(4)}, Deducted: ${deduction.success}`);
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
            .select('duration_seconds, cost_usd')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .gte('created_at', startOfMonth.toISOString());
        
        // Calculate monthly totals
        const totalMinutes = monthlyStats?.reduce((sum, s) => sum + Math.ceil((s.duration_seconds || 0) / 60), 0) || 0;
        const totalCost = monthlyStats?.reduce((sum, s) => sum + (s.cost_usd || 0), 0) || 0;
        
        // Get recent sessions
        const { data: recentSessions } = await supabase
            .from('voice_sessions')
            .select('id, duration_seconds, cost_usd, status, created_at')
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
                durationMinutes: Math.ceil((s.duration_seconds || 0) / 60),
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

module.exports = router;
