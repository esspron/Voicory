// ============================================
// TTS Router Service — Voice Library Aware
// Routes TTS generation through the correct provider
// based on the voices table (tts_provider column).
//
// Supported providers: elevenlabs, openai, google (stub)
// Falls back to null → caller uses <Say voice="Polly.Joanna">
// ============================================
const crypto = require('crypto');
const axios = require('axios').default || require('axios');
const { supabase } = require('../config');

// ─── Cache helpers (Upstash Redis) ────────────────────────────────────────────

function ttsHash(text, voiceId) {
    return crypto.createHash('sha256').update(`${text}|${voiceId}`).digest('hex').slice(0, 20);
}

async function cacheTTSAudio(hash, audioBase64, ttlSeconds = 120) {
    const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!baseUrl || !token) {
        console.warn('[🔊 TTS] Upstash Redis env vars not set — skipping cache');
        return;
    }
    try {
        await axios.post(
            `${baseUrl}/set/tts:${hash}`,
            { value: audioBase64, ex: ttlSeconds },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch (e) {
        console.warn('[🔊 TTS] Redis cache write failed:', e.message);
    }
}

async function getCachedTTSAudio(hash) {
    const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!baseUrl || !token) return null;
    try {
        const resp = await axios.get(`${baseUrl}/get/tts:${hash}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return resp.data?.result || null;
    } catch (e) {
        console.warn('[🔊 TTS] Redis cache read failed:', e.message);
        return null;
    }
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function generateElevenLabsAudio(text, elevenlabsVoiceId, modelId) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key || !elevenlabsVoiceId) return null;
    const model = modelId || 'eleven_turbo_v2_5';
    const resp = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoiceId}/stream`,
        {
            text,
            model_id: model,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        },
        {
            params: { output_format: 'ulaw_8000' },
            headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
            responseType: 'arraybuffer',
            timeout: 10000
        }
    );
    return Buffer.from(resp.data);
}

async function generateOpenAIAudio(text, voiceName) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    const voice = voiceName || 'alloy';
    // OpenAI TTS outputs PCM 24kHz 16-bit mono
    const resp = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        { model: 'tts-1', input: text, voice, response_format: 'pcm', speed: 1.0 },
        { headers: { Authorization: `Bearer ${key}` }, responseType: 'arraybuffer', timeout: 10000 }
    );
    // Downsample 24kHz PCM → 8kHz μ-law for Twilio
    return convertPCMToUlaw8k(Buffer.from(resp.data));
}

function convertPCMToUlaw8k(pcmBuffer) {
    // PCM from OpenAI is 24kHz, 16-bit signed, mono
    // Downsample to 8kHz by taking every 3rd sample
    const samples16 = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, Math.floor(pcmBuffer.byteLength / 2));
    const outLen = Math.floor(samples16.length / 3);
    const ulawBuffer = Buffer.alloc(outLen);
    for (let i = 0; i < outLen; i++) {
        ulawBuffer[i] = linearToUlaw(samples16[i * 3]);
    }
    return ulawBuffer;
}

function linearToUlaw(sample) {
    const BIAS = 0x84;
    const CLIP = 32635;
    let sign = (sample >> 8) & 0x80;
    if (sign) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample += BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) exponent--;
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Look up a voice_id in the voices table, route to the correct TTS provider,
 * cache the result in Redis, and return a proxy URL for Twilio <Play>.
 * Returns null on any failure — caller should fall back to <Say voice="Polly.Joanna">.
 *
 * @param {string} text       - Text to synthesize
 * @param {string} voiceId    - UUID from voices table (assistant.voice_id)
 * @param {string} callSid    - Twilio Call SID (for URL namespacing)
 * @returns {Promise<string|null>} Proxy URL or null
 */
async function generateTTSUrl(text, voiceId, callSid) {
    if (!voiceId || !text) return null;

    // 1. Look up voice in voices table using actual schema columns
    const { data: voice, error } = await supabase
        .from('voices')
        .select('id, name, tts_provider, elevenlabs_voice_id, elevenlabs_model_id, provider_voice_id')
        .eq('id', voiceId)
        .single();

    if (error || !voice) {
        console.warn('[🔊 TTS] Voice not found in library, voiceId:', voiceId, error?.message);
        return null;
    }

    console.log(`[🔊 TTS] Using voice: ${voice.name} (provider: ${voice.tts_provider})`);

    const hash = ttsHash(text, voiceId);
    const backendBase = process.env.BACKEND_URL || 'https://voicory-backend-783942490798.asia-south1.run.app';
    const ttsUrl = `${backendBase}/api/tts/${encodeURIComponent(callSid || 'nocall')}/${hash}`;

    try {
        // Check Redis cache first
        const cached = await getCachedTTSAudio(hash);
        if (cached) {
            console.log(`[🔊 TTS] Cache hit for hash=${hash}`);
            return ttsUrl;
        }

        // 2. Route to correct provider
        let audioBuffer = null;
        switch (voice.tts_provider) {
            case 'elevenlabs':
                audioBuffer = await generateElevenLabsAudio(
                    text,
                    voice.elevenlabs_voice_id,
                    voice.elevenlabs_model_id
                );
                break;

            case 'openai':
                // provider_voice_id holds OpenAI voice name (alloy/echo/fable/onyx/nova/shimmer)
                audioBuffer = await generateOpenAIAudio(text, voice.provider_voice_id || 'alloy');
                break;

            case 'google':
                // Google Chirp3-HD — not yet configured; fall through to null
                console.warn('[🔊 TTS] Google TTS not yet configured, falling back to <Say>');
                return null;

            default:
                console.warn('[🔊 TTS] Unknown tts_provider:', voice.tts_provider, '— falling back to <Say>');
                return null;
        }

        if (!audioBuffer) {
            console.warn('[🔊 TTS] Provider returned null audio for voice:', voice.name);
            return null;
        }

        // Cache as base64 (TTL 120s — enough for a call turn)
        await cacheTTSAudio(hash, audioBuffer.toString('base64'), 120);
        return ttsUrl;

    } catch (e) {
        console.error('[🔊 TTS] generateTTSUrl failed:', e.message);
        return null;
    }
}

/**
 * TTS proxy handler — serve cached audio from Redis.
 * Used by GET /api/tts/:callSid/:hash in index.js
 */
async function serveTTSAudio(hash, res) {
    try {
        const audioBase64 = await getCachedTTSAudio(hash);
        if (!audioBase64) {
            return res.status(404).send('TTS audio not found or expired');
        }
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        // μ-law 8kHz audio — Twilio expects audio/basic
        res.set('Content-Type', 'audio/basic');
        res.set('Content-Length', audioBuffer.length);
        res.set('Cache-Control', 'no-store');
        return res.send(audioBuffer);
    } catch (e) {
        console.error('[🔊 TTS] serveTTSAudio error:', e.message);
        return res.status(500).send('TTS serve error');
    }
}

module.exports = { generateTTSUrl, serveTTSAudio, ttsHash };
