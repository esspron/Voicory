// ============================================
// TTS PROVIDERS - Text-to-Speech Streaming
// Supports: ElevenLabs, Deepgram, Cartesia, OpenAI
// ============================================

const { EventEmitter } = require('events');
const WebSocket = require('ws');

// ============================================
// TTS STREAM INTERFACE
// ============================================
class TTSStream extends EventEmitter {
    constructor() {
        super();
        this._cancelled = false;
    }
    
    cancel() {
        this._cancelled = true;
        this.emit('cancelled');
    }
    
    get isCancelled() {
        return this._cancelled;
    }
}

// ============================================
// ELEVENLABS TTS STREAMING
// ============================================
async function streamElevenLabs(config) {
    const {
        voiceId,
        model = 'eleven_turbo_v2_5',
        text,
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0,
        sampleRate = 24000,
        onAudio,
        onEnd,
    } = config;
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY not configured');
    }
    
    if (!voiceId) {
        throw new Error('ElevenLabs voiceId is required');
    }
    
    const stream = new TTSStream();
    
    try {
        // Use streaming endpoint with input streaming
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: model,
                    voice_settings: {
                        stability,
                        similarity_boost: similarityBoost,
                        style,
                        use_speaker_boost: true,
                    },
                    output_format: `pcm_${sampleRate}`,
                }),
            }
        );
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
        }
        
        const reader = response.body.getReader();
        
        const processStream = async () => {
            try {
                while (true) {
                    if (stream.isCancelled) {
                        reader.cancel();
                        break;
                    }
                    
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    // Emit audio chunk
                    if (onAudio && !stream.isCancelled) {
                        onAudio(Buffer.from(value));
                    }
                }
                
                if (onEnd && !stream.isCancelled) {
                    onEnd();
                }
            } catch (error) {
                if (!stream.isCancelled) {
                    stream.emit('error', error);
                }
            }
        };
        
        // Start processing without blocking
        processStream();
        
        return stream;
        
    } catch (error) {
        console.error('[TTS:ElevenLabs] Error:', error);
        stream.emit('error', error);
        throw error;
    }
}

// ============================================
// ELEVENLABS WEBSOCKET STREAMING
// For real-time input streaming (lowest latency)
// ============================================
class ElevenLabsWebSocketTTS extends TTSStream {
    constructor(config) {
        super();
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.voiceId = config.voiceId;
        this.model = config.model || 'eleven_turbo_v2_5';
        this.stability = config.stability || 0.5;
        this.similarityBoost = config.similarityBoost || 0.75;
        this.sampleRate = config.sampleRate || 24000;
        
        this.ws = null;
        this.connected = false;
        this._textBuffer = [];
        this._flushing = false;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            if (!this.apiKey) {
                reject(new Error('ELEVENLABS_API_KEY not configured'));
                return;
            }
            
            const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=${this.model}&output_format=pcm_${this.sampleRate}`;
            
            this.ws = new WebSocket(url, {
                headers: {
                    'xi-api-key': this.apiKey,
                },
            });
            
            this.ws.on('open', () => {
                console.log('[TTS:ElevenLabsWS] Connected');
                
                // Send BOS (Beginning of Stream) message
                this.ws.send(JSON.stringify({
                    text: ' ',
                    voice_settings: {
                        stability: this.stability,
                        similarity_boost: this.similarityBoost,
                    },
                    xi_api_key: this.apiKey,
                }));
                
                this.connected = true;
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this._handleMessage(data);
            });
            
            this.ws.on('error', (error) => {
                console.error('[TTS:ElevenLabsWS] Error:', error);
                this.emit('error', error);
                if (!this.connected) reject(error);
            });
            
            this.ws.on('close', () => {
                this.connected = false;
                this.emit('end');
            });
        });
    }
    
    sendText(text) {
        if (!this.connected || !this.ws || this.isCancelled) return;
        
        // Send text chunk
        this.ws.send(JSON.stringify({
            text,
            try_trigger_generation: true,
        }));
    }
    
    flush() {
        if (!this.connected || !this.ws) return;
        
        // Send EOS (End of Stream) message
        this.ws.send(JSON.stringify({
            text: '',
        }));
    }
    
    close() {
        if (this.ws) {
            this.flush();
            setTimeout(() => {
                if (this.ws) {
                    this.ws.close();
                }
            }, 100);
        }
        this.connected = false;
    }
    
    cancel() {
        super.cancel();
        this.close();
    }
    
    _handleMessage(data) {
        try {
            const response = JSON.parse(data.toString());
            
            if (response.audio) {
                // Decode base64 audio
                const audioBuffer = Buffer.from(response.audio, 'base64');
                this.emit('audio', audioBuffer);
            }
            
            if (response.isFinal) {
                this.emit('end');
            }
        } catch (error) {
            // Binary audio data (non-JSON)
            this.emit('audio', data);
        }
    }
}

// ============================================
// DEEPGRAM AURA TTS
// ============================================
async function streamDeepgram(config) {
    const {
        voiceId = 'aura-asteria-en', // Default voice
        text,
        sampleRate = 24000,
        onAudio,
        onEnd,
    } = config;
    
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        throw new Error('DEEPGRAM_API_KEY not configured');
    }
    
    const stream = new TTSStream();
    
    try {
        const response = await fetch(
            `https://api.deepgram.com/v1/speak?model=${voiceId}&encoding=linear16&sample_rate=${sampleRate}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${apiKey}`,
                },
                body: JSON.stringify({ text }),
            }
        );
        
        if (!response.ok) {
            throw new Error(`Deepgram TTS error: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        
        const processStream = async () => {
            try {
                while (true) {
                    if (stream.isCancelled) {
                        reader.cancel();
                        break;
                    }
                    
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    if (onAudio && !stream.isCancelled) {
                        onAudio(Buffer.from(value));
                    }
                }
                
                if (onEnd && !stream.isCancelled) {
                    onEnd();
                }
            } catch (error) {
                if (!stream.isCancelled) {
                    stream.emit('error', error);
                }
            }
        };
        
        processStream();
        
        return stream;
        
    } catch (error) {
        console.error('[TTS:Deepgram] Error:', error);
        throw error;
    }
}

// ============================================
// CARTESIA TTS
// ============================================
async function streamCartesia(config) {
    const {
        voiceId,
        text,
        sampleRate = 24000,
        speed = 1.0,
        onAudio,
        onEnd,
    } = config;
    
    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) {
        throw new Error('CARTESIA_API_KEY not configured');
    }
    
    const stream = new TTSStream();
    
    try {
        const response = await fetch('https://api.cartesia.ai/tts/bytes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'Cartesia-Version': '2024-06-10',
            },
            body: JSON.stringify({
                model_id: 'sonic-english',
                transcript: text,
                voice: {
                    mode: 'id',
                    id: voiceId,
                },
                output_format: {
                    container: 'raw',
                    encoding: 'pcm_s16le',
                    sample_rate: sampleRate,
                },
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Cartesia TTS error: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        
        const processStream = async () => {
            try {
                while (true) {
                    if (stream.isCancelled) {
                        reader.cancel();
                        break;
                    }
                    
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    if (onAudio && !stream.isCancelled) {
                        onAudio(Buffer.from(value));
                    }
                }
                
                if (onEnd && !stream.isCancelled) {
                    onEnd();
                }
            } catch (error) {
                if (!stream.isCancelled) {
                    stream.emit('error', error);
                }
            }
        };
        
        processStream();
        
        return stream;
        
    } catch (error) {
        console.error('[TTS:Cartesia] Error:', error);
        throw error;
    }
}

// ============================================
// OPENAI TTS
// ============================================
async function streamOpenAI(config) {
    const {
        voiceId = 'alloy', // alloy, echo, fable, onyx, nova, shimmer
        model = 'tts-1', // tts-1 or tts-1-hd
        text,
        speed = 1.0,
        onAudio,
        onEnd,
    } = config;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }
    
    const stream = new TTSStream();
    
    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                input: text,
                voice: voiceId,
                response_format: 'pcm',
                speed,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI TTS error: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        
        const processStream = async () => {
            try {
                while (true) {
                    if (stream.isCancelled) {
                        reader.cancel();
                        break;
                    }
                    
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    if (onAudio && !stream.isCancelled) {
                        onAudio(Buffer.from(value));
                    }
                }
                
                if (onEnd && !stream.isCancelled) {
                    onEnd();
                }
            } catch (error) {
                if (!stream.isCancelled) {
                    stream.emit('error', error);
                }
            }
        };
        
        processStream();
        
        return stream;
        
    } catch (error) {
        console.error('[TTS:OpenAI] Error:', error);
        throw error;
    }
}

// ============================================
// FACTORY FUNCTION
// ============================================
async function streamTTS(config) {
    const provider = config.provider || 'elevenlabs';
    
    switch (provider.toLowerCase()) {
        case 'elevenlabs':
            return streamElevenLabs(config);
        case 'deepgram':
            return streamDeepgram(config);
        case 'cartesia':
            return streamCartesia(config);
        case 'openai':
            return streamOpenAI(config);
        default:
            throw new Error(`Unknown TTS provider: ${provider}`);
    }
}

/**
 * Create a WebSocket-based TTS client for real-time streaming
 */
function createTTSClient(config) {
    const provider = config.provider || 'elevenlabs';
    
    if (provider === 'elevenlabs') {
        return new ElevenLabsWebSocketTTS(config);
    }
    
    throw new Error(`WebSocket TTS not supported for provider: ${provider}`);
}

module.exports = {
    streamTTS,
    createTTSClient,
    TTSStream,
    ElevenLabsWebSocketTTS,
};
