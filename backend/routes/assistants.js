// ============================================
// ASSISTANTS ROUTES
// Handles: CRUD, duplicate, preview-voice TTS
// ============================================
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ─── Auth middleware ─────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing auth token' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: 'Auth error' });
    }
}

// ─── GET /api/assistants ─────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('assistants')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ assistants: data || [] });
    } catch (err) {
        console.error('GET /api/assistants error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/assistants/:id ─────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Assistant not found' });
        res.json(data);
    } catch (err) {
        console.error('GET /api/assistants/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/assistants ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;
        const insertData = {
            user_id: req.user.id,
            name: input.name || 'New Assistant',
            title: input.title || null,
            instruction: input.instruction || null,
            voice_id: input.voiceId || input.voice_id || null,
            elevenlabs_model_id: input.elevenlabsModelId || input.elevenlabs_model_id || 'eleven_turbo_v2_5',
            language_settings: input.languageSettings || input.language_settings || null,
            style_settings: input.styleSettings || input.style_settings || null,
            dynamic_variables: input.dynamicVariables || input.dynamic_variables || null,
            llm_provider: input.llmProvider || input.llm_provider || 'openai',
            llm_model: input.llmModel || input.llm_model || 'gpt-4o',
            model: input.llmModel || input.llm_model || 'gpt-4o',
            temperature: input.temperature ?? 0.7,
            max_tokens: input.maxTokens || input.max_tokens || 1024,
            interruptible: input.interruptible ?? true,
            use_default_personality: input.useDefaultPersonality ?? input.use_default_personality ?? true,
            timezone: input.timezone || 'Asia/Kolkata',
            rag_enabled: input.ragEnabled ?? input.rag_enabled ?? false,
            rag_similarity_threshold: input.ragSimilarityThreshold || input.rag_similarity_threshold || 0.7,
            rag_max_results: input.ragMaxResults || input.rag_max_results || 5,
            rag_instructions: input.ragInstructions || input.rag_instructions || null,
            knowledge_base_ids: input.knowledgeBaseIds || input.knowledge_base_ids || [],
            memory_enabled: input.memoryEnabled ?? input.memory_enabled ?? false,
            memory_config: input.memoryConfig || input.memory_config || null,
            status: input.status || 'draft',
            transcriber: 'deepgram',
        };

        const { data, error } = await supabase
            .from('assistants')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('POST /api/assistants error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/assistants/:id ─────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const input = req.body;
        const updateData = {};

        if (input.name !== undefined) updateData.name = input.name;
        if (input.title !== undefined) updateData.title = input.title || null;
        if (input.instruction !== undefined) updateData.instruction = input.instruction;
        if (input.voiceId !== undefined || input.voice_id !== undefined) updateData.voice_id = input.voiceId || input.voice_id || null;
        if (input.elevenlabsModelId !== undefined || input.elevenlabs_model_id !== undefined)
            updateData.elevenlabs_model_id = input.elevenlabsModelId || input.elevenlabs_model_id;
        if (input.languageSettings !== undefined || input.language_settings !== undefined)
            updateData.language_settings = input.languageSettings || input.language_settings;
        if (input.styleSettings !== undefined || input.style_settings !== undefined)
            updateData.style_settings = input.styleSettings || input.style_settings;
        if (input.dynamicVariables !== undefined || input.dynamic_variables !== undefined)
            updateData.dynamic_variables = input.dynamicVariables || input.dynamic_variables;
        if (input.llmProvider !== undefined || input.llm_provider !== undefined)
            updateData.llm_provider = input.llmProvider || input.llm_provider;
        if (input.llmModel !== undefined || input.llm_model !== undefined) {
            updateData.llm_model = input.llmModel || input.llm_model;
            updateData.model = input.llmModel || input.llm_model;
        }
        if (input.temperature !== undefined) updateData.temperature = input.temperature;
        if (input.maxTokens !== undefined || input.max_tokens !== undefined)
            updateData.max_tokens = input.maxTokens || input.max_tokens;
        if (input.interruptible !== undefined) updateData.interruptible = input.interruptible;
        if (input.useDefaultPersonality !== undefined || input.use_default_personality !== undefined)
            updateData.use_default_personality = input.useDefaultPersonality ?? input.use_default_personality;
        if (input.timezone !== undefined) updateData.timezone = input.timezone;
        if (input.ragEnabled !== undefined || input.rag_enabled !== undefined)
            updateData.rag_enabled = input.ragEnabled ?? input.rag_enabled;
        if (input.ragSimilarityThreshold !== undefined || input.rag_similarity_threshold !== undefined)
            updateData.rag_similarity_threshold = input.ragSimilarityThreshold ?? input.rag_similarity_threshold;
        if (input.ragMaxResults !== undefined || input.rag_max_results !== undefined)
            updateData.rag_max_results = input.ragMaxResults ?? input.rag_max_results;
        if (input.ragInstructions !== undefined || input.rag_instructions !== undefined)
            updateData.rag_instructions = input.ragInstructions || input.rag_instructions;
        if (input.knowledgeBaseIds !== undefined || input.knowledge_base_ids !== undefined)
            updateData.knowledge_base_ids = input.knowledgeBaseIds || input.knowledge_base_ids;
        if (input.memoryEnabled !== undefined || input.memory_enabled !== undefined)
            updateData.memory_enabled = input.memoryEnabled ?? input.memory_enabled;
        if (input.memoryConfig !== undefined || input.memory_config !== undefined)
            updateData.memory_config = input.memoryConfig || input.memory_config;
        if (input.status !== undefined) updateData.status = input.status;

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('assistants')
            .update(updateData)
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Assistant not found' });
        res.json(data);
    } catch (err) {
        console.error('PUT /api/assistants/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/assistants/:id ──────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        // Verify ownership first
        const { data: existing, error: fetchErr } = await supabase
            .from('assistants')
            .select('id')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ error: 'Assistant not found' });

        const { error } = await supabase
            .from('assistants')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('DELETE /api/assistants/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/assistants/:id/duplicate ─────────────────────────────────────
router.post('/:id/duplicate', requireAuth, async (req, res) => {
    try {
        // Fetch original
        const { data: original, error: fetchErr } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchErr || !original) return res.status(404).json({ error: 'Assistant not found' });

        // Build copy — strip id, timestamps, set new name
        const copy = { ...original };
        delete copy.id;
        delete copy.created_at;
        delete copy.updated_at;
        copy.name = `${original.name} (Copy)`;
        copy.status = 'draft';
        copy.user_id = req.user.id;

        const { data: newAssistant, error: insertErr } = await supabase
            .from('assistants')
            .insert(copy)
            .select()
            .single();

        if (insertErr) throw insertErr;
        res.status(201).json(newAssistant);
    } catch (err) {
        console.error('POST /api/assistants/:id/duplicate error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/assistants/preview-voice ─────────────────────────────────────
// Generates a short TTS preview using ElevenLabs
// Body: { text?, voice_id, provider?, model_id? }
router.post('/preview-voice', requireAuth, async (req, res) => {
    try {
        const { text, voice_id, voiceId, provider = 'elevenlabs', model_id } = req.body;
        const vid = voice_id || voiceId;
        if (!vid) return res.status(400).json({ error: 'voice_id is required' });

        const previewText = (text || 'Hello! This is a preview of my voice. How can I help you today?').slice(0, 200);

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'ElevenLabs API key not configured' });

        const modelId = model_id || 'eleven_turbo_v2_5';
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}`;

        const response = await axios.post(
            url,
            {
                text: previewText,
                model_id: modelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0,
                    use_speaker_boost: true,
                },
            },
            {
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                responseType: 'arraybuffer',
                timeout: 15000,
            }
        );

        const audioBase64 = Buffer.from(response.data).toString('base64');
        res.json({
            audio: `data:audio/mpeg;base64,${audioBase64}`,
            format: 'mp3',
        });
    } catch (err) {
        console.error('POST /api/assistants/preview-voice error:', err?.response?.data || err.message);
        // Return friendly error
        const status = err?.response?.status || 500;
        const msg = err?.response?.data
            ? Buffer.from(err.response.data).toString()
            : err.message;
        res.status(status).json({ error: msg || 'TTS preview failed' });
    }
});

module.exports = router;
