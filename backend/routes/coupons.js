// ============================================
// COUPON ROUTES - Coupon Management
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const crypto = require('crypto');

// ============================================
// COUPON MANAGEMENT ENDPOINTS
// ============================================

/**
 * Redeem a coupon code
 * POST /api/coupons/redeem
 */
router.post('/api/coupons/redeem', async (req, res) => {
    try {
        const { couponCode, userId } = req.body;

        if (!couponCode || !userId) {
            return res.status(400).json({ error: 'Coupon code and user ID are required' });
        }

        const { data, error } = await supabase.rpc('redeem_coupon', {
            p_user_id: userId,
            p_coupon_code: couponCode
        });

        if (error) {
            console.error('Coupon redemption error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!data.success) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);

    } catch (error) {
        console.error('Redeem coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Apply welcome bonus to new user
 * POST /api/coupons/welcome-bonus
 */
router.post('/api/coupons/welcome-bonus', async (req, res) => {
    try {
        const { userId, ipAddress, userAgent } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const { data, error } = await supabase.rpc('apply_welcome_bonus', {
            p_user_id: userId,
            p_ip_address: ipAddress || req.ip,
            p_user_agent: userAgent || req.get('User-Agent')
        });

        if (error) {
            console.error('Welcome bonus error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Apply welcome bonus error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create bulk promo coupons (Admin only)
 * POST /api/coupons/generate-bulk
 */
router.post('/api/coupons/generate-bulk', async (req, res) => {
    try {
        const { 
            creatorId,
            count = 10, 
            creditAmount = 500, 
            prefix = 'PROMO',
            validDays = 90,
            newUserOnly = false,
            maxUsesPerCoupon = 1,
            description = null
        } = req.body;

        if (!creatorId) {
            return res.status(400).json({ error: 'Creator ID is required' });
        }

        if (count > 100) {
            return res.status(400).json({ error: 'Maximum 100 coupons per batch' });
        }

        const { data, error } = await supabase.rpc('create_promo_coupons', {
            p_creator_id: creatorId,
            p_count: count,
            p_credit_amount: creditAmount,
            p_prefix: prefix,
            p_valid_days: validDays,
            p_new_user_only: newUserOnly,
            p_max_uses_per_coupon: maxUsesPerCoupon,
            p_description: description
        });

        if (error) {
            console.error('Bulk coupon generation error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Generate bulk coupons error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all coupons (Admin)
 * GET /api/coupons
 */
router.get('/api/coupons', async (req, res) => {
    try {
        const { type, active, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('coupons')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq('coupon_type', type);
        }

        if (active !== undefined) {
            query = query.eq('is_active', active === 'true');
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Get coupons error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ coupons: data, total: count });

    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get coupon usage statistics
 * GET /api/coupons/:couponId/stats
 */
router.get('/api/coupons/:couponId/stats', async (req, res) => {
    try {
        const { couponId } = req.params;

        // Get coupon details
        const { data: coupon, error: couponError } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', couponId)
            .single();

        if (couponError || !coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        // Get usage history
        const { data: usage, error: usageError } = await supabase
            .from('coupon_usage')
            .select('*, user_profiles(full_name, email)')
            .eq('coupon_id', couponId)
            .order('used_at', { ascending: false });

        if (usageError) {
            console.error('Get coupon usage error:', usageError);
        }

        // Calculate stats
        const totalRedemptions = usage?.length || 0;
        const totalCreditsGiven = usage?.reduce((sum, u) => sum + (u.discount_applied || 0), 0) || 0;

        res.json({
            coupon,
            stats: {
                totalRedemptions,
                totalCreditsGiven,
                remainingUses: coupon.max_uses ? coupon.max_uses - coupon.current_uses : 'Unlimited',
                isActive: coupon.is_active && new Date(coupon.valid_until) > new Date()
            },
            recentUsage: usage?.slice(0, 20) || []
        });

    } catch (error) {
        console.error('Get coupon stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create single coupon (Admin)
 * POST /api/coupons/create
 */
router.post('/api/coupons/create', async (req, res) => {
    try {
        const {
            code,
            couponType = 'promo',
            creditAmount = 0,
            discountPercent = 0,
            discountAmount = 0,
            maxDiscount = null,
            minPurchase = null,
            maxUses = null,
            validDays = 90,
            newUserOnly = false,
            autoApplyOnSignup = false,
            description = null,
            creatorId
        } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Coupon code is required' });
        }

        const { data, error } = await supabase
            .from('coupons')
            .insert({
                code: code.toUpperCase(),
                coupon_type: couponType,
                credit_amount: creditAmount,
                discount_percent: discountPercent,
                discount_amount: discountAmount,
                max_discount: maxDiscount,
                min_purchase: minPurchase,
                max_uses: maxUses,
                valid_until: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
                new_user_only: newUserOnly,
                auto_apply_on_signup: autoApplyOnSignup,
                description,
                created_by: creatorId,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Coupon code already exists' });
            }
            console.error('Create coupon error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update coupon status (Admin)
 * PATCH /api/coupons/:couponId
 */
router.patch('/api/coupons/:couponId', async (req, res) => {
    try {
        const { couponId } = req.params;
        const { isActive, maxUses, validUntil, description } = req.body;

        const updates = {};
        if (isActive !== undefined) updates.is_active = isActive;
        if (maxUses !== undefined) updates.max_uses = maxUses;
        if (validUntil !== undefined) updates.valid_until = validUntil;
        if (description !== undefined) updates.description = description;

        const { data, error } = await supabase
            .from('coupons')
            .update(updates)
            .eq('id', couponId)
            .select()
            .single();

        if (error) {
            console.error('Update coupon error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete coupon (Admin)
 * DELETE /api/coupons/:couponId
 */
router.delete('/api/coupons/:couponId', async (req, res) => {
    try {
        const { couponId } = req.params;

        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', couponId);

        if (error) {
            console.error('Delete coupon error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, message: 'Coupon deleted' });

    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get welcome bonus status for a user
 * GET /api/coupons/welcome-bonus/:userId
 */
router.get('/api/coupons/welcome-bonus/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from('welcome_bonus_claims')
            .select('*, coupons(code, description)')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Get welcome bonus status error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!data) {
            // Check if there's an available bonus
            const { data: availableBonus } = await supabase
                .from('coupons')
                .select('code, credit_amount, description')
                .eq('coupon_type', 'signup_bonus')
                .eq('auto_apply_on_signup', true)
                .eq('is_active', true)
                .gt('valid_until', new Date().toISOString())
                .single();

            return res.json({
                claimed: false,
                availableBonus: availableBonus || null
            });
        }

        res.json({
            claimed: true,
            claimDetails: data
        });

    } catch (error) {
        console.error('Get welcome bonus status error:', error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
