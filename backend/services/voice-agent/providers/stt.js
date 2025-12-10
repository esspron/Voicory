// ============================================
// STT PROVIDERS - Speech-to-Text Streaming
// Supports: Deepgram, Whisper, AssemblyAI
// ============================================

const { EventEmitter } = require('events');
const WebSocket = require('ws');

// ============================================
// DEEPGRAM STT CLIENT
// ============================================
class DeepgramSTTClient extends EventEmitter {
    constructor(config) {
        super();
        this.apiKey = process.env.DEEPGRAM_API_KEY;
        this.model = config.model || 'nova-2';
        this.language = config.language || 'en';
        this.interimResults = config.interimResults !== false;
        this.endpointingMs = config.endpointingMs || 400;
        this.keywords = config.keywords || [];
        this.sampleRate = config.sampleRate || 16000;
        
        this.ws = null;
        this.connected = false;
        this._keepAliveInterval = null;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            if (!this.apiKey) {
                reject(new Error('DEEPGRAM_API_KEY not configured'));
                return;
            }
            
            // Build URL with parameters
            const params = new URLSearchParams({
                model: this.model,
                language: this.language,
                encoding: 'linear16',
                sample_rate: this.sampleRate,
                channels: 1,
                interim_results: this.interimResults,
                endpointing: this.endpointingMs,
                smart_format: true,
                punctuate: true,
                filler_words: false,
                diarize: false,
            });
            
            // Add keywords for boosting
            if (this.keywords.length > 0) {
                this.keywords.forEach(kw => {
                    params.append('keywords', kw);
                });
            }
            
            const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
            
            this.ws = new WebSocket(url, {
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                },
            });
            
            this.ws.on('open', () => {
                console.log('[DeepgramSTT] Connected');
                this.connected = true;
                
                // Keep-alive ping
                this._keepAliveInterval = setInterval(() => {
                    if (this.connected) {
                        this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
                    }
                }, 10000);
                
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this._handleMessage(data);
            });
            
            this.ws.on('error', (error) => {
                console.error('[DeepgramSTT] Error:', error);
                this.emit('error', error);
                if (!this.connected) {
                    reject(error);
                }
            });
            
            this.ws.on('close', (code, reason) => {
                console.log(`[DeepgramSTT] Closed: ${code} - ${reason}`);
                this.connected = false;
                clearInterval(this._keepAliveInterval);
                this.emit('close', { code, reason });
            });
        });
    }
    
    send(audioChunk) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(audioChunk);
        }
    }
    
    finish() {
        if (this.ws && this.connected) {
            // Send close stream message
            this.ws.send(JSON.stringify({ type: 'CloseStream' }));
            this.ws.close();
        }
        this.connected = false;
        clearInterval(this._keepAliveInterval);
    }
    
    _handleMessage(data) {
        try {
            const response = JSON.parse(data.toString());
            
            if (response.type === 'Results') {
                const channel = response.channel;
                const alternatives = channel?.alternatives || [];
                
                if (alternatives.length > 0) {
                    const best = alternatives[0];
                    const transcript = best.transcript || '';
                    const confidence = best.confidence || 0;
                    const isFinal = response.is_final === true;
                    
                    // Calculate latency
                    const latencyMs = response.metadata?.request_id 
                        ? Date.now() - (response.start * 1000) 
                        : null;
                    
                    this.emit('transcript', {
                        transcript,
                        confidence,
                        isFinal,
                        latencyMs,
                        words: best.words || [],
                    });
                }
            } else if (response.type === 'SpeechStarted') {
                this.emit('speechStart');
            } else if (response.type === 'UtteranceEnd') {
                this.emit('utteranceEnd');
            }
        } catch (error) {
            console.error('[DeepgramSTT] Parse error:', error);
        }
    }
}

// ============================================
// WHISPER STT CLIENT (OpenAI)
// For non-streaming, batch transcription
// ============================================
class WhisperSTTClient extends EventEmitter {
    constructor(config) {
        super();
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = config.model || 'whisper-1';
        this.language = config.language;
        this.sampleRate = config.sampleRate || 16000;
        
        this._audioBuffer = [];
        this._processing = false;
        this._flushInterval = null;
    }
    
    async connect() {
        console.log('[WhisperSTT] Ready (batch mode)');
        
        // Periodically flush buffer and transcribe
        this._flushInterval = setInterval(() => {
            this._flushBuffer();
        }, 1000); // Process every second
        
        return Promise.resolve();
    }
    
    send(audioChunk) {
        this._audioBuffer.push(audioChunk);
    }
    
    finish() {
        clearInterval(this._flushInterval);
        this._flushBuffer();
    }
    
    async _flushBuffer() {
        if (this._processing || this._audioBuffer.length === 0) return;
        
        this._processing = true;
        
        try {
            const audioData = Buffer.concat(this._audioBuffer);
            this._audioBuffer = [];
            
            // Convert to WAV format for Whisper
            const wavBuffer = this._createWavBuffer(audioData);
            
            // Send to OpenAI Whisper API
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', wavBuffer, {
                filename: 'audio.wav',
                contentType: 'audio/wav',
            });
            form.append('model', this.model);
            if (this.language) {
                form.append('language', this.language);
            }
            
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...form.getHeaders(),
                },
                body: form,
            });
            
            const result = await response.json();
            
            if (result.text) {
                this.emit('transcript', {
                    transcript: result.text,
                    confidence: 1.0,
                    isFinal: true,
                });
            }
        } catch (error) {
            console.error('[WhisperSTT] Error:', error);
            this.emit('error', error);
        } finally {
            this._processing = false;
        }
    }
    
    _createWavBuffer(pcmData) {
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = this.sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;
        
        const header = Buffer.alloc(44);
        
        // RIFF header
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + pcmData.length, 4);
        header.write('WAVE', 8);
        
        // fmt chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // Chunk size
        header.writeUInt16LE(1, 20); // Audio format (PCM)
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(this.sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        
        // data chunk
        header.write('data', 36);
        header.writeUInt32LE(pcmData.length, 40);
        
        return Buffer.concat([header, pcmData]);
    }
}

// ============================================
// ASSEMBLYAI STT CLIENT
// ============================================
class AssemblyAISTTClient extends EventEmitter {
    constructor(config) {
        super();
        this.apiKey = process.env.ASSEMBLYAI_API_KEY;
        this.sampleRate = config.sampleRate || 16000;
        
        this.ws = null;
        this.connected = false;
    }
    
    async connect() {
        return new Promise(async (resolve, reject) => {
            if (!this.apiKey) {
                reject(new Error('ASSEMBLYAI_API_KEY not configured'));
                return;
            }
            
            try {
                // Get temporary token
                const tokenResponse = await fetch('https://api.assemblyai.com/v2/realtime/token', {
                    method: 'POST',
                    headers: {
                        'Authorization': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expires_in: 3600 }),
                });
                
                const { token } = await tokenResponse.json();
                
                this.ws = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.sampleRate}&token=${token}`);
                
                this.ws.on('open', () => {
                    console.log('[AssemblyAISTT] Connected');
                    this.connected = true;
                    resolve();
                });
                
                this.ws.on('message', (data) => {
                    this._handleMessage(data);
                });
                
                this.ws.on('error', (error) => {
                    console.error('[AssemblyAISTT] Error:', error);
                    this.emit('error', error);
                    if (!this.connected) reject(error);
                });
                
                this.ws.on('close', () => {
                    this.connected = false;
                    this.emit('close');
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    send(audioChunk) {
        if (this.connected) {
            // AssemblyAI expects base64 encoded audio
            const base64Audio = audioChunk.toString('base64');
            this.ws.send(JSON.stringify({ audio_data: base64Audio }));
        }
    }
    
    finish() {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ terminate_session: true }));
            this.ws.close();
        }
        this.connected = false;
    }
    
    _handleMessage(data) {
        try {
            const response = JSON.parse(data.toString());
            
            if (response.message_type === 'PartialTranscript') {
                this.emit('transcript', {
                    transcript: response.text,
                    confidence: response.confidence || 0.9,
                    isFinal: false,
                });
            } else if (response.message_type === 'FinalTranscript') {
                this.emit('transcript', {
                    transcript: response.text,
                    confidence: response.confidence || 1.0,
                    isFinal: true,
                });
            }
        } catch (error) {
            console.error('[AssemblyAISTT] Parse error:', error);
        }
    }
}

// ============================================
// FACTORY FUNCTION
// ============================================
function createSTTClient(config) {
    const provider = config.provider || 'deepgram';
    
    switch (provider.toLowerCase()) {
        case 'deepgram':
            return new DeepgramSTTClient(config);
        case 'whisper':
            return new WhisperSTTClient(config);
        case 'assemblyai':
            return new AssemblyAISTTClient(config);
        default:
            throw new Error(`Unknown STT provider: ${provider}`);
    }
}

module.exports = {
    createSTTClient,
    DeepgramSTTClient,
    WhisperSTTClient,
    AssemblyAISTTClient,
};
