// ============================================
// REALTIME VOICE SERVICE - Streaming Voice AI
// ============================================
// Orchestrates: Streaming STT → LLM → Streaming TTS
// Features: Interruption, VAD, low-latency
// ============================================

const { processMessage } = require('./assistantProcessor');
const { synthesizeWithVoiceId } = require('./tts');
const { getCachedAssistant } = require('./assistant');
const { transcribe } = require('./stt');

// ============================================
// CONFIGURATION
// ============================================

const REALTIME_CONFIG = {
    // Voice Activity Detection
    vadSilenceMs: 600,          // Reduced for faster response
    vadMinSpeechMs: 100,        // Minimum speech duration
    
    // Audio processing
    sampleRate: 16000,          // 16kHz for STT
    chunkSizeMs: 100,           // Audio chunk size
    
    // TTS streaming - sentence-by-sentence for lower latency
    ttsChunkSize: 100,          // Send to TTS every N characters
    
    // Interruption
    interruptOnSpeech: true,    // Stop TTS when user speaks
};

// ============================================
// REALTIME VOICE SESSION CLASS
// ============================================

class RealtimeVoiceSession {
    constructor(options) {
        const {
            assistantId,
            assistantConfig,
            userId,
            onTranscript,
            onResponse,
            onAudio,
            onStateChange,
            onError
        } = options;

        this.assistantId = assistantId;
        this.assistantConfig = assistantConfig;
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
        this.isMuted = false;
        this.conversationHistory = [];
        
        // Audio buffers
        this.audioBuffer = [];
        this.lastAudioTime = 0;
        this.silenceTimer = null;
        this.hasReceivedAudio = false;
        
        // TTS control
        this.currentTTSAbort = null;
        this.ttsQueue = [];

        // Resolved config (will be set on start)
        this.resolvedConfig = null;
    }

    // ============================================
    // SESSION LIFECYCLE
    // ============================================

    async start() {
        console.log('[RealtimeVoice] Starting session');
        this.setState('processing');

        try {
            // Resolve assistant configuration
            await this.resolveConfig();

            // Play first message if configured
            if (this.resolvedConfig.firstMessage) {
                this.setState('speaking');
                
                // Add to history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: this.resolvedConfig.firstMessage
                });
                
                // Send response text
                this.onResponse(this.resolvedConfig.firstMessage);

                // Generate and stream TTS
                await this.speakText(this.resolvedConfig.firstMessage);
            }

            // Start listening
            this.setState('listening');

        } catch (error) {
            console.error('[RealtimeVoice] Start error:', error);
            this.onError(error);
        }
    }

    end() {
        console.log('[RealtimeVoice] Ending session');
        this.isEnded = true;
        this.interrupt();
        this.setState('idle');
    }

    // ============================================
    // CONFIGURATION
    // ============================================

    async resolveConfig() {
        // Start with assistantConfig (for preview)
        let config = { ...this.assistantConfig };

        // If assistantId provided, merge with database config
        if (this.assistantId) {
            const assistant = await getCachedAssistant(this.assistantId);
            if (!assistant) {
                throw new Error('Assistant not found');
            }
            
            config = {
                name: assistant.name,
                systemPrompt: assistant.system_prompt,
                firstMessage: assistant.first_message,
                voiceId: assistant.voice_id,
                languageSettings: assistant.language_settings,
                styleSettings: assistant.style_settings,
                llmModel: assistant.llm_model,
                temperature: assistant.temperature,
                maxTokens: assistant.max_tokens,
                ragEnabled: assistant.rag_enabled,
                ragSimilarityThreshold: assistant.rag_similarity_threshold,
                ragMaxResults: assistant.rag_max_results,
                ragInstructions: assistant.rag_instructions,
                knowledgeBaseIds: assistant.knowledge_base_ids || [],
                ...this.assistantConfig // Override with live config
            };
        }

        this.resolvedConfig = config;
        console.log('[RealtimeVoice] Config resolved:', {
            name: config.name,
            voiceId: config.voiceId,
            hasSystemPrompt: !!config.systemPrompt
        });
    }

    updateConfig(newConfig) {
        this.resolvedConfig = { ...this.resolvedConfig, ...newConfig };
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    setState(newState) {
        if (this.state !== newState) {
            console.log(`[RealtimeVoice] State: ${this.state} → ${newState}`);
            this.state = newState;
            this.onStateChange(newState);
        }
    }

    setMuted(muted) {
        this.isMuted = muted;
        console.log(`[RealtimeVoice] Muted: ${muted}`);
    }

    // ============================================
    // AUDIO PROCESSING (FROM BROWSER)
    // ============================================

    async processAudio(audioData) {
        if (this.isEnded || this.isMuted) return;

        // Accumulate audio - VAD is handled by browser
        this.audioBuffer.push(audioData);
        
        // Log periodically for debugging
        if (this.audioBuffer.length % 50 === 0) {
            console.log(`[RealtimeVoice] Audio buffer: ${this.audioBuffer.length} chunks`);
        }
    }

    // Called when browser detects speech ended (via VAD) or barge-in interrupt
    async onSpeechEnd() {
        if (this.isEnded) return;
        if (this.audioBuffer.length === 0) {
            console.log('[RealtimeVoice] speech_end received but no audio buffered');
            this.setState('listening');
            return;
        }

        console.log(`[RealtimeVoice] 🎤 speech_end - Processing ${this.audioBuffer.length} audio chunks`);
        await this.processCollectedAudio();
    }

    async processCollectedAudio() {
        if (this.audioBuffer.length === 0) return;
        if (this.isEnded) return;

        console.log(`[RealtimeVoice] Processing ${this.audioBuffer.length} audio chunks`);
        this.setState('processing');

        try {
            // Combine audio chunks
            const combinedAudio = Buffer.concat(this.audioBuffer);
            this.audioBuffer = [];

            // Transcribe with OpenAI
            const sttResult = await transcribe({
                audio: combinedAudio,
                filename: 'audio.webm',
                language: this.resolvedConfig?.languageSettings?.default || 'en'
            });

            if (!sttResult.success || !sttResult.text?.trim()) {
                console.log('[RealtimeVoice] No transcription result');
                this.setState('listening');
                return;
            }

            const userText = sttResult.text.trim();
            console.log('[RealtimeVoice] Transcription:', userText);

            // Send transcript to client
            this.onTranscript(userText, true);

            // Add to history
            this.conversationHistory.push({
                role: 'user',
                content: userText
            });

            // Generate response
            await this.generateResponse(userText);

        } catch (error) {
            console.error('[RealtimeVoice] Audio processing error:', error);
            this.onError(error);
            this.setState('listening');
        }
    }

    // ============================================
    // LLM RESPONSE GENERATION
    // ============================================

    async generateResponse(userMessage) {
        if (this.isEnded) return;

        console.log('[RealtimeVoice] Generating response...');

        try {
            // Use existing processMessage for RAG + LLM
            const result = await processMessage({
                message: userMessage,
                assistantId: this.assistantId,
                assistantConfig: this.resolvedConfig,
                conversationHistory: this.conversationHistory.slice(-10),
                channel: 'calls',
                customer: null,
                memory: null,
                userId: this.userId
            });

            if (result.error) {
                throw new Error(result.error);
            }

            const responseText = result.response;
            console.log('[RealtimeVoice] Response:', responseText.substring(0, 100) + '...');

            // Add to history
            this.conversationHistory.push({
                role: 'assistant',
                content: responseText
            });

            // Send response text to client
            this.onResponse(responseText);

            // Generate TTS and stream audio
            this.setState('speaking');
            await this.speakText(responseText);

            // Back to listening
            if (!this.isEnded) {
                this.setState('listening');
            }

        } catch (error) {
            console.error('[RealtimeVoice] Response generation error:', error);
            this.onError(error);
            this.setState('listening');
        }
    }

    // ============================================
    // TEXT-TO-SPEECH
    // ============================================

    async speakText(text) {
        if (this.isEnded || !text) return;

        // Create abort controller for interruption
        const abortController = { aborted: false };
        this.currentTTSAbort = abortController;

        try {
            // Get voice configuration (this is a UUID that references the voices table)
            const voiceId = this.resolvedConfig?.voiceId;
            if (!voiceId) {
                console.warn('[RealtimeVoice] No voice configured');
                return;
            }

            // Determine language code
            const languageCode = this.getLanguageCode();

            console.log(`[RealtimeVoice] TTS: voiceId=${voiceId}, lang=${languageCode}`);

            // Use sentence-by-sentence streaming for lower latency
            await this.streamTTS(text, voiceId, languageCode, abortController);

        } catch (error) {
            if (!abortController.aborted) {
                console.error('[RealtimeVoice] TTS error:', error);
                this.onError(error);
            }
        } finally {
            this.currentTTSAbort = null;
        }
    }

    async fullTTS(text, voiceId, languageCode, abortController) {
        // Use synthesizeWithVoiceId which looks up voice config from database
        const result = await synthesizeWithVoiceId(text, voiceId, languageCode);

        if (abortController.aborted) return;

        if (!result.success) {
            throw new Error(result.error);
        }

        // Send full audio to client
        const audioBuffer = Buffer.from(result.audioContent, 'base64');
        this.onAudio(audioBuffer);
    }

    async streamTTS(text, voiceId, languageCode, abortController) {
        // Split text into sentences for streaming
        const sentences = this.splitIntoSentences(text);
        
        for (const sentence of sentences) {
            if (abortController.aborted) break;
            if (!sentence.trim()) continue;

            // Use synthesizeWithVoiceId which looks up voice config from database
            const result = await synthesizeWithVoiceId(sentence, voiceId, languageCode);

            if (abortController.aborted) break;

            if (result.success) {
                const audioBuffer = Buffer.from(result.audioContent, 'base64');
                this.onAudio(audioBuffer);
            }
        }
    }

    splitIntoSentences(text) {
        // Split by sentence-ending punctuation
        return text
            .split(/(?<=[.!?।])\s+/)
            .filter(s => s.trim().length > 0);
    }

    // ============================================
    // INTERRUPTION (BARGE-IN)
    // ============================================

    interrupt() {
        console.log('[RealtimeVoice] ⚡ BARGE-IN - Interrupting current response');
        
        // Abort current TTS generation
        if (this.currentTTSAbort) {
            this.currentTTSAbort.aborted = true;
            console.log('[RealtimeVoice] TTS generation aborted');
        }

        // Clear audio buffer
        this.audioBuffer = [];
        
        // Clear TTS queue
        this.ttsQueue = [];

        // If we were speaking, switch back to listening
        if (this.state === 'speaking') {
            this.setState('listening');
        }
    }

    // ============================================
    // HELPERS
    // ============================================

    getLanguageCode() {
        const langMap = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'hi-Latn': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'mr': 'mr-IN',
            'bn': 'bn-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
        };
        const defaultLang = this.resolvedConfig?.languageSettings?.default || 'en';
        return langMap[defaultLang] || 'en-IN';
    }

    getProviderFromVoiceId(voiceId) {
        if (!voiceId) return 'google';
        
        // ElevenLabs IDs are 21-character alphanumeric
        if (/^[a-zA-Z0-9]{21}$/.test(voiceId)) {
            return 'elevenlabs';
        }
        
        // OpenAI voices
        if (['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voiceId)) {
            return 'openai';
        }
        
        // Default to Google (Chirp 3 HD)
        return 'google';
    }

    extractVoiceId(voiceId) {
        // For Google, voiceId might be just the name (e.g., "Achernar")
        // For ElevenLabs/OpenAI, it's the full ID
        return voiceId;
    }
}

module.exports = {
    RealtimeVoiceSession,
    REALTIME_CONFIG
};
