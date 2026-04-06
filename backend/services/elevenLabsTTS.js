// ============================================
// ElevenLabs TTS Service
// Generates TTS audio via ElevenLabs API and caches in Upstash Redis.
// Returns a URL Twilio can <Play>.
// ============================================
const crypto = require('crypto');
const axios = require('axios').default || require('axios');

/**
 * Hash text+voiceId for cache key
 */
function ttsHash(text, voiceId) {
    return crypto.createHash('sha256').update(`${text}|${voiceId}`).digest('hex').slice(0, 20);
}

/**
 * Store audio buffer (base64) in Upstash Redis with TTL.
 * Key: tts:<hash>
 */
async function cacheTTSAudio(hash, audioBase64, ttlSeconds = 120) {
    const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!baseUrl || !token) {
        console.warn('[TTS] Upstash Redis env vars not set — skipping cache');
        return;
    }
    try {
        await axios.post(
            `${baseUrl}/set/tts:${hash}`,
            { value: audioBase64, ex: ttlSeconds },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch (e) {
        console.warn('[TTS] Redis cache write failed:', e.message);
    }
}

/**
 * Retrieve audio buffer (base64) from Upstash Redis.
 * Returns null if not cached.
 */
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
        console.warn('[TTS] Redis cache read failed:', e.message);
        return null;
    }
}

/**
 * Generate TTS audio using ElevenLabs API.
 * Returns base64-encoded μ-law 8kHz audio buffer, or null on failure.
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceId - ElevenLabs voice_id
 * @param {string} [modelId] - ElevenLabs model ID (e.g. eleven_turbo_v2)
 * @returns {Promise<Buffer|null>}
 */
async function generateElevenLabsAudio(text, voiceId, modelId) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.warn('[TTS] ELEVENLABS_API_KEY not set');
        return null;
    }
    const model = modelId || 'eleven_turbo_v2';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

    const resp = await axios.post(
        url,
        {
            text,
            model_id: model,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        },
        {
            params: { output_format: 'ulaw_8000' },
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 10000
        }
    );
    return Buffer.from(resp.data);
}

/**
 * Main TTS URL generator.
 * Generates ElevenLabs TTS audio, caches it in Redis, and returns a proxy URL.
 * Falls back to null on any failure (caller should use <Say> fallback).
 *
 * @param {string} text - Text to speak
 * @param {string} voiceId - ElevenLabs voice ID from assistant.voice_id
 * @param {string} modelId - ElevenLabs model ID from assistant.elevenlabs_model_id
 * @param {string} callSid - Twilio call SID (for URL namespacing)
 * @returns {Promise<string|null>} URL for Twilio <Play>, or null on failure
 */
async function generateTTSUrl(text, voiceId, modelId, callSid) {
    if (!voiceId) return null;

    const hash = ttsHash(text, voiceId);
    const backendBase = process.env.BACKEND_URL || 'https://voicory-backend-783942490798.asia-south1.run.app';
    const ttsUrl = `${backendBase}/api/tts/${encodeURIComponent(callSid || 'nocall')}/${hash}`;

    try {
        // Check Redis cache first
        const cached = await getCachedTTSAudio(hash);
        if (cached) {
            console.log(`[TTS] Cache hit for hash=${hash}`);
            return ttsUrl;
        }

        // Generate fresh audio
        console.log(`[TTS] Generating ElevenLabs audio for voiceId=${voiceId}, model=${modelId || 'eleven_turbo_v2'}`);
        const audioBuffer = await generateElevenLabsAudio(text, voiceId, modelId);
        if (!audioBuffer) return null;

        // Cache as base64 (TTL 120s — enough for a call turn)
        const audioBase64 = audioBuffer.toString('base64');
        await cacheTTSAudio(hash, audioBase64, 120);

        return ttsUrl;
    } catch (e) {
        console.error('[TTS] generateTTSUrl failed:', e.message);
        return null;
    }
}

/**
 * TTS proxy handler — serve cached audio from Redis.
 * Used by GET /api/tts/:callSid/:hash
 *
 * @param {string} hash - TTS hash
 * @param {object} res - Express response object
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
        console.error('[TTS] serveTTSAudio error:', e.message);
        return res.status(500).send('TTS serve error');
    }
}

module.exports = { generateTTSUrl, serveTTSAudio, ttsHash };
