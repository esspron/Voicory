/**
 * Google Chirp 3 HD TTS Service
 * 
 * Official SDK implementation using @google-cloud/text-to-speech
 * with all best practices from Google's documentation.
 * 
 * Features:
 * - Streaming TTS for low-latency voice
 * - SSML support (speak, say-as, phoneme, sub, p, s)
 * - Pace control via speaking_rate (0.25 - 2.0)
 * - Pause markup [pause short/medium/long/x-long]
 * - Custom pronunciations
 * - TTS-optimized prompting techniques
 */

const textToSpeech = require('@google-cloud/text-to-speech');

// ============================================================================
// CONFIGURATION - Google Chirp 3 HD Voice Library
// ============================================================================

const CHIRP3_HD_CONFIG = {
  // Model identifier
  model: 'chirp3-hd',
  
  // Supported voices (subset - full list at cloud.google.com/text-to-speech/docs/voices)
  voices: {
    // English - US
    'en-US': [
      'Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Zephyr',
      'Aoede', 'Callirrhoe', 'Autonoe', 'Despina', 'Erinome', 'Algieba', 'Rasalgethi',
      'Sadatoni', 'Vindemiatrix', 'Sadachbia', 'Zubenelgenubi', 'Sulafat', 'Achernar',
      'Gacrux', 'Achird', 'Isonoe', 'Pulcherrima', 'Laomedeia', 'Umbriel', 'Elara'
    ],
    // English - UK
    'en-GB': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // English - India
    'en-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // English - Australia
    'en-AU': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Hindi
    'hi-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Spanish
    'es-ES': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    'es-US': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // French
    'fr-FR': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // German
    'de-DE': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Portuguese
    'pt-BR': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Japanese
    'ja-JP': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Korean
    'ko-KR': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Chinese (Mandarin)
    'cmn-CN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Arabic
    'ar-XA': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Italian
    'it-IT': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Dutch
    'nl-NL': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Polish
    'pl-PL': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Russian
    'ru-RU': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Turkish
    'tr-TR': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Vietnamese
    'vi-VN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Indonesian
    'id-ID': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Thai
    'th-TH': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Filipino
    'fil-PH': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Bengali
    'bn-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Tamil
    'ta-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Telugu
    'te-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Marathi
    'mr-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Gujarati
    'gu-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Kannada
    'kn-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Malayalam
    'ml-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
    // Punjabi
    'pa-IN': ['Enceladus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']
  },

  // Speaking rate range (1.0 = normal)
  speakingRate: {
    min: 0.25,
    max: 2.0,
    default: 1.0
  },

  // Pitch range (-20.0 to 20.0 semitones)
  pitch: {
    min: -20.0,
    max: 20.0,
    default: 0.0
  },

  // Supported SSML elements (subset of full SSML)
  supportedSSML: ['speak', 'say-as', 'p', 's', 'phoneme', 'sub'],

  // Pause markup tags (use in markup field, NOT SSML)
  pauseTags: {
    short: '[pause short]',     // ~200ms
    medium: '[pause medium]',   // ~500ms
    long: '[pause long]',       // ~1000ms
    xlong: '[pause x-long]'     // ~2000ms
  },

  // Audio encoding options
  audioEncoding: {
    streaming: ['LINEAR16', 'MULAW', 'ALAW', 'OGG_OPUS'],
    batch: ['LINEAR16', 'MP3', 'OGG_OPUS', 'MULAW', 'ALAW']
  },

  // Sample rates (Hz)
  sampleRates: {
    LINEAR16: 24000,
    MULAW: 8000,
    ALAW: 8000,
    OGG_OPUS: 24000,
    MP3: 24000
  }
};

// ============================================================================
// TTS CLIENT INITIALIZATION
// ============================================================================

let ttsClient = null;

/**
 * Initialize TTS client with credentials
 * Uses GOOGLE_APPLICATION_CREDENTIALS env var or service account JSON
 */
function getClient() {
  if (!ttsClient) {
    // Option 1: Use GOOGLE_APPLICATION_CREDENTIALS env var (recommended)
    // Option 2: Pass credentials directly
    const options = {};
    
    if (process.env.GOOGLE_TTS_CREDENTIALS) {
      // Parse JSON credentials from env var
      try {
        options.credentials = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS);
      } catch (e) {
        console.error('[GoogleChirp3HD] Failed to parse GOOGLE_TTS_CREDENTIALS:', e.message);
      }
    }
    
    ttsClient = new textToSpeech.TextToSpeechClient(options);
  }
  return ttsClient;
}

// ============================================================================
// TEXT PREPROCESSING - Prompting Techniques from Google Docs
// ============================================================================

/**
 * Format text for natural Chirp 3 HD synthesis
 * Applies Google's recommended scripting techniques
 * 
 * @param {string} text - Raw text to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted text with natural speech patterns
 */
function formatTextForChirp3(text, options = {}) {
  let formatted = text;

  // 1. Convert periods to more natural pauses with ellipses for emphasis
  // "Think about it. Really think." → "Think about it... Really think."
  if (options.addEmphasisPauses) {
    formatted = formatted.replace(/\. (?=[A-Z])/g, '... ');
  }

  // 2. Add conversational contractions (makes it sound more natural)
  if (options.useContractions !== false) {
    const contractions = {
      'I am': "I'm",
      'I will': "I'll",
      'I would': "I'd",
      'I have': "I've",
      'you are': "you're",
      'you will': "you'll",
      'you would': "you'd",
      'you have': "you've",
      'we are': "we're",
      'we will': "we'll",
      'we would': "we'd",
      'we have': "we've",
      'they are': "they're",
      'they will': "they'll",
      'they would': "they'd",
      'they have': "they've",
      'it is': "it's",
      'it will': "it'll",
      'it would': "it'd",
      'that is': "that's",
      'that will': "that'll",
      'that would': "that'd",
      'there is': "there's",
      'there will': "there'll",
      'what is': "what's",
      'what will': "what'll",
      'who is': "who's",
      'who will': "who'll",
      'do not': "don't",
      'does not': "doesn't",
      'did not': "didn't",
      'is not': "isn't",
      'are not': "aren't",
      'was not': "wasn't",
      'were not': "weren't",
      'have not': "haven't",
      'has not': "hasn't",
      'had not': "hadn't",
      'will not': "won't",
      'would not': "wouldn't",
      'could not': "couldn't",
      'should not': "shouldn't",
      'cannot': "can't",
      'let us': "let's"
    };

    for (const [full, contraction] of Object.entries(contractions)) {
      // Case-insensitive replacement
      const regex = new RegExp(full, 'gi');
      formatted = formatted.replace(regex, (match) => {
        // Preserve original capitalization
        if (match[0] === match[0].toUpperCase()) {
          return contraction.charAt(0).toUpperCase() + contraction.slice(1);
        }
        return contraction;
      });
    }
  }

  // 3. Add disfluencies for natural speech (optional)
  // "Well, um, I think..." sounds more human
  if (options.addDisfluencies) {
    const disfluencies = ['um', 'uh', 'well', 'you know', 'like'];
    // Add sparingly at sentence starts
    const sentences = formatted.split(/(?<=[.!?])\s+/);
    formatted = sentences.map((sentence, index) => {
      // Add to ~20% of sentences after the first
      if (index > 0 && Math.random() < 0.2) {
        const disfluency = disfluencies[Math.floor(Math.random() * disfluencies.length)];
        return disfluency.charAt(0).toUpperCase() + disfluency.slice(1) + ', ' + sentence.charAt(0).toLowerCase() + sentence.slice(1);
      }
      return sentence;
    }).join(' ');
  }

  // 4. Add thinking pauses with punctuation
  // Before important points, add commas or ellipses
  if (options.addThinkingPauses) {
    // Add pause before "because", "however", "therefore"
    formatted = formatted.replace(/\s+(because|however|therefore|although|since|while)/gi, '... $1');
  }

  // 5. Convert lists to spoken format
  // "Option 1, Option 2, Option 3" → "Option 1... Option 2... and Option 3"
  if (options.speakLists) {
    formatted = formatted.replace(/,\s*([^,]+),\s*and\s+/gi, '... $1... and ');
  }

  return formatted.trim();
}

/**
 * Convert pause markup tags to SSML breaks
 * [pause short] → <break time="200ms"/>
 * 
 * @param {string} text - Text with pause tags
 * @returns {string} - Text with SSML breaks
 */
function convertPauseTagsToSSML(text) {
  const pauseDurations = {
    'short': '200ms',
    'medium': '500ms',
    'long': '1000ms',
    'x-long': '2000ms'
  };

  let result = text;
  for (const [tag, duration] of Object.entries(pauseDurations)) {
    const regex = new RegExp(`\\[pause ${tag}\\]`, 'gi');
    result = result.replace(regex, `<break time="${duration}"/>`);
  }

  return result;
}

// ============================================================================
// SSML BUILDER
// ============================================================================

/**
 * Build valid SSML for Chirp 3 HD
 * Only uses supported elements: speak, say-as, p, s, phoneme, sub
 * 
 * @param {string} text - Text to convert to SSML
 * @param {Object} options - SSML options
 * @returns {string} - Valid SSML string
 */
function buildSSML(text, options = {}) {
  let ssmlContent = text;

  // Convert pause tags to SSML breaks
  ssmlContent = convertPauseTagsToSSML(ssmlContent);

  // Add paragraph markers for long texts
  if (options.useParagraphs && text.length > 200) {
    const paragraphs = ssmlContent.split(/\n\n+/);
    ssmlContent = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
  }

  // Add sentence markers for better pacing
  if (options.useSentences) {
    ssmlContent = ssmlContent.replace(/([.!?])\s+(?=[A-Z])/g, '$1</s><s>');
    if (!ssmlContent.startsWith('<s>')) {
      ssmlContent = '<s>' + ssmlContent;
    }
    if (!ssmlContent.endsWith('</s>')) {
      ssmlContent = ssmlContent + '</s>';
    }
  }

  // Apply custom pronunciations
  if (options.customPronunciations) {
    for (const [word, pronunciation] of Object.entries(options.customPronunciations)) {
      // Use phoneme tag for IPA pronunciations
      if (pronunciation.startsWith('/') && pronunciation.endsWith('/')) {
        const ipa = pronunciation.slice(1, -1);
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        ssmlContent = ssmlContent.replace(regex, `<phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme>`);
      }
      // Use sub tag for text substitutions
      else {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        ssmlContent = ssmlContent.replace(regex, `<sub alias="${pronunciation}">${word}</sub>`);
      }
    }
  }

  // Apply say-as for specific patterns
  if (options.useSayAs !== false) {
    // Phone numbers
    ssmlContent = ssmlContent.replace(
      /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      (match) => `<say-as interpret-as="telephone">${match}</say-as>`
    );

    // Dates (MM/DD/YYYY or similar)
    ssmlContent = ssmlContent.replace(
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,
      (match) => `<say-as interpret-as="date">${match}</say-as>`
    );

    // Currency
    ssmlContent = ssmlContent.replace(
      /[$₹€£¥]\s?\d+(?:,\d{3})*(?:\.\d{2})?/g,
      (match) => `<say-as interpret-as="currency">${match}</say-as>`
    );
  }

  // Wrap in speak tags
  return `<speak>${ssmlContent}</speak>`;
}

// ============================================================================
// MAIN TTS FUNCTIONS
// ============================================================================

/**
 * Synthesize speech using Google Chirp 3 HD (batch mode)
 * 
 * @param {string} text - Text to synthesize
 * @param {Object} options - Synthesis options
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function synthesizeChirp3HD(text, options = {}) {
  const client = getClient();

  const {
    voice = 'Puck',
    languageCode = 'en-US',
    speakingRate = 1.0,
    pitch = 0.0,
    audioEncoding = 'LINEAR16',
    useSSML = false,
    formatText = true,
    textFormatOptions = {},
    ssmlOptions = {},
    customPronunciations = {}
  } = options;

  // Step 1: Format text for natural speech
  let processedText = text;
  if (formatText) {
    processedText = formatTextForChirp3(text, textFormatOptions);
  }

  // Step 2: Build SSML if requested
  let inputType;
  if (useSSML || Object.keys(customPronunciations).length > 0) {
    processedText = buildSSML(processedText, {
      ...ssmlOptions,
      customPronunciations
    });
    inputType = { ssml: processedText };
  } else {
    inputType = { text: processedText };
  }

  // Step 3: Build request
  const request = {
    input: inputType,
    voice: {
      languageCode: languageCode,
      name: `${languageCode}-Chirp3-HD-${voice}`
    },
    audioConfig: {
      audioEncoding: audioEncoding,
      speakingRate: Math.max(0.25, Math.min(2.0, speakingRate)),
      pitch: Math.max(-20, Math.min(20, pitch)),
      sampleRateHertz: CHIRP3_HD_CONFIG.sampleRates[audioEncoding] || 24000
    }
  };

  // Step 4: Make request
  const [response] = await client.synthesizeSpeech(request);

  return response.audioContent;
}

/**
 * Streaming TTS using Google Chirp 3 HD
 * Returns an async generator that yields audio chunks
 * 
 * @param {string} text - Text to synthesize
 * @param {Object} options - Synthesis options
 * @returns {AsyncGenerator<Buffer>} - Async generator of audio chunks
 */
async function* streamChirp3HD(text, options = {}) {
  const client = getClient();

  const {
    voice = 'Puck',
    languageCode = 'en-US',
    speakingRate = 1.0,
    pitch = 0.0,
    audioEncoding = 'LINEAR16',
    useSSML = false,
    formatText = true,
    textFormatOptions = {},
    ssmlOptions = {},
    customPronunciations = {}
  } = options;

  // Step 1: Format text for natural speech
  let processedText = text;
  if (formatText) {
    processedText = formatTextForChirp3(text, textFormatOptions);
  }

  // Step 2: Build SSML if requested
  let inputType;
  if (useSSML || Object.keys(customPronunciations).length > 0) {
    processedText = buildSSML(processedText, {
      ...ssmlOptions,
      customPronunciations
    });
    inputType = { ssml: processedText };
  } else {
    inputType = { text: processedText };
  }

  // Step 3: Build streaming request
  const request = {
    input: inputType,
    voice: {
      languageCode: languageCode,
      name: `${languageCode}-Chirp3-HD-${voice}`
    },
    audioConfig: {
      audioEncoding: audioEncoding,
      speakingRate: Math.max(0.25, Math.min(2.0, speakingRate)),
      pitch: Math.max(-20, Math.min(20, pitch)),
      sampleRateHertz: CHIRP3_HD_CONFIG.sampleRates[audioEncoding] || 24000
    }
  };

  // Step 4: Use streaming synthesis
  const stream = client.streamingSynthesize();

  // Create a promise to track completion
  let resolveComplete;
  const completePromise = new Promise(resolve => {
    resolveComplete = resolve;
  });

  // Buffer for incoming chunks
  const audioChunks = [];
  let chunkIndex = 0;
  let isComplete = false;

  // Handle incoming data
  stream.on('data', (response) => {
    if (response.audioContent) {
      audioChunks.push(response.audioContent);
    }
  });

  stream.on('end', () => {
    isComplete = true;
    resolveComplete();
  });

  stream.on('error', (err) => {
    console.error('[GoogleChirp3HD] Streaming error:', err);
    isComplete = true;
    resolveComplete();
  });

  // Write request
  stream.write({ streamingConfig: { voice: request.voice, audioConfig: request.audioConfig } });
  stream.write({ input: request.input });
  stream.end();

  // Yield chunks as they arrive
  while (!isComplete || chunkIndex < audioChunks.length) {
    if (chunkIndex < audioChunks.length) {
      yield audioChunks[chunkIndex];
      chunkIndex++;
    } else {
      // Wait a bit for more data
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * Simple streaming using HTTP (fallback for non-streaming SDK versions)
 * Uses batch synthesis but streams the response
 * 
 * @param {string} text - Text to synthesize
 * @param {Object} options - Synthesis options
 * @returns {Promise<Buffer>} - Full audio buffer
 */
async function synthesizeChirp3HDFallback(text, options = {}) {
  // This uses the batch API but can be called in a streaming context
  return synthesizeChirp3HD(text, options);
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
  const { language = 'en' } = options;

  // TTS optimization instructions
  const ttsInstructions = `

## SPEECH OPTIMIZATION (for natural voice synthesis)

Your responses will be spoken aloud using text-to-speech. Follow these guidelines:

### Pacing & Rhythm
- Use punctuation to control pacing. Commas create short pauses, periods create longer pauses.
- Use "..." (ellipsis) for thoughtful pauses or to build anticipation.
- Use "—" (em dash) for interruptions or quick asides.
- Use "!" for emphasis, but sparingly.
- Use "?" naturally in questions.

### Natural Speech Patterns
- Use contractions (I'm, you're, don't, can't) to sound conversational.
- Keep sentences short to medium length. Break up long thoughts.
- Use filler words sparingly when appropriate (well, you know, honestly).
- Vary sentence structure - don't start every sentence the same way.

### Pronunciation Hints
- For acronyms, write them as they should be spoken (e.g., "NASA" not "N.A.S.A" unless you want each letter said)
- For numbers, write them as words for emphasis ("twenty three" vs "23")
- For emphasis on specific words, use ALL CAPS sparingly.

### Avoid
- Long complex sentences with multiple clauses
- Lists with more than 3-4 items without pauses
- Technical jargon without explanation
- Parenthetical asides (use em dashes instead)

### Example Good Response:
"Let me think about that... Okay, so there are three main things to consider. First, the timing. Second, the budget. And third — this is important — the team availability."

### Example Bad Response:
"There are three main things to consider: (1) the timing of the project which depends on various factors including external dependencies, (2) the budget allocation across different departments, and (3) the availability of team members who have the required skills."
`;

  return basePrompt + ttsInstructions;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get available voices for a language
 * @param {string} languageCode - BCP-47 language code
 * @returns {string[]} - Array of voice names
 */
function getVoicesForLanguage(languageCode) {
  return CHIRP3_HD_CONFIG.voices[languageCode] || CHIRP3_HD_CONFIG.voices['en-US'];
}

/**
 * Check if a language is supported
 * @param {string} languageCode - BCP-47 language code
 * @returns {boolean}
 */
function isLanguageSupported(languageCode) {
  return languageCode in CHIRP3_HD_CONFIG.voices;
}

/**
 * Get all supported languages
 * @returns {string[]} - Array of language codes
 */
function getSupportedLanguages() {
  return Object.keys(CHIRP3_HD_CONFIG.voices);
}

/**
 * Validate speaking rate
 * @param {number} rate - Speaking rate to validate
 * @returns {number} - Clamped speaking rate
 */
function validateSpeakingRate(rate) {
  return Math.max(
    CHIRP3_HD_CONFIG.speakingRate.min,
    Math.min(CHIRP3_HD_CONFIG.speakingRate.max, rate)
  );
}

/**
 * Build voice name string for Google TTS API
 * @param {string} languageCode - BCP-47 language code
 * @param {string} voiceName - Voice name (e.g., 'Puck')
 * @returns {string} - Full voice name (e.g., 'en-US-Chirp3-HD-Puck')
 */
function buildVoiceName(languageCode, voiceName) {
  return `${languageCode}-Chirp3-HD-${voiceName}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main TTS functions
  synthesizeChirp3HD,
  streamChirp3HD,
  synthesizeChirp3HDFallback,

  // Text processing
  formatTextForChirp3,
  buildSSML,
  convertPauseTagsToSSML,

  // LLM prompt optimization
  getTTSOptimizedSystemPrompt,

  // Utilities
  getVoicesForLanguage,
  isLanguageSupported,
  getSupportedLanguages,
  validateSpeakingRate,
  buildVoiceName,

  // Configuration
  CHIRP3_HD_CONFIG
};
