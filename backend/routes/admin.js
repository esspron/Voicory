// ============================================
// ADMIN ROUTES - Protected by Passkey
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');

// =====================================
// ADMIN ENDPOINTS (Protected by passkey)
// =====================================

const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || 'voicory2024admin';

/**
 * Middleware to verify admin passkey
 */
const verifyAdminPasskey = (req, res, next) => {
    const passkey = req.headers['x-admin-passkey'];
    if (!passkey || passkey !== ADMIN_PASSKEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid admin passkey' });
    }
    next();
};

/**
 * Admin: Adjust user credits
 * POST /api/admin/adjust-credits
 */
router.post('/api/admin/adjust-credits', verifyAdminPasskey, async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;

        if (!userId || amount === undefined || !reason) {
            return res.status(400).json({ error: 'userId, amount, and reason are required' });
        }

        // Get current balance
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('credits_balance, organization_email')
            .eq('user_id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = Number(profile.credits_balance) || 0;
        const balanceAfter = balanceBefore + Number(amount);

        // Update balance
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ credits_balance: balanceAfter })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Admin credit adjustment failed:', updateError);
            return res.status(400).json({ error: updateError.message });
        }

        // Log transaction
        const { error: transactionError } = await supabase
            .from('credit_transactions')
            .insert({
                user_id: userId,
                transaction_type: amount >= 0 ? 'bonus' : 'usage',
                amount: amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                description: `Admin adjustment: ${reason}`,
                reference_type: 'admin_adjustment',
            });

        if (transactionError) {
            console.error('Failed to log admin transaction:', transactionError);
        }

        console.log(`Admin credit adjustment: User ${profile.organization_email}, Amount: ${amount}, Reason: ${reason}`);

        res.json({
            success: true,
            message: `Credits adjusted by ₹${amount}`,
            newBalance: balanceAfter,
        });

    } catch (error) {
        console.error('Admin adjust credits error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Admin: Suspend/Unsuspend user
 * POST /api/admin/user/:userId/status
 */
router.post('/api/admin/user/:userId/status', verifyAdminPasskey, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;

        if (!status || !['active', 'suspended', 'banned'].includes(status)) {
            return res.status(400).json({ error: 'Valid status (active, suspended, banned) is required' });
        }

        const { error } = await supabase
            .from('user_profiles')
            .update({ 
                account_status: status,
                status_reason: reason,
                status_updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) {
            console.error('Admin user status update failed:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log(`Admin updated user ${userId} status to ${status}. Reason: ${reason}`);

        res.json({
            success: true,
            message: `User status updated to ${status}`,
        });

    } catch (error) {
        console.error('Admin user status error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Admin: Get system stats
 * GET /api/admin/stats
 */
router.get('/api/admin/stats', verifyAdminPasskey, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const [
            { count: totalUsers },
            { count: newUsersToday },
            { data: transactions },
            { count: totalAssistants },
            { count: totalPhoneNumbers },
        ] = await Promise.all([
            supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
            supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
            supabase.from('credit_transactions').select('amount').eq('transaction_type', 'purchase'),
            supabase.from('assistants').select('*', { count: 'exact', head: true }),
            supabase.from('phone_numbers').select('*', { count: 'exact', head: true }),
        ]);

        const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        res.json({
            totalUsers: totalUsers || 0,
            newUsersToday: newUsersToday || 0,
            totalRevenue,
            totalAssistants: totalAssistants || 0,
            totalPhoneNumbers: totalPhoneNumbers || 0,
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
