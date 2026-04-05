// ============================================
// SCRIPT TEMPLATES ROUTES
// Handles: user-saved custom script templates CRUD + apply to assistant
// ============================================
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

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

// ─── GET /api/script-templates ───────────────────────────────────────────────
// List all saved templates for the authenticated user
router.get('/', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('script_templates')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ templates: data || [] });
    } catch (err) {
        console.error('GET /api/script-templates error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/script-templates/:id ───────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('script_templates')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Template not found' });
        res.json(data);
    } catch (err) {
        console.error('GET /api/script-templates/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/script-templates ──────────────────────────────────────────────
// Create a new template (from scratch or by saving a system template)
router.post('/', requireAuth, async (req, res) => {
    try {
        const {
            name,
            description,
            system_prompt,
            first_message,
            industry,
            category,
            direction,
            tags,
            variables,
            qualification_questions,
            objection_handlers,
            estimated_call_duration,
            source_template_id,
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Template name is required' });
        }
        if (!system_prompt || !system_prompt.trim()) {
            return res.status(400).json({ error: 'System prompt is required' });
        }

        const { data, error } = await supabase
            .from('script_templates')
            .insert({
                user_id: req.user.id,
                name: name.trim(),
                description: description || null,
                system_prompt: system_prompt.trim(),
                first_message: first_message || null,
                industry: industry || 'real_estate',
                category: category || 'custom',
                direction: direction || 'outbound',
                tags: tags || [],
                variables: variables || [],
                qualification_questions: qualification_questions || [],
                objection_handlers: objection_handlers || [],
                estimated_call_duration: estimated_call_duration || null,
                source_template_id: source_template_id || null,
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('POST /api/script-templates error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/script-templates/:id ───────────────────────────────────────────
// Update an existing template
router.put('/:id', requireAuth, async (req, res) => {
    try {
        // Verify ownership
        const { data: existing, error: fetchErr } = await supabase
            .from('script_templates')
            .select('id')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ error: 'Template not found' });

        const allowedFields = [
            'name', 'description', 'system_prompt', 'first_message',
            'industry', 'category', 'direction', 'tags', 'variables',
            'qualification_questions', 'objection_handlers', 'estimated_call_duration',
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('script_templates')
            .update(updates)
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('PUT /api/script-templates/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/script-templates/:id ────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('script_templates')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/script-templates/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/script-templates/:id/duplicate ────────────────────────────────
// Duplicate a saved template
router.post('/:id/duplicate', requireAuth, async (req, res) => {
    try {
        const { data: original, error: fetchErr } = await supabase
            .from('script_templates')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchErr || !original) return res.status(404).json({ error: 'Template not found' });

        const { id, created_at, updated_at, ...rest } = original;
        const { data, error } = await supabase
            .from('script_templates')
            .insert({ ...rest, name: `${rest.name} (Copy)`, source_template_id: id })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('POST /api/script-templates/:id/duplicate error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/script-templates/:id/apply ────────────────────────────────────
// Apply a saved template's system prompt to an existing assistant
router.post('/:id/apply', requireAuth, async (req, res) => {
    try {
        const { assistant_id } = req.body;
        if (!assistant_id) return res.status(400).json({ error: 'assistant_id is required' });

        // Fetch template (user must own it)
        const { data: template, error: tErr } = await supabase
            .from('script_templates')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (tErr || !template) return res.status(404).json({ error: 'Template not found' });

        // Verify assistant ownership
        const { data: assistant, error: aErr } = await supabase
            .from('assistants')
            .select('id')
            .eq('id', assistant_id)
            .eq('user_id', req.user.id)
            .single();

        if (aErr || !assistant) return res.status(404).json({ error: 'Assistant not found' });

        // Apply template system prompt to assistant
        const updates = {
            instruction: template.system_prompt,
            updated_at: new Date().toISOString(),
        };
        if (template.first_message) updates.first_message = template.first_message;
        if (template.variables && template.variables.length > 0) {
            updates.dynamic_variables = template.variables;
        }

        const { data: updated, error: uErr } = await supabase
            .from('assistants')
            .update(updates)
            .eq('id', assistant_id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (uErr) throw uErr;
        res.json({ success: true, assistant: updated });
    } catch (err) {
        console.error('POST /api/script-templates/:id/apply error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
