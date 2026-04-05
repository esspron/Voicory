// ============================================
// SETTINGS ROUTES — Org Profile + Logo Upload
// SECURITY: All routes require authentication
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase, supabaseUrl } = require('../config');
const { verifySupabaseAuth } = require('../lib/auth');

// Multer: memory storage, accept images up to 5MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpg, png, gif, webp, svg)'));
        }
    }
});

// ─── GET /api/settings/org ─────────────────────────────────────────────────
// Returns the current user's org profile from user_profiles
router.get('/org', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Profile not found' });
            }
            throw error;
        }

        return res.json({
            id: data.id,
            userId: data.user_id,
            organizationName: data.organization_name || '',
            organizationEmail: data.organization_email || '',
            logoUrl: data.logo_url || null,
            walletId: data.wallet_id,
            channel: data.channel || 'daily',
            callConcurrencyLimit: data.call_concurrency_limit || 10,
            hipaaEnabled: data.hipaa_enabled || false,
            creditsBalance: Number(data.credits_balance) || 0,
            planType: data.plan_type || 'PAYG',
            country: data.country || 'US',
            currency: data.currency || 'USD',
            currencySymbol: data.currency_symbol || '$',
            createdAt: data.created_at,
            updatedAt: data.updated_at
        });
    } catch (err) {
        console.error('[settings/org GET] error:', err);
        return res.status(500).json({ error: 'Failed to fetch org profile' });
    }
});

// ─── PUT /api/settings/org ─────────────────────────────────────────────────
// Update org profile fields
router.put('/org', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { organizationName, organizationEmail, channel, callConcurrencyLimit, country } = req.body;

        const updateData = {};
        if (organizationName !== undefined) updateData.organization_name = String(organizationName).trim();
        if (organizationEmail !== undefined) updateData.organization_email = String(organizationEmail).trim();
        if (channel !== undefined) updateData.channel = channel;
        if (callConcurrencyLimit !== undefined) updateData.call_concurrency_limit = parseInt(callConcurrencyLimit) || 10;
        if (country !== undefined) updateData.country = country;

        const { error } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', userId);

        if (error) throw error;

        return res.json({ success: true });
    } catch (err) {
        console.error('[settings/org PUT] error:', err);
        return res.status(500).json({ error: 'Failed to update org profile' });
    }
});

// ─── POST /api/settings/org/logo ───────────────────────────────────────────
// Upload company logo to Supabase Storage bucket 'logos', return public URL
router.post('/org/logo', verifySupabaseAuth, upload.single('logo'), async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const ext = file.originalname.split('.').pop() || 'png';
        const storagePath = `${userId}/logo_${Date.now()}.${ext}`;

        // Upload to Supabase Storage bucket 'logos'
        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(storagePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('logos')
            .getPublicUrl(storagePath);

        const logoUrl = publicUrlData.publicUrl;

        // Save logo_url back to user_profiles
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ logo_url: logoUrl })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        return res.json({ success: true, logoUrl });
    } catch (err) {
        console.error('[settings/org/logo POST] error:', err);
        return res.status(500).json({ error: 'Logo upload failed: ' + err.message });
    }
});

module.exports = router;
