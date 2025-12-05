/**
 * Google Chirp 3 HD TTS Service
 * 
 * Simple REST API implementation using GOOGLE_TTS_API_KEY
 * Works with the voices configured in your database.
 */

const axios = require('axios');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Default voice for fallback (from your database)
const DEFAULT_VOICE = {
  languageCode: 'en-IN',
  name: 'en-IN-Chirp3-HD-Achernar'  // Aanya - Warm and professional
};

// ============================================================================
// MAIN TTS FUNCTION
// ============================================================================

/**
 * Synthesize speech using Google Chirp 3 HD via REST API
 * 
 * @param {string} text - Text to synthesize
 * @param {Object} options - Synthesis options
 * @returns {Promise<Buffer>} - Audio buffer (MP3)
 */
async function synthesizeChirp3HD(text, options = {}) {
  if (!GOOGLE_TTS_API_KEY) {
    throw new Error('GOOGLE_TTS_API_KEY not configured');
  }

  const {
    voice = 'Achernar',
    languageCode = 'en-IN',
    audioEncoding = 'MP3',
    speakingRate = 1.0,
    pitch = 0.0,
  } = options;

  // Build full voice name: en-IN-Chirp3-HD-Achernar
  const fullVoiceName = `${languageCode}-Chirp3-HD-${voice}`;

  console.log(`[GoogleChirp3HD] Synthesizing with voice: ${fullVoiceName}`);

  const requestBody = {
    input: { text },
    voice: {
      languageCode: languageCode,
      name: fullVoiceName
    },
    audioConfig: {
      audioEncoding: audioEncoding,
      speakingRate: Math.max(0.25, Math.min(2.0, speakingRate)),
      pitch: Math.max(-20, Math.min(20, pitch)),
      sampleRateHertz: audioEncoding === 'MP3' ? 24000 : 24000
    }
  };

  try {
    const response = await axios.post(
      `${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    // Response contains base64-encoded audio
    const audioContent = response.data.audioContent;
    return Buffer.from(audioContent, 'base64');

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error('[GoogleChirp3HD] Error:', errorMessage);
    throw new Error(`Google TTS failed: ${errorMessage}`);
  }
}

/**
 * Synthesize using full voice name from database (e.g., "en-IN-Chirp3-HD-Achernar")
 * 
 * @param {string} text - Text to synthesize
 * @param {string} fullVoiceName - Full voice name from language_voice_codes
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer>} - Audio buffer (MP3)
 */
async function synthesizeWithFullVoiceName(text, fullVoiceName, options = {}) {
  if (!GOOGLE_TTS_API_KEY) {
    throw new Error('GOOGLE_TTS_API_KEY not configured');
  }

  // Extract language code from full name (e.g., "en-IN-Chirp3-HD-Achernar" -> "en-IN")
  const parts = fullVoiceName.split('-');
  const languageCode = `${parts[0]}-${parts[1]}`;

  console.log(`[GoogleChirp3HD] Synthesizing with: ${fullVoiceName}, lang: ${languageCode}`);

  const {
    audioEncoding = 'MP3',
    speakingRate = 1.0,
    pitch = 0.0,
  } = options;

  const requestBody = {
    input: { text },
    voice: {
      languageCode: languageCode,
      name: fullVoiceName
    },
    audioConfig: {
      audioEncoding: audioEncoding,
      speakingRate: Math.max(0.25, Math.min(2.0, speakingRate)),
      pitch: Math.max(-20, Math.min(20, pitch)),
      sampleRateHertz: 24000
    }
  };

  try {
    const response = await axios.post(
      `${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    return Buffer.from(response.data.audioContent, 'base64');

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error('[GoogleChirp3HD] Error:', errorMessage);
    throw new Error(`Google TTS failed: ${errorMessage}`);
  }
}

// ============================================================================
// TTS-OPTIMIZED SYSTEM PROMPT
// ============================================================================

/**
 * Get TTS-optimized system prompt for LLM
 * Appends natural speech instructions to help LLM generate better TTS input
 * 
 * @param {string} basePrompt - Original system prompt
 * @param {Object} options - Voice configuration
 * @returns {string} - Enhanced system prompt for TTS
 */
function getTTSOptimizedSystemPrompt(basePrompt, options = {}) {
  const ttsInstructions = `

## SPEECH GUIDELINES

Your responses will be spoken aloud. Follow these guidelines:

### Natural Speech
- Use contractions (I'm, you're, don't, can't) to sound conversational.
- Keep sentences short and clear.
- Use punctuation for natural pacing - commas for short pauses, periods for longer pauses.
- Use "..." for thoughtful pauses.

### Avoid
- Long complex sentences
- Technical jargon without explanation
- Lists with more than 3-4 items
- Parenthetical asides

### Good Example:
"Let me think about that... Okay, there are three main things. First, the timing. Second, the budget. And third - this is key - your team's availability."
`;

  return basePrompt + ttsInstructions;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  synthesizeChirp3HD,
  synthesizeWithFullVoiceName,
  getTTSOptimizedSystemPrompt,
  DEFAULT_VOICE
};
