// ============================================
// CALLBOT STREAM HANDLER - Real-time Voice AI
// Uses Twilio Media Streams + WebSocket for low-latency voice
// ============================================

const WebSocket = require('ws');
const { transcribeStream } = require('../stt');
const { processMessage } = require('../assistantProcessor');
const { synthesizeWithVoiceId, getVoiceConfig, getTTSOptimizedSystemPrompt } = require('../tts');
const { getCachedPhoneConfig, getCachedAssistant } = require('../assistant');
const { supabase } = require('../../config');

// Audio format constants for Twilio Media Streams
const TWILIO_SAMPLE_RATE = 8000;
const TWILIO_ENCODING = 'mulaw'; // μ-law encoding

/**
 * CallSession - Manages a single voice call session
 */
class CallSession {
    constructor(callSid, streamSid, phoneNumber, userId) {
        this.callSid = callSid;
        this.streamSid = streamSid;
        this.phoneNumber = phoneNumber;
        this.userId = userId;
        this.assistant = null;
        this.voice = null;
        
        // Conversation state
        this.conversationHistory = [];
        this.isProcessing = false;
        this.audioBuffer = [];
        this.silenceTimer = null;
        
        // Timing
        this.startedAt = new Date();
        this.lastActivityAt = new Date();
        
        // VAD (Voice Activity Detection) settings
        this.vadSilenceMs = 1000; // 1 second of silence to trigger processing
        this.minSpeechMs = 300;   // Minimum speech duration to process
    }

    /**
     * Initialize session with assistant config
     */
    async initialize() {
        try {
            const phoneConfig = await getCachedPhoneConfig(this.phoneNumber);
            if (!phoneConfig?.assistant_id) {
                throw new Error('No assistant configured for this phone number');
            }

            this.assistant = await getCachedAssistant(phoneConfig.assistant_id);
            if (!this.assistant) {
                throw new Error('Assistant not found');
            }

            // Get voice configuration
            if (this.assistant.voice_id) {
                const { data: voice } = await supabase
                    .from('voices')
                    .select('*')
                    .eq('id', this.assistant.voice_id)
                    .single();
                this.voice = voice;
                
                // Apply TTS-optimized system prompt for Google Chirp 3 HD voices
                if (voice?.tts_provider === 'google') {
                    const languageCode = this.assistant.language_settings?.default || 'en-IN';
                    this.assistant.system_prompt = getTTSOptimizedSystemPrompt(
                        this.assistant.system_prompt || 'You are a helpful assistant.',
                        { languageCode }
                    );
                    console.log(`[CallSession] 🎯 Applied TTS-optimized prompt for Google Chirp 3 HD`);
                }
            }

            console.log(`[CallSession] Initialized for call ${this.callSid}`, {
                assistant: this.assistant.name,
                voice: this.voice?.name || 'default',
                voiceProvider: this.voice?.tts_provider
            });

            return true;
        } catch (error) {
            console.error(`[CallSession] Init error:`, error.message);
            return false;
        }
    }

    /**
     * Add audio chunk to buffer
     */
    addAudioChunk(chunk) {
        this.audioBuffer.push(chunk);
        this.lastActivityAt = new Date();
        
        // Reset silence timer
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        
        // Start new silence timer
        this.silenceTimer = setTimeout(() => {
            this.onSilenceDetected();
        }, this.vadSilenceMs);
    }

    /**
     * Called when silence is detected after speech
     */
    async onSilenceDetected() {
        if (this.isProcessing || this.audioBuffer.length === 0) {
            return;
        }

        // Check if we have enough audio (minimum speech duration)
        const audioData = Buffer.concat(this.audioBuffer);
        const durationMs = (audioData.length / TWILIO_SAMPLE_RATE) * 1000;
        
        if (durationMs < this.minSpeechMs) {
            console.log(`[CallSession] Audio too short (${durationMs}ms), ignoring`);
            this.audioBuffer = [];
            return;
        }

        this.isProcessing = true;
        console.log(`[CallSession] Processing ${durationMs}ms of audio`);

        try {
            // Clear buffer for next utterance
            const audioToProcess = Buffer.concat(this.audioBuffer);
            this.audioBuffer = [];

            // This will be handled by the stream processor
            // Emit event for the WebSocket handler
            if (this.onAudioReady) {
                this.onAudioReady(audioToProcess);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Add message to conversation history
     */
    addToHistory(role, content) {
        this.conversationHistory.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });

        // Keep last 20 messages
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }
    }

    /**
     * Clean up session
     */
    cleanup() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        this.audioBuffer = [];
        console.log(`[CallSession] Cleaned up call ${this.callSid}`);
    }
}

// Active call sessions
const activeSessions = new Map();

/**
 * Handle incoming Twilio Media Stream WebSocket connection
 */
function handleMediaStream(ws, req) {
    let session = null;
    let callSid = null;
    let streamSid = null;

    console.log('[MediaStream] New WebSocket connection');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.event) {
                case 'connected':
                    console.log('[MediaStream] Connected event received');
                    break;

                case 'start':
                    // Stream started - initialize session
                    callSid = data.start.callSid;
                    streamSid = data.start.streamSid;
                    const phoneNumber = data.start.customParameters?.phoneNumber || 
                                       data.start.to || 
                                       'unknown';
                    const userId = data.start.customParameters?.userId || 'unknown';

                    console.log('[MediaStream] Stream started:', {
                        callSid,
                        streamSid,
                        phoneNumber
                    });

                    // Create and initialize session
                    session = new CallSession(callSid, streamSid, phoneNumber, userId);
                    activeSessions.set(callSid, session);

                    const initialized = await session.initialize();
                    if (!initialized) {
                        console.error('[MediaStream] Failed to initialize session');
                        ws.close();
                        return;
                    }

                    // Set up audio ready handler
                    session.onAudioReady = async (audioBuffer) => {
                        await processAudioAndRespond(ws, session, audioBuffer);
                    };

                    // Send first message if configured
                    if (session.assistant?.first_message) {
                        await sendTTSResponse(ws, session, session.assistant.first_message);
                    }
                    break;

                case 'media':
                    // Incoming audio from caller
                    if (session && data.media?.payload) {
                        const audioChunk = Buffer.from(data.media.payload, 'base64');
                        session.addAudioChunk(audioChunk);
                    }
                    break;

                case 'stop':
                    console.log('[MediaStream] Stream stopped');
                    if (session) {
                        await saveCallLog(session);
                        session.cleanup();
                        activeSessions.delete(callSid);
                    }
                    break;

                default:
                    // Ignore other events (dtmf, mark, etc.)
                    break;
            }
        } catch (error) {
            console.error('[MediaStream] Message handling error:', error);
        }
    });

    ws.on('close', () => {
        console.log('[MediaStream] WebSocket closed');
        if (session) {
            session.cleanup();
            if (callSid) {
                activeSessions.delete(callSid);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('[MediaStream] WebSocket error:', error);
    });
}

/**
 * Process audio and send AI response
 */
async function processAudioAndRespond(ws, session, audioBuffer) {
    try {
        console.log('[MediaStream] Processing audio...');
        const startTime = Date.now();

        // Step 1: STT - Convert audio to text
        // For Twilio μ-law audio, we need to convert to a format OpenAI accepts
        const transcription = await transcribeAudio(audioBuffer);
        
        if (!transcription || transcription.trim().length === 0) {
            console.log('[MediaStream] No transcription, skipping');
            return;
        }

        console.log(`[MediaStream] STT (${Date.now() - startTime}ms):`, transcription);
        session.addToHistory('user', transcription);

        // Step 2: LLM - Generate response
        const llmStart = Date.now();
        const result = await processMessage({
            message: transcription,
            assistantId: session.assistant.id,
            channel: 'calls',
            conversationHistory: session.conversationHistory.slice(-10),
            userId: session.userId
        });

        const response = result.response || result.text || 
            "I'm sorry, I couldn't process that.";
        
        console.log(`[MediaStream] LLM (${Date.now() - llmStart}ms):`, response.substring(0, 100));
        session.addToHistory('assistant', response);

        // Step 3: TTS - Convert response to audio and send
        await sendTTSResponse(ws, session, response);

        console.log(`[MediaStream] Total processing: ${Date.now() - startTime}ms`);

    } catch (error) {
        console.error('[MediaStream] Processing error:', error);
        // Send error message
        await sendTTSResponse(ws, session, "I'm sorry, I encountered an error. Please try again.");
    }
}

/**
 * Transcribe μ-law audio from Twilio
 */
async function transcribeAudio(audioBuffer) {
    try {
        // Convert μ-law to PCM/WAV for OpenAI
        // For now, we'll use the transcribeBuffer function
        // In production, you'd want proper μ-law to PCM conversion
        
        const { transcribe } = require('../stt');
        
        // Create a WAV header for the μ-law audio
        const wavBuffer = createWavFromMulaw(audioBuffer);
        
        const result = await transcribe(wavBuffer, {
            model: 'gpt-4o-transcribe',
            language: 'en' // Could be dynamic based on assistant settings
        });

        return result?.text || '';
    } catch (error) {
        console.error('[MediaStream] Transcription error:', error);
        return '';
    }
}

/**
 * Create WAV file from μ-law audio
 */
function createWavFromMulaw(mulawBuffer) {
    // μ-law to PCM conversion
    const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2);
    
    for (let i = 0; i < mulawBuffer.length; i++) {
        const pcmSample = mulawToPcm(mulawBuffer[i]);
        pcmBuffer.writeInt16LE(pcmSample, i * 2);
    }

    // Create WAV header
    const wavHeader = Buffer.alloc(44);
    const dataSize = pcmBuffer.length;
    const fileSize = dataSize + 36;

    // RIFF header
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);

    // fmt chunk
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);      // Chunk size
    wavHeader.writeUInt16LE(1, 20);        // Audio format (PCM)
    wavHeader.writeUInt16LE(1, 22);        // Num channels (mono)
    wavHeader.writeUInt32LE(8000, 24);     // Sample rate
    wavHeader.writeUInt32LE(16000, 28);    // Byte rate
    wavHeader.writeUInt16LE(2, 32);        // Block align
    wavHeader.writeUInt16LE(16, 34);       // Bits per sample

    // data chunk
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);

    return Buffer.concat([wavHeader, pcmBuffer]);
}

/**
 * Convert μ-law sample to PCM
 */
function mulawToPcm(mulawByte) {
    const MULAW_BIAS = 33;
    const sign = (mulawByte & 0x80) ? -1 : 1;
    const exponent = (mulawByte >> 4) & 0x07;
    const mantissa = mulawByte & 0x0F;
    
    let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
    sample = sign * (sample - MULAW_BIAS);
    
    return sample;
}

/**
 * Send TTS audio response via WebSocket
 */
async function sendTTSResponse(ws, session, text) {
    try {
        const languageCode = session.assistant?.language || 'en-IN';
        
        let audioContent = null;
        
        // Try custom voice TTS
        if (session.voice?.voice_id) {
            const ttsResult = await synthesizeWithVoiceId(
                text,
                session.voice.voice_id,
                languageCode
            );
            
            if (ttsResult?.success && ttsResult?.audioContent) {
                audioContent = ttsResult.audioContent;
            }
        }

        if (!audioContent) {
            // Fallback: Use OpenAI TTS or Google TTS
            const { synthesize } = require('../tts');
            const fallbackResult = await synthesize({
                text,
                provider: 'openai',
                voiceId: 'alloy',
                languageCode
            });
            
            if (fallbackResult?.success) {
                audioContent = fallbackResult.audioContent;
            }
        }

        if (audioContent) {
            // Convert to μ-law format for Twilio
            const mulawAudio = await convertToMulaw(audioContent);
            
            // Send audio in chunks
            const chunkSize = 320; // 20ms of μ-law audio at 8kHz
            for (let i = 0; i < mulawAudio.length; i += chunkSize) {
                const chunk = mulawAudio.slice(i, i + chunkSize);
                
                ws.send(JSON.stringify({
                    event: 'media',
                    streamSid: session.streamSid,
                    media: {
                        payload: chunk.toString('base64')
                    }
                }));
                
                // Small delay to prevent overwhelming the stream
                await sleep(15);
            }

            // Send mark to indicate end of audio
            ws.send(JSON.stringify({
                event: 'mark',
                streamSid: session.streamSid,
                mark: {
                    name: 'response_end'
                }
            }));
        }

    } catch (error) {
        console.error('[MediaStream] TTS error:', error);
    }
}

/**
 * Convert MP3/PCM audio to μ-law for Twilio
 * In production, use ffmpeg or a proper audio processing library
 */
async function convertToMulaw(base64Audio) {
    // This is a simplified conversion
    // In production, use ffmpeg: ffmpeg -i input.mp3 -ar 8000 -ac 1 -f mulaw output.raw
    
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    
    // For now, return a placeholder
    // TODO: Implement proper audio conversion with ffmpeg
    console.warn('[MediaStream] Audio conversion not fully implemented - using placeholder');
    
    return audioBuffer;
}

/**
 * Save call log to database
 */
async function saveCallLog(session) {
    try {
        await supabase
            .from('call_logs')
            .upsert({
                call_sid: session.callSid,
                assistant_id: session.assistant?.id,
                user_id: session.userId,
                transcript: session.conversationHistory,
                status: 'completed',
                started_at: session.startedAt.toISOString(),
                ended_at: new Date().toISOString(),
                duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
            }, {
                onConflict: 'call_sid'
            });
        
        console.log(`[MediaStream] Call log saved for ${session.callSid}`);
    } catch (error) {
        console.error('[MediaStream] Failed to save call log:', error);
    }
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get active session by call SID
 */
function getSession(callSid) {
    return activeSessions.get(callSid);
}

/**
 * Get all active sessions count
 */
function getActiveSessionCount() {
    return activeSessions.size;
}

module.exports = {
    handleMediaStream,
    getSession,
    getActiveSessionCount,
    CallSession
};
