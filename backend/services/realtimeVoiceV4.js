// ============================================
// REALTIME VOICE SERVICE V4 - Ultra-Low Latency Pipeline
// ============================================
// ARCHITECTURE: Same as ElevenLabs/Vapi
//
// Traditional (slow, 2-3 seconds):
//   [STT complete] → [LLM complete] → [TTS complete] → Play
//   800ms + 1500ms + 600ms = 2900ms 😱
//
// V4 Pipeline (fast, ~500ms to first audio):
//   [STT streaming] → [LLM streaming] → [TTS streaming] → Play
//                      ↓ first token     ↓ first chunk
//                      ~200ms            ~300ms → Start playing!
//
// KEY OPTIMIZATIONS:
// 1. Stream LLM token-by-token
// 2. Buffer into sentence chunks
// 3. Start TTS on first complete sentence
// 4. Pipeline TTS while LLM still generating
// 5. Play audio while still synthesizing
// ============================================

const { getCachedAssistant } = require('./assistant');
const { RealtimeSTTSession } = require('./realtimeSTT');
const { synthesizeWithVoiceId, getVoiceConfig, synthesizeElevenLabs } = require('./tts');
const OpenAI = require('openai');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// CONFIGURATION - TUNED FOR LOW LATENCY
// ============================================

const V4_CONFIG = {
    // Audio
    sampleRate: 24000,
    
    // LLM Streaming
    streamingEnabled: true,
    maxTokens: 300,           // Shorter responses = faster
    temperature: 0.7,
    
    // Sentence buffering for TTS
    // FIXED: Only split on sentence-ending punctuation, NOT commas
    minSentenceLength: 30,    // Wait for longer chunks to avoid tiny fragments
    maxSentenceLength: 200,   // Don't wait too long
    // Only split on actual sentence endings (period, exclamation, question)
    // NOT on commas, semicolons, or colons which can break mid-sentence
    sentenceDelimiters: /[.!?।]+\s*/,
    
    // Conversation
    maxConversationHistory: 6,
    
    // Interruption
    enableBargeIn: true,
    
    // Metrics
    enableMetrics: true,
    enableRecording: true,
};

// ============================================
// ELEVENLABS STREAMING TTS
// ============================================

/**
 * Stream TTS from ElevenLabs - returns audio chunks as they're generated
 * This is the KEY to low latency - don't wait for full audio!
 */
async function streamElevenLabsTTS(text, voiceId, settings = {}, onChunk) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');
    
    const modelId = settings.modelId || 'eleven_turbo_v2_5'; // Turbo is fastest!
    
    console.log(`[V4 TTS] Streaming ElevenLabs: "${text.substring(0, 50)}..."`);
    
    const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
        },
        data: {
            text,
            model_id: modelId,
            voice_settings: {
                stability: settings.stability ?? 0.5,
                similarity_boost: settings.similarityBoost ?? 0.75,
                style: settings.style ?? 0,
            },
            optimize_streaming_latency: 4, // Maximum optimization!
        },
        responseType: 'stream',
        timeout: 30000,
    });
    
    return new Promise((resolve, reject) => {
        const chunks = [];
        
        response.data.on('data', (chunk) => {
            chunks.push(chunk);
            // Send chunk immediately for playback
            if (onChunk) onChunk(chunk);
        });
        
        response.data.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        
        response.data.on('error', reject);
    });
}

/**
 * Stream TTS from Google - returns audio chunks
 * Google doesn't have true streaming, but we can parallelize
 */
async function streamGoogleTTS(text, voiceId, languageCode, languageVoiceCodes, onChunk) {
    console.log(`[V4 Google TTS] Synthesizing: "${text.substring(0, 50)}..." voiceId=${voiceId}`);
    const result = await synthesizeWithVoiceId(text, voiceId, languageCode);
    
    if (result.success) {
        const audioBuffer = Buffer.from(result.audioContent, 'base64');
        console.log(`[V4 Google TTS] ✅ Got audio: ${audioBuffer.length} bytes`);
        if (onChunk) {
            console.log(`[V4 Google TTS] 📤 Calling onChunk callback`);
            onChunk(audioBuffer);
        }
        return audioBuffer;
    }
    
    console.error(`[V4 Google TTS] ❌ Failed:`, result.error);
    throw new Error(result.error || 'Google TTS failed');
}

// ============================================
// LATENCY TRACKER (Enhanced)
// ============================================

class LatencyTracker {
    constructor() {
        this.metrics = {
            stt: [],
            llmFirstToken: [],   // NEW: Time to first LLM token
            llmComplete: [],
            ttsFirstChunk: [],   // NEW: Time to first TTS chunk
            ttsComplete: [],
            totalToFirstAudio: [], // NEW: Key metric!
            totalTurn: [],
        };
        this.turnCount = 0;
    }

    record(metric, ms) {
        if (this.metrics[metric]) {
            this.metrics[metric].push(ms);
        }
    }

    recordTurn() {
        this.turnCount++;
    }

    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }

    avg(arr) {
        return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    }

    getMetrics() {
        const calc = (arr) => ({
            avg: this.avg(arr),
            p50: this.percentile(arr, 50),
            p99: this.percentile(arr, 99),
            min: arr.length > 0 ? Math.min(...arr) : 0,
            max: arr.length > 0 ? Math.max(...arr) : 0,
        });

        return {
            turnCount: this.turnCount,
            stt: calc(this.metrics.stt),
            llm: {
                firstToken: calc(this.metrics.llmFirstToken),
                complete: calc(this.metrics.llmComplete),
            },
            tts: {
                firstChunk: calc(this.metrics.ttsFirstChunk),
                complete: calc(this.metrics.ttsComplete),
            },
            total: {
                toFirstAudio: calc(this.metrics.totalToFirstAudio),
                turn: calc(this.metrics.totalTurn),
            },
        };
    }
}

// ============================================
// CALL RECORDER
// ============================================

class CallRecorder {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.isRecording = false;
        this.transcript = [];
        this.startTime = null;
        this.endTime = null;
    }

    start() {
        this.isRecording = true;
        this.startTime = new Date();
    }

    stop() {
        this.isRecording = false;
        this.endTime = new Date();
    }

    addTranscript(role, text) {
        this.transcript.push({
            role,
            text,
            timestamp: Date.now(),
        });
    }

    getSummary() {
        return {
            sessionId: this.sessionId,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime && this.startTime ? this.endTime - this.startTime : null,
            transcript: this.transcript,
        };
    }
}

// ============================================
// REALTIME VOICE SESSION V4
// ============================================

class RealtimeVoiceSessionV4 {
    constructor(options) {
        const {
            sessionId,
            assistantId,
            assistantConfig,
            userId,
            onTranscript,
            onPartialTranscript,
            onResponse,
            onPartialResponse,  // NEW: For streaming LLM responses
            onAudio,
            onStateChange,
            onMetrics,
            onError,
        } = options;

        this.sessionId = sessionId || `v4_${Date.now()}`;
        this.assistantId = assistantId;
        this.assistantConfig = assistantConfig;
        this.userId = userId;

        // Callbacks
        this.onTranscript = onTranscript || (() => {});
        this.onPartialTranscript = onPartialTranscript || (() => {});
        this.onResponse = onResponse || (() => {});
        this.onPartialResponse = onPartialResponse || (() => {});
        this.onAudio = onAudio || (() => {});
        this.onStateChange = onStateChange || (() => {});
        this.onMetrics = onMetrics || (() => {});
        this.onError = onError || (() => {});

        // State
        this.state = 'idle';
        this.isEnded = false;
        this.isMuted = false;
        this.conversationHistory = [];

        // TTS pipeline
        this.ttsAbort = null;
        this.ttsQueue = [];
        this.isSpeaking = false;

        // Tracking
        this.latencyTracker = new LatencyTracker();
        this.recorder = new CallRecorder(this.sessionId);
        this.turnStartTime = null;

        // Config
        this.resolvedConfig = null;
        this.voiceConfig = null;

        // STT
        this.sttSession = null;
        this.currentPartialTranscript = '';
    }

    // ============================================
    // LIFECYCLE
    // ============================================

    async start() {
        console.log(`[V4] 🚀 Starting session ${this.sessionId}`);
        this.setState('processing');

        if (V4_CONFIG.enableRecording) {
            this.recorder.start();
        }

        try {
            await this.resolveConfig();
            await this.loadVoiceConfig();
            await this.startStreamingSTT();

            // Play first message
            if (this.resolvedConfig.firstMessage) {
                this.conversationHistory.push({
                    role: 'assistant',
                    content: this.resolvedConfig.firstMessage,
                });
                this.recorder.addTranscript('assistant', this.resolvedConfig.firstMessage);
                this.onResponse(this.resolvedConfig.firstMessage);
                
                this.setState('speaking');
                await this.speakText(this.resolvedConfig.firstMessage);
            }

            this.setState('listening');
            this.sendMetrics();

        } catch (error) {
            console.error('[V4] Start error:', error);
            this.onError(error);
        }
    }

    end() {
        console.log(`[V4] 🛑 Ending session ${this.sessionId}`);
        this.isEnded = true;
        this.interrupt();

        if (this.sttSession) {
            this.sttSession.disconnect();
            this.sttSession = null;
        }

        if (V4_CONFIG.enableRecording) {
            this.recorder.stop();
            console.log('[V4] Recording:', this.recorder.getSummary());
        }

        this.sendMetrics();
        this.setState('idle');
    }

    // ============================================
    // CONFIGURATION
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
                ...this.assistantConfig,
            };
        }

        this.resolvedConfig = config;
        console.log('[V4] Config:', {
            name: config.name,
            voiceId: config.voiceId,
            llmModel: config.llmModel,
        });
    }

    async loadVoiceConfig() {
        if (this.resolvedConfig.voiceId) {
            this.voiceConfig = await getVoiceConfig(this.resolvedConfig.voiceId);
            console.log('[V4] Voice:', {
                provider: this.voiceConfig?.tts_provider,
                voiceId: this.voiceConfig?.provider_voice_id,
            });
        }
    }

    // ============================================
    // STREAMING STT
    // ============================================

    async startStreamingSTT() {
        const language = this.resolvedConfig?.languageSettings?.default || null;
        console.log(`[V4] 🎤 Starting STT (language: ${language || 'auto'})`);

        this.sttSession = new RealtimeSTTSession({
            sessionId: `${this.sessionId}_stt`,
            language,
            prompt: this.resolvedConfig?.systemPrompt?.substring(0, 200) || '',

            onPartialTranscript: (text) => {
                this.currentPartialTranscript = text;
                this.onPartialTranscript(text);
            },

            onFinalTranscript: (text) => {
                this.handleFinalTranscript(text);
            },

            onSpeechStart: () => {
                console.log('[V4] 🎤 Speech detected');
                this.turnStartTime = Date.now();

                // Barge-in: interrupt if speaking
                if (this.state === 'speaking' && V4_CONFIG.enableBargeIn) {
                    this.interrupt();
                }
            },

            onSpeechEnd: () => {
                console.log('[V4] 🎤 Speech ended');
            },

            onError: (error) => {
                console.error('[V4] STT error:', error);
                this.onError(error);
            },

            onConnected: () => {
                console.log('[V4] ✅ STT connected');
            },
        });

        await this.sttSession.connect();
    }

    // Audio from frontend
    processAudio(audioData) {
        if (this.isEnded || this.isMuted) return;
        if (this.sttSession?.isConnected) {
            this.sttSession.sendAudio(audioData);
        }
    }

    // ============================================
    // TRANSCRIPT HANDLING
    // ============================================

    async handleFinalTranscript(text) {
        if (this.isEnded || !text?.trim()) return;

        const userText = text.trim();
        const turnStart = this.turnStartTime || Date.now();

        // STT latency
        const sttLatency = Date.now() - turnStart;
        this.latencyTracker.record('stt', sttLatency);
        console.log(`[V4] ⏱️ STT: ${sttLatency}ms`);

        // Record
        this.recorder.addTranscript('user', userText);
        this.onTranscript(userText, true);
        this.currentPartialTranscript = '';

        this.conversationHistory.push({
            role: 'user',
            content: userText,
        });

        // Generate streaming response
        await this.generateStreamingResponse(userText, turnStart);
    }

    // ============================================
    // STREAMING LLM + TTS PIPELINE (THE SECRET SAUCE!)
    // ============================================

    async generateStreamingResponse(userMessage, turnStart) {
        if (this.isEnded) return;
        this.setState('processing');

        const ttsAbort = { aborted: false };
        this.ttsAbort = ttsAbort;

        try {
            const llmStart = Date.now();
            let firstTokenTime = null;
            let fullResponse = '';
            let sentenceBuffer = '';
            let firstAudioSent = false;
            
            // TTS queue - process sentences in ORDER, not parallel
            const ttsQueue = [];
            let ttsProcessing = false;

            // Process TTS queue sequentially
            const processTTSQueue = async () => {
                if (ttsProcessing || ttsQueue.length === 0) return;
                ttsProcessing = true;
                
                while (ttsQueue.length > 0 && !ttsAbort.aborted) {
                    const { sentence, isFirst } = ttsQueue.shift();
                    await this.streamTTSChunk(sentence, ttsAbort, isFirst, turnStart);
                }
                
                ttsProcessing = false;
            };

            // Build messages for LLM
            const messages = [
                {
                    role: 'system',
                    content: this.resolvedConfig.systemPrompt || 'You are a helpful assistant.',
                },
                ...this.conversationHistory.slice(-V4_CONFIG.maxConversationHistory),
            ];

            console.log(`[V4] 🤖 Streaming LLM: ${this.resolvedConfig.llmModel || 'gpt-4o-mini'}`);

            // Stream LLM response
            const stream = await openai.chat.completions.create({
                model: this.resolvedConfig.llmModel || 'gpt-4o-mini',
                messages,
                max_tokens: this.resolvedConfig.maxTokens || V4_CONFIG.maxTokens,
                temperature: this.resolvedConfig.temperature ?? V4_CONFIG.temperature,
                stream: true,
            });

            // Process tokens as they arrive
            for await (const chunk of stream) {
                if (ttsAbort.aborted) break;

                const token = chunk.choices[0]?.delta?.content || '';
                if (!token) continue;

                // Track first token
                if (!firstTokenTime) {
                    firstTokenTime = Date.now();
                    const firstTokenLatency = firstTokenTime - llmStart;
                    this.latencyTracker.record('llmFirstToken', firstTokenLatency);
                    console.log(`[V4] ⏱️ LLM first token: ${firstTokenLatency}ms`);
                }

                fullResponse += token;
                sentenceBuffer += token;

                // Send partial response to UI
                this.onPartialResponse(fullResponse);

                // Check if we have a complete sentence to TTS
                const sentenceMatch = sentenceBuffer.match(V4_CONFIG.sentenceDelimiters);
                if (sentenceMatch && sentenceBuffer.length >= V4_CONFIG.minSentenceLength) {
                    const sentence = sentenceBuffer.trim();
                    sentenceBuffer = '';

                    if (sentence) {
                        console.log(`[V4] 📝 Sentence ready: "${sentence.substring(0, 50)}..."`);

                        // Queue for sequential TTS (not parallel!)
                        ttsQueue.push({ sentence, isFirst: !firstAudioSent });
                        
                        if (!firstAudioSent) {
                            // Start speaking state on first chunk
                            this.setState('speaking');
                            firstAudioSent = true;
                        }
                        
                        // Start processing queue (non-blocking)
                        processTTSQueue();
                    }
                }
            }

            // LLM complete
            const llmCompleteLatency = Date.now() - llmStart;
            this.latencyTracker.record('llmComplete', llmCompleteLatency);
            console.log(`[V4] ⏱️ LLM complete: ${llmCompleteLatency}ms`);

            // Handle remaining buffer
            if (sentenceBuffer.trim() && !ttsAbort.aborted) {
                ttsQueue.push({ sentence: sentenceBuffer.trim(), isFirst: !firstAudioSent });
                processTTSQueue();
            }

            // Wait for TTS queue to finish
            while ((ttsQueue.length > 0 || ttsProcessing) && !ttsAbort.aborted) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            if (!ttsAbort.aborted) {
                // Record full response
                this.conversationHistory.push({
                    role: 'assistant',
                    content: fullResponse,
                });
                this.recorder.addTranscript('assistant', fullResponse);
                this.onResponse(fullResponse);

                // Total turn latency
                const totalLatency = Date.now() - turnStart;
                this.latencyTracker.record('totalTurn', totalLatency);
                this.latencyTracker.recordTurn();
                console.log(`[V4] ⏱️ Total turn: ${totalLatency}ms`);

                this.sendMetrics();
                this.setState('listening');
            }

        } catch (error) {
            if (!ttsAbort.aborted) {
                console.error('[V4] Response error:', error);
                this.onError(error);
                this.setState('listening');
            }
        } finally {
            this.ttsAbort = null;
        }
    }

    // ============================================
    // STREAMING TTS
    // ============================================

    async streamTTSChunk(text, abortController, isFirstChunk, turnStart) {
        if (abortController.aborted || !text) return;

        const ttsStart = Date.now();

        try {
            const voiceId = this.voiceConfig?.provider_voice_id || this.voiceConfig?.elevenlabs_voice_id;
            const provider = this.voiceConfig?.tts_provider || 'google';

            console.log(`[V4] 🔊 TTS (${provider}): "${text.substring(0, 30)}..."`);

            let audioBuffer;

            if (provider === 'elevenlabs' && voiceId) {
                // Use ElevenLabs streaming!
                audioBuffer = await streamElevenLabsTTS(
                    text,
                    voiceId,
                    {
                        modelId: this.voiceConfig?.provider_model || 'eleven_turbo_v2_5',
                        stability: this.voiceConfig?.default_stability,
                        similarityBoost: this.voiceConfig?.default_similarity,
                    },
                    (chunk) => {
                        // Stream each chunk to client immediately
                        if (!abortController.aborted) {
                            this.onAudio(chunk);
                        }
                    }
                );
            } else {
                // Google TTS (or fallback)
                const languageCode = this.getLanguageCode();
                console.log(`[V4] 🔊 Using Google TTS for chunk`);
                audioBuffer = await streamGoogleTTS(
                    text,
                    this.resolvedConfig.voiceId,
                    languageCode,
                    this.voiceConfig?.language_voice_codes,
                    (chunk) => {
                        console.log(`[V4] 📤 streamTTSChunk onChunk callback: ${chunk.length} bytes`);
                        if (!abortController.aborted) {
                            this.onAudio(chunk);
                        }
                    }
                );
            }

            // Track TTS latency
            const ttsLatency = Date.now() - ttsStart;
            
            if (isFirstChunk) {
                this.latencyTracker.record('ttsFirstChunk', ttsLatency);
                const totalToFirstAudio = Date.now() - turnStart;
                this.latencyTracker.record('totalToFirstAudio', totalToFirstAudio);
                console.log(`[V4] ⏱️ Time to first audio: ${totalToFirstAudio}ms 🎯`);
            }
            
            this.latencyTracker.record('ttsComplete', ttsLatency);
            console.log(`[V4] ⏱️ TTS chunk: ${ttsLatency}ms`);

        } catch (error) {
            if (!abortController.aborted) {
                console.error('[V4] TTS error:', error);
            }
        }
    }

    // ============================================
    // NON-STREAMING TTS (fallback)
    // ============================================

    async speakText(text) {
        if (this.isEnded || !text) return;

        const abortController = { aborted: false };
        this.ttsAbort = abortController;

        try {
            console.log(`[V4] 🔊 speakText: "${text.substring(0, 50)}..."`);
            const result = await synthesizeWithVoiceId(
                text,
                this.resolvedConfig.voiceId,
                this.getLanguageCode()
            );

            if (!abortController.aborted && result.success) {
                const audioBuffer = Buffer.from(result.audioContent, 'base64');
                console.log(`[V4] 📤 Sending first message audio: ${audioBuffer.length} bytes`);
                this.onAudio(audioBuffer);
            } else if (!result.success) {
                console.error('[V4] ❌ speakText TTS failed:', result.error);
            }
        } catch (error) {
            if (!abortController.aborted) {
                console.error('[V4] TTS error:', error);
            }
        } finally {
            this.ttsAbort = null;
        }
    }

    // ============================================
    // INTERRUPTION (Barge-in)
    // ============================================

    interrupt() {
        console.log('[V4] ⚡ BARGE-IN');

        if (this.ttsAbort) {
            this.ttsAbort.aborted = true;
        }

        this.ttsQueue = [];

        if (this.sttSession) {
            this.sttSession.clearAudio();
        }

        if (this.state === 'speaking') {
            this.setState('listening');
        }
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    setState(newState) {
        if (this.state !== newState) {
            console.log(`[V4] State: ${this.state} → ${newState}`);
            this.state = newState;
            this.onStateChange(newState);
        }
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (muted && this.sttSession) {
            this.sttSession.clearAudio();
        }
    }

    // ============================================
    // METRICS
    // ============================================

    sendMetrics() {
        if (V4_CONFIG.enableMetrics) {
            this.onMetrics(this.latencyTracker.getMetrics());
        }
    }

    getMetrics() {
        return this.latencyTracker.getMetrics();
    }

    // ============================================
    // HELPERS
    // ============================================

    getLanguageCode() {
        const langMap = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'mr': 'mr-IN',
            'bn': 'bn-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
        };
        const lang = this.resolvedConfig?.languageSettings?.default || 'en';
        return langMap[lang] || 'en-IN';
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    RealtimeVoiceSessionV4,
    LatencyTracker,
    V4_CONFIG,
    streamElevenLabsTTS,
};
