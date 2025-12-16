// ============================================
// PADDLE PAYMENT ROUTES - Hybrid Billing
// Supports BOTH prepaid credits AND monthly post-paid usage billing
// Paddle handles tax compliance, merchant of record
// SECURITY: User-initiated routes require authentication
// Webhook routes use signature verification
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const crypto = require('crypto');
const { verifySupabaseAuth } = require('../lib/auth');

// ============================================
// BILLING CONFIGURATION
// ============================================

// Prepaid Credits Config
const DYNAMIC_PRICE_ID = process.env.PADDLE_PRICE_ID || ''; // Single $1 price, use quantity
const MIN_AMOUNT = 20;  // Minimum $20
const MAX_AMOUNT = 10000; // Maximum $10,000

// Post-paid Subscription Config
const SUBSCRIPTION_PRICE_ID = process.env.PADDLE_SUBSCRIPTION_PRICE_ID || ''; // Monthly subscription price (can be $0)
const USAGE_PRICE_ID = process.env.PADDLE_USAGE_PRICE_ID || DYNAMIC_PRICE_ID; // Price for one-time usage charges

// Paddle API Base URL
const PADDLE_API_URL = process.env.PADDLE_ENVIRONMENT === 'production' 
    ? 'https://api.paddle.com' 
    : 'https://sandbox-api.paddle.com';

// Paddle configuration check
const isPaddleConfigured = () => {
    return !!(
        process.env.PADDLE_API_KEY && 
        process.env.PADDLE_CLIENT_TOKEN &&
        process.env.PADDLE_PRICE_ID
    );
};

// Check if subscriptions are enabled (requires subscription price)
const isSubscriptionEnabled = () => {
    return isPaddleConfigured() && !!SUBSCRIPTION_PRICE_ID;
};

if (isPaddleConfigured()) {
    console.log('✅ Paddle initialized');
    if (isSubscriptionEnabled()) {
        console.log('✅ Paddle subscriptions enabled');
    }
} else {
    console.warn('⚠️ Paddle credentials not set - Paddle payments disabled');
}

// ============================================
// HELPER: Make Paddle API Request
// ============================================
const paddleApiRequest = async (endpoint, method = 'GET', body = null) => {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${PADDLE_API_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
        console.error('Paddle API error:', data);
        throw new Error(data.error?.detail || 'Paddle API request failed');
    }
    
    return data;
};

// ============================================
// HELPER: Verify Paddle Webhook Signature
// ============================================
const verifyPaddleWebhookSignature = (rawBody, signature, webhookSecret) => {
    if (!webhookSecret) return true; // Skip verification if no secret set
    
    try {
        // Paddle uses ts;h1=signature format
        const parts = signature.split(';');
        const tsValue = parts.find(p => p.startsWith('ts='));
        const h1Value = parts.find(p => p.startsWith('h1='));
        
        if (!tsValue || !h1Value) {
            console.error('Invalid Paddle signature format');
            return false;
        }
        
        const timestamp = tsValue.replace('ts=', '');
        const providedSignature = h1Value.replace('h1=', '');
        
        // Create the signed payload
        const signedPayload = `${timestamp}:${rawBody}`;
        
        // Calculate expected signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(signedPayload)
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(providedSignature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('Paddle signature verification error:', error);
        return false;
    }
};

// ============================================
// GET /api/paddle/packages
// Returns dynamic pricing configuration
// ============================================
router.get('/packages', (req, res) => {
    res.json({
        success: true,
        pricingModel: 'hybrid', // Both prepaid and post-paid
        billingModes: {
            prepaid: {
                enabled: true,
                pricePerCredit: 1, // $1 = 1 credit
                minAmount: MIN_AMOUNT,
                maxAmount: MAX_AMOUNT,
                description: 'Buy credits upfront, use as you go'
            },
            postpaid: {
                enabled: isSubscriptionEnabled(),
                description: 'Pay monthly based on actual usage',
                billingCycle: 'monthly'
            }
        },
        currency: 'USD',
        paddlePriceId: DYNAMIC_PRICE_ID,
        paddleConfigured: isPaddleConfigured()
    });
});

// ============================================
// GET /api/paddle/config
// Returns Paddle client configuration (safe to expose)
// ============================================
router.get('/config', (req, res) => {
    res.json({
        clientToken: process.env.PADDLE_CLIENT_TOKEN || '',
        environment: process.env.PADDLE_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
        configured: isPaddleConfigured(),
        subscriptionsEnabled: isSubscriptionEnabled()
    });
});

// ============================================
// GET /api/paddle/billing-status
// Get user's current billing mode and status
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.get('/billing-status', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // Get user profile with billing info
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('billing_mode, paddle_customer_id, paddle_subscription_id, credits_balance')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // Get subscription details if in postpaid mode
        let subscription = null;
        if (profile.paddle_subscription_id) {
            const { data: sub } = await supabase
                .from('paddle_subscriptions')
                .select('*')
                .eq('paddle_subscription_id', profile.paddle_subscription_id)
                .single();
            subscription = sub;
        }

        // Get current month's usage
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { data: currentUsage } = await supabase
            .from('monthly_usage_summary')
            .select('*')
            .eq('user_id', userId)
            .eq('billing_period_start', periodStart.toISOString().split('T')[0])
            .single();

        res.json({
            success: true,
            billingMode: profile.billing_mode || 'prepaid',
            creditsBalance: parseFloat(profile.credits_balance) || 0,
            paddleCustomerId: profile.paddle_customer_id,
            subscription: subscription ? {
                id: subscription.paddle_subscription_id,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end,
                nextBilledAt: subscription.next_billed_at
            } : null,
            currentUsage: currentUsage ? {
                periodStart: currentUsage.billing_period_start,
                periodEnd: currentUsage.billing_period_end,
                totalCost: parseFloat(currentUsage.total_cost_usd) || 0,
                breakdown: {
                    llm: parseFloat(currentUsage.total_llm_cost_usd) || 0,
                    tts: parseFloat(currentUsage.total_tts_cost_usd) || 0,
                    stt: parseFloat(currentUsage.total_stt_cost_usd) || 0,
                    calls: parseFloat(currentUsage.total_call_cost_usd) || 0
                }
            } : {
                periodStart: periodStart.toISOString().split('T')[0],
                periodEnd: periodEnd.toISOString().split('T')[0],
                totalCost: 0,
                breakdown: { llm: 0, tts: 0, stt: 0, calls: 0 }
            }
        });

    } catch (error) {
        console.error('Get billing status error:', error);
        res.status(500).json({ error: error.message || 'Failed to get billing status' });
    }
});

// ============================================
// POST /api/paddle/switch-billing-mode
// Switch between prepaid and postpaid billing
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/switch-billing-mode', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { mode } = req.body;

        if (!['prepaid', 'postpaid'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid billing mode' });
        }

        if (mode === 'postpaid' && !isSubscriptionEnabled()) {
            return res.status(400).json({ error: 'Post-paid billing is not available' });
        }

        // Update user profile
        const { error } = await supabase
            .from('user_profiles')
            .update({ billing_mode: mode, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            billingMode: mode,
            message: mode === 'postpaid' 
                ? 'Switched to monthly post-paid billing. You will be charged at the end of each month.'
                : 'Switched to prepaid credits. Buy credits to use services.'
        });

    } catch (error) {
        console.error('Switch billing mode error:', error);
        res.status(500).json({ error: error.message || 'Failed to switch billing mode' });
    }
});

// ============================================
// POST /api/paddle/create-transaction
// Creates a Paddle transaction for one-time purchase
// DYNAMIC PRICING: User specifies amount, we use quantity
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/create-transaction', verifySupabaseAuth, async (req, res) => {
    try {
        if (!isPaddleConfigured()) {
            return res.status(503).json({ 
                error: 'Payment system not configured. Please contact support.',
                details: 'Missing Paddle credentials'
            });
        }

        const userId = req.userId;
        const { amount: requestedAmount } = req.body;

        // Validate amount
        const amount = parseFloat(requestedAmount);
        if (isNaN(amount) || !Number.isInteger(amount)) {
            return res.status(400).json({ error: 'Amount must be a whole number' });
        }
        if (amount < MIN_AMOUNT) {
            return res.status(400).json({ error: `Minimum amount is $${MIN_AMOUNT}` });
        }
        if (amount > MAX_AMOUNT) {
            return res.status(400).json({ error: `Maximum amount is $${MAX_AMOUNT}. Contact sales for larger amounts.` });
        }

        // $1 = 1 credit
        const credits = amount;
        const quantity = amount; // Quantity = amount (since price is $1)

        // Get user email for Paddle
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !userData?.user?.email) {
            return res.status(400).json({ error: 'User email not found' });
        }

        // Create pending transaction record
        const { data: transaction, error: txError } = await supabase
            .from('payment_transactions')
            .insert({
                user_id: userId,
                provider: 'paddle',
                amount: amount,
                currency: 'USD',
                credits: credits,
                status: 'pending',
                metadata: { 
                    quantity,
                    priceId: DYNAMIC_PRICE_ID
                }
            })
            .select()
            .single();

        if (txError) {
            console.error('Failed to create transaction record:', txError);
            return res.status(500).json({ error: 'Failed to create transaction' });
        }

        console.log('Created pending Paddle transaction:', transaction.id, 'Amount:', amount, 'Credits:', credits);

        // Return data needed for Paddle.js checkout with quantity-based pricing
        res.json({
            success: true,
            transactionId: transaction.id,
            priceId: DYNAMIC_PRICE_ID,
            quantity: quantity, // This is the key - quantity determines total price
            credits: credits,
            customData: {
                userId,
                transactionId: transaction.id,
                credits
            },
            customer: {
                email: userData.user.email
            }
        });

    } catch (error) {
        console.error('Paddle create transaction error:', error);
        res.status(500).json({ error: error.message || 'Failed to create transaction' });
    }
});

// ============================================
// POST /api/paddle/create-subscription
// Creates a Paddle subscription for monthly post-paid billing
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/create-subscription', verifySupabaseAuth, async (req, res) => {
    try {
        if (!isSubscriptionEnabled()) {
            return res.status(503).json({ 
                error: 'Subscription billing not available. Please use prepaid credits.'
            });
        }

        const userId = req.userId;

        // Get user email and check for existing subscription
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !userData?.user?.email) {
            return res.status(400).json({ error: 'User email not found' });
        }

        // Check if user already has an active subscription
        const { data: existingSub } = await supabase
            .from('paddle_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing'])
            .single();

        if (existingSub) {
            return res.status(400).json({ 
                error: 'You already have an active subscription',
                subscriptionId: existingSub.paddle_subscription_id
            });
        }

        // Return data for Paddle.js to open subscription checkout
        res.json({
            success: true,
            priceId: SUBSCRIPTION_PRICE_ID,
            customData: {
                userId,
                billingMode: 'postpaid'
            },
            customer: {
                email: userData.user.email
            }
        });

    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ error: error.message || 'Failed to create subscription' });
    }
});

// ============================================
// GET /api/paddle/usage-summary
// Get usage summary for current billing period
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.get('/usage-summary', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { period } = req.query; // Optional: 'current' or 'YYYY-MM'

        let periodStart, periodEnd;
        
        if (period && period !== 'current' && /^\d{4}-\d{2}$/.test(period)) {
            const [year, month] = period.split('-').map(Number);
            periodStart = new Date(year, month - 1, 1);
            periodEnd = new Date(year, month, 0);
        } else {
            // Current month
            const now = new Date();
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        // Get or create usage summary
        const { data: summaryId, error: summaryError } = await supabase.rpc(
            'get_or_create_monthly_usage_summary',
            {
                p_user_id: userId,
                p_period_start: periodStart.toISOString().split('T')[0],
                p_period_end: periodEnd.toISOString().split('T')[0]
            }
        );

        if (summaryError) {
            throw summaryError;
        }

        // Get the summary
        const { data: summary, error: fetchError } = await supabase
            .from('monthly_usage_summary')
            .select('*')
            .eq('id', summaryId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        // Get detailed usage logs for the period
        const { data: usageLogs } = await supabase
            .from('usage_logs')
            .select('usage_type, provider, model, cost_usd, created_at')
            .eq('user_id', userId)
            .gte('created_at', periodStart.toISOString())
            .lt('created_at', new Date(periodEnd.getTime() + 86400000).toISOString())
            .order('created_at', { ascending: false })
            .limit(100);

        res.json({
            success: true,
            summary: {
                periodStart: summary.billing_period_start,
                periodEnd: summary.billing_period_end,
                status: summary.billing_status,
                totals: {
                    llm: {
                        tokens: summary.total_llm_tokens,
                        cost: parseFloat(summary.total_llm_cost_usd) || 0
                    },
                    tts: {
                        seconds: summary.total_tts_seconds,
                        cost: parseFloat(summary.total_tts_cost_usd) || 0
                    },
                    stt: {
                        seconds: summary.total_stt_seconds,
                        cost: parseFloat(summary.total_stt_cost_usd) || 0
                    },
                    calls: {
                        minutes: summary.total_call_minutes,
                        cost: parseFloat(summary.total_call_cost_usd) || 0
                    },
                    total: parseFloat(summary.total_cost_usd) || 0
                },
                billedAt: summary.billed_at,
                paidAt: summary.paid_at
            },
            recentUsage: usageLogs || []
        });

    } catch (error) {
        console.error('Get usage summary error:', error);
        res.status(500).json({ error: error.message || 'Failed to get usage summary' });
    }
});

// ============================================
// POST /api/paddle/bill-usage (Internal/Cron)
// Bills accumulated usage for post-paid users
// Called by cron job at end of billing period
// ============================================
router.post('/bill-usage', async (req, res) => {
    try {
        // Verify this is an authorized internal request (use secret key)
        const authKey = req.headers['x-internal-key'];
        if (authKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!isPaddleConfigured()) {
            return res.status(503).json({ error: 'Paddle not configured' });
        }

        const { userId, periodStart, periodEnd } = req.body;

        // Get all users with postpaid billing mode and active subscriptions
        let usersQuery = supabase
            .from('user_profiles')
            .select('user_id, paddle_subscription_id')
            .eq('billing_mode', 'postpaid')
            .not('paddle_subscription_id', 'is', null);

        // If specific user requested, filter to just them
        if (userId) {
            usersQuery = usersQuery.eq('user_id', userId);
        }

        const { data: users, error: usersError } = await usersQuery;
        if (usersError) throw usersError;

        const results = [];
        const billingPeriodStart = periodStart || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
        const billingPeriodEnd = periodEnd || new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

        for (const user of users || []) {
            try {
                // Get usage summary for the period
                const { data: summary } = await supabase
                    .from('monthly_usage_summary')
                    .select('*')
                    .eq('user_id', user.user_id)
                    .eq('billing_period_start', billingPeriodStart)
                    .single();

                if (!summary || summary.billing_status !== 'pending' || parseFloat(summary.total_cost_usd) <= 0) {
                    results.push({ userId: user.user_id, status: 'skipped', reason: 'No pending charges' });
                    continue;
                }

                // Get subscription
                const { data: subscription } = await supabase
                    .from('paddle_subscriptions')
                    .select('*')
                    .eq('paddle_subscription_id', user.paddle_subscription_id)
                    .eq('status', 'active')
                    .single();

                if (!subscription) {
                    results.push({ userId: user.user_id, status: 'skipped', reason: 'No active subscription' });
                    continue;
                }

                // Create one-time charge on the subscription
                const chargeAmount = Math.ceil(parseFloat(summary.total_cost_usd) * 100) / 100; // Round up to cents
                const quantity = Math.ceil(chargeAmount); // Use quantity for $1 price

                const chargeResponse = await paddleApiRequest(
                    `/subscriptions/${subscription.paddle_subscription_id}/charge`,
                    'POST',
                    {
                        effective_from: 'immediately',
                        items: [{
                            price_id: USAGE_PRICE_ID,
                            quantity: quantity
                        }],
                        on_payment_failure: 'apply_change' // Still apply the charge, will be retried
                    }
                );

                // Update the usage summary
                await supabase
                    .from('monthly_usage_summary')
                    .update({
                        billing_status: 'billed',
                        billed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', summary.id);

                results.push({
                    userId: user.user_id,
                    status: 'billed',
                    amount: chargeAmount,
                    subscriptionId: subscription.paddle_subscription_id
                });

                console.log(`Billed $${chargeAmount} to user ${user.user_id} via subscription ${subscription.paddle_subscription_id}`);

            } catch (error) {
                console.error(`Failed to bill user ${user.user_id}:`, error);
                results.push({
                    userId: user.user_id,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            billingPeriod: { start: billingPeriodStart, end: billingPeriodEnd },
            results
        });

    } catch (error) {
        console.error('Bill usage error:', error);
        res.status(500).json({ error: error.message || 'Failed to bill usage' });
    }
});

// ============================================
// GET /api/paddle/transactions
// Get user's transaction history
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.get('/transactions', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 20, offset = 0 } = req.query;

        // Get from both payment_transactions (legacy) and paddle_transactions
        const [legacyResult, paddleResult] = await Promise.all([
            supabase
                .from('payment_transactions')
                .select('*')
                .eq('user_id', userId)
                .eq('provider', 'paddle')
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1),
            supabase
                .from('paddle_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
        ]);

        // Combine and format
        const transactions = [
            ...(legacyResult.data || []).map(tx => ({
                id: tx.id,
                paddleId: tx.provider_transaction_id,
                type: 'prepaid',
                amount: parseFloat(tx.amount),
                credits: tx.credits,
                status: tx.status,
                createdAt: tx.created_at
            })),
            ...(paddleResult.data || []).map(tx => ({
                id: tx.id,
                paddleId: tx.paddle_transaction_id,
                type: tx.transaction_type,
                amount: parseFloat(tx.grand_total || tx.total || 0),
                credits: parseFloat(tx.credits_amount) || 0,
                status: tx.status,
                createdAt: tx.created_at
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            transactions: transactions.slice(0, parseInt(limit)),
            hasMore: transactions.length > parseInt(limit)
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: error.message || 'Failed to get transactions' });
    }
});

// ============================================
// POST /api/paddle/webhook
// Handles Paddle webhook events
// ============================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['paddle-signature'];
        const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
        const rawBody = req.body.toString();

        // Verify signature
        if (webhookSecret && !verifyPaddleWebhookSignature(rawBody, signature, webhookSecret)) {
            console.error('Paddle webhook signature verification failed');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(rawBody);
        console.log('Paddle webhook received:', event.event_type);

        switch (event.event_type) {
            case 'transaction.completed': {
                const transaction = event.data;
                const customData = transaction.custom_data || {};
                
                console.log('Paddle transaction completed:', transaction.id);
                
                const userId = customData.userId;
                const credits = parseInt(customData.credits) || 0;
                const internalTxId = customData.transactionId;

                if (!userId || !credits) {
                    console.error('Missing userId or credits in Paddle webhook');
                    break;
                }

                // Check if already processed
                const { data: existingTx } = await supabase
                    .from('payment_transactions')
                    .select('status')
                    .eq('id', internalTxId)
                    .single();

                if (existingTx?.status === 'completed') {
                    console.log('Transaction already processed:', internalTxId);
                    break;
                }

                // Add credits to user
                const { error: creditError } = await supabase.rpc('add_credits', {
                    p_user_id: userId,
                    p_amount: credits,
                    p_transaction_type: 'purchase',
                    p_reference_id: transaction.id,
                    p_description: `Credit purchase via Paddle - ${credits} credits`
                });

                if (creditError) {
                    console.error('Failed to add credits:', creditError);
                    break;
                }

                // Update transaction status
                await supabase
                    .from('payment_transactions')
                    .update({ 
                        status: 'completed',
                        provider_transaction_id: transaction.id,
                        metadata: {
                            paddleTransactionId: transaction.id,
                            paddleInvoiceId: transaction.invoice_id,
                            paddleCustomerId: transaction.customer_id
                        }
                    })
                    .eq('id', internalTxId);

                console.log('Credits added successfully:', credits, 'to user:', userId);
                break;
            }

            case 'transaction.payment_failed': {
                const transaction = event.data;
                const customData = transaction.custom_data || {};
                const internalTxId = customData.transactionId;

                console.log('Paddle payment failed:', transaction.id);

                if (internalTxId) {
                    await supabase
                        .from('payment_transactions')
                        .update({ 
                            status: 'failed',
                            metadata: { 
                                error: 'Payment failed',
                                paddleTransactionId: transaction.id
                            }
                        })
                        .eq('id', internalTxId);
                }
                break;
            }

            case 'transaction.canceled': {
                const transaction = event.data;
                const customData = transaction.custom_data || {};
                const internalTxId = customData.transactionId;

                console.log('Paddle transaction canceled:', transaction.id);

                if (internalTxId) {
                    await supabase
                        .from('payment_transactions')
                        .update({ 
                            status: 'cancelled',
                            metadata: { paddleTransactionId: transaction.id }
                        })
                        .eq('id', internalTxId);
                }
                break;
            }

            // ============================================
            // SUBSCRIPTION EVENTS
            // ============================================
            case 'subscription.created': {
                const subscription = event.data;
                const customData = subscription.custom_data || {};
                const userId = customData.userId;

                console.log('Paddle subscription created:', subscription.id);

                if (!userId) {
                    console.error('No userId in subscription custom_data');
                    break;
                }

                // Create or update paddle_customer
                await supabase
                    .from('paddle_customers')
                    .upsert({
                        user_id: userId,
                        paddle_customer_id: subscription.customer_id,
                        email: customData.email,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                // Create subscription record
                await supabase
                    .from('paddle_subscriptions')
                    .upsert({
                        user_id: userId,
                        paddle_subscription_id: subscription.id,
                        paddle_customer_id: subscription.customer_id,
                        status: subscription.status,
                        billing_mode: 'postpaid',
                        current_period_start: subscription.current_billing_period?.starts_at,
                        current_period_end: subscription.current_billing_period?.ends_at,
                        next_billed_at: subscription.next_billed_at,
                        currency_code: subscription.currency_code,
                        collection_mode: subscription.collection_mode,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'paddle_subscription_id' });

                // Update user profile
                await supabase
                    .from('user_profiles')
                    .update({
                        billing_mode: 'postpaid',
                        paddle_customer_id: subscription.customer_id,
                        paddle_subscription_id: subscription.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                console.log('Subscription created for user:', userId);
                break;
            }

            case 'subscription.activated':
            case 'subscription.updated': {
                const subscription = event.data;

                console.log('Paddle subscription updated:', subscription.id);

                // Find user by subscription ID
                const { data: existingSub } = await supabase
                    .from('paddle_subscriptions')
                    .select('user_id')
                    .eq('paddle_subscription_id', subscription.id)
                    .single();

                if (!existingSub) {
                    console.error('Subscription not found:', subscription.id);
                    break;
                }

                // Update subscription
                await supabase
                    .from('paddle_subscriptions')
                    .update({
                        status: subscription.status,
                        current_period_start: subscription.current_billing_period?.starts_at,
                        current_period_end: subscription.current_billing_period?.ends_at,
                        next_billed_at: subscription.next_billed_at,
                        canceled_at: subscription.canceled_at,
                        paused_at: subscription.paused_at,
                        updated_at: new Date().toISOString()
                    })
                    .eq('paddle_subscription_id', subscription.id);

                break;
            }

            case 'subscription.canceled': {
                const subscription = event.data;

                console.log('Paddle subscription canceled:', subscription.id);

                await supabase
                    .from('paddle_subscriptions')
                    .update({
                        status: 'canceled',
                        canceled_at: subscription.canceled_at || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('paddle_subscription_id', subscription.id);

                // Update user profile billing mode back to prepaid
                const { data: sub } = await supabase
                    .from('paddle_subscriptions')
                    .select('user_id')
                    .eq('paddle_subscription_id', subscription.id)
                    .single();

                if (sub) {
                    await supabase
                        .from('user_profiles')
                        .update({
                            billing_mode: 'prepaid',
                            paddle_subscription_id: null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', sub.user_id);
                }

                break;
            }

            case 'subscription.paused': {
                const subscription = event.data;

                console.log('Paddle subscription paused:', subscription.id);

                await supabase
                    .from('paddle_subscriptions')
                    .update({
                        status: 'paused',
                        paused_at: subscription.paused_at || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('paddle_subscription_id', subscription.id);

                break;
            }

            case 'subscription.resumed': {
                const subscription = event.data;

                console.log('Paddle subscription resumed:', subscription.id);

                await supabase
                    .from('paddle_subscriptions')
                    .update({
                        status: 'active',
                        paused_at: null,
                        current_period_start: subscription.current_billing_period?.starts_at,
                        current_period_end: subscription.current_billing_period?.ends_at,
                        next_billed_at: subscription.next_billed_at,
                        updated_at: new Date().toISOString()
                    })
                    .eq('paddle_subscription_id', subscription.id);

                break;
            }

            default:
                console.log(`Unhandled Paddle event: ${event.event_type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Paddle webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /api/paddle/verify-transaction
// Verifies a completed Paddle transaction (backup for webhook)
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/verify-transaction', verifySupabaseAuth, async (req, res) => {
    try {
        if (!isPaddleConfigured()) {
            return res.status(503).json({ error: 'Paddle not configured' });
        }

        const userId = req.userId;
        const { paddleTransactionId, internalTransactionId } = req.body;

        if (!paddleTransactionId || !internalTransactionId) {
            return res.status(400).json({ error: 'Transaction IDs required' });
        }

        // Check if transaction belongs to user and is pending
        const { data: transaction, error: txError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('id', internalTransactionId)
            .eq('user_id', userId)
            .single();

        if (txError || !transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.status === 'completed') {
            return res.json({
                success: true,
                credits: transaction.credits,
                message: 'Transaction already processed'
            });
        }

        // Verify with Paddle API
        const paddleResponse = await fetch(
            `https://api.paddle.com/transactions/${paddleTransactionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!paddleResponse.ok) {
            return res.status(400).json({ error: 'Failed to verify with Paddle' });
        }

        const paddleData = await paddleResponse.json();
        const paddleTransaction = paddleData.data;

        if (paddleTransaction.status !== 'completed') {
            return res.status(400).json({ error: 'Transaction not completed' });
        }

        // Add credits
        const { error: creditError } = await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: transaction.credits,
            p_transaction_type: 'purchase',
            p_reference_id: paddleTransactionId,
            p_description: `Credit purchase via Paddle - ${transaction.credits} credits`
        });

        if (creditError) {
            console.error('Failed to add credits:', creditError);
            return res.status(500).json({ error: 'Failed to add credits' });
        }

        // Update transaction
        await supabase
            .from('payment_transactions')
            .update({ 
                status: 'completed',
                provider_transaction_id: paddleTransactionId
            })
            .eq('id', internalTransactionId);

        res.json({
            success: true,
            credits: transaction.credits
        });

    } catch (error) {
        console.error('Paddle verify error:', error);
        res.status(500).json({ error: error.message || 'Failed to verify transaction' });
    }
});

// ============================================
// GET /api/paddle/transaction/:id
// Get transaction status
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.get('/transaction/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const { data: transaction, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(transaction);

    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
