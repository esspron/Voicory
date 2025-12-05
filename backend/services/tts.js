// ============================================
// UNIFIED TTS SERVICE - Multi-Provider Voice Synthesis
// ============================================
// Supports: Google Chirp 3 HD, ElevenLabs, OpenAI TTS
// Used by: CallBot, Voice Preview, Talk to Assistant
// ============================================

const axios = require('axios');

// ============================================
// PROVIDER CONFIGURATIONS
// ============================================

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const ELEVENLABS_TTS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

// ============================================
// MAIN TTS FUNCTION - Provider Router
// ============================================

/**
 * Synthesize speech using the appropriate TTS provider
 * @param {Object} options - Synthesis options
 * @param {string} options.text - Text to synthesize
 * @param {string} options.provider - TTS provider: 'google', 'elevenlabs', 'openai'
 * @param {string} options.voiceId - Provider-specific voice ID
 * @param {string} options.languageCode - Language code (e.g., 'en-IN', 'hi-IN')
 * @param {Object} options.voiceSettings - Optional voice settings
 * @param {Object} options.languageVoiceCodes - Language to voice code mapping (for Google)
 * @returns {Promise<{audioContent: Buffer|string, success: boolean, error?: string}>}
 */
async function synthesize(options) {
    const {
        text,
        provider = 'google',
        voiceId,
        languageCode = 'en-IN',
        voiceSettings = {},
        languageVoiceCodes = {}
    } = options;

    if (!text) {
        return { success: false, error: 'Text is required' };
    }

    console.log(`[TTS] Synthesizing with ${provider}, voice: ${voiceId}, language: ${languageCode}`);

    switch (provider.toLowerCase()) {
        case 'google':
            return synthesizeGoogle(text, voiceId, languageCode, languageVoiceCodes);
        case 'elevenlabs':
            return synthesizeElevenLabs(text, voiceId, voiceSettings);
        case 'openai':
            return synthesizeOpenAI(text, voiceId, voiceSettings);
        default:
            return { success: false, error: `Unknown TTS provider: ${provider}` };
    }
}

// ============================================
// GOOGLE CLOUD TTS - Chirp 3 HD
// ============================================

async function synthesizeGoogle(text, voiceName, languageCode, languageVoiceCodes = {}) {
    if (!GOOGLE_TTS_API_KEY) {
        return { success: false, error: 'GOOGLE_TTS_API_KEY not configured' };
    }

    try {
        // Build the full voice name using language_voice_codes if available
        let fullVoiceName;
        if (languageVoiceCodes && languageVoiceCodes[languageCode]) {
            // Use the pre-mapped voice name (e.g., "hi-IN-Chirp3-HD-Achernar")
            fullVoiceName = languageVoiceCodes[languageCode];
        } else {
            // Fallback: construct the voice name
            fullVoiceName = `${languageCode}-Chirp3-HD-${voiceName}`;
        }

        console.log(`[Google TTS] Using voice: ${fullVoiceName}`);

        const response = await axios.post(
            `${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`,
            {
                input: { text },
                voice: {
                    languageCode: languageCode,
                    name: fullVoiceName
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: 1.0,
                    pitch: 0,
                    volumeGainDb: 0,
                    sampleRateHertz: 24000 // High quality for Chirp 3 HD
                }
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        return {
            success: true,
            audioContent: response.data.audioContent, // Base64 encoded MP3
            contentType: 'audio/mp3',
            encoding: 'base64'
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('[Google TTS Error]', errorMessage);
        return { success: false, error: errorMessage };
    }
}

// ============================================
// ELEVENLABS TTS - Premium Voices
// ============================================

async function synthesizeElevenLabs(text, voiceId, settings = {}) {
    if (!ELEVENLABS_API_KEY) {
        return { success: false, error: 'ELEVENLABS_API_KEY not configured' };
    }

    try {
        const modelId = settings.modelId || 'eleven_turbo_v2_5';
        
        console.log(`[ElevenLabs TTS] Using voice: ${voiceId}, model: ${modelId}`);

        const response = await axios.post(
            `${ELEVENLABS_TTS_ENDPOINT}/${voiceId}`,
            {
                text,
                model_id: modelId,
                voice_settings: {
                    stability: settings.stability ?? 0.5,
                    similarity_boost: settings.similarityBoost ?? 0.75,
                    style: settings.style ?? 0,
                    use_speaker_boost: true
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                responseType: 'arraybuffer',
                timeout: 30000
            }
        );

        // Convert to base64 for consistency
        const audioBase64 = Buffer.from(response.data).toString('base64');

        return {
            success: true,
            audioContent: audioBase64,
            contentType: 'audio/mpeg',
            encoding: 'base64'
        };
    } catch (error) {
        const errorMessage = error.response?.data?.detail?.message || error.message;
        console.error('[ElevenLabs TTS Error]', errorMessage);
        return { success: false, error: errorMessage };
    }
}

// ============================================
// OPENAI TTS - Built-in Voices
// ============================================

async function synthesizeOpenAI(text, voiceId = 'alloy', settings = {}) {
    if (!OPENAI_API_KEY) {
        return { success: false, error: 'OPENAI_API_KEY not configured' };
    }

    try {
        const model = settings.model || 'tts-1'; // or 'tts-1-hd' for higher quality
        
        // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
        const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
        const voice = validVoices.includes(voiceId) ? voiceId : 'alloy';

        console.log(`[OpenAI TTS] Using voice: ${voice}, model: ${model}`);

        const response = await axios.post(
            OPENAI_TTS_ENDPOINT,
            {
                model,
                input: text,
                voice,
                response_format: 'mp3',
                speed: settings.speed || 1.0
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 30000
            }
        );

        // Convert to base64 for consistency
        const audioBase64 = Buffer.from(response.data).toString('base64');

        return {
            success: true,
            audioContent: audioBase64,
            contentType: 'audio/mpeg',
            encoding: 'base64'
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('[OpenAI TTS Error]', errorMessage);
        return { success: false, error: errorMessage };
    }
}

// ============================================
// VOICE LOOKUP HELPER
// ============================================

/**
 * Get voice configuration from database
 * @param {string} voiceId - Voice UUID from database
 * @returns {Promise<Object>} Voice configuration
 */
async function getVoiceConfig(voiceId) {
    const { supabase } = require('../config');
    
    const { data, error } = await supabase
        .from('voices')
        .select('*')
        .eq('id', voiceId)
        .single();
    
    if (error) {
        console.error('[TTS] Failed to get voice config:', error.message);
        return null;
    }
    
    return data;
}

/**
 * Synthesize using voice ID from database
 * Automatically routes to correct provider based on voice config
 */
async function synthesizeWithVoiceId(text, voiceId, languageCode = 'en-IN') {
    const voiceConfig = await getVoiceConfig(voiceId);
    
    if (!voiceConfig) {
        return { success: false, error: 'Voice not found' };
    }
    
    return synthesize({
        text,
        provider: voiceConfig.tts_provider,
        voiceId: voiceConfig.provider_voice_id || voiceConfig.elevenlabs_voice_id,
        languageCode,
        languageVoiceCodes: voiceConfig.language_voice_codes || {},
        voiceSettings: {
            modelId: voiceConfig.provider_model || voiceConfig.elevenlabs_model_id,
            stability: voiceConfig.default_stability,
            similarityBoost: voiceConfig.default_similarity,
            style: voiceConfig.default_style
        }
    });
}

// ============================================
// STREAMING TTS (for real-time calls)
// ============================================

/**
 * Stream TTS for real-time voice calls (Twilio)
 * Returns audio in mulaw format at 8000Hz for Twilio
 */
async function synthesizeForTwilio(text, voiceId, languageCode = 'en-IN') {
    const voiceConfig = await getVoiceConfig(voiceId);
    
    if (!voiceConfig) {
        // Fallback to Google TTS with default voice
        return synthesizeGoogle(text, 'Achernar', languageCode, {});
    }
    
    // For now, use the standard synthesize and convert
    // In production, you'd want streaming for lower latency
    return synthesize({
        text,
        provider: voiceConfig.tts_provider,
        voiceId: voiceConfig.provider_voice_id || voiceConfig.elevenlabs_voice_id,
        languageCode,
        languageVoiceCodes: voiceConfig.language_voice_codes || {},
        voiceSettings: {
            modelId: voiceConfig.provider_model || voiceConfig.elevenlabs_model_id,
            stability: voiceConfig.default_stability,
            similarityBoost: voiceConfig.default_similarity,
            style: voiceConfig.default_style
        }
    });
}

// ============================================
// PROVIDER STATUS CHECK
// ============================================

function getProviderStatus() {
    return {
        google: {
            configured: !!GOOGLE_TTS_API_KEY,
            endpoint: GOOGLE_TTS_ENDPOINT
        },
        elevenlabs: {
            configured: !!ELEVENLABS_API_KEY,
            endpoint: ELEVENLABS_TTS_ENDPOINT
        },
        openai: {
            configured: !!OPENAI_API_KEY,
            endpoint: OPENAI_TTS_ENDPOINT
        }
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Main functions
    synthesize,
    synthesizeWithVoiceId,
    synthesizeForTwilio,
    getVoiceConfig,
    
    // Provider-specific (for testing)
    synthesizeGoogle,
    synthesizeElevenLabs,
    synthesizeOpenAI,
    
    // Status
    getProviderStatus
};
