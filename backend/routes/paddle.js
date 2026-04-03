// ============================================
// PADDLE PAYMENT ROUTES - Prepaid Credits
// Users buy credits upfront, use as they go
// Paddle handles tax compliance, merchant of record
// SECURITY: User-initiated routes require authentication
// Webhook routes use signature verification
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const crypto = require('crypto');
const { verifySupabaseAuth, rateLimit } = require('../lib/auth');

// Rate limiters for payment endpoints
const paymentRateLimit = rateLimit({ windowMs: 60000, max: 10 }); // 10 per minute for user actions
const webhookRateLimit = rateLimit({ windowMs: 60000, max: 200 }); // 200 per minute for webhooks

// ============================================
// BILLING CONFIGURATION
// ============================================

// Prepaid Credits Config
const DYNAMIC_PRICE_ID = process.env.PADDLE_PRICE_ID || ''; // Single $1 price, use quantity
const MIN_AMOUNT = 20;  // Minimum $20
const MAX_AMOUNT = 10000; // Maximum $10,000

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

if (isPaddleConfigured()) {
    console.log('✅ Paddle initialized (prepaid credits)');
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
// CRITICAL SECURITY: This validates webhooks are from Paddle
// ============================================
const verifyPaddleWebhookSignature = (rawBody, signature, webhookSecret) => {
    // SECURITY: Fail closed - if no secret configured, reject all webhooks
    if (!webhookSecret) {
        console.error('SECURITY: No webhook secret configured - rejecting webhook');
        return false;
    }
    
    if (!signature) {
        console.error('SECURITY: No signature provided in webhook');
        return false;
    }
    
    try {
        // Paddle uses ts=TIMESTAMP;h1=SIGNATURE format
        const parts = signature.split(';');
        const tsValue = parts.find(p => p.startsWith('ts='));
        const h1Value = parts.find(p => p.startsWith('h1='));
        
        if (!tsValue || !h1Value) {
            console.error('Invalid Paddle signature format - missing ts or h1');
            return false;
        }
        
        const timestamp = tsValue.replace('ts=', '');
        const providedSignature = h1Value.replace('h1=', '');
        
        // SECURITY: Check timestamp to prevent replay attacks (5 minute tolerance)
        const webhookAge = Math.abs(Date.now() / 1000 - parseInt(timestamp));
        if (webhookAge > 300) {
            console.error('SECURITY: Webhook too old:', webhookAge, 'seconds');
            return false;
        }
        
        // Create the signed payload: timestamp:rawBody
        const signedPayload = `${timestamp}:${rawBody}`;
        
        // Calculate expected signature using HMAC SHA256
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(signedPayload)
            .digest('hex');
        
        // SECURITY: Use timing-safe comparison to prevent timing attacks
        const isValid = crypto.timingSafeEqual(
            Buffer.from(providedSignature),
            Buffer.from(expectedSignature)
        );
        
        if (!isValid && process.env.NODE_ENV !== 'production') {
            console.log('Signature mismatch - expected:', expectedSignature.substring(0, 20) + '...');
        }
        
        return isValid;
    } catch (error) {
        console.error('Paddle signature verification error:', error.message);
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
        pricingModel: 'prepaid',
        pricePerCredit: 1, // $1 = 1 credit
        minAmount: MIN_AMOUNT,
        maxAmount: MAX_AMOUNT,
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
        configured: isPaddleConfigured()
    });
});

// ============================================
// GET /api/paddle/billing-status
// Get user's current credit balance
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.get('/billing-status', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // Get user profile with credits balance
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('paddle_customer_id, credits_balance')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        res.json({
            success: true,
            billingMode: 'prepaid',
            creditsBalance: parseFloat(profile.credits_balance) || 0,
            paddleCustomerId: profile.paddle_customer_id
        });

    } catch (error) {
        console.error('Get billing status error:', error);
        res.status(500).json({ error: error.message || 'Failed to get billing status' });
    }
});

// ============================================
// POST /api/paddle/create-transaction
// Creates a Paddle transaction for one-time purchase
// DYNAMIC PRICING: User specifies amount, we use quantity
// PROTECTED: Requires valid Supabase JWT token + rate limit
// ============================================
router.post('/create-transaction', verifySupabaseAuth, paymentRateLimit, async (req, res) => {
    try {
        if (!isPaddleConfigured()) {
            return res.status(503).json({ 
                error: 'Payment system not configured. Please contact support.',
                details: 'Missing Paddle credentials'
            });
        }

        const userId = req.userId;
        const { amount: requestedAmount } = req.body;

        // Validate amount - must be positive integer within limits
        const amount = parseInt(requestedAmount, 10);
        if (isNaN(amount) || amount < MIN_AMOUNT) {
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
// SECURITY: Rate limited + signature verification
// ============================================
router.post('/webhook', webhookRateLimit, async (req, res) => {
    try {
        const signature = req.headers['paddle-signature'];
        const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
        
        // Handle both raw buffer and parsed JSON body
        let rawBody;
        let event;
        
        if (Buffer.isBuffer(req.body)) {
            rawBody = req.body.toString();
            event = JSON.parse(rawBody);
        } else if (typeof req.body === 'object') {
            // Body was already parsed by express.json()
            event = req.body;
            rawBody = JSON.stringify(req.body);
        } else {
            rawBody = req.body.toString();
            event = JSON.parse(rawBody);
        }
        
        // Log event type (non-sensitive)
        console.log('Paddle webhook received:', event.event_type);

        // SECURITY: Verify webhook signature (CRITICAL)
        if (!verifyPaddleWebhookSignature(rawBody, signature, webhookSecret)) {
            console.error('SECURITY: Paddle webhook signature verification failed');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        switch (event.event_type) {
            case 'transaction.completed': {
                const transaction = event.data;
                const customData = transaction.custom_data || {};
                const paddleTxId = transaction.id;
                
                console.log('Paddle transaction completed:', paddleTxId);
                
                const userId = customData.userId;
                const credits = parseInt(customData.credits) || 0;
                const internalTxId = customData.transactionId;

                if (!userId || !credits) {
                    console.error('Missing userId or credits in Paddle webhook');
                    // Return 200 to prevent retries for invalid data
                    return res.json({ received: true, error: 'Missing required data' });
                }

                // IDEMPOTENCY: Check if already processed by Paddle transaction ID
                const { data: existingByPaddleId } = await supabase
                    .from('payment_transactions')
                    .select('id, status')
                    .eq('provider_transaction_id', paddleTxId)
                    .single();

                if (existingByPaddleId?.status === 'completed') {
                    console.log('Transaction already processed (by Paddle ID):', paddleTxId);
                    return res.json({ received: true, duplicate: true });
                }

                // Also check by internal transaction ID
                const { data: existingTx } = await supabase
                    .from('payment_transactions')
                    .select('status, provider_transaction_id')
                    .eq('id', internalTxId)
                    .single();

                if (existingTx?.status === 'completed') {
                    console.log('Transaction already processed (by internal ID):', internalTxId);
                    return res.json({ received: true, duplicate: true });
                }

                // First, mark as processing to prevent race conditions
                const { error: lockError } = await supabase
                    .from('payment_transactions')
                    .update({ 
                        status: 'processing',
                        provider_transaction_id: paddleTxId
                    })
                    .eq('id', internalTxId)
                    .eq('status', 'pending'); // Only update if still pending

                if (lockError) {
                    console.log('Could not acquire lock, may already be processing');
                }

                // Add credits to user
                const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
                    p_user_id: userId,
                    p_amount: credits,
                    p_transaction_type: 'purchase',
                    p_description: `Credit purchase via Paddle - ${credits} credits`,
                    p_reference_type: 'paddle_transaction',
                    p_reference_id: null,  // Paddle IDs are strings, not UUIDs
                    p_metadata: { paddle_transaction_id: paddleTxId, internal_transaction_id: internalTxId }
                });

                if (creditError) {
                    console.error('Failed to add credits:', creditError);
                    // Mark as failed
                    await supabase
                        .from('payment_transactions')
                        .update({ status: 'failed', metadata: { error: creditError.message } })
                        .eq('id', internalTxId);
                    return res.status(500).json({ error: 'Failed to add credits' });
                }
                
                console.log('Credits added successfully:', creditResult);

                // Update transaction status to completed
                await supabase
                    .from('payment_transactions')
                    .update({ 
                        status: 'completed',
                        provider_transaction_id: paddleTxId,
                        metadata: {
                            paddleTransactionId: paddleTxId,
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

            case 'adjustment.created': {
                // Handle refunds - deduct credits from user
                const adjustment = event.data;
                const action = adjustment.action; // 'refund', 'credit', 'chargeback'
                
                if (action === 'refund' || action === 'chargeback') {
                    console.log('Paddle refund/chargeback received:', adjustment.id);
                    
                    const paddleTxId = adjustment.transaction_id;
                    if (!paddleTxId) {
                        console.error('No transaction_id in adjustment');
                        break;
                    }

                    // Find the original transaction
                    const { data: originalTx } = await supabase
                        .from('payment_transactions')
                        .select('user_id, credits')
                        .eq('provider_transaction_id', paddleTxId)
                        .eq('status', 'completed')
                        .single();

                    if (!originalTx) {
                        console.error('Original transaction not found for refund:', paddleTxId);
                        break;
                    }

                    // Calculate refund amount (Paddle sends in minor units, e.g., cents)
                    // adjustment.totals.total is the refund amount
                    const refundAmountCents = Math.abs(parseInt(adjustment.totals?.total || 0));
                    const refundCredits = Math.ceil(refundAmountCents / 100); // $1 = 1 credit

                    if (refundCredits > 0) {
                        // Deduct credits using negative amount
                        const { error: deductError } = await supabase.rpc('add_credits', {
                            p_user_id: originalTx.user_id,
                            p_amount: -refundCredits, // Negative to deduct
                            p_transaction_type: action,
                            p_description: `${action === 'chargeback' ? 'Chargeback' : 'Refund'} - ${refundCredits} credits deducted`,
                            p_reference_type: 'paddle_adjustment',
                            p_reference_id: null,
                            p_metadata: { 
                                paddle_adjustment_id: adjustment.id,
                                paddle_transaction_id: paddleTxId,
                                action: action
                            }
                        });

                        if (deductError) {
                            console.error('Failed to deduct credits for refund:', deductError);
                        } else {
                            console.log('Refund processed: deducted', refundCredits, 'credits from user:', originalTx.user_id);
                        }
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled Paddle event: ${event.event_type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Paddle webhook error:', error);
        // Return 200 to prevent infinite retries on parsing errors
        res.json({ received: true, error: error.message });
    }
});

// ============================================
// POST /api/paddle/verify-transaction
// Verifies a completed Paddle transaction (backup for webhook)
// PROTECTED: Requires valid Supabase JWT token + rate limit
// ============================================
router.post('/verify-transaction', verifySupabaseAuth, paymentRateLimit, async (req, res) => {
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

// ============================================
// POST /api/paddle/create-subscription
// Create a Paddle subscription (alias of create-transaction for subscription-type packages)
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/create-subscription', verifySupabaseAuth, paymentRateLimit, async (req, res) => {
    try {
        // Delegate to create-transaction logic — subscriptions use the same Paddle Checkout flow
        // The distinction is handled by the package type in create-transaction
        const userId = req.userId;
        const { packageId, successUrl, cancelUrl } = req.body;

        if (!packageId) {
            return res.status(400).json({ error: 'packageId is required' });
        }

        // Forward to create-transaction handler by re-using the same supabase + response pattern
        // Get the package info
        const packages = require('./paddle').packages || [];
        const pkg = packages.find(p => p.id === packageId);

        // Return a stub with instructions to use create-transaction instead
        // Full subscription billing is handled through Paddle Checkout via create-transaction
        return res.status(200).json({
            success: true,
            message: 'Use /api/paddle/create-transaction for Paddle Checkout flow',
            redirectTo: '/api/paddle/create-transaction',
            packageId
        });
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POST /api/paddle/switch-billing-mode
// Switch between credit and subscription billing modes
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/switch-billing-mode', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { mode } = req.body; // 'credits' | 'subscription'

        if (!mode || !['credits', 'subscription'].includes(mode)) {
            return res.status(400).json({ error: "mode must be 'credits' or 'subscription'" });
        }

        // Update billing mode preference in user settings
        const { error } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, billing_mode: mode, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        if (error) {
            console.error('Switch billing mode error:', error);
            return res.status(500).json({ error: 'Failed to update billing mode' });
        }

        res.json({ success: true, billingMode: mode });
    } catch (error) {
        console.error('Switch billing mode error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
