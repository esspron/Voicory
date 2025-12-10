// ============================================
// VOICE AGENT WEBSOCKET SERVER
// Handles real-time voice agent connections
// ============================================

const WebSocket = require('ws');
const { VoiceAgent, AgentState } = require('./VoiceAgent');
const { supabase } = require('../../config');
const { v4: uuidv4 } = require('uuid');

// Active sessions map
const activeSessions = new Map();

// ============================================
// SESSION MANAGER
// ============================================
class VoiceAgentSessionManager {
    constructor() {
        this.sessions = new Map();
    }
    
    async createSession(ws, config) {
        const sessionId = config.sessionId || uuidv4();
        
        // Get assistant configuration from database
        const assistantConfig = await this._getAssistantConfig(config.assistantId, config.userId);
        
        if (!assistantConfig) {
            throw new Error('Assistant not found or not accessible');
        }
        
        // Merge voice agent config
        const voiceConfig = await this._getVoiceAgentConfig(config.assistantId);
        
        // Create voice agent instance
        const agent = new VoiceAgent({
            sessionId,
            assistantId: config.assistantId,
            userId: config.userId,
            systemPrompt: assistantConfig.instruction || '',
            
            // STT Config
            sttProvider: voiceConfig?.stt_provider || 'deepgram',
            sttModel: voiceConfig?.stt_model || 'nova-2',
            sttLanguage: voiceConfig?.stt_language || 'en',
            sttInterimResults: voiceConfig?.stt_interim_results !== false,
            sttEndpointingMs: voiceConfig?.stt_endpointing_ms || 400,
            
            // LLM Config
            llmProvider: voiceConfig?.llm_provider || assistantConfig.llm_provider || 'openai',
            llmModel: voiceConfig?.llm_model || assistantConfig.llm_model || 'gpt-4o',
            llmTemperature: voiceConfig?.llm_temperature || assistantConfig.temperature || 0.7,
            llmMaxTokens: voiceConfig?.llm_max_tokens || 300,
            
            // TTS Config
            ttsProvider: voiceConfig?.tts_provider || 'elevenlabs',
            ttsVoiceId: assistantConfig.voice?.elevenlabs_voice_id || voiceConfig?.tts_voice_id,
            ttsModel: voiceConfig?.tts_model || assistantConfig.elevenlabs_model_id || 'eleven_turbo_v2_5',
            ttsStability: voiceConfig?.tts_stability || assistantConfig.voice?.default_stability || 0.5,
            ttsSimilarityBoost: voiceConfig?.tts_similarity_boost || assistantConfig.voice?.default_similarity || 0.75,
            
            // VAD Config
            vadEnabled: voiceConfig?.vad_enabled !== false,
            vadThreshold: voiceConfig?.vad_threshold || 0.5,
            vadMinSpeechDurationMs: voiceConfig?.vad_min_speech_duration_ms || 200,
            vadSilenceDurationMs: voiceConfig?.vad_silence_duration_ms || 500,
            
            // Interruption Config
            interruptionEnabled: voiceConfig?.interruption_enabled !== false,
            interruptionThresholdMs: voiceConfig?.interruption_threshold_ms || 200,
            interruptionCancelPending: voiceConfig?.interruption_cancel_pending !== false,
            
            // Turn Config
            turnDetectionMode: voiceConfig?.turn_detection_mode || 'server_vad',
            turnEndSilenceMs: voiceConfig?.turn_end_silence_ms || 700,
            
            // Latency Optimization
            optimisticStt: voiceConfig?.optimistic_stt !== false,
            sentenceSplitting: voiceConfig?.sentence_splitting !== false,
            
            // Audio Config
            inputSampleRate: voiceConfig?.input_sample_rate || 16000,
            outputSampleRate: voiceConfig?.output_sample_rate || 24000,
            
            // Session Config
            greetingEnabled: voiceConfig?.greeting_enabled !== false,
            greetingDelayMs: voiceConfig?.greeting_delay_ms || 500,
            farewellPhrase: voiceConfig?.farewell_phrase || 'Goodbye! Have a great day.',
        });
        
        // Create session record
        const session = {
            id: sessionId,
            agent,
            ws,
            config,
            assistantConfig,
            createdAt: new Date(),
            dbRecordId: null,
        };
        
        // Save session to database
        const { data: dbSession, error } = await supabase
            .from('voice_sessions')
            .insert({
                user_id: config.userId,
                assistant_id: config.assistantId,
                phone_number_id: config.phoneNumberId,
                customer_id: config.customerId,
                session_type: config.sessionType || 'widget',
                transport: 'websocket',
                status: 'connecting',
                from_number: config.fromNumber,
                to_number: config.toNumber,
            })
            .select()
            .single();
        
        if (!error && dbSession) {
            session.dbRecordId = dbSession.id;
        }
        
        // Setup agent event handlers
        this._setupAgentEvents(session);
        
        // Store session
        this.sessions.set(sessionId, session);
        
        return session;
    }
    
    async _getAssistantConfig(assistantId, userId) {
        const { data, error } = await supabase
            .from('assistants')
            .select(`
                *,
                voice:voices(
                    id,
                    name,
                    elevenlabs_voice_id,
                    elevenlabs_model_id,
                    default_stability,
                    default_similarity
                )
            `)
            .eq('id', assistantId)
            .eq('user_id', userId)
            .single();
        
        if (error || !data) {
            console.error('[VoiceAgentSession] Failed to get assistant:', error);
            return null;
        }
        
        return data;
    }
    
    async _getVoiceAgentConfig(assistantId) {
        const { data, error } = await supabase
            .from('voice_agent_config')
            .select('*')
            .eq('assistant_id', assistantId)
            .single();
        
        // Return null if no config (will use defaults)
        return data || null;
    }
    
    _setupAgentEvents(session) {
        const { agent, ws, id: sessionId } = session;
        
        // State changes
        agent.on('stateChange', (state) => {
            this._sendMessage(ws, {
                type: 'state_change',
                sessionId,
                state,
                timestamp: Date.now(),
            });
            
            // Update database
            if (session.dbRecordId) {
                supabase
                    .from('voice_sessions')
                    .update({ 
                        status: this._mapAgentStateToDbStatus(state),
                        connected_at: state === AgentState.LISTENING ? new Date().toISOString() : undefined,
                    })
                    .eq('id', session.dbRecordId)
                    .then(() => {});
            }
        });
        
        // Transcripts
        agent.on('transcript', (data) => {
            this._sendMessage(ws, {
                type: 'transcript',
                sessionId,
                ...data,
                timestamp: Date.now(),
            });
        });
        
        // Audio output
        agent.on('audio', (audioBuffer) => {
            // Send binary audio data
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(audioBuffer);
            }
        });
        
        // Clear audio buffer (for interruptions)
        agent.on('clearAudioBuffer', () => {
            this._sendMessage(ws, {
                type: 'clear_audio',
                sessionId,
                timestamp: Date.now(),
            });
        });
        
        // VAD events
        agent.on('vadStart', (data) => {
            this._sendMessage(ws, {
                type: 'vad_start',
                sessionId,
                ...data,
            });
        });
        
        agent.on('vadEnd', (data) => {
            this._sendMessage(ws, {
                type: 'vad_end',
                sessionId,
                ...data,
            });
        });
        
        // Interruption
        agent.on('interrupted', (data) => {
            this._sendMessage(ws, {
                type: 'interrupted',
                sessionId,
                ...data,
            });
        });
        
        // Errors
        agent.on('error', (data) => {
            this._sendMessage(ws, {
                type: 'error',
                sessionId,
                ...data,
            });
        });
        
        // Session ended
        agent.on('ended', async (data) => {
            this._sendMessage(ws, {
                type: 'session_ended',
                sessionId,
                ...data,
            });
            
            // Update database with final metrics
            if (session.dbRecordId) {
                const metrics = agent.getMetrics();
                await supabase
                    .from('voice_sessions')
                    .update({
                        status: 'ended',
                        ended_at: new Date().toISOString(),
                        duration_ms: Date.now() - session.createdAt.getTime(),
                        turn_count: metrics.turnCount,
                        interruption_count: metrics.interruptionCount,
                        total_user_speech_ms: metrics.totalUserSpeechMs,
                        total_agent_speech_ms: metrics.totalAgentSpeechMs,
                        avg_stt_latency_ms: metrics.avgSTTLatency,
                        avg_llm_latency_ms: metrics.avgLLMLatency,
                        avg_tts_latency_ms: metrics.avgTTSLatency,
                        avg_total_latency_ms: metrics.avgTotalLatency,
                        transcript: data.conversationHistory,
                    })
                    .eq('id', session.dbRecordId);
            }
            
            // Cleanup
            this.sessions.delete(sessionId);
        });
    }
    
    _mapAgentStateToDbStatus(state) {
        const mapping = {
            [AgentState.IDLE]: 'connecting',
            [AgentState.LISTENING]: 'listening',
            [AgentState.PROCESSING]: 'processing',
            [AgentState.SPEAKING]: 'speaking',
            [AgentState.INTERRUPTED]: 'listening',
            [AgentState.ENDED]: 'ended',
        };
        return mapping[state] || 'connected';
    }
    
    _sendMessage(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }
    
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    async endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.agent.stop();
            this.sessions.delete(sessionId);
        }
    }
    
    getActiveSessionCount() {
        return this.sessions.size;
    }
}

// Singleton instance
const sessionManager = new VoiceAgentSessionManager();

// ============================================
// WEBSOCKET MESSAGE HANDLERS
// ============================================

/**
 * Handle incoming WebSocket message
 */
async function handleWebSocketMessage(ws, message, sessionId) {
    try {
        // Check if binary (audio data)
        if (Buffer.isBuffer(message)) {
            const session = sessionManager.getSession(sessionId);
            if (session) {
                session.agent.processAudioInput(message);
            }
            return;
        }
        
        // Parse JSON message
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
            case 'start':
                await handleStartSession(ws, data);
                break;
                
            case 'stop':
                await handleStopSession(data.sessionId);
                break;
                
            case 'audio':
                // Base64 encoded audio
                if (data.audio && data.sessionId) {
                    const session = sessionManager.getSession(data.sessionId);
                    if (session) {
                        const audioBuffer = Buffer.from(data.audio, 'base64');
                        session.agent.processAudioInput(audioBuffer);
                    }
                }
                break;
                
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
                
            default:
                console.log(`[VoiceAgentWS] Unknown message type: ${data.type}`);
        }
        
    } catch (error) {
        console.error('[VoiceAgentWS] Message handling error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
        }));
    }
}

/**
 * Handle start session request
 */
async function handleStartSession(ws, data) {
    try {
        const { assistantId, userId, sessionType, customerId, fromNumber, toNumber } = data;
        
        if (!assistantId || !userId) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'assistantId and userId are required',
            }));
            return;
        }
        
        console.log(`[VoiceAgentWS] Starting session for assistant ${assistantId}`);
        
        // Create session
        const session = await sessionManager.createSession(ws, {
            assistantId,
            userId,
            sessionType: sessionType || 'widget',
            customerId,
            fromNumber,
            toNumber,
        });
        
        // Send session created confirmation
        ws.send(JSON.stringify({
            type: 'session_created',
            sessionId: session.id,
            assistantName: session.assistantConfig.name,
            config: {
                sampleRate: session.agent.audioConfig.inputSampleRate,
                encoding: session.agent.audioConfig.encoding,
            },
        }));
        
        // Store session ID on WebSocket for later reference
        ws.sessionId = session.id;
        
        // Start the agent
        await session.agent.start();
        
    } catch (error) {
        console.error('[VoiceAgentWS] Failed to start session:', error);
        ws.send(JSON.stringify({
            type: 'error',
            error: error.message,
        }));
    }
}

/**
 * Handle stop session request
 */
async function handleStopSession(sessionId) {
    if (sessionId) {
        await sessionManager.endSession(sessionId);
    }
}

// ============================================
// WEBSOCKET SERVER SETUP
// ============================================

// Store WebSocket server instance for cleanup
let wssInstance = null;

/**
 * Initialize WebSocket server for voice agents
 * @param {http.Server} server - HTTP server to attach to
 * @param {Object} supabaseClient - Optional Supabase client override
 * @param {string} path - WebSocket path (default: /ws/voice-agent)
 */
function initializeWebSocketServer(server, supabaseClient = null, path = '/ws/voice-agent') {
    // If supabaseClient is actually a string (path), fix parameters
    if (typeof supabaseClient === 'string') {
        path = supabaseClient;
        supabaseClient = null;
    }
    
    const wss = new WebSocket.Server({
        server,
        path,
        // Authentication will be handled in the connection handler
    });
    
    wssInstance = wss;
    
    console.log(`[VoiceAgentWS] WebSocket server initialized at ${path}`);
    
    wss.on('connection', (ws, req) => {
        console.log('[VoiceAgentWS] New connection from:', req.socket.remoteAddress);
        
        // Setup message handler
        ws.on('message', (message) => {
            handleWebSocketMessage(ws, message, ws.sessionId);
        });
        
        // Handle disconnection
        ws.on('close', async () => {
            console.log('[VoiceAgentWS] Connection closed');
            if (ws.sessionId) {
                await sessionManager.endSession(ws.sessionId);
            }
        });
        
        // Handle errors
        ws.on('error', (error) => {
            console.error('[VoiceAgentWS] Connection error:', error);
        });
        
        // Send ready message
        ws.send(JSON.stringify({
            type: 'ready',
            message: 'Voice agent WebSocket connected. Send "start" to begin session.',
        }));
    });
    
    // Periodic cleanup of stale sessions
    setInterval(() => {
        const count = sessionManager.getActiveSessionCount();
        if (count > 0) {
            console.log(`[VoiceAgentWS] Active sessions: ${count}`);
        }
    }, 60000);
    
    return wss;
}

/**
 * Close WebSocket server and all sessions
 */
async function closeWebSocketServer() {
    if (!wssInstance) return;
    
    console.log('[VoiceAgentWS] Closing WebSocket server...');
    
    // End all active sessions
    const sessions = Array.from(sessionManager.sessions.keys());
    await Promise.all(sessions.map(id => sessionManager.endSession(id)));
    
    // Close WebSocket server
    return new Promise((resolve, reject) => {
        wssInstance.close((err) => {
            if (err) {
                console.error('[VoiceAgentWS] Error closing server:', err);
                reject(err);
            } else {
                console.log('[VoiceAgentWS] WebSocket server closed');
                wssInstance = null;
                resolve();
            }
        });
    });
}

module.exports = {
    initializeWebSocketServer,
    closeWebSocketServer,
    sessionManager,
    handleWebSocketMessage,
};
