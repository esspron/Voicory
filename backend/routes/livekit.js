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
const { AccessToken } = require('livekit-server-sdk');
const { supabase, redis } = require('../config');
const { v4: uuidv4 } = require('uuid');

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'APIVoicoryDev';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'VoicoryDevSecretKey12345678901234567890';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekit.voicory.com';

// Usage limits configuration
const USAGE_LIMITS = {
    FREE_MINUTES_PER_MONTH: 10,           // Free tier: 10 minutes/month
    PAID_MINUTES_PER_MONTH: 1000,         // Paid tier: based on credits
    MAX_CONCURRENT_SESSIONS: 3,           // Max simultaneous voice calls
    TOKEN_TTL_MINUTES: 30,                // Token expires in 30 min
    RATE_LIMIT_REQUESTS: 10,              // Max token requests per minute
    RATE_LIMIT_WINDOW: 60,                // Rate limit window (seconds)
};

/**
 * Check user's voice usage and enforce limits
 * @param {string} userId - User ID
 * @returns {Object} - { allowed: boolean, usage: object, error?: string }
 */
async function checkUserUsageLimits(userId) {
    try {
        // Get user profile with credits and usage
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('credits_balance, voice_minutes_used, voice_minutes_limit, plan_type')
            .eq('id', userId)
            .single();
        
        if (profileError) {
            console.error('Failed to get user profile:', profileError);
            // Allow if profile check fails (fail open for now)
            return { allowed: true, usage: null };
        }
        
        const planType = profile?.plan_type || 'free';
        const creditsBalance = profile?.credits_balance || 0;
        const minutesUsed = profile?.voice_minutes_used || 0;
        
        // Calculate available minutes based on plan
        let minutesLimit;
        if (planType === 'free') {
            minutesLimit = USAGE_LIMITS.FREE_MINUTES_PER_MONTH;
        } else {
            // Paid users: 1 credit = 1 voice minute (or use custom limit)
            minutesLimit = profile?.voice_minutes_limit || creditsBalance;
        }
        
        const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);
        
        // Check if user has minutes remaining
        if (minutesRemaining <= 0) {
            return {
                allowed: false,
                error: `Voice minutes exhausted. Used: ${minutesUsed}/${minutesLimit} minutes. Please upgrade or add credits.`,
                usage: { minutesUsed, minutesLimit, minutesRemaining, planType },
            };
        }
        
        // Check concurrent sessions limit
        const { count: activeSessions } = await supabase
            .from('voice_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active');
        
        if (activeSessions >= USAGE_LIMITS.MAX_CONCURRENT_SESSIONS) {
            return {
                allowed: false,
                error: `Maximum concurrent sessions reached (${USAGE_LIMITS.MAX_CONCURRENT_SESSIONS}). Please end an existing call first.`,
                usage: { minutesUsed, minutesLimit, minutesRemaining, activeSessions },
            };
        }
        
        return {
            allowed: true,
            usage: { minutesUsed, minutesLimit, minutesRemaining, activeSessions, planType },
        };
        
    } catch (error) {
        console.error('Usage check error:', error);
        // Fail open
        return { allowed: true, usage: null };
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
            await redis.expire(key, USAGE_LIMITS.RATE_LIMIT_WINDOW);
        }
        
        return current <= USAGE_LIMITS.RATE_LIMIT_REQUESTS;
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
                retryAfter: USAGE_LIMITS.RATE_LIMIT_WINDOW,
            });
        }
        
        // Check usage limits
        const usageLimits = await checkUserUsageLimits(user.id);
        if (!usageLimits.allowed) {
            return res.status(403).json({ 
                error: usageLimits.error,
                usage: usageLimits.usage,
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
            ttl: `${USAGE_LIMITS.TOKEN_TTL_MINUTES}m`,
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
            canPublishSources: ['microphone'], // Only microphone, no video/screen
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
router.post('/webhook', async (req, res) => {
    try {
        // TODO: Verify webhook signature with LIVEKIT_API_SECRET
        // const signature = req.headers['authorization'];
        
        const event = req.body;
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
                        .select('connected_at, user_id')
                        .eq('room_name', roomName)
                        .single();
                    
                    const durationSeconds = session?.connected_at
                        ? Math.floor((Date.now() - new Date(session.connected_at).getTime()) / 1000)
                        : 0;
                    
                    const durationMinutes = Math.ceil(durationSeconds / 60); // Round up
                    
                    // Update session with duration
                    await supabase
                        .from('voice_sessions')
                        .update({
                            status: 'completed',
                            ended_at: new Date().toISOString(),
                            duration_seconds: durationSeconds,
                        })
                        .eq('room_name', roomName);
                    
                    // Update user's voice minutes usage
                    if (session?.user_id && durationMinutes > 0) {
                        const { error: usageError } = await supabase.rpc('increment_voice_minutes', {
                            p_user_id: session.user_id,
                            p_minutes: durationMinutes,
                        });
                        
                        if (usageError) {
                            console.error('Failed to update voice usage:', usageError);
                            // Fallback: direct update
                            await supabase
                                .from('user_profiles')
                                .update({ 
                                    voice_minutes_used: supabase.raw(`COALESCE(voice_minutes_used, 0) + ${durationMinutes}`)
                                })
                                .eq('id', session.user_id);
                        }
                        
                        console.log(`[LiveKit] Updated usage for user ${session.user_id}: +${durationMinutes} minutes`);
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
        
        // TODO: Use LiveKit SDK to actually close the room
        // const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        // await roomService.deleteRoom(roomName);
        
        return res.json({ success: true, roomName });
        
    } catch (error) {
        console.error('[LiveKit] Failed to end room:', error);
        return res.status(500).json({ error: 'Failed to end room' });
    }
});

/**
 * GET /api/livekit/usage
 * Get authenticated user's voice usage statistics
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
        
        // Get user profile with usage
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('credits_balance, voice_minutes_used, voice_minutes_limit, plan_type')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            return res.status(500).json({ error: 'Failed to get usage data' });
        }
        
        const planType = profile?.plan_type || 'free';
        const minutesUsed = profile?.voice_minutes_used || 0;
        const creditsBalance = profile?.credits_balance || 0;
        
        // Calculate limit based on plan
        let minutesLimit;
        if (planType === 'free') {
            minutesLimit = USAGE_LIMITS.FREE_MINUTES_PER_MONTH;
        } else {
            minutesLimit = profile?.voice_minutes_limit || creditsBalance;
        }
        
        // Get session history for this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: sessions, count: sessionCount } = await supabase
            .from('voice_sessions')
            .select('duration_seconds, status, created_at', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('created_at', startOfMonth.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);
        
        // Get active sessions count
        const { count: activeSessions } = await supabase
            .from('voice_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active');
        
        return res.json({
            usage: {
                minutesUsed,
                minutesLimit,
                minutesRemaining: Math.max(0, minutesLimit - minutesUsed),
                percentUsed: minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0,
            },
            plan: {
                type: planType,
                creditsBalance,
            },
            sessions: {
                activeCount: activeSessions || 0,
                maxConcurrent: USAGE_LIMITS.MAX_CONCURRENT_SESSIONS,
                thisMonth: sessionCount || 0,
                recent: sessions || [],
            },
            limits: {
                freeMinutesPerMonth: USAGE_LIMITS.FREE_MINUTES_PER_MONTH,
                maxConcurrentSessions: USAGE_LIMITS.MAX_CONCURRENT_SESSIONS,
            },
        });
        
    } catch (error) {
        console.error('[LiveKit] Failed to get usage:', error);
        return res.status(500).json({ error: 'Failed to get usage data' });
    }
});

module.exports = router;
