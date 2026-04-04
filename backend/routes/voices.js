/**
 * backend/routes/voices.js
 * Voice Library API — list, preview TTS, custom voice upload
 *
 * Routes:
 *   GET  /api/voices           — list all active voices (DB + hardcoded fallback)
 *   POST /api/voices/preview   — generate TTS preview (ElevenLabs or OpenAI)
 *   POST /api/voices/custom    — upload custom ElevenLabs clone (multipart audio file)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');

// ─── Auth ────────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}

// ─── Multer (audio files, max 20 MB) ────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
                     'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/flac',
                     'audio/x-flac', 'video/webm'];
    cb(null, allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|webm|flac|m4a)$/i) !== null);
  }
});

// ─── Hardcoded fallback voice list ──────────────────────────────────────────
// Used when the DB voices table is empty or unavailable
const FALLBACK_VOICES = [
  {
    id: 'fallback-1',
    name: 'Priya',
    description: 'Warm and professional Indian female voice. Ideal for customer support.',
    gender: 'Female',
    ttsProvider: 'elevenlabs',
    elevenlabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    elevenlabsModelId: 'eleven_multilingual_v2',
    accent: 'Indian',
    primaryLanguage: 'English',
    supportedLanguages: ['English', 'Hindi'],
    tags: ['professional', 'customer-support', 'warm'],
    defaultStability: 0.5,
    defaultSimilarity: 0.75,
    defaultStyle: 0.0,
    costPerMin: 2.50,
    isActive: true,
    isFeatured: true,
    isPremium: false,
    displayOrder: 1,
    pricingTier: 'spark',
    previewUrl: null
  },
  {
    id: 'fallback-2',
    name: 'Arjun',
    description: 'Confident and clear Indian male voice. Great for sales calls.',
    gender: 'Male',
    ttsProvider: 'elevenlabs',
    elevenlabsVoiceId: 'VR6AewLTigWG4xSOukaG',
    elevenlabsModelId: 'eleven_multilingual_v2',
    accent: 'Indian',
    primaryLanguage: 'English',
    supportedLanguages: ['English', 'Hindi', 'Gujarati'],
    tags: ['sales', 'confident', 'clear'],
    defaultStability: 0.5,
    defaultSimilarity: 0.75,
    defaultStyle: 0.0,
    costPerMin: 2.50,
    isActive: true,
    isFeatured: false,
    isPremium: false,
    displayOrder: 2,
    pricingTier: 'spark',
    previewUrl: null
  },
  {
    id: 'fallback-3',
    name: 'Meera',
    description: 'Expressive bilingual voice fluent in Hindi and English.',
    gender: 'Female',
    ttsProvider: 'elevenlabs',
    elevenlabsVoiceId: 'ThT5KcBeYPX3keUQqHPh',
    elevenlabsModelId: 'eleven_multilingual_v2',
    accent: 'Indian',
    primaryLanguage: 'Hindi',
    supportedLanguages: ['Hindi', 'English'],
    tags: ['bilingual', 'expressive', 'hindi'],
    defaultStability: 0.5,
    defaultSimilarity: 0.75,
    defaultStyle: 0.0,
    costPerMin: 3.00,
    isActive: true,
    isFeatured: true,
    isPremium: true,
    displayOrder: 3,
    pricingTier: 'boost',
    previewUrl: null
  },
  {
    id: 'fallback-4',
    name: 'Rohan',
    description: 'Neutral accent, high clarity. Perfect for IVR and announcements.',
    gender: 'Male',
    ttsProvider: 'openai',
    elevenlabsVoiceId: '',
    elevenlabsModelId: '',
    providerVoiceId: 'onyx',
    providerModel: 'tts-1',
    accent: 'Neutral',
    primaryLanguage: 'English',
    supportedLanguages: ['English'],
    tags: ['IVR', 'neutral', 'announcements'],
    defaultStability: 0.5,
    defaultSimilarity: 0.75,
    defaultStyle: 0.0,
    costPerMin: 1.50,
    isActive: true,
    isFeatured: false,
    isPremium: false,
    displayOrder: 4,
    pricingTier: 'spark',
    previewUrl: null
  },
  {
    id: 'fallback-5',
    name: 'Ananya',
    description: 'Premium ultra-realistic voice with natural prosody for premium experiences.',
    gender: 'Female',
    ttsProvider: 'elevenlabs',
    elevenlabsVoiceId: 'pFZP5JQG7iQjIQuC4Bku',
    elevenlabsModelId: 'eleven_multilingual_v2',
    accent: 'Indian',
    primaryLanguage: 'English',
    supportedLanguages: ['English', 'Hindi', 'Tamil', 'Bengali'],
    tags: ['premium', 'ultra-realistic', 'multilingual'],
    defaultStability: 0.6,
    defaultSimilarity: 0.85,
    defaultStyle: 0.1,
    costPerMin: 5.00,
    isActive: true,
    isFeatured: true,
    isPremium: true,
    displayOrder: 5,
    pricingTier: 'fusion',
    previewUrl: null
  }
];

// ─── GET /api/voices ─────────────────────────────────────────────────────────
// Returns active voices from DB; falls back to hardcoded list if DB has none.
// Custom voices owned by the authenticated user are appended.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: dbVoices, error } = await supabase
      .from('voices')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Map DB snake_case → camelCase expected by frontend
    const mapVoice = (v) => ({
      id: v.id,
      name: v.name,
      description: v.description || '',
      gender: v.gender,
      ttsProvider: v.tts_provider || 'elevenlabs',
      providerVoiceId: v.provider_voice_id || '',
      providerModel: v.provider_model || '',
      elevenlabsVoiceId: v.elevenlabs_voice_id || '',
      elevenlabsModelId: v.elevenlabs_model_id || 'eleven_multilingual_v2',
      accent: v.accent || '',
      primaryLanguage: v.primary_language || 'English',
      supportedLanguages: v.supported_languages || [],
      tags: v.tags || [],
      defaultStability: v.default_stability ?? 0.5,
      defaultSimilarity: v.default_similarity ?? 0.75,
      defaultStyle: v.default_style ?? 0.0,
      costPerMin: parseFloat(v.cost_per_min) || 0,
      isActive: v.is_active,
      isFeatured: v.is_featured || false,
      isPremium: v.is_premium || false,
      displayOrder: v.display_order || 99,
      pricingTier: v.pricing_tier || null,
      latencyTier: v.latency_tier || null,
      qualityTier: v.quality_tier || null,
      supportsStreaming: v.supports_streaming || false,
      previewUrl: v.preview_url || null,
      isCustom: false,
    });

    let voices = [];

    if (!error && dbVoices && dbVoices.length > 0) {
      voices = dbVoices.map(mapVoice);
    } else {
      // DB unavailable or empty — use fallback list
      voices = FALLBACK_VOICES;
    }

    // Append custom voices owned by this user
    const { data: customVoices } = await supabase
      .from('custom_voices')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (customVoices && customVoices.length > 0) {
      const mapped = customVoices.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description || 'Custom cloned voice',
        gender: v.gender || 'Neutral',
        ttsProvider: 'elevenlabs',
        providerVoiceId: v.elevenlabs_voice_id,
        providerModel: '',
        elevenlabsVoiceId: v.elevenlabs_voice_id,
        elevenlabsModelId: 'eleven_multilingual_v2',
        accent: v.accent || 'Custom',
        primaryLanguage: 'English',
        supportedLanguages: ['English'],
        tags: ['custom', 'cloned'],
        defaultStability: 0.5,
        defaultSimilarity: 0.75,
        defaultStyle: 0.0,
        costPerMin: 5.00,
        isActive: true,
        isFeatured: false,
        isPremium: true,
        displayOrder: 999,
        pricingTier: 'fusion',
        previewUrl: v.preview_url || null,
        isCustom: true,
      }));
      voices = [...voices, ...mapped];
    }

    res.json({ voices });
  } catch (err) {
    console.error('GET /api/voices error:', err.message);
    // Always return something useful
    res.json({ voices: FALLBACK_VOICES });
  }
});

// ─── POST /api/voices/preview ─────────────────────────────────────────────
// Body: { voice_id, provider, text }
// Returns: { audio_url } — base64 data URI playable in browser
router.post('/preview', requireAuth, async (req, res) => {
  const { voice_id, provider = 'elevenlabs', text } = req.body;

  if (!voice_id) return res.status(400).json({ error: 'voice_id is required' });

  const previewText = (text || 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ? Hello! How can I help you today?').slice(0, 250);

  try {
    // ── ElevenLabs ─────────────────────────────────────────────────────────
    if (provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'ElevenLabs API key not configured. Please contact support.' });
      }

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
        {
          text: previewText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true }
        },
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
          timeout: 20000,
        }
      );

      const base64 = Buffer.from(response.data).toString('base64');
      return res.json({ audio_url: `data:audio/mpeg;base64,${base64}` });
    }

    // ── OpenAI TTS ─────────────────────────────────────────────────────────
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'OpenAI API key not configured.' });
      }

      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          input: previewText,
          voice: voice_id, // alloy, echo, fable, onyx, nova, shimmer
          response_format: 'mp3',
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 20000,
        }
      );

      const base64 = Buffer.from(response.data).toString('base64');
      return res.json({ audio_url: `data:audio/mpeg;base64,${base64}` });
    }

    return res.status(400).json({ error: `Unsupported provider: ${provider}` });

  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data
      ? Buffer.isBuffer(err.response.data)
        ? err.response.data.toString()
        : JSON.stringify(err.response.data)
      : err.message;

    console.error('POST /api/voices/preview error:', msg);

    if (status === 401) return res.status(503).json({ error: 'TTS provider authentication failed. Check API key.' });
    if (status === 422) return res.status(400).json({ error: 'Voice ID not found or invalid for this provider.' });
    if (status === 429) return res.status(429).json({ error: 'TTS rate limit reached. Please try again shortly.' });

    res.status(500).json({ error: 'Preview generation failed. Please try again.' });
  }
});

// ─── POST /api/voices/preview/:voiceId (convenience alias with voice in URL) ─
router.post('/preview/:voiceId', requireAuth, async (req, res) => {
  req.body.voice_id = req.body.voice_id || req.params.voiceId;
  return router.handle(req, res, () => {});
});

// ─── POST /api/voices/custom ─────────────────────────────────────────────────
// Clones a voice via ElevenLabs Voice Cloning API
// multipart/form-data: name, description, gender, file (audio)
router.post('/custom', requireAuth, upload.single('file'), async (req, res) => {
  const { name, description, gender = 'Neutral' } = req.body;

  if (!name) return res.status(400).json({ error: 'Voice name is required' });
  if (!req.file) return res.status(400).json({ error: 'Audio file is required' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ElevenLabs API key not configured. Custom voice cloning is unavailable.' });
  }

  try {
    // Upload to ElevenLabs IVC (Instant Voice Cloning)
    const form = new FormData();
    form.append('name', name);
    if (description) form.append('description', description);
    form.append('files', req.file.buffer, {
      filename: req.file.originalname || 'sample.mp3',
      contentType: req.file.mimetype || 'audio/mpeg',
    });

    const elResponse = await axios.post(
      'https://api.elevenlabs.io/v1/voices/add',
      form,
      {
        headers: {
          'xi-api-key': apiKey,
          ...form.getHeaders(),
        },
        timeout: 60000,
      }
    );

    const elevenlabsVoiceId = elResponse.data?.voice_id;
    if (!elevenlabsVoiceId) throw new Error('ElevenLabs did not return a voice_id');

    // Save to custom_voices table
    const { data: saved, error: dbErr } = await supabase
      .from('custom_voices')
      .insert({
        user_id: req.user.id,
        name,
        description: description || '',
        gender,
        elevenlabs_voice_id: elevenlabsVoiceId,
        status: 'ready',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbErr) {
      // Voice was created in ElevenLabs but DB save failed — still return success
      console.error('Failed to save custom voice to DB:', dbErr.message);
      return res.json({
        success: true,
        voice_id: elevenlabsVoiceId,
        warning: 'Voice created but not saved to database. Voice ID: ' + elevenlabsVoiceId,
      });
    }

    res.json({
      success: true,
      voice: {
        id: saved.id,
        name: saved.name,
        elevenlabsVoiceId: saved.elevenlabs_voice_id,
        isCustom: true,
        status: 'ready',
      },
    });

  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;

    console.error('POST /api/voices/custom error:', msg);

    if (status === 401) return res.status(503).json({ error: 'ElevenLabs authentication failed.' });
    if (status === 422) return res.status(400).json({ error: 'Invalid audio file or voice name. ' + msg });
    if (status === 429) return res.status(429).json({ error: 'ElevenLabs rate limit reached. Please try again.' });

    res.status(500).json({ error: 'Custom voice upload failed. Please try again.' });
  }
});

// ─── POST /api/voices/:voiceId/assign ────────────────────────────────────────
// Assigns a voice to an assistant
// Body: { assistant_id }
router.post('/:voiceId/assign', requireAuth, async (req, res) => {
  const { voiceId } = req.params;
  const { assistant_id } = req.body;

  if (!assistant_id) return res.status(400).json({ error: 'assistant_id is required' });

  try {
    // Verify ownership
    const { data: assistant, error: fetchErr } = await supabase
      .from('assistants')
      .select('id, user_id')
      .eq('id', assistant_id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !assistant) {
      return res.status(404).json({ error: 'Assistant not found or access denied' });
    }

    // Get voice details to update assistant voice config
    let voiceDetails = FALLBACK_VOICES.find(v => v.id === voiceId || v.elevenlabsVoiceId === voiceId);
    if (!voiceDetails) {
      const { data: dbVoice } = await supabase.from('voices').select('*').eq('id', voiceId).single();
      if (dbVoice) {
        voiceDetails = { elevenlabsVoiceId: dbVoice.elevenlabs_voice_id, name: dbVoice.name };
      }
      // Also check custom voices
      const { data: customVoice } = await supabase
        .from('custom_voices')
        .select('*')
        .eq('id', voiceId)
        .eq('user_id', req.user.id)
        .single();
      if (customVoice) voiceDetails = { elevenlabsVoiceId: customVoice.elevenlabs_voice_id, name: customVoice.name };
    }

    // Update assistant with new voice
    const { error: updateErr } = await supabase
      .from('assistants')
      .update({
        voice_id: voiceId,
        elevenlabs_voice_id: voiceDetails?.elevenlabsVoiceId || voiceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assistant_id)
      .eq('user_id', req.user.id);

    if (updateErr) throw updateErr;

    res.json({ success: true, message: `Voice "${voiceDetails?.name || voiceId}" assigned to assistant` });

  } catch (err) {
    console.error('POST /api/voices/:voiceId/assign error:', err.message);
    res.status(500).json({ error: 'Failed to assign voice' });
  }
});

module.exports = router;
