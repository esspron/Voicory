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
const { verifySupabaseAuth } = require('../lib/auth');

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
