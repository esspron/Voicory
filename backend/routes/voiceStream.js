// ============================================
// VOICE STREAM ROUTES V4 - Ultra-Low Latency Pipeline
// ============================================
// Features: 
//   - OpenAI Realtime WebSocket STT (gpt-4o-transcribe)
//   - STREAMING LLM → TTS Pipeline (~500ms to first audio!)
//   - ElevenLabs streaming TTS or Google TTS
//   - Latency metrics, call recording
//   - Barge-in interruption support
// Architecture: Same as VAPI, ElevenLabs Conversational AI
// ============================================

const express = require('express');
const router = express.Router();
const { WebSocketServer } = require('ws');
const { verifySupabaseAuth } = require('../lib/auth');
// V4: Ultra-low latency with streaming LLM + TTS pipeline
const { RealtimeVoiceSessionV4 } = require('../services/realtimeVoiceV4');

// Store active sessions
const activeSessions = new Map();

/**
 * GET /api/voice-stream/health
 * Check WebSocket service status
 */
router.get('/health', (req, res) => {
    res.json({
        service: 'voice-stream',
        status: 'healthy',
        activeSessions: activeSessions.size,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/voice-stream/session
 * Create a new voice session and get connection token
 * 
 * Body:
 * - assistantId: string (optional)
 * - assistantConfig: object (optional) - live config for preview
 */
router.post('/session', verifySupabaseAuth, async (req, res) => {
    try {
        const { assistantId, assistantConfig } = req.body;
        const userId = req.userId;

        if (!assistantId && !assistantConfig) {
            return res.status(400).json({ error: 'assistantId or assistantConfig required' });
        }

        // Generate unique session ID
        const sessionId = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store session config for WebSocket connection
        activeSessions.set(sessionId, {
            userId,
            assistantId,
            assistantConfig,
            createdAt: Date.now(),
            status: 'pending'
        });

        // Clean up session after 60 seconds if not connected
        setTimeout(() => {
            const session = activeSessions.get(sessionId);
            if (session && session.status === 'pending') {
                activeSessions.delete(sessionId);
                console.log(`[VoiceStream] Session ${sessionId} expired (unused)`);
            }
        }, 60000);

        res.json({
            success: true,
            sessionId,
            wsUrl: `/api/voice-stream/ws/${sessionId}`,
            expiresIn: 60
        });

    } catch (error) {
        console.error('[VoiceStream] Session creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/voice-stream/session/:sessionId
 * End a voice session
 */
router.delete('/session/:sessionId', verifySupabaseAuth, async (req, res) => {
    const { sessionId } = req.params;
    
    const session = activeSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== req.userId) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    // Clean up session
    if (session.voiceSession) {
        session.voiceSession.end();
    }
    activeSessions.delete(sessionId);

    res.json({ success: true });
});

// ============================================
// WEBSOCKET SETUP FUNCTION
// Called from index.js with the HTTP server
// ============================================

function setupWebSocket(server) {
    const wss = new WebSocketServer({ 
        noServer: true,
        perMessageDeflate: false // Disable compression for lower latency
    });

    // Handle upgrade requests
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const pathname = url.pathname;

        // Only handle voice stream paths
        if (!pathname.startsWith('/api/voice-stream/ws/')) {
            socket.destroy();
            return;
        }

        const sessionId = pathname.split('/').pop();
        const session = activeSessions.get(sessionId);

        if (!session) {
            console.log(`[VoiceStream] Invalid session: ${sessionId}`);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, session, sessionId);
        });
    });

    // Handle WebSocket connections
    wss.on('connection', async (ws, request, session, sessionId) => {
        console.log(`[VoiceStreamV4] 🚀 Client connected: ${sessionId}`);
        
        session.status = 'connected';
        session.ws = ws;

        try {
            // Create V4 voice session with streaming LLM + TTS pipeline
            const voiceSession = new RealtimeVoiceSessionV4({
                sessionId,
                assistantId: session.assistantId,
                assistantConfig: session.assistantConfig,
                userId: session.userId,
                onTranscript: (text, isFinal) => {
                    ws.send(JSON.stringify({
                        type: 'transcript',
                        text,
                        isFinal
                    }));
                },
                onPartialTranscript: (text) => {
                    ws.send(JSON.stringify({
                        type: 'partial_transcript',
                        text
                    }));
                },
                onResponse: (text) => {
                    ws.send(JSON.stringify({
                        type: 'response',
                        text
                    }));
                },
                onPartialResponse: (text) => {
                    // V4: Stream LLM response as it generates
                    ws.send(JSON.stringify({
                        type: 'partial_response',
                        text
                    }));
                },
                onAudio: (audioChunk) => {
                    // Send binary audio data (streaming chunks!)
                    if (audioChunk && audioChunk.length > 0) {
                        console.log(`[VoiceStreamV4] 🔊 Sending audio: ${audioChunk.length} bytes`);
                        ws.send(audioChunk);
                    } else {
                        console.warn('[VoiceStreamV4] ⚠️ Empty audio chunk received');
                    }
                },
                onStateChange: (state) => {
                    ws.send(JSON.stringify({
                        type: 'state',
                        state
                    }));
                },
                onMetrics: (metrics) => {
                    // V4: Enhanced latency metrics
                    ws.send(JSON.stringify({
                        type: 'metrics',
                        metrics
                    }));
                },
                onError: (error) => {
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            });

            session.voiceSession = voiceSession;

            // Start the session (plays first message)
            await voiceSession.start();

        } catch (error) {
            console.error('[VoiceStreamV3] Session start error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Failed to start voice session'
            }));
            ws.close();
            return;
        }

        // Handle incoming messages (audio from browser)
        ws.on('message', async (data, isBinary) => {
            if (!session.voiceSession) return;

            if (isBinary) {
                // Binary = PCM16 audio data from microphone (24kHz mono)
                session.voiceSession.processAudio(data);
            } else {
                // JSON = control messages
                try {
                    const message = JSON.parse(data.toString());
                    await handleControlMessage(session, sessionId, message, ws);
                } catch (e) {
                    console.error('[VoiceStreamV4] Invalid message:', e);
                }
            }
        });

        ws.on('close', () => {
            console.log(`[VoiceStreamV4] 🛑 Client disconnected: ${sessionId}`);
            if (session.voiceSession) {
                session.voiceSession.end();
            }
            activeSessions.delete(sessionId);
        });

        ws.on('error', (error) => {
            console.error(`[VoiceStreamV4] WebSocket error:`, error);
            if (session.voiceSession) {
                session.voiceSession.end();
            }
            activeSessions.delete(sessionId);
        });
    });

    console.log('✅ Voice Stream V4 WebSocket initialized (Ultra-Low Latency Pipeline)');
    return wss;
}

// Handle control messages from client
async function handleControlMessage(session, sessionId, message, ws) {
    const { voiceSession } = session;
    if (!voiceSession) return;

    switch (message.type) {
        case 'speech_end':
            console.log('[VoiceStreamV4] speech_end received');
            break;

        case 'interrupt':
            voiceSession.interrupt();
            break;

        case 'mute':
            voiceSession.setMuted(message.muted);
            break;

        case 'end':
            voiceSession.end();
            break;

        case 'config':
            // Allow live config updates
            if (voiceSession.resolvedConfig) {
                Object.assign(voiceSession.resolvedConfig, message.config);
            }
            break;

        case 'get_metrics':
            const metrics = voiceSession.getMetrics();
            ws.send(JSON.stringify({ type: 'metrics', metrics }));
            break;

        default:
            console.log('[VoiceStreamV4] Unknown message:', message.type);
    }
}

module.exports = {
    router,
    setupWebSocket,
    activeSessions
};
