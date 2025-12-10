// ============================================
// VOICE AGENT SERVICE - Real-Time Voice AI
// LiveKit-style architecture for ultra-low latency voice interactions
// ============================================
// This is the core voice agent orchestrator that handles:
// - WebSocket/WebRTC transport
// - VAD (Voice Activity Detection)
// - STT (Speech-to-Text) streaming
// - LLM (Language Model) streaming
// - TTS (Text-to-Speech) streaming
// - Barge-in/Interruption handling
// ============================================

const { EventEmitter } = require('events');

// ============================================
// VOICE AGENT STATE MACHINE
// ============================================
const AgentState = {
    IDLE: 'idle',
    LISTENING: 'listening',
    PROCESSING: 'processing',
    SPEAKING: 'speaking',
    INTERRUPTED: 'interrupted',
    ENDED: 'ended',
};

// ============================================
// VOICE AGENT CLASS
// ============================================
class VoiceAgent extends EventEmitter {
    constructor(config) {
        super();
        
        // Core configuration
        this.sessionId = config.sessionId;
        this.assistantId = config.assistantId;
        this.userId = config.userId;
        this.systemPrompt = config.systemPrompt || '';
        
        // State management
        this.state = AgentState.IDLE;
        this.conversationHistory = [];
        this.currentTranscript = '';
        this.pendingTTSText = '';
        
        // Provider configurations
        this.sttConfig = {
            provider: config.sttProvider || 'deepgram',
            model: config.sttModel || 'nova-2',
            language: config.sttLanguage || 'en',
            interimResults: config.sttInterimResults !== false,
            endpointingMs: config.sttEndpointingMs || 400,
            keywords: config.sttKeywords || [],
        };
        
        this.llmConfig = {
            provider: config.llmProvider || 'openai',
            model: config.llmModel || 'gpt-4o',
            temperature: config.llmTemperature || 0.7,
            maxTokens: config.llmMaxTokens || 300,
            streaming: config.llmStreaming !== false,
        };
        
        this.ttsConfig = {
            provider: config.ttsProvider || 'elevenlabs',
            voiceId: config.ttsVoiceId,
            model: config.ttsModel || 'eleven_turbo_v2_5',
            stability: config.ttsStability || 0.5,
            similarityBoost: config.ttsSimilarityBoost || 0.75,
            chunkLength: config.ttsChunkLength || 100,
        };
        
        // VAD configuration
        this.vadConfig = {
            enabled: config.vadEnabled !== false,
            threshold: config.vadThreshold || 0.5,
            minSpeechDurationMs: config.vadMinSpeechDurationMs || 200,
            silenceDurationMs: config.vadSilenceDurationMs || 500,
            paddingMs: config.vadPaddingMs || 300,
        };
        
        // Interruption configuration
        this.interruptConfig = {
            enabled: config.interruptionEnabled !== false,
            thresholdMs: config.interruptionThresholdMs || 200,
            cancelPending: config.interruptionCancelPending !== false,
            minWords: config.interruptionMinWords || 1,
        };
        
        // Turn-taking configuration
        this.turnConfig = {
            mode: config.turnDetectionMode || 'server_vad',
            endSilenceMs: config.turnEndSilenceMs || 700,
            maxDurationMs: config.turnMaxDurationMs || 30000,
        };
        
        // Latency optimization
        this.optimisticSTT = config.optimisticStt !== false;
        this.sentenceSplitting = config.sentenceSplitting !== false;
        this.sentenceSplitChars = config.sentenceSplitChars || '.,!?;:';
        
        // Audio settings
        this.audioConfig = {
            inputSampleRate: config.inputSampleRate || 16000,
            outputSampleRate: config.outputSampleRate || 24000,
            encoding: config.audioEncoding || 'pcm_s16le',
            channels: 1,
        };
        
        // Session settings
        this.greetingEnabled = config.greetingEnabled !== false;
        this.greetingDelayMs = config.greetingDelayMs || 500;
        this.farewellPhrase = config.farewellPhrase || 'Goodbye! Have a great day.';
        
        // Metrics tracking
        this.metrics = {
            turnCount: 0,
            interruptionCount: 0,
            totalUserSpeechMs: 0,
            totalAgentSpeechMs: 0,
            latencies: {
                stt: [],
                llm: [],
                tts: [],
                total: [],
            },
        };
        
        // Internal state
        this._audioBuffer = [];
        this._sttClient = null;
        this._ttsClient = null;
        this._currentTTSStream = null;
        this._vadActive = false;
        this._speechStartTime = null;
        this._lastSpeechTime = null;
        this._processingStartTime = null;
        this._turnStartTime = null;
        
        console.log(`[VoiceAgent] Created agent for session ${this.sessionId}`);
    }
    
    // ============================================
    // LIFECYCLE METHODS
    // ============================================
    
    async start() {
        try {
            console.log(`[VoiceAgent] Starting session ${this.sessionId}`);
            this.state = AgentState.LISTENING;
            this.emit('stateChange', this.state);
            
            // Initialize STT connection
            await this._initSTT();
            
            // Send greeting if enabled
            if (this.greetingEnabled && this.systemPrompt) {
                setTimeout(() => {
                    this._generateGreeting();
                }, this.greetingDelayMs);
            }
            
            this.emit('started', { sessionId: this.sessionId });
            
        } catch (error) {
            console.error(`[VoiceAgent] Failed to start:`, error);
            this.state = AgentState.ENDED;
            this.emit('error', { type: 'start_failed', error });
        }
    }
    
    async stop() {
        console.log(`[VoiceAgent] Stopping session ${this.sessionId}`);
        
        // Cancel any pending TTS
        this._cancelTTS();
        
        // Close STT connection
        if (this._sttClient) {
            this._sttClient.finish();
            this._sttClient = null;
        }
        
        this.state = AgentState.ENDED;
        this.emit('stateChange', this.state);
        this.emit('ended', {
            sessionId: this.sessionId,
            metrics: this.metrics,
            conversationHistory: this.conversationHistory,
        });
    }
    
    // ============================================
    // AUDIO INPUT HANDLING
    // ============================================
    
    /**
     * Process incoming audio chunk from user
     * @param {Buffer} audioChunk - PCM audio data
     */
    processAudioInput(audioChunk) {
        if (this.state === AgentState.ENDED) return;
        
        // Buffer audio for VAD processing
        this._audioBuffer.push(audioChunk);
        
        // Run VAD if enabled
        if (this.vadConfig.enabled) {
            this._processVAD(audioChunk);
        }
        
        // Stream to STT (optimistic processing)
        if (this._sttClient && (this.optimisticSTT || this._vadActive)) {
            this._sttClient.send(audioChunk);
        }
        
        // Check for interruption while bot is speaking
        if (this.state === AgentState.SPEAKING && this._vadActive) {
            this._handleInterruption();
        }
    }
    
    // ============================================
    // VAD (VOICE ACTIVITY DETECTION)
    // ============================================
    
    _processVAD(audioChunk) {
        // Calculate RMS energy of audio chunk
        const samples = new Int16Array(audioChunk.buffer, audioChunk.byteOffset, audioChunk.length / 2);
        let sumSquares = 0;
        for (let i = 0; i < samples.length; i++) {
            sumSquares += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        const normalizedEnergy = rms / 32768; // Normalize to 0-1
        
        const isSpeech = normalizedEnergy > this.vadConfig.threshold;
        const now = Date.now();
        
        if (isSpeech) {
            if (!this._vadActive) {
                // Speech started
                this._vadActive = true;
                this._speechStartTime = now;
                this._turnStartTime = this._turnStartTime || now;
                this.emit('vadStart', { timestamp: now });
            }
            this._lastSpeechTime = now;
        } else {
            if (this._vadActive) {
                const silenceDuration = now - this._lastSpeechTime;
                
                // Check if silence exceeds threshold
                if (silenceDuration >= this.vadConfig.silenceDurationMs) {
                    const speechDuration = this._lastSpeechTime - this._speechStartTime;
                    
                    // Only trigger if speech was long enough
                    if (speechDuration >= this.vadConfig.minSpeechDurationMs) {
                        this._vadActive = false;
                        this.metrics.totalUserSpeechMs += speechDuration;
                        this.emit('vadEnd', { 
                            timestamp: now, 
                            duration: speechDuration 
                        });
                        
                        // End of user turn - process response
                        this._endUserTurn();
                    }
                }
            }
        }
    }
    
    // ============================================
    // STT (SPEECH-TO-TEXT) HANDLING
    // ============================================
    
    async _initSTT() {
        const { createSTTClient } = require('./providers/stt');
        
        this._sttClient = createSTTClient({
            provider: this.sttConfig.provider,
            model: this.sttConfig.model,
            language: this.sttConfig.language,
            interimResults: this.sttConfig.interimResults,
            endpointingMs: this.sttConfig.endpointingMs,
            keywords: this.sttConfig.keywords,
            sampleRate: this.audioConfig.inputSampleRate,
        });
        
        // Handle STT events
        this._sttClient.on('transcript', (data) => {
            this._handleTranscript(data);
        });
        
        this._sttClient.on('error', (error) => {
            console.error(`[VoiceAgent] STT error:`, error);
            this.emit('error', { type: 'stt_error', error });
        });
        
        await this._sttClient.connect();
        console.log(`[VoiceAgent] STT connected (${this.sttConfig.provider})`);
    }
    
    _handleTranscript(data) {
        const { transcript, isFinal, confidence, latencyMs } = data;
        
        if (latencyMs) {
            this.metrics.latencies.stt.push(latencyMs);
        }
        
        // Emit interim results for UI display
        this.emit('transcript', {
            text: transcript,
            isFinal,
            confidence,
            isUser: true,
        });
        
        if (isFinal && transcript.trim()) {
            this.currentTranscript = transcript.trim();
            console.log(`[VoiceAgent] User said: "${this.currentTranscript}"`);
        }
    }
    
    // ============================================
    // TURN MANAGEMENT
    // ============================================
    
    _endUserTurn() {
        if (!this.currentTranscript.trim()) {
            console.log(`[VoiceAgent] Empty transcript, ignoring turn`);
            return;
        }
        
        const userMessage = this.currentTranscript.trim();
        this.currentTranscript = '';
        
        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString(),
        });
        
        this.metrics.turnCount++;
        this._processingStartTime = Date.now();
        
        // Transition to processing state
        this.state = AgentState.PROCESSING;
        this.emit('stateChange', this.state);
        
        // Generate response
        this._generateResponse(userMessage);
    }
    
    // ============================================
    // LLM (LANGUAGE MODEL) PROCESSING
    // ============================================
    
    async _generateGreeting() {
        try {
            const { streamLLMResponse } = require('./providers/llm');
            
            // Generate greeting based on system prompt
            const greetingPrompt = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: '[SYSTEM] Generate a brief, natural greeting for a voice call. Be conversational and welcoming. Keep it under 20 words.' },
            ];
            
            let greeting = '';
            
            await streamLLMResponse({
                provider: this.llmConfig.provider,
                model: this.llmConfig.model,
                messages: greetingPrompt,
                temperature: 0.8,
                maxTokens: 50,
                onToken: (token) => {
                    greeting += token;
                },
            });
            
            // Clean up the greeting
            greeting = greeting.replace(/["\[\]]/g, '').trim();
            
            // Add to history
            this.conversationHistory.push({
                role: 'assistant',
                content: greeting,
                timestamp: new Date().toISOString(),
            });
            
            // Speak the greeting
            this._speakText(greeting);
            
        } catch (error) {
            console.error(`[VoiceAgent] Failed to generate greeting:`, error);
            // Use fallback greeting
            this._speakText("Hello! How can I help you today?");
        }
    }
    
    async _generateResponse(userMessage) {
        try {
            const { streamLLMResponse } = require('./providers/llm');
            
            const llmStartTime = Date.now();
            let fullResponse = '';
            let sentenceBuffer = '';
            let firstTokenTime = null;
            
            // Build messages for LLM
            const messages = [
                { role: 'system', content: this.systemPrompt },
                ...this.conversationHistory.slice(-10).map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            ];
            
            // Stream LLM response
            await streamLLMResponse({
                provider: this.llmConfig.provider,
                model: this.llmConfig.model,
                messages,
                temperature: this.llmConfig.temperature,
                maxTokens: this.llmConfig.maxTokens,
                onToken: (token) => {
                    if (!firstTokenTime) {
                        firstTokenTime = Date.now();
                        this.metrics.latencies.llm.push(firstTokenTime - llmStartTime);
                    }
                    
                    fullResponse += token;
                    sentenceBuffer += token;
                    
                    // Emit token for UI display
                    this.emit('transcript', {
                        text: fullResponse,
                        isFinal: false,
                        isUser: false,
                    });
                    
                    // Check for sentence completion (for streaming TTS)
                    if (this.sentenceSplitting) {
                        this._processSentenceBuffer(sentenceBuffer, (sentence) => {
                            sentenceBuffer = sentenceBuffer.slice(sentence.length);
                        });
                    }
                },
            });
            
            // Add to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
            });
            
            // Emit final transcript
            this.emit('transcript', {
                text: fullResponse,
                isFinal: true,
                isUser: false,
            });
            
            // Send remaining text to TTS
            if (sentenceBuffer.trim()) {
                this._speakText(sentenceBuffer.trim());
            }
            
            // Calculate total latency
            const totalLatency = Date.now() - this._processingStartTime;
            this.metrics.latencies.total.push(totalLatency);
            
            console.log(`[VoiceAgent] Response generated in ${totalLatency}ms`);
            
        } catch (error) {
            console.error(`[VoiceAgent] LLM error:`, error);
            this.emit('error', { type: 'llm_error', error });
            
            // Speak error message
            this._speakText("I'm sorry, I had trouble processing that. Could you please repeat?");
        }
    }
    
    _processSentenceBuffer(buffer, onSentence) {
        // Look for sentence-ending punctuation
        for (const char of this.sentenceSplitChars) {
            const idx = buffer.indexOf(char);
            if (idx !== -1 && idx < buffer.length - 1) {
                const sentence = buffer.slice(0, idx + 1).trim();
                if (sentence.length > 10) { // Minimum sentence length
                    this._speakText(sentence);
                    onSentence(buffer.slice(0, idx + 1));
                    return;
                }
            }
        }
    }
    
    // ============================================
    // TTS (TEXT-TO-SPEECH) HANDLING
    // ============================================
    
    async _speakText(text) {
        if (!text.trim() || this.state === AgentState.ENDED) return;
        
        try {
            const { streamTTS } = require('./providers/tts');
            
            this.state = AgentState.SPEAKING;
            this.emit('stateChange', this.state);
            
            const ttsStartTime = Date.now();
            let firstAudioTime = null;
            
            // Create TTS stream
            this._currentTTSStream = await streamTTS({
                provider: this.ttsConfig.provider,
                voiceId: this.ttsConfig.voiceId,
                model: this.ttsConfig.model,
                text,
                stability: this.ttsConfig.stability,
                similarityBoost: this.ttsConfig.similarityBoost,
                sampleRate: this.audioConfig.outputSampleRate,
                onAudio: (audioChunk) => {
                    if (!firstAudioTime) {
                        firstAudioTime = Date.now();
                        this.metrics.latencies.tts.push(firstAudioTime - ttsStartTime);
                    }
                    
                    // Emit audio for playback
                    this.emit('audio', audioChunk);
                },
                onEnd: () => {
                    this._currentTTSStream = null;
                    
                    // Return to listening state
                    if (this.state !== AgentState.ENDED && this.state !== AgentState.INTERRUPTED) {
                        this.state = AgentState.LISTENING;
                        this.emit('stateChange', this.state);
                    }
                },
            });
            
        } catch (error) {
            console.error(`[VoiceAgent] TTS error:`, error);
            this.emit('error', { type: 'tts_error', error });
            
            this.state = AgentState.LISTENING;
            this.emit('stateChange', this.state);
        }
    }
    
    _cancelTTS() {
        if (this._currentTTSStream) {
            console.log(`[VoiceAgent] Cancelling TTS stream`);
            this._currentTTSStream.cancel();
            this._currentTTSStream = null;
        }
        this.pendingTTSText = '';
    }
    
    // ============================================
    // INTERRUPTION (BARGE-IN) HANDLING
    // ============================================
    
    _handleInterruption() {
        if (!this.interruptConfig.enabled) return;
        if (this.state !== AgentState.SPEAKING) return;
        
        const speechDuration = Date.now() - this._speechStartTime;
        
        // Check if user speech exceeds threshold
        if (speechDuration >= this.interruptConfig.thresholdMs) {
            console.log(`[VoiceAgent] Interruption detected after ${speechDuration}ms`);
            
            this.state = AgentState.INTERRUPTED;
            this.emit('stateChange', this.state);
            this.metrics.interruptionCount++;
            
            // Cancel pending TTS
            if (this.interruptConfig.cancelPending) {
                this._cancelTTS();
            }
            
            // Clear audio buffer to stop playback
            this.emit('clearAudioBuffer');
            
            // Emit interruption event
            this.emit('interrupted', {
                afterMs: speechDuration,
                timestamp: Date.now(),
            });
            
            // Return to listening
            this.state = AgentState.LISTENING;
            this.emit('stateChange', this.state);
        }
    }
    
    // ============================================
    // UTILITY METHODS
    // ============================================
    
    getState() {
        return this.state;
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            avgSTTLatency: this._avg(this.metrics.latencies.stt),
            avgLLMLatency: this._avg(this.metrics.latencies.llm),
            avgTTSLatency: this._avg(this.metrics.latencies.tts),
            avgTotalLatency: this._avg(this.metrics.latencies.total),
        };
    }
    
    getConversationHistory() {
        return this.conversationHistory;
    }
    
    _avg(arr) {
        if (!arr.length) return 0;
        return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
}

module.exports = {
    VoiceAgent,
    AgentState,
};
