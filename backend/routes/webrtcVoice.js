// ============================================
// WEBRTC VOICE STREAM ROUTE
// ============================================
// Clean WebRTC voice implementation:
//   - OpenAI Realtime STT with server VAD
//   - Configured LLM for responses
//   - Custom TTS (Google/ElevenLabs)
//   - Natural interruption support
//   - Full assistant config: system prompt, RAG, memory, language, style
// ============================================

const express = require('express');
const { WebRTCVoiceSession } = require('../services/webrtcVoice');

const router = express.Router();

// Track active sessions with their configs
const activeSessions = new Map();

// ============================================
// SESSION CLEANUP (Production Memory Management)
// ============================================
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max session lifetime
const CLEANUP_INTERVAL_MS = 60 * 1000; // Check every minute

setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of activeSessions.entries()) {
        // Clean up sessions older than 5 minutes
        if (session.createdAt && (now - session.createdAt) > SESSION_TIMEOUT_MS) {
            // If it's a WebRTCVoiceSession with end method, call it
            if (typeof session.end === 'function') {
                try { session.end(); } catch (e) { /* ignore */ }
            }
            activeSessions.delete(sessionId);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`[WebRTC Cleanup] Removed ${cleaned} stale session(s). Active: ${activeSessions.size}`);
    }
}, CLEANUP_INTERVAL_MS);

// ============================================
// REST: Create Session
// ============================================

router.post('/session', async (req, res) => {
    try {
        const { assistantId, assistantConfig } = req.body;
        const userId = req.user?.id;

        // Allow preview without voiceId (will use fallback)
        if (!assistantId && !assistantConfig) {
            return res.status(400).json({ error: 'assistantId or assistantConfig required' });
        }

        const sessionId = `webrtc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        console.log(`[WebRTC Route] Creating session: ${sessionId}`);
        console.log(`[WebRTC Route] Config:`, {
            assistantId,
            hasConfig: !!assistantConfig,
            voiceId: assistantConfig?.voiceId,
            llmModel: assistantConfig?.llmModel,
            ragEnabled: assistantConfig?.ragEnabled,
        });

        // Store session config for WebSocket to retrieve
        activeSessions.set(sessionId, {
            assistantId,
            assistantConfig,
            userId,
            createdAt: Date.now(),
            status: 'pending'
        });

        // Clean up session after 60 seconds if not connected
        setTimeout(() => {
            const session = activeSessions.get(sessionId);
            if (session && session.status === 'pending') {
                activeSessions.delete(sessionId);
                console.log(`[WebRTC Route] Session ${sessionId} expired (unused)`);
            }
        }, 60000);

        res.json({
            sessionId,
            wsUrl: `/api/webrtc-voice/ws/${sessionId}`,
            config: {
                sampleRate: 24000,
                channels: 1,
                format: 'pcm16',
            }
        });

    } catch (error) {
        console.error('[WebRTC Route] Session creation error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// ============================================
// WEBSOCKET: Voice Stream
// ============================================

function setupWebSocket(server) {
    const { WebSocketServer } = require('ws');
    
    // Allowed origins for WebSocket connections
    const ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://app.voicory.com',
        'https://voicory.com',
        'https://www.voicory.com',
    ];
    
    // Check if origin is allowed (also allows Vercel/Railway preview URLs)
    const isOriginAllowed = (origin) => {
        if (!origin) return process.env.NODE_ENV !== 'production'; // Allow no origin in dev
        if (ALLOWED_ORIGINS.includes(origin)) return true;
        if (/\.vercel\.app$/.test(origin)) return true;
        if (/\.railway\.app$/.test(origin)) return true;
        return false;
    };
    
    const wss = new WebSocketServer({ 
        noServer: true,
        perMessageDeflate: false // Disable compression for lower latency
    });

    // Handle upgrade requests
    server.on('upgrade', (request, socket, head) => {
        // Guard against undefined request.url
        if (!request || !request.url) {
            return; // Let other handlers deal with it
        }

        const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // Only handle webrtc-voice paths
        if (!pathname.startsWith('/api/webrtc-voice/ws/')) {
            return; // Let other handlers deal with it
        }

        // Validate origin for security
        const origin = request.headers.origin;
        if (!isOriginAllowed(origin)) {
            console.log(`[WebRTC WS] ❌ Rejected connection from origin: ${origin}`);
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        const sessionId = pathname.split('/').pop()?.split('?')[0];

        if (!sessionId) {
            console.log(`[WebRTC WS] Invalid session path: ${pathname}`);
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            socket.destroy();
            return;
        }

        // Complete WebSocket upgrade
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, sessionId);
        });
    });

    wss.on('connection', async (ws, req, sessionId) => {
        // Retrieve stored session config from REST API call
        const storedSession = activeSessions.get(sessionId);
        
        let assistantId = null;
        let assistantConfig = {};
        let userId = null;

        if (storedSession) {
            assistantId = storedSession.assistantId;
            assistantConfig = storedSession.assistantConfig || {};
            userId = storedSession.userId;
            storedSession.status = 'connected';
            
            console.log(`[WebRTC WS] 🚀 Client connected: ${sessionId}`);
            console.log(`[WebRTC WS] Config loaded:`, {
                assistantId,
                voiceId: assistantConfig.voiceId,
                llmModel: assistantConfig.llmModel,
                ragEnabled: assistantConfig.ragEnabled,
                knowledgeBases: assistantConfig.knowledgeBaseIds?.length || 0,
            });
        } else {
            console.log(`[WebRTC WS] ⚠️ No stored config for session: ${sessionId}`);
        }

        let session = null;

        try {
            // Create session with full assistant config
            session = new WebRTCVoiceSession({
                sessionId,
                assistantId,
                assistantConfig,
                userId,
                
                onTranscript: (text) => {
                    sendJson(ws, { type: 'transcript', text, isFinal: true });
                },

                onResponse: (text) => {
                    sendJson(ws, { type: 'response', text });
                },

                onAudio: (audioBuffer) => {
                    if (audioBuffer === null) {
                        // Signal to stop audio playback (barge-in)
                        sendJson(ws, { type: 'stop_audio' });
                    } else if (ws.readyState === 1) {
                        // Send audio as binary
                        console.log(`[WebRTC WS] 🔊 Sending audio: ${audioBuffer.length} bytes`);
                        ws.send(audioBuffer);
                    }
                },

                onStateChange: (state) => {
                    sendJson(ws, { type: 'state', state });
                },

                onError: (error) => {
                    sendJson(ws, { type: 'error', error: error.message });
                },

                onMetrics: (metrics) => {
                    sendJson(ws, { type: 'metrics', metrics });
                },
            });

            activeSessions.set(sessionId, session);

            // Start session
            await session.start();

            // Handle incoming messages
            ws.on('message', async (data) => {
                try {
                    // Binary data = audio from client
                    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
                        const audioData = Buffer.isBuffer(data) ? data : Buffer.from(data);
                        session.sendAudio(audioData);
                        return;
                    }

                    // JSON = control messages
                    const message = JSON.parse(data.toString());
                    
                    switch (message.type) {
                        case 'end':
                            console.log(`[WebRTC WS] Client requested end`);
                            session.end();
                            ws.close(1000, 'Session ended');
                            break;

                        case 'config':
                            // Update config mid-session if needed
                            console.log(`[WebRTC WS] Config update:`, message.config);
                            break;

                        default:
                            console.log(`[WebRTC WS] Unknown message type: ${message.type}`);
                    }

                } catch (error) {
                    console.error('[WebRTC WS] Message error:', error);
                }
            });

            // Handle disconnect
            ws.on('close', () => {
                console.log(`[WebRTC WS] 🛑 Client disconnected: ${sessionId}`);
                if (session) {
                    session.end();
                    activeSessions.delete(sessionId);
                }
            });

            ws.on('error', (error) => {
                console.error(`[WebRTC WS] Error: ${error}`);
                if (session) {
                    session.end();
                    activeSessions.delete(sessionId);
                }
            });

        } catch (error) {
            console.error('[WebRTC WS] Session start error:', error);
            sendJson(ws, { type: 'error', error: error.message });
            ws.close(1011, 'Session start failed');
        }
    });
}

function sendJson(ws, data) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}

module.exports = { router, setupWebSocket };
