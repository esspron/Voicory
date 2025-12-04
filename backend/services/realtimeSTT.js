// ============================================
// OPENAI REALTIME STT - Streaming Transcription
// ============================================
// Uses: wss://api.openai.com/v1/realtime?intent=transcription
// Model: gpt-4o-transcribe (multilingual, fast)
// Features:
//   - Server-side VAD
//   - Streaming partial transcripts
//   - Noise reduction
//   - Automatic language detection
// ============================================

const WebSocket = require('ws');

// ============================================
// CONFIGURATION
// ============================================

const REALTIME_STT_CONFIG = {
    // OpenAI Realtime endpoint
    endpoint: 'wss://api.openai.com/v1/realtime?intent=transcription',
    
    // Model - gpt-4o-transcribe for best multilingual support
    model: 'gpt-4o-transcribe',
    
    // Audio format - PCM16 mono 24kHz
    inputAudioFormat: 'pcm16',
    sampleRate: 24000,
    
    // Server-side VAD settings (snake_case for OpenAI API)
    vad: {
        type: 'server_vad',
        threshold: 0.6,              // Higher threshold to filter fan noise (0-1)
        prefix_padding_ms: 300,      // Audio to include before speech start
        silence_duration_ms: 700,    // Longer silence to avoid cutting off speech
    },
    
    // Reconnection
    maxReconnectAttempts: 3,
    reconnectDelayMs: 1000,
};

// ============================================
// REALTIME STT SESSION CLASS
// ============================================

class RealtimeSTTSession {
    constructor(options) {
        const {
            sessionId,
            language = null,        // null = auto-detect
            prompt = '',            // Context prompt for better accuracy
            onPartialTranscript,    // (text) => void - interim results
            onFinalTranscript,      // (text, itemId) => void - final results
            onSpeechStart,          // () => void
            onSpeechEnd,            // () => void
            onError,                // (error) => void
            onConnected,            // () => void
            onDisconnected,         // () => void
        } = options;

        this.sessionId = sessionId || `stt_${Date.now()}`;
        this.language = language;
        this.prompt = prompt;
        
        // Callbacks
        this.onPartialTranscript = onPartialTranscript || (() => {});
        this.onFinalTranscript = onFinalTranscript || (() => {});
        this.onSpeechStart = onSpeechStart || (() => {});
        this.onSpeechEnd = onSpeechEnd || (() => {});
        this.onError = onError || (() => {});
        this.onConnected = onConnected || (() => {});
        this.onDisconnected = onDisconnected || (() => {});

        // State
        this.ws = null;
        this.isConnected = false;
        this.isEnded = false;
        this.reconnectAttempts = 0;
        
        // Transcript ordering
        this.lastItemId = null;
        this.transcriptBuffer = new Map(); // itemId -> { text, isFinal }
    }

    // ============================================
    // CONNECTION LIFECYCLE
    // ============================================

    async connect() {
        if (this.isConnected || this.isEnded) return;

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            this.onError(new Error('OPENAI_API_KEY not configured'));
            return;
        }

        console.log(`[RealtimeSTT] 🔌 Connecting session ${this.sessionId}...`);

        try {
            this.ws = new WebSocket(REALTIME_STT_CONFIG.endpoint, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'realtime=v1',
                },
            });

            this.ws.on('open', () => this.handleOpen());
            this.ws.on('message', (data) => this.handleMessage(data));
            this.ws.on('error', (error) => this.handleError(error));
            this.ws.on('close', (code, reason) => this.handleClose(code, reason));

        } catch (error) {
            console.error('[RealtimeSTT] Connection error:', error);
            this.onError(error);
        }
    }

    disconnect() {
        console.log(`[RealtimeSTT] 🔌 Disconnecting session ${this.sessionId}`);
        this.isEnded = true;
        
        if (this.ws) {
            try {
                this.ws.close(1000, 'Session ended');
            } catch (e) {
                // Ignore close errors
            }
            this.ws = null;
        }
        
        this.isConnected = false;
    }

    // ============================================
    // WEBSOCKET EVENT HANDLERS
    // ============================================

    handleOpen() {
        console.log(`[RealtimeSTT] ✅ WebSocket connected`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Configure the transcription session
        this.sendSessionConfig();
        this.onConnected();
    }

    handleMessage(data) {
        try {
            const event = JSON.parse(data.toString());
            
            // Log ALL events for debugging
            console.log(`[RealtimeSTT] 📨 Event: ${event.type}`, 
                event.type === 'error' ? event.error : 
                event.type.includes('transcription') ? { delta: event.delta?.substring?.(0, 50), transcript: event.transcript?.substring?.(0, 50) } : 
                ''
            );

            switch (event.type) {
                // Session events
                case 'transcription_session.created':
                    console.log(`[RealtimeSTT] Session created: ${event.session?.id}`);
                    break;

                case 'transcription_session.updated':
                    console.log(`[RealtimeSTT] ✅ Session configured successfully`);
                    break;

                // Speech detection events
                case 'input_audio_buffer.speech_started':
                    this.onSpeechStart();
                    break;

                case 'input_audio_buffer.speech_stopped':
                    this.onSpeechEnd();
                    break;

                case 'input_audio_buffer.committed':
                    // VAD detected end of utterance, audio committed for transcription
                    console.log(`[RealtimeSTT] 📝 Audio committed: ${event.item_id}`);
                    this.lastItemId = event.item_id;
                    break;

                // Transcription events - these are what we need!
                case 'conversation.item.input_audio_transcription.delta':
                    // Partial/streaming transcript
                    console.log(`[RealtimeSTT] 🔤 Partial: "${event.delta}"`);
                    if (event.delta) {
                        this.handlePartialTranscript(event.item_id, event.delta);
                    }
                    break;

                case 'conversation.item.input_audio_transcription.completed':
                    // Final transcript for an utterance
                    console.log(`[RealtimeSTT] ✅ Final transcript: "${event.transcript}"`);
                    if (event.transcript) {
                        this.handleFinalTranscript(event.item_id, event.transcript);
                    }
                    break;

                // Error events
                case 'error':
                    console.error(`[RealtimeSTT] ❌ Error:`, event.error);
                    this.onError(new Error(event.error?.message || 'Unknown error'));
                    break;

                default:
                    // Log unhandled events
                    break;
            }
        } catch (error) {
            console.error('[RealtimeSTT] Failed to parse message:', error);
        }
    }

    handleError(error) {
        console.error(`[RealtimeSTT] WebSocket error:`, error.message);
        this.onError(error);
    }

    handleClose(code, reason) {
        console.log(`[RealtimeSTT] WebSocket closed: ${code} - ${reason}`);
        this.isConnected = false;
        
        if (!this.isEnded && this.reconnectAttempts < REALTIME_STT_CONFIG.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[RealtimeSTT] Reconnecting (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => this.connect(), REALTIME_STT_CONFIG.reconnectDelayMs);
        } else {
            this.onDisconnected();
        }
    }

    // ============================================
    // SESSION CONFIGURATION
    // ============================================

    sendSessionConfig() {
        // OpenAI Realtime API requires config inside a 'session' object
        // Reference: https://platform.openai.com/docs/api-reference/realtime
        const config = {
            type: 'transcription_session.update',
            session: {
                input_audio_format: REALTIME_STT_CONFIG.inputAudioFormat,
                input_audio_transcription: {
                    model: REALTIME_STT_CONFIG.model,
                    language: this.language || null, // null = auto-detect
                },
                turn_detection: {
                    type: 'server_vad',
                    threshold: REALTIME_STT_CONFIG.vad.threshold,
                    prefix_padding_ms: REALTIME_STT_CONFIG.vad.prefix_padding_ms,
                    silence_duration_ms: REALTIME_STT_CONFIG.vad.silence_duration_ms,
                },
            }
        };

        console.log(`[RealtimeSTT] 📤 Sending session config:`, {
            model: config.session.input_audio_transcription.model,
            language: config.session.input_audio_transcription.language || 'auto',
            vad: config.session.turn_detection,
        });

        this.send(config);
    }

    // ============================================
    // AUDIO STREAMING
    // ============================================

    /**
     * Send audio data to OpenAI Realtime
     * @param {Buffer} audioData - PCM16 audio buffer (mono, 24kHz)
     */
    sendAudio(audioData) {
        if (!this.isConnected || this.isEnded) return;

        // Convert buffer to base64
        const base64Audio = audioData.toString('base64');

        this.send({
            type: 'input_audio_buffer.append',
            audio: base64Audio,
        });
    }

    /**
     * Signal that audio input is complete (optional, VAD handles this automatically)
     */
    commitAudio() {
        if (!this.isConnected || this.isEnded) return;
        
        this.send({
            type: 'input_audio_buffer.commit',
        });
    }

    /**
     * Clear audio buffer (e.g., on interruption)
     */
    clearAudio() {
        if (!this.isConnected || this.isEnded) return;
        
        this.send({
            type: 'input_audio_buffer.clear',
        });
    }

    // ============================================
    // TRANSCRIPT HANDLING
    // ============================================

    handlePartialTranscript(itemId, delta) {
        // Accumulate partial transcript
        const existing = this.transcriptBuffer.get(itemId) || { text: '', isFinal: false };
        existing.text += delta;
        this.transcriptBuffer.set(itemId, existing);

        // Emit partial
        this.onPartialTranscript(existing.text);
    }

    handleFinalTranscript(itemId, transcript) {
        // Store final transcript
        this.transcriptBuffer.set(itemId, { text: transcript, isFinal: true });

        console.log(`[RealtimeSTT] ✅ Final transcript: "${transcript.substring(0, 50)}..."`);

        // Emit final
        this.onFinalTranscript(transcript, itemId);

        // Clean up old transcripts (keep last 10)
        if (this.transcriptBuffer.size > 10) {
            const keys = Array.from(this.transcriptBuffer.keys());
            for (let i = 0; i < keys.length - 10; i++) {
                this.transcriptBuffer.delete(keys[i]);
            }
        }
    }

    // ============================================
    // UTILITY
    // ============================================

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    isReady() {
        return this.isConnected && !this.isEnded;
    }
}

// ============================================
// AUDIO FORMAT CONVERSION UTILITIES
// ============================================

/**
 * Convert WebM/Opus audio to PCM16 for OpenAI Realtime
 * Note: For production, consider using FFmpeg or a dedicated audio library
 * 
 * @param {Buffer} webmBuffer - WebM audio buffer
 * @returns {Promise<Buffer>} - PCM16 audio buffer
 */
async function convertWebmToPCM16(webmBuffer) {
    // For now, we'll handle this conversion on the frontend
    // or use a library like fluent-ffmpeg
    // 
    // The frontend should ideally send PCM16 directly using AudioWorklet
    // This is a placeholder for the conversion logic
    
    console.warn('[RealtimeSTT] WebM to PCM16 conversion not implemented - frontend should send PCM16');
    return webmBuffer;
}

/**
 * Resample audio to target sample rate
 * @param {Buffer} pcmBuffer - Input PCM buffer
 * @param {number} inputRate - Input sample rate
 * @param {number} outputRate - Target sample rate (default 24000)
 * @returns {Buffer} - Resampled PCM buffer
 */
function resamplePCM(pcmBuffer, inputRate, outputRate = 24000) {
    if (inputRate === outputRate) return pcmBuffer;

    const ratio = outputRate / inputRate;
    const inputSamples = pcmBuffer.length / 2; // 16-bit = 2 bytes per sample
    const outputSamples = Math.floor(inputSamples * ratio);
    const output = Buffer.alloc(outputSamples * 2);

    for (let i = 0; i < outputSamples; i++) {
        const srcIndex = Math.floor(i / ratio);
        const srcOffset = srcIndex * 2;
        if (srcOffset + 1 < pcmBuffer.length) {
            output.writeInt16LE(pcmBuffer.readInt16LE(srcOffset), i * 2);
        }
    }

    return output;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    RealtimeSTTSession,
    REALTIME_STT_CONFIG,
    convertWebmToPCM16,
    resamplePCM,
};
