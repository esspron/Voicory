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
const { synthesizeWithVoiceId, getVoiceConfig, getTTSOptimizedSystemPrompt, synthesize } = require('./tts');
const { synthesizeChirp3HD } = require('./googleChirp3HD');
const { searchKnowledgeBase, formatRAGContext } = require('./rag');

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
            onMetrics,
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
        this.onMetrics = onMetrics || (() => {});

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

        // If assistantId provided, load from database and merge
        if (this.assistantId) {
            const assistant = await getCachedAssistant(this.assistantId);
            if (assistant) {
                config = {
                    name: assistant.name,
                    systemPrompt: assistant.system_prompt,
                    firstMessage: assistant.first_message,
                    voiceId: assistant.voice_id,
                    llmModel: assistant.llm_model || WEBRTC_CONFIG.defaultModel,
                    temperature: assistant.temperature ?? WEBRTC_CONFIG.temperature,
                    maxTokens: assistant.max_tokens ?? WEBRTC_CONFIG.maxTokens,
                    // RAG settings
                    ragEnabled: assistant.rag_enabled ?? false,
                    ragSimilarityThreshold: assistant.rag_similarity_threshold ?? 0.7,
                    ragMaxResults: assistant.rag_max_results ?? 5,
                    ragInstructions: assistant.rag_instructions,
                    knowledgeBaseIds: assistant.knowledge_base_ids || [],
                    // Language settings
                    languageSettings: {
                        primary: assistant.primary_language || 'en-IN',
                        supported: assistant.supported_languages || ['en'],
                    },
                    // Style settings
                    styleSettings: assistant.style_settings || {},
                    // Override with assistantConfig from frontend (live preview)
                    ...this.assistantConfig,
                };
            }
        }

        // Use assistantConfig directly if no assistantId
        this.resolvedConfig = config;
        
        // Load voice config
        if (config.voiceId) {
            this.voiceConfig = await getVoiceConfig(config.voiceId);
            console.log('[WebRTC] Voice:', { 
                provider: this.voiceConfig?.tts_provider, 
                voiceId: this.voiceConfig?.provider_voice_id,
                languageCodes: Object.keys(this.voiceConfig?.language_voice_codes || {}).length,
            });
        }

        // Build final system prompt with all enhancements
        this.finalSystemPrompt = await this.buildSystemPrompt(config);

        console.log('[WebRTC] Config resolved:', {
            name: config.name,
            voiceId: config.voiceId,
            llmModel: config.llmModel,
            voiceProvider: this.voiceConfig?.tts_provider,
            ragEnabled: config.ragEnabled,
            knowledgeBases: config.knowledgeBaseIds?.length || 0,
            primaryLanguage: config.languageSettings?.primary,
        });
    }

    /**
     * Build complete system prompt with:
     * - Base system prompt
     * - Style/communication settings
     * - TTS optimization (for Google voices)
     * - Language instructions
     */
    async buildSystemPrompt(config) {
        let systemPrompt = config.systemPrompt || 'You are a helpful voice assistant.';

        // Add style instructions if defined
        if (config.styleSettings) {
            const { tone, personality, responseLength, formalityLevel } = config.styleSettings;
            if (tone || personality || responseLength || formalityLevel) {
                systemPrompt += `\n\n## Communication Style\n`;
                if (tone) systemPrompt += `- Tone: ${tone}\n`;
                if (personality) systemPrompt += `- Personality: ${personality}\n`;
                if (responseLength) systemPrompt += `- Response length: ${responseLength}\n`;
                if (formalityLevel) systemPrompt += `- Formality: ${formalityLevel}\n`;
            }
        }

        // Add language instructions
        const primaryLang = config.languageSettings?.primary || 'en-IN';
        if (primaryLang !== 'en' && primaryLang !== 'en-US') {
            systemPrompt += `\n\n## Language\nRespond in ${this.getLanguageName(primaryLang)}. Match the user's language if they switch.`;
        }

        // Add TTS optimization for Google voices
        if (this.voiceConfig?.tts_provider === 'google') {
            systemPrompt = getTTSOptimizedSystemPrompt(systemPrompt, { 
                languageCode: primaryLang 
            });
            console.log('[WebRTC] 🎯 Applied TTS-optimized prompt for Google Chirp 3 HD');
        }

        return systemPrompt;
    }

    getLanguageName(code) {
        const languages = {
            'hi-IN': 'Hindi',
            'en-IN': 'English (India)',
            'en-US': 'English (US)',
            'en-GB': 'English (UK)',
            'ta-IN': 'Tamil',
            'te-IN': 'Telugu',
            'bn-IN': 'Bengali',
            'mr-IN': 'Marathi',
            'gu-IN': 'Gujarati',
            'kn-IN': 'Kannada',
            'ml-IN': 'Malayalam',
            'es-ES': 'Spanish',
            'fr-FR': 'French',
            'de-DE': 'German',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'cmn-CN': 'Chinese (Mandarin)',
            'ar-XA': 'Arabic',
        };
        return languages[code] || code;
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
                console.log('[WebRTC] 🎤 Speech started (audio detected)');
                // DON'T interrupt here - wait for actual transcript
                // This is just audio energy detection, not real speech
                // Industry best practice: only interrupt on meaningful transcript
                break;

            case 'input_audio_buffer.speech_stopped':
                console.log('[WebRTC] 🎤 Speech stopped');
                break;

            case 'conversation.item.input_audio_transcription.completed':
                const transcript = event.transcript?.trim();
                if (transcript) {
                    console.log(`[WebRTC] 📝 Transcript: "${transcript}"`);
                    
                    // Check if this is meaningful speech (not just filler/noise)
                    if (this.isMeaningfulSpeech(transcript)) {
                        // Interrupt if still speaking - user wants to talk
                        if (this.state === 'speaking') {
                            console.log('[WebRTC] ⚡ Meaningful speech detected - interrupting');
                            this.interruptTTS();
                        }
                        this.handleTranscript(transcript);
                    } else {
                        console.log(`[WebRTC] 🔇 Filtered non-meaningful: "${transcript}"`);
                        // Don't process filler words/noise
                    }
                }
                break;

            case 'error':
                console.error('[WebRTC] STT error:', event.error);
                this.onError(new Error(event.error?.message || 'STT error'));
                break;
        }
    }

    /**
     * Check if transcript contains meaningful speech vs filler/noise
     * Industry practice: filter out non-actionable utterances
     * 
     * IMPORTANT: Only filter PURE filler utterances.
     * If there's ANY real content, let it through for interruption.
     */
    isMeaningfulSpeech(transcript) {
        if (!transcript) return false;
        
        // Remove punctuation and normalize
        const cleaned = transcript
            .toLowerCase()
            .replace(/[.,!?;:'"()-]/g, '')  // Remove punctuation
            .trim();
        
        // Too short to be meaningful (single char, etc)
        if (cleaned.length < 2) return false;
        
        // PURE filler utterances (entire transcript is just this)
        const PURE_FILLERS = new Set([
            // Single sounds
            'um', 'uh', 'ah', 'eh', 'oh', 'hm', 'hmm', 'mm', 'mhm', 'uhuh', 'uh huh', 'uh-huh',
            // Hesitations  
            'er', 'err', 'erm', 'umm', 'uhh', 'ahh',
            // Non-speech
            'ahem', 'cough', 'sigh', 'laugh', 'haha', 'hehe', 'lol',
            // Repeated sounds
            'aaa', 'mmm', 'uuu', 'eee',
        ]);
        
        // If the entire transcript is just a filler, reject it
        if (PURE_FILLERS.has(cleaned)) {
            return false;
        }
        
        // Check if it's just repeated single char (like "aaaaaa")
        if (/^(.)\1+$/.test(cleaned)) {
            return false;
        }
        
        // If we have multiple words OR a word with 3+ chars, it's meaningful
        const words = cleaned.split(/\s+/).filter(w => w.length > 0);
        
        // Multiple words = meaningful (e.g., "oh sorry", "wait stop", "hold on")
        if (words.length >= 2) {
            return true;
        }
        
        // Single word with 3+ characters = meaningful
        if (words.length === 1 && words[0].length >= 3) {
            // But filter out single-word acknowledgments that shouldn't interrupt
            const SINGLE_WORD_FILLERS = new Set([
                'okay', 'ok', 'yeah', 'yep', 'yup', 'yes', 'no', 'nope', 
                'sure', 'right', 'alright', 'fine', 'cool', 'nice', 'great',
                'thanks', 'thank', 'bye', 'goodbye', 'hey', 'hi', 'hello'
            ]);
            
            if (SINGLE_WORD_FILLERS.has(words[0])) {
                return false;
            }
            return true;
        }
        
        return false;
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
    // LLM RESPONSE (with RAG support)
    // ============================================

    async generateResponse(userText) {
        console.log('[WebRTC] 🤖 Generating response...');
        
        try {
            // Build messages array
            const messages = [
                {
                    role: 'system',
                    content: this.finalSystemPrompt,
                },
            ];

            // Add RAG context if enabled
            if (this.resolvedConfig.ragEnabled && this.resolvedConfig.knowledgeBaseIds?.length > 0) {
                const ragContext = await this.searchKnowledgeBase(userText);
                if (ragContext) {
                    messages.push({
                        role: 'system',
                        content: ragContext,
                    });
                }
            }

            // Add conversation history
            messages.push(...this.conversationHistory.slice(-WEBRTC_CONFIG.maxConversationHistory));

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

            // Track latency metrics
            if (!this.latencyMetrics) {
                this.latencyMetrics = { turnCount: 0, llmLatencies: [], ttsLatencies: [], totalLatencies: [] };
            }
            this.latencyMetrics.turnCount++;
            this.latencyMetrics.llmLatencies.push(llmLatency);

            if (responseText) {
                // Record assistant response
                this.conversationHistory.push({
                    role: 'assistant',
                    content: responseText,
                });
                this.onResponse(responseText);
                
                // Speak the response (TTS latency tracked inside)
                await this.speakText(responseText, llmLatency);
            }

            this.setState('listening');

        } catch (error) {
            console.error('[WebRTC] LLM error:', error);
            this.onError(error);
            this.setState('listening');
        }
    }

    // ============================================
    // RAG - Knowledge Base Search
    // ============================================

    async searchKnowledgeBase(query) {
        const { ragEnabled, knowledgeBaseIds, ragSimilarityThreshold, ragMaxResults, ragInstructions } = this.resolvedConfig;

        if (!ragEnabled || !knowledgeBaseIds || knowledgeBaseIds.length === 0) {
            return null;
        }

        console.log('[WebRTC] 🔍 Searching knowledge base...');
        const startTime = Date.now();

        try {
            const documents = await searchKnowledgeBase(
                query,
                knowledgeBaseIds,
                ragSimilarityThreshold ?? 0.7,
                ragMaxResults ?? 5
            );

            const ragLatency = Date.now() - startTime;
            console.log(`[WebRTC] 📚 RAG search: ${ragLatency}ms, found ${documents?.length || 0} docs`);

            if (documents && documents.length > 0) {
                return formatRAGContext(documents, ragInstructions);
            }

            return null;
        } catch (error) {
            console.error('[WebRTC] RAG search error:', error);
            return null;
        }
    }

    // ============================================
    // TTS (Text-to-Speech)
    // ============================================

    async speakText(text, llmLatency = 0) {
        if (this.isEnded || !text) return;

        this.setState('speaking');
        this.isSpeaking = true;
        this.ttsAbortController = { aborted: false };
        const turnStartTime = Date.now() - llmLatency; // Approximate turn start

        try {
            console.log(`[WebRTC] 🔊 TTS: "${text.substring(0, 50)}..."`);
            
            const ttsStart = Date.now();
            let result;
            
            // If voiceId is configured, use it
            if (this.resolvedConfig.voiceId) {
                result = await synthesizeWithVoiceId(
                    text,
                    this.resolvedConfig.voiceId,
                    this.resolvedConfig.languageSettings?.primary || 'en-IN'
                );
            } else {
                // Fallback to Google Chirp 3 HD with default voice
                console.log('[WebRTC] 🔄 Using fallback Google Chirp 3 HD TTS');
                try {
                    const languageCode = this.resolvedConfig.languageSettings?.primary || 'en-IN';
                    const audioBuffer = await synthesizeChirp3HD(text, {
                        voice: 'Puck',  // Default friendly voice
                        languageCode: languageCode,
                        audioEncoding: 'MP3',
                        speakingRate: 1.0,
                    });
                    result = {
                        success: true,
                        audioContent: audioBuffer.toString('base64'),
                    };
                } catch (fallbackError) {
                    console.error('[WebRTC] Fallback TTS also failed:', fallbackError.message);
                    // Try OpenAI TTS as last resort
                    result = await synthesize({
                        text,
                        provider: 'openai',
                        voiceId: 'alloy',
                    });
                }
            }

            if (this.ttsAbortController.aborted) {
                console.log('[WebRTC] TTS aborted (barge-in)');
                return;
            }

            if (result.success) {
                const audioBuffer = Buffer.from(result.audioContent, 'base64');
                const ttsLatency = Date.now() - ttsStart;
                const totalLatency = Date.now() - turnStartTime;
                
                console.log(`[WebRTC] ⏱️ TTS latency: ${ttsLatency}ms, size: ${audioBuffer.length} bytes`);
                console.log(`[WebRTC] ⏱️ Total turn latency: ${totalLatency}ms`);
                
                // Track metrics
                if (this.latencyMetrics) {
                    this.latencyMetrics.ttsLatencies.push(ttsLatency);
                    this.latencyMetrics.totalLatencies.push(totalLatency);
                    
                    // Emit metrics to frontend
                    this.emitMetrics();
                }
                
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

    // ============================================
    // METRICS
    // ============================================

    /**
     * Calculate and emit latency metrics to frontend
     */
    emitMetrics() {
        if (!this.latencyMetrics || this.latencyMetrics.turnCount === 0) return;

        const calcStats = (arr) => {
            if (!arr || arr.length === 0) return { avg: 0, p50: 0, p99: 0 };
            const sorted = [...arr].sort((a, b) => a - b);
            const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
            const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
            const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1] || 0;
            return { avg, p50: Math.round(p50), p99: Math.round(p99) };
        };

        const metrics = {
            turnCount: this.latencyMetrics.turnCount,
            stt: { avg: 0, p50: 0, p99: 0 }, // STT handled by OpenAI Realtime
            llm: { firstToken: calcStats(this.latencyMetrics.llmLatencies) },
            tts: { firstChunk: calcStats(this.latencyMetrics.ttsLatencies) },
            total: { toFirstAudio: calcStats(this.latencyMetrics.totalLatencies) }
        };

        // Send metrics to frontend via a special callback
        // We need to use a separate callback for this
        if (this.onMetrics) {
            this.onMetrics(metrics);
        }
    }
}

module.exports = { WebRTCVoiceSession, WEBRTC_CONFIG };
