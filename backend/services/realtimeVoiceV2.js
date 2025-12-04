// ============================================
// REALTIME VOICE SERVICE V2 - Production-Grade Live Agent
// ============================================
// Like: VAPI, ElevenLabs Conversational AI, Twilio Voice
// Features:
//   - Latency metrics (P50/P99)
//   - Call recording
//   - Real-time partial transcripts
//   - Turn analytics
//   - Interruption handling
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
    vadSilenceMs: 600,
    vadMinSpeechMs: 100,
    
    // Audio processing
    sampleRate: 16000,
    chunkSizeMs: 100,
    
    // TTS streaming
    ttsChunkSize: 100,
    
    // Interruption
    interruptOnSpeech: true,
    
    // V2 Features
    enableMetrics: true,
    enableRecording: true,
    maxRecordingDuration: 30 * 60 * 1000, // 30 minutes
};

// ============================================
// LATENCY TRACKER CLASS
// ============================================

class LatencyTracker {
    constructor() {
        this.sttLatencies = [];
        this.llmLatencies = [];
        this.ttsLatencies = [];
        this.totalLatencies = [];
        this.turnCount = 0;
    }

    recordSTT(ms) {
        this.sttLatencies.push(ms);
    }

    recordLLM(ms) {
        this.llmLatencies.push(ms);
    }

    recordTTS(ms) {
        this.ttsLatencies.push(ms);
    }

    recordTotalTurn(ms) {
        this.totalLatencies.push(ms);
        this.turnCount++;
    }

    calculatePercentile(arr, percentile) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    getMetrics() {
        return {
            turnCount: this.turnCount,
            stt: {
                avg: this.sttLatencies.length > 0 
                    ? Math.round(this.sttLatencies.reduce((a, b) => a + b, 0) / this.sttLatencies.length)
                    : 0,
                p50: this.calculatePercentile(this.sttLatencies, 50),
                p99: this.calculatePercentile(this.sttLatencies, 99),
            },
            llm: {
                avg: this.llmLatencies.length > 0
                    ? Math.round(this.llmLatencies.reduce((a, b) => a + b, 0) / this.llmLatencies.length)
                    : 0,
                p50: this.calculatePercentile(this.llmLatencies, 50),
                p99: this.calculatePercentile(this.llmLatencies, 99),
            },
            tts: {
                avg: this.ttsLatencies.length > 0
                    ? Math.round(this.ttsLatencies.reduce((a, b) => a + b, 0) / this.ttsLatencies.length)
                    : 0,
                p50: this.calculatePercentile(this.ttsLatencies, 50),
                p99: this.calculatePercentile(this.ttsLatencies, 99),
            },
            total: {
                avg: this.totalLatencies.length > 0
                    ? Math.round(this.totalLatencies.reduce((a, b) => a + b, 0) / this.totalLatencies.length)
                    : 0,
                p50: this.calculatePercentile(this.totalLatencies, 50),
                p99: this.calculatePercentile(this.totalLatencies, 99),
            },
        };
    }
}

// ============================================
// CALL RECORDER CLASS
// ============================================

class CallRecorder {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.isRecording = false;
        this.userAudioChunks = [];
        this.assistantAudioChunks = [];
        this.transcript = [];
        this.startTime = null;
        this.endTime = null;
    }

    start() {
        this.isRecording = true;
        this.startTime = new Date();
        console.log(`[Recorder] Started recording for session ${this.sessionId}`);
    }

    stop() {
        this.isRecording = false;
        this.endTime = new Date();
        console.log(`[Recorder] Stopped recording for session ${this.sessionId}`);
    }

    addUserAudio(audioData) {
        if (!this.isRecording) return;
        this.userAudioChunks.push({
            data: audioData,
            timestamp: Date.now()
        });
    }

    addAssistantAudio(audioData) {
        if (!this.isRecording) return;
        this.assistantAudioChunks.push({
            data: audioData,
            timestamp: Date.now()
        });
    }

    addTranscript(role, text, timestamp = Date.now()) {
        this.transcript.push({ role, text, timestamp });
    }

    getRecordingSummary() {
        return {
            sessionId: this.sessionId,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime && this.startTime 
                ? this.endTime - this.startTime 
                : null,
            userAudioChunks: this.userAudioChunks.length,
            assistantAudioChunks: this.assistantAudioChunks.length,
            transcript: this.transcript,
        };
    }

    // Get combined audio for playback (future feature)
    getCombinedUserAudio() {
        return Buffer.concat(this.userAudioChunks.map(c => c.data));
    }

    getCombinedAssistantAudio() {
        return Buffer.concat(this.assistantAudioChunks.map(c => c.data));
    }
}

// ============================================
// REALTIME VOICE SESSION V2 CLASS
// ============================================

class RealtimeVoiceSessionV2 {
    constructor(options) {
        const {
            sessionId,
            assistantId,
            assistantConfig,
            userId,
            onTranscript,
            onPartialTranscript,
            onResponse,
            onAudio,
            onStateChange,
            onMetrics,
            onError
        } = options;

        this.sessionId = sessionId || `vs_${Date.now()}`;
        this.assistantId = assistantId;
        this.assistantConfig = assistantConfig;
        this.userId = userId;
        
        // Callbacks
        this.onTranscript = onTranscript || (() => {});
        this.onPartialTranscript = onPartialTranscript || (() => {});
        this.onResponse = onResponse || (() => {});
        this.onAudio = onAudio || (() => {});
        this.onStateChange = onStateChange || (() => {});
        this.onMetrics = onMetrics || (() => {});
        this.onError = onError || (() => {});

        // State
        this.state = 'idle';
        this.isEnded = false;
        this.isMuted = false;
        this.conversationHistory = [];
        
        // Audio buffers
        this.audioBuffer = [];
        this.lastAudioTime = 0;
        
        // TTS control
        this.currentTTSAbort = null;
        this.ttsQueue = [];

        // V2: Latency tracking
        this.latencyTracker = new LatencyTracker();
        this.turnStartTime = null;

        // V2: Call recording
        this.recorder = new CallRecorder(this.sessionId);

        // Resolved config
        this.resolvedConfig = null;
    }

    // ============================================
    // SESSION LIFECYCLE
    // ============================================

    async start() {
        console.log(`[RealtimeVoiceV2] 🚀 Starting session ${this.sessionId}`);
        this.setState('processing');

        // Start recording
        if (REALTIME_CONFIG.enableRecording) {
            this.recorder.start();
        }

        try {
            await this.resolveConfig();

            if (this.resolvedConfig.firstMessage) {
                this.setState('speaking');
                
                this.conversationHistory.push({
                    role: 'assistant',
                    content: this.resolvedConfig.firstMessage
                });
                
                this.recorder.addTranscript('assistant', this.resolvedConfig.firstMessage);
                this.onResponse(this.resolvedConfig.firstMessage);
                await this.speakText(this.resolvedConfig.firstMessage);
            }

            this.setState('listening');
            this.sendMetricsUpdate();

        } catch (error) {
            console.error('[RealtimeVoiceV2] Start error:', error);
            this.onError(error);
        }
    }

    end() {
        console.log(`[RealtimeVoiceV2] 🛑 Ending session ${this.sessionId}`);
        this.isEnded = true;
        this.interrupt();
        
        // Stop recording and get summary
        if (REALTIME_CONFIG.enableRecording) {
            this.recorder.stop();
            const summary = this.recorder.getRecordingSummary();
            console.log('[RealtimeVoiceV2] Recording summary:', {
                duration: summary.duration,
                turns: summary.transcript.length,
            });
        }

        // Send final metrics
        this.sendMetricsUpdate();
        this.setState('idle');
    }

    // ============================================
    // CONFIGURATION
    // ============================================

    async resolveConfig() {
        let config = { ...this.assistantConfig };

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
                ...this.assistantConfig
            };
        }

        this.resolvedConfig = config;
        console.log('[RealtimeVoiceV2] Config resolved:', {
            name: config.name,
            voiceId: config.voiceId,
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
            console.log(`[RealtimeVoiceV2] State: ${this.state} → ${newState}`);
            this.state = newState;
            this.onStateChange(newState);
        }
    }

    setMuted(muted) {
        this.isMuted = muted;
        console.log(`[RealtimeVoiceV2] Muted: ${muted}`);
    }

    // ============================================
    // AUDIO PROCESSING
    // ============================================

    async processAudio(audioData) {
        if (this.isEnded || this.isMuted) return;

        // Store complete audio file (browser now sends complete WebM blob)
        // We only expect one chunk now - the complete audio file
        this.audioBuffer = [audioData]; // Replace instead of push
        
        // Record user audio
        if (REALTIME_CONFIG.enableRecording) {
            this.recorder.addUserAudio(audioData);
        }
        
        // Start turn timer
        this.turnStartTime = Date.now();
    }

    async onSpeechEnd() {
        if (this.isEnded) return;
        if (this.audioBuffer.length === 0) {
            console.log('[RealtimeVoiceV2] speech_end but no audio');
            this.setState('listening');
            return;
        }

        const audioSize = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
        console.log(`[RealtimeVoiceV2] 🎤 speech_end - complete audio file (${audioSize} bytes)`);
        await this.processCollectedAudio();
    }

    async processCollectedAudio() {
        if (this.audioBuffer.length === 0) return;
        if (this.isEnded) return;

        this.setState('processing');
        const turnStart = this.turnStartTime || Date.now();

        try {
            // Get complete audio file (browser sends as single WebM blob now)
            const combinedAudio = Buffer.concat(this.audioBuffer);
            this.audioBuffer = [];
            
            console.log(`[RealtimeVoiceV2] Processing audio: ${combinedAudio.length} bytes`);

            // STT with latency tracking
            const sttStart = Date.now();
            const sttResult = await transcribe({
                audio: combinedAudio,
                filename: 'audio.webm',
                language: this.resolvedConfig?.languageSettings?.default || 'en'
            });
            const sttLatency = Date.now() - sttStart;
            this.latencyTracker.recordSTT(sttLatency);
            console.log(`[RealtimeVoiceV2] ⏱️ STT: ${sttLatency}ms`);

            if (!sttResult.success || !sttResult.text?.trim()) {
                console.log('[RealtimeVoiceV2] No transcription - STT result:', sttResult);
                this.setState('listening');
                return;
            }

            const userText = sttResult.text.trim();
            console.log('[RealtimeVoiceV2] 📝 Transcript:', userText);

            // Record and send transcript
            this.recorder.addTranscript('user', userText);
            this.onTranscript(userText, true);

            this.conversationHistory.push({
                role: 'user',
                content: userText
            });

            // Generate response with latency tracking
            await this.generateResponse(userText, turnStart);

        } catch (error) {
            console.error('[RealtimeVoiceV2] Processing error:', error);
            this.onError(error);
            this.setState('listening');
        }
    }

    // ============================================
    // LLM RESPONSE GENERATION
    // ============================================

    async generateResponse(userMessage, turnStart) {
        if (this.isEnded) return;

        try {
            // LLM with latency tracking
            const llmStart = Date.now();
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
            const llmLatency = Date.now() - llmStart;
            this.latencyTracker.recordLLM(llmLatency);
            console.log(`[RealtimeVoiceV2] ⏱️ LLM: ${llmLatency}ms`);

            if (result.error) {
                throw new Error(result.error);
            }

            const responseText = result.response;
            console.log('[RealtimeVoiceV2] 🤖 Response:', responseText.substring(0, 80) + '...');

            // Record transcript
            this.recorder.addTranscript('assistant', responseText);

            this.conversationHistory.push({
                role: 'assistant',
                content: responseText
            });

            this.onResponse(responseText);

            // TTS with latency tracking
            this.setState('speaking');
            const ttsStart = Date.now();
            await this.speakText(responseText);
            const ttsLatency = Date.now() - ttsStart;
            this.latencyTracker.recordTTS(ttsLatency);
            console.log(`[RealtimeVoiceV2] ⏱️ TTS: ${ttsLatency}ms`);

            // Record total turn latency
            const totalLatency = Date.now() - turnStart;
            this.latencyTracker.recordTotalTurn(totalLatency);
            console.log(`[RealtimeVoiceV2] ⏱️ Total turn: ${totalLatency}ms`);

            // Send metrics update
            this.sendMetricsUpdate();

            if (!this.isEnded) {
                this.setState('listening');
            }

        } catch (error) {
            console.error('[RealtimeVoiceV2] Response error:', error);
            this.onError(error);
            this.setState('listening');
        }
    }

    // ============================================
    // TEXT-TO-SPEECH
    // ============================================

    async speakText(text) {
        if (this.isEnded || !text) return;

        const abortController = { aborted: false };
        this.currentTTSAbort = abortController;

        try {
            const voiceId = this.resolvedConfig?.voiceId;
            if (!voiceId) {
                console.warn('[RealtimeVoiceV2] No voice configured');
                return;
            }

            const languageCode = this.getLanguageCode();
            console.log(`[RealtimeVoiceV2] 🔊 TTS: voiceId=${voiceId}`);

            await this.streamTTS(text, voiceId, languageCode, abortController);

        } catch (error) {
            if (!abortController.aborted) {
                console.error('[RealtimeVoiceV2] TTS error:', error);
                this.onError(error);
            }
        } finally {
            this.currentTTSAbort = null;
        }
    }

    async streamTTS(text, voiceId, languageCode, abortController) {
        const sentences = this.splitIntoSentences(text);
        
        for (const sentence of sentences) {
            if (abortController.aborted) break;
            if (!sentence.trim()) continue;

            const result = await synthesizeWithVoiceId(sentence, voiceId, languageCode);

            if (abortController.aborted) break;

            if (result.success) {
                const audioBuffer = Buffer.from(result.audioContent, 'base64');
                
                // Record assistant audio
                if (REALTIME_CONFIG.enableRecording) {
                    this.recorder.addAssistantAudio(audioBuffer);
                }
                
                this.onAudio(audioBuffer);
            }
        }
    }

    splitIntoSentences(text) {
        return text
            .split(/(?<=[.!?।])\s+/)
            .filter(s => s.trim().length > 0);
    }

    // ============================================
    // INTERRUPTION
    // ============================================

    interrupt() {
        console.log('[RealtimeVoiceV2] ⚡ BARGE-IN');
        
        if (this.currentTTSAbort) {
            this.currentTTSAbort.aborted = true;
        }

        this.audioBuffer = [];
        this.ttsQueue = [];

        if (this.state === 'speaking') {
            this.setState('listening');
        }
    }

    // ============================================
    // METRICS
    // ============================================

    sendMetricsUpdate() {
        if (!REALTIME_CONFIG.enableMetrics) return;
        
        const metrics = this.latencyTracker.getMetrics();
        this.onMetrics(metrics);
    }

    getMetrics() {
        return this.latencyTracker.getMetrics();
    }

    getRecordingSummary() {
        return this.recorder.getRecordingSummary();
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
}

module.exports = {
    RealtimeVoiceSessionV2,
    LatencyTracker,
    CallRecorder,
    REALTIME_CONFIG
};
