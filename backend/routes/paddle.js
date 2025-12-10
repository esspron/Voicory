// ============================================
// PADDLE PAYMENT ROUTES - Per-Usage Billing
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
// CREDIT PACKAGES - Per Usage (Not Subscription)
// Simple pricing: $1 = 1 credit
// ============================================
const CREDIT_PACKAGES = {
    starter: { 
        credits: 1, 
        priceUSD: 1,
        paddlePriceId: process.env.PADDLE_PRICE_STARTER || ''
    },
    basic: { 
        credits: 5, 
        priceUSD: 5,
        paddlePriceId: process.env.PADDLE_PRICE_BASIC || ''
    },
    popular: { 
        credits: 10, 
        priceUSD: 10,
        paddlePriceId: process.env.PADDLE_PRICE_POPULAR || ''
    },
    pro: { 
        credits: 25, 
        priceUSD: 25,
        paddlePriceId: process.env.PADDLE_PRICE_PRO || ''
    },
    business: { 
        credits: 50, 
        priceUSD: 50,
        paddlePriceId: process.env.PADDLE_PRICE_BUSINESS || ''
    },
    enterprise: { 
        credits: 100, 
        priceUSD: 100,
        paddlePriceId: process.env.PADDLE_PRICE_ENTERPRISE || ''
    }
};

// Paddle configuration check
const isPaddleConfigured = () => {
    return !!(process.env.PADDLE_API_KEY && process.env.PADDLE_CLIENT_TOKEN);
};

if (isPaddleConfigured()) {
    console.log('✅ Paddle initialized');
} else {
    console.warn('⚠️ Paddle credentials not set - Paddle payments disabled');
}

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
// Returns available credit packages with Paddle price IDs
// ============================================
router.get('/packages', (req, res) => {
    const packages = Object.entries(CREDIT_PACKAGES).map(([id, pkg]) => ({
        id,
        credits: pkg.credits,
        price: pkg.priceUSD,
        currency: 'USD',
        paddlePriceId: pkg.paddlePriceId
    }));
    
    res.json({
        success: true,
        packages,
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
// POST /api/paddle/create-transaction
// Creates a Paddle transaction for one-time purchase
// Supports both fixed packages and custom amounts
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/create-transaction', verifySupabaseAuth, async (req, res) => {
    try {
        if (!isPaddleConfigured()) {
            return res.status(503).json({ error: 'Paddle not configured' });
        }

        const userId = req.userId;
        const { packageId, customAmount } = req.body;

        let amount, credits, paddlePriceId;

        // Support custom amounts (like Vapi/Retell)
        if (customAmount) {
            const numAmount = parseFloat(customAmount);
            if (isNaN(numAmount) || numAmount < 1) {
                return res.status(400).json({ error: 'Minimum amount is $1' });
            }
            if (numAmount > 10000) {
                return res.status(400).json({ error: 'Maximum amount is $10,000. Contact sales for larger amounts.' });
            }
            // $1 = 1 credit
            amount = numAmount;
            credits = numAmount;
            // Use dynamic pricing - Paddle will handle the actual price
            paddlePriceId = process.env.PADDLE_PRICE_DYNAMIC || process.env.PADDLE_PRICE_POPULAR || '';
        } else if (packageId && CREDIT_PACKAGES[packageId]) {
            // Fixed package
            const pkg = CREDIT_PACKAGES[packageId];
            amount = pkg.priceUSD;
            credits = pkg.credits;
            paddlePriceId = pkg.paddlePriceId;
        } else {
            return res.status(400).json({ error: 'Amount or package ID is required' });
        }
        
        if (!paddlePriceId) {
            return res.status(400).json({ error: 'Price not configured' });
        }

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
                    packageId: packageId || 'custom',
                    customAmount: customAmount || null,
                    paddlePriceId
                }
            })
            .select()
            .single();

        if (txError) {
            console.error('Failed to create transaction record:', txError);
            return res.status(500).json({ error: 'Failed to create transaction' });
        }

        console.log('Created pending Paddle transaction:', transaction.id);

        // Return data needed for Paddle.js checkout
        res.json({
            success: true,
            transactionId: transaction.id,
            priceId: paddlePriceId,
            credits: pkg.credits,
            customData: {
                userId,
                transactionId: transaction.id,
                packageId,
                credits: pkg.credits
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
