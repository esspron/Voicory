// ============================================
// WEBRTC VOICE SERVICE - Clean Implementation
// ============================================
// Architecture:
//   1. OpenAI Realtime API for STT (gpt-4o-transcribe) with server VAD
//   2. Your configured LLM for response generation
//   3. Google/ElevenLabs TTS for speech synthesis
//   4. WebSocket to browser with proper audio buffering
// ============================================

const WebSocket = require('ws');
const { openai } = require('../config');
const { getCachedAssistant } = require('./assistant');
const { synthesizeWithVoiceId, getVoiceById } = require('../routes/tts');

// ============================================
// CONFIGURATION
// ============================================

const WEBRTC_CONFIG = {
    // OpenAI Realtime STT
    sttEndpoint: 'wss://api.openai.com/v1/realtime?intent=transcription',
    sttModel: 'gpt-4o-transcribe',
    
    // VAD Settings - tuned for clean detection
    vad: {
        type: 'server_vad',
        threshold: 0.6,           // Balanced sensitivity
        prefix_padding_ms: 300,   // Capture word beginnings
        silence_duration_ms: 700, // Natural pause detection
    },
    
    // Audio format
    sampleRate: 24000,
    
    // LLM
    defaultModel: 'gpt-4o-mini',
    maxTokens: 300,
    temperature: 0.7,
    
    // Response
    maxConversationHistory: 10,
};

// ============================================
// WEBRTC VOICE SESSION
// ============================================

class WebRTCVoiceSession {
    constructor(options) {
        const {
            sessionId,
            assistantId,
            assistantConfig,
            userId,
            onTranscript,
            onResponse,
            onAudio,
            onStateChange,
            onError,
        } = options;

        this.sessionId = sessionId || `webrtc_${Date.now()}`;
        this.assistantId = assistantId;
        this.assistantConfig = assistantConfig || {};
        this.userId = userId;

        // Callbacks
        this.onTranscript = onTranscript || (() => {});
        this.onResponse = onResponse || (() => {});
        this.onAudio = onAudio || (() => {});
        this.onStateChange = onStateChange || (() => {});
        this.onError = onError || (() => {});

        // State
        this.state = 'idle'; // idle, listening, processing, speaking
        this.isEnded = false;
        this.conversationHistory = [];
        
        // OpenAI Realtime STT
        this.sttWs = null;
        this.sttConnected = false;
        
        // TTS
        this.isSpeaking = false;
        this.ttsAbortController = null;
        
        // Config (resolved from assistant)
        this.resolvedConfig = null;
        this.voiceConfig = null;
    }

    // ============================================
    // LIFECYCLE
    // ============================================

    async start() {
        console.log(`[WebRTC] 🚀 Starting session ${this.sessionId}`);
        
        try {
            // Resolve assistant config
            await this.resolveConfig();
            
            // Connect to OpenAI Realtime STT
            await this.connectSTT();
            
            // Play first message if configured
            if (this.resolvedConfig.firstMessage) {
                this.conversationHistory.push({
                    role: 'assistant',
                    content: this.resolvedConfig.firstMessage,
                });
                this.onResponse(this.resolvedConfig.firstMessage);
                await this.speakText(this.resolvedConfig.firstMessage);
            }
            
            this.setState('listening');
            
        } catch (error) {
            console.error('[WebRTC] Start error:', error);
            this.onError(error);
        }
    }

    end() {
        console.log(`[WebRTC] 🛑 Ending session ${this.sessionId}`);
        this.isEnded = true;
        
        // Cancel any ongoing TTS
        if (this.ttsAbortController) {
            this.ttsAbortController.abort();
        }
        
        // Close STT connection
        if (this.sttWs) {
            this.sttWs.close();
            this.sttWs = null;
        }
        
        this.setState('idle');
    }

    // ============================================
    // CONFIG RESOLUTION
    // ============================================

    async resolveConfig() {
        let config = { ...this.assistantConfig };

        if (this.assistantId) {
            const assistant = await getCachedAssistant(this.assistantId);
            if (!assistant) throw new Error('Assistant not found');
            
            config = {
                name: assistant.name,
                systemPrompt: assistant.system_prompt,
                firstMessage: assistant.first_message,
                voiceId: assistant.voice_id,
                llmModel: assistant.llm_model || WEBRTC_CONFIG.defaultModel,
                temperature: assistant.temperature ?? WEBRTC_CONFIG.temperature,
                maxTokens: assistant.max_tokens ?? WEBRTC_CONFIG.maxTokens,
                languageSettings: {
                    primary: assistant.primary_language || 'en',
                },
                ...config,
            };
        }

        this.resolvedConfig = config;
        
        // Load voice config
        if (config.voiceId) {
            this.voiceConfig = await getVoiceById(config.voiceId);
            console.log('[WebRTC] Voice:', { 
                provider: this.voiceConfig?.provider, 
                voiceId: this.voiceConfig?.provider_voice_id 
            });
        }

        console.log('[WebRTC] Config:', {
            name: config.name,
            voiceId: config.voiceId,
            llmModel: config.llmModel,
        });
    }

    // ============================================
    // OPENAI REALTIME STT
    // ============================================

    async connectSTT() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

        return new Promise((resolve, reject) => {
            console.log('[WebRTC] 🔌 Connecting to OpenAI Realtime STT...');
            
            this.sttWs = new WebSocket(WEBRTC_CONFIG.sttEndpoint, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'realtime=v1',
                },
            });

            this.sttWs.on('open', () => {
                console.log('[WebRTC] ✅ STT connected');
                this.sttConnected = true;
                
                // Configure session
                const sessionConfig = {
                    type: 'transcription_session.update',
                    session: {
                        input_audio_format: 'pcm16',
                        input_audio_transcription: {
                            model: WEBRTC_CONFIG.sttModel,
                            language: this.resolvedConfig?.languageSettings?.primary || 'en',
                        },
                        turn_detection: WEBRTC_CONFIG.vad,
                    },
                };
                
                this.sttWs.send(JSON.stringify(sessionConfig));
                resolve();
            });

            this.sttWs.on('message', (data) => {
                try {
                    const event = JSON.parse(data.toString());
                    this.handleSTTEvent(event);
                } catch (e) {
                    console.error('[WebRTC] STT parse error:', e);
                }
            });

            this.sttWs.on('error', (error) => {
                console.error('[WebRTC] STT error:', error);
                reject(error);
            });

            this.sttWs.on('close', (code, reason) => {
                console.log(`[WebRTC] STT closed: ${code} - ${reason}`);
                this.sttConnected = false;
            });

            // Timeout
            setTimeout(() => {
                if (!this.sttConnected) {
                    reject(new Error('STT connection timeout'));
                }
            }, 10000);
        });
    }

    handleSTTEvent(event) {
        const type = event.type;

        switch (type) {
            case 'transcription_session.created':
            case 'transcription_session.updated':
                console.log('[WebRTC] STT session ready');
                break;

            case 'input_audio_buffer.speech_started':
                console.log('[WebRTC] 🎤 Speech started');
                // Interrupt TTS if speaking (natural barge-in)
                if (this.state === 'speaking') {
                    this.interruptTTS();
                }
                break;

            case 'input_audio_buffer.speech_stopped':
                console.log('[WebRTC] 🎤 Speech stopped');
                break;

            case 'conversation.item.input_audio_transcription.completed':
                const transcript = event.transcript?.trim();
                if (transcript) {
                    console.log(`[WebRTC] 📝 Transcript: "${transcript}"`);
                    this.handleTranscript(transcript);
                }
                break;

            case 'error':
                console.error('[WebRTC] STT error:', event.error);
                this.onError(new Error(event.error?.message || 'STT error'));
                break;
        }
    }

    // Send audio to STT
    sendAudio(audioData) {
        if (!this.sttConnected || this.isEnded) return;
        
        // audioData should be PCM16 at 24kHz
        const base64Audio = Buffer.from(audioData).toString('base64');
        
        this.sttWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio,
        }));
    }

    // ============================================
    // TRANSCRIPT HANDLING
    // ============================================

    async handleTranscript(text) {
        if (this.isEnded || !text) return;

        this.setState('processing');
        
        // Record user message
        this.conversationHistory.push({
            role: 'user',
            content: text,
        });
        this.onTranscript(text);

        // Generate response
        await this.generateResponse(text);
    }

    // ============================================
    // LLM RESPONSE
    // ============================================

    async generateResponse(userText) {
        console.log('[WebRTC] 🤖 Generating response...');
        
        try {
            const messages = [
                {
                    role: 'system',
                    content: this.resolvedConfig.systemPrompt || 'You are a helpful assistant.',
                },
                ...this.conversationHistory.slice(-WEBRTC_CONFIG.maxConversationHistory),
            ];

            const startTime = Date.now();
            
            const response = await openai.chat.completions.create({
                model: this.resolvedConfig.llmModel || WEBRTC_CONFIG.defaultModel,
                messages,
                temperature: this.resolvedConfig.temperature ?? WEBRTC_CONFIG.temperature,
                max_tokens: this.resolvedConfig.maxTokens ?? WEBRTC_CONFIG.maxTokens,
            });

            const llmLatency = Date.now() - startTime;
            const responseText = response.choices[0]?.message?.content?.trim();
            
            console.log(`[WebRTC] ⏱️ LLM response: ${llmLatency}ms`);

            if (responseText) {
                // Record assistant response
                this.conversationHistory.push({
                    role: 'assistant',
                    content: responseText,
                });
                this.onResponse(responseText);
                
                // Speak the response
                await this.speakText(responseText);
            }

            this.setState('listening');

        } catch (error) {
            console.error('[WebRTC] LLM error:', error);
            this.onError(error);
            this.setState('listening');
        }
    }

    // ============================================
    // TTS (Text-to-Speech)
    // ============================================

    async speakText(text) {
        if (this.isEnded || !text) return;

        this.setState('speaking');
        this.isSpeaking = true;
        this.ttsAbortController = { aborted: false };

        try {
            console.log(`[WebRTC] 🔊 TTS: "${text.substring(0, 50)}..."`);
            
            const ttsStart = Date.now();
            
            const result = await synthesizeWithVoiceId(
                text,
                this.resolvedConfig.voiceId,
                this.resolvedConfig.languageSettings?.primary || 'en'
            );

            if (this.ttsAbortController.aborted) {
                console.log('[WebRTC] TTS aborted (barge-in)');
                return;
            }

            if (result.success) {
                const audioBuffer = Buffer.from(result.audioContent, 'base64');
                const ttsLatency = Date.now() - ttsStart;
                
                console.log(`[WebRTC] ⏱️ TTS latency: ${ttsLatency}ms, size: ${audioBuffer.length} bytes`);
                
                // Send audio to client
                this.onAudio(audioBuffer);
            } else {
                console.error('[WebRTC] TTS failed:', result.error);
            }

        } catch (error) {
            if (!this.ttsAbortController?.aborted) {
                console.error('[WebRTC] TTS error:', error);
            }
        } finally {
            this.isSpeaking = false;
            this.ttsAbortController = null;
        }
    }

    interruptTTS() {
        if (this.isSpeaking && this.ttsAbortController) {
            console.log('[WebRTC] ⚡ Interrupting TTS (barge-in)');
            this.ttsAbortController.aborted = true;
            this.isSpeaking = false;
            this.setState('listening');
            
            // Tell frontend to stop audio playback
            this.onAudio(null); // null signals stop
        }
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    setState(newState) {
        if (this.state !== newState) {
            console.log(`[WebRTC] State: ${this.state} → ${newState}`);
            this.state = newState;
            this.onStateChange(newState);
        }
    }
}

module.exports = { WebRTCVoiceSession, WEBRTC_CONFIG };
