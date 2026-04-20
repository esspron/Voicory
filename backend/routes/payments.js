// ============================================
// PAYMENT ROUTES - Stripe & Razorpay
// SECURITY: User-initiated routes require authentication
// Webhook routes use signature verification instead
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const crypto = require('crypto');
const { verifySupabaseAuth } = require('../lib/auth');

// Initialize Stripe
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized');
} else {
    console.warn('⚠️ STRIPE_SECRET_KEY not set - Stripe payments disabled');
}

// Initialize Razorpay
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized');
} else {
    console.warn('⚠️ Razorpay credentials not set - Razorpay payments disabled');
}
const CREDIT_PACKAGES = {
    starter: { credits: 100, priceINR: 99, priceUSD: 1.20 },
    basic: { credits: 500, priceINR: 449, priceUSD: 5.40 },
    popular: { credits: 1000, priceINR: 799, priceUSD: 9.60 },
    pro: { credits: 2500, priceINR: 1799, priceUSD: 21.60 },
    business: { credits: 5000, priceINR: 3299, priceUSD: 39.60 },
    enterprise: { credits: 10000, priceINR: 5999, priceUSD: 72 }
};

/**
 * Create Stripe Payment Intent
 * POST /api/payments/stripe/create-intent
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/stripe/create-intent', verifySupabaseAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        // SECURITY: Use authenticated user ID
        const userId = req.userId;
        const { packageId, amount, currency, credits } = req.body;

        if (!userId || !packageId || !amount || !currency) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate package
        const pkg = CREDIT_PACKAGES[packageId];
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Amount in cents
            currency: currency,
            metadata: {
                userId,
                packageId,
                credits: pkg.credits.toString()
            }
        });

        // Create pending transaction record
        await supabase
            .from('payment_transactions')
            .insert({
                user_id: userId,
                provider: 'stripe',
                provider_transaction_id: paymentIntent.id,
                amount: amount / 100,
                currency: currency.toUpperCase(),
                credits: pkg.credits,
                status: 'pending',
                metadata: { packageId }
            });

        console.log('Created Stripe payment intent:', paymentIntent.id);

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Stripe create intent error:', error);
        res.status(500).json({ error: error.message || 'Failed to create payment intent' });
    }
});

/**
 * Confirm Stripe Payment
 * POST /api/payments/stripe/confirm
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/stripe/confirm', verifySupabaseAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        // SECURITY: Use authenticated user ID
        const userId = req.userId;
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Payment intent ID is required' });
        }

        // Retrieve payment intent to verify
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        // Check if already processed
        const { data: existingTx } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('provider_transaction_id', paymentIntentId)
            .eq('status', 'completed')
            .single();

        if (existingTx) {
            return res.json({
                success: true,
                transactionId: existingTx.id,
                credits: existingTx.credits,
                message: 'Payment already processed'
            });
        }

        const credits = parseInt(paymentIntent.metadata.credits) || 0;

        // Add credits to user
        const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: credits,
            p_transaction_type: 'purchase',
            p_reference_id: paymentIntentId,
            p_description: `Credit purchase via Stripe - ${credits} credits`
        });

        if (creditError) {
            console.error('Failed to add credits:', creditError);
            return res.status(500).json({ error: 'Failed to add credits' });
        }

        // Update transaction status
        await supabase
            .from('payment_transactions')
            .update({ status: 'completed' })
            .eq('provider_transaction_id', paymentIntentId);

        console.log('Stripe payment confirmed:', paymentIntentId, 'Credits:', credits);

        res.json({
            success: true,
            transactionId: paymentIntentId,
            credits,
            newBalance: creditResult?.new_balance
        });

    } catch (error) {
        console.error('Stripe confirm error:', error);
        res.status(500).json({ error: error.message || 'Failed to confirm payment' });
    }
});

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        if (endpointSecret) {
            try {
                event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            } catch (err) {
                console.error('Webhook signature verification failed:', err.message);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }
        } else {
            event = JSON.parse(req.body.toString());
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('Payment succeeded:', paymentIntent.id);
                
                // Process the successful payment
                const userId = paymentIntent.metadata.userId;
                const credits = parseInt(paymentIntent.metadata.credits) || 0;

                if (userId && credits > 0) {
                    // Add credits
                    await supabase.rpc('add_credits', {
                        p_user_id: userId,
                        p_amount: credits,
                        p_transaction_type: 'purchase',
                        p_reference_id: paymentIntent.id,
                        p_description: `Credit purchase via Stripe - ${credits} credits`
                    });

                    // Update transaction status
                    await supabase
                        .from('payment_transactions')
                        .update({ status: 'completed' })
                        .eq('provider_transaction_id', paymentIntent.id);
                }
                break;

            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object;
                console.log('Payment failed:', failedIntent.id);
                
                // Update transaction status
                await supabase
                    .from('payment_transactions')
                    .update({ 
                        status: 'failed',
                        metadata: { error: failedIntent.last_payment_error?.message }
                    })
                    .eq('provider_transaction_id', failedIntent.id);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create Razorpay Order — Dynamic Pricing with Live Forex
 * POST /api/payments/razorpay/create-order
 *
 * Accepts EITHER:
 *   { amountUsd: 50 }          ← USD amount, converted to INR at live rate
 *   { amountInr: 4200 }        ← Direct INR amount, converted to USD credits at live rate
 *   { packageId: 'starter' }   ← Legacy fixed packages
 *
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/razorpay/create-order', verifySupabaseAuth, async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ error: 'Razorpay not configured' });
        }

        const userId = req.userId;
        const { packageId, amountUsd, amountInr } = req.body;
        const { getUsdInrRate, convertUsdToInr, convertInrToUsd } = require('../services/forex');

        let amountPaise, creditsToAdd, amountInrFinal, rateUsed;

        if (packageId && CREDIT_PACKAGES[packageId]) {
            // Legacy package flow
            const pkg = CREDIT_PACKAGES[packageId];
            amountPaise = pkg.priceINR * 100;
            creditsToAdd = pkg.credits;
            amountInrFinal = pkg.priceINR;
            rateUsed = pkg.priceINR / (pkg.priceUSD || 1);
        } else if (amountUsd) {
            // Dynamic USD → INR conversion
            const numUsd = parseFloat(amountUsd);
            if (!numUsd || numUsd < 1 || numUsd > 10000) {
                return res.status(400).json({ error: 'Amount must be between $1 and $10,000' });
            }
            const conv = await convertUsdToInr(numUsd);
            amountInrFinal = Math.ceil(conv.inr); // Round up to nearest rupee
            amountPaise = amountInrFinal * 100;
            creditsToAdd = numUsd; // $1 = 1 credit
            rateUsed = conv.rate;
        } else if (amountInr) {
            // Direct INR → calculate USD credits
            const numInr = parseFloat(amountInr);
            if (!numInr || numInr < 100 || numInr > 1000000) {
                return res.status(400).json({ error: 'Amount must be between ₹100 and ₹10,00,000' });
            }
            const conv = await convertInrToUsd(numInr);
            amountInrFinal = Math.ceil(numInr);
            amountPaise = amountInrFinal * 100;
            creditsToAdd = Math.round(conv.usd * 100) / 100; // Round to 2 decimal places
            rateUsed = conv.rate;
        } else {
            return res.status(400).json({ error: 'Provide amountUsd, amountInr, or packageId' });
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt: `credit_${Date.now()}_${userId.slice(0, 8)}`,
            payment_capture: true,
            notes: {
                userId,
                credits: creditsToAdd.toString(),
                rateUsed: rateUsed.toString(),
                amountInr: amountInrFinal.toString(),
            }
        });

        // Create pending transaction record
        await supabase
            .from('payment_transactions')
            .insert({
                user_id: userId,
                provider: 'razorpay',
                provider_transaction_id: order.id,
                amount: amountInrFinal,
                currency: 'INR',
                credits: creditsToAdd,
                status: 'pending',
                metadata: { rateUsed, amountInr: amountInrFinal, creditsToAdd }
            });

        res.json({
            orderId: order.id,
            amount: order.amount,
            amountInr: amountInrFinal,
            currency: 'INR',
            credits: creditsToAdd,
            rateUsed,
            keyId: process.env.RAZORPAY_KEY_ID,
        });

    } catch (error) {
        console.error('Razorpay create order error:', error);
        res.status(500).json({ error: error.message || 'Failed to create order' });
    }
});

/**
 * Verify Razorpay Payment
 * POST /api/payments/razorpay/verify
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/razorpay/verify', verifySupabaseAuth, async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ error: 'Razorpay not configured' });
        }

        // SECURITY: Use authenticated user ID
        const userId = req.userId;
        const { orderId, paymentId, signature, credits } = req.body;

        if (!orderId || !paymentId || !signature) {
            return res.status(400).json({ error: 'Order ID, payment ID, and signature are required' });
        }

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        if (generatedSignature !== signature) {
            console.error('Razorpay signature mismatch');
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Check if already processed
        const { data: existingTx } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('provider_transaction_id', orderId)
            .eq('status', 'completed')
            .single();

        if (existingTx) {
            return res.json({
                success: true,
                transactionId: paymentId,
                credits: existingTx.credits,
                message: 'Payment already processed'
            });
        }

        // Fetch order details to get credits and rate
        const order = await razorpay.orders.fetch(orderId);
        const actualCredits = parseFloat(order.notes?.credits) || credits || 0;
        const rateUsed = parseFloat(order.notes?.rateUsed) || 85;

        // Add credits to user
        const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: actualCredits,
            p_transaction_type: 'purchase',
            p_reference_id: paymentId,
            p_description: `Credit purchase via Razorpay - ${actualCredits} credits @ ₹${rateUsed}/USD`
        });

        if (creditError) {
            console.error('Failed to add credits:', creditError);
            return res.status(500).json({ error: 'Failed to add credits' });
        }

        // Update transaction status
        await supabase
            .from('payment_transactions')
            .update({ 
                status: 'completed',
                provider_transaction_id: paymentId, // Update to payment ID
                metadata: { orderId, paymentId }
            })
            .eq('provider_transaction_id', orderId);

        console.log('Razorpay payment verified:', paymentId, 'Credits:', actualCredits);

        res.json({
            success: true,
            transactionId: paymentId,
            credits: actualCredits,
            newBalance: creditResult?.new_balance
        });

    } catch (error) {
        console.error('Razorpay verify error:', error);
        res.status(500).json({ error: error.message || 'Failed to verify payment' });
    }
});

/**
 * Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 */
router.post('/razorpay', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ error: 'Razorpay not configured' });
        }

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        
        if (webhookSecret) {
            const crypto = require('crypto');
            const signature = req.headers['x-razorpay-signature'];
            const generatedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (signature !== generatedSignature) {
                console.error('Razorpay webhook signature mismatch');
                return res.status(400).json({ error: 'Invalid signature' });
            }
        }

        const event = req.body;
        console.log('Razorpay webhook:', event.event);

        switch (event.event) {
            case 'payment.captured':
                const payment = event.payload.payment.entity;
                const order = event.payload.order?.entity;
                
                console.log('Payment captured:', payment.id);
                
                if (order?.notes?.userId) {
                    const userId = order.notes.userId;
                    const credits = parseInt(order.notes.credits) || 0;

                    // Check if already processed
                    const { data: existingTx } = await supabase
                        .from('payment_transactions')
                        .select('status')
                        .eq('provider_transaction_id', order.id)
                        .single();

                    if (existingTx?.status !== 'completed') {
                        // Add credits
                        await supabase.rpc('add_credits', {
                            p_user_id: userId,
                            p_amount: credits,
                            p_transaction_type: 'purchase',
                            p_reference_id: payment.id,
                            p_description: `Credit purchase via Razorpay - ${credits} credits`
                        });

                        // Update transaction status
                        await supabase
                            .from('payment_transactions')
                            .update({ 
                                status: 'completed',
                                provider_transaction_id: payment.id
                            })
                            .eq('provider_transaction_id', order.id);
                    }
                }
                break;

            case 'payment.failed':
                const failedPayment = event.payload.payment.entity;
                console.log('Payment failed:', failedPayment.id);
                
                await supabase
                    .from('payment_transactions')
                    .update({ 
                        status: 'failed',
                        metadata: { error: failedPayment.error_description }
                    })
                    .eq('provider_transaction_id', failedPayment.order_id);
                break;

            default:
                console.log(`Unhandled Razorpay event: ${event.event}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Razorpay webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get payment status
 * GET /api/payments/status/:transactionId
 * PROTECTED: Requires valid Supabase JWT token
 */
router.get('/status/:transactionId', verifySupabaseAuth, async (req, res) => {
    try {
        const { transactionId } = req.params;
        // SECURITY: Use authenticated user ID to verify ownership
        const userId = req.userId;

        const { data, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('provider_transaction_id', transactionId)
            .eq('user_id', userId)  // SECURITY: Only allow user to see their own transactions
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(data);

    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
