// ============================================
// PADDLE PAYMENT SERVICE - Per-Usage Billing
// Paddle.js checkout overlay integration
// ============================================

import { authFetch } from '../lib/api';
import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export interface PaddleConfig {
    clientToken: string;
    environment: 'sandbox' | 'production';
    configured: boolean;
}

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    popular?: boolean;
}

export interface PaddlePackage {
    id: string;
    credits: number;
    price: number;
    currency: string;
    paddlePriceId: string;
}

export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    credits?: number;
    newBalance?: number;
    error?: string;
}

export interface CreateTransactionResponse {
    success: boolean;
    transactionId: string;
    priceId: string;
    credits: number;
    customData: {
        userId: string;
        transactionId: string;
        packageId: string;
        credits: number;
    };
    customer: {
        email: string;
    };
}

// ============================================\n// CREDIT PACKAGES - $1 = 1 Credit\n// ============================================

export const CREDIT_PACKAGES: CreditPackage[] = [
    {
        id: 'starter',
        name: 'Starter',
        credits: 1,
        price: 1,
    },
    {
        id: 'basic',
        name: 'Basic',
        credits: 5,
        price: 5,
    },
    {
        id: 'popular',
        name: 'Popular',
        credits: 10,
        price: 10,
        popular: true,
    },
    {
        id: 'pro',
        name: 'Pro',
        credits: 25,
        price: 25,
    },
    {
        id: 'business',
        name: 'Business',
        credits: 50,
        price: 50,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        credits: 100,
        price: 100,
    }
];

// ============================================
// PADDLE SCRIPT LOADER
// ============================================

declare global {
    interface Window {
        Paddle: any;
    }
}

let paddleInitialized = false;
let paddleConfig: PaddleConfig | null = null;

/**
 * Load Paddle.js script
 */
export const loadPaddleScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.Paddle) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

/**
 * Get Paddle configuration from backend
 */
export const getPaddleConfig = async (): Promise<PaddleConfig | null> => {
    try {
        if (paddleConfig) return paddleConfig;

        const response = await authFetch('/api/paddle/config');
        if (!response.ok) {
            console.error('Failed to get Paddle config');
            return null;
        }

        paddleConfig = await response.json();
        return paddleConfig;
    } catch (error) {
        console.error('Error fetching Paddle config:', error);
        return null;
    }
};

/**
 * Initialize Paddle.js
 */
export const initializePaddle = async (): Promise<boolean> => {
    try {
        if (paddleInitialized && window.Paddle) {
            return true;
        }

        // Load script
        const loaded = await loadPaddleScript();
        if (!loaded) {
            console.error('Failed to load Paddle script');
            return false;
        }

        // Get config
        const config = await getPaddleConfig();
        if (!config || !config.configured) {
            console.error('Paddle not configured');
            return false;
        }

        // Initialize Paddle
        window.Paddle.Environment.set(config.environment);
        window.Paddle.Initialize({
            token: config.clientToken,
            eventCallback: (event: any) => {
                console.log('Paddle event:', event.name, event.data);
            }
        });

        paddleInitialized = true;
        console.log('✅ Paddle initialized:', config.environment);
        return true;
    } catch (error) {
        console.error('Error initializing Paddle:', error);
        return false;
    }
};

// ============================================
// PADDLE CHECKOUT
// ============================================

/**
 * Create a transaction on the backend
 */
export const createPaddleTransaction = async (
    packageId: string,
    customAmount?: number
): Promise<CreateTransactionResponse | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const response = await authFetch('/api/paddle/create-transaction', {
            method: 'POST',
            body: JSON.stringify({
                packageId,
                customAmount
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create transaction');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Error creating Paddle transaction:', error);
        return null;
    }
};

/**
 * Open Paddle checkout overlay
 */
export const openPaddleCheckout = async (
    packageId: string,
    _currency: string = 'USD', // Kept for backwards compatibility, always USD
    onSuccess: (result: PaymentResult) => void,
    onError: (error: string) => void,
    onClose?: () => void,
    customAmount?: number
): Promise<void> => {
    try {
        // Initialize Paddle if not already
        const initialized = await initializePaddle();
        if (!initialized) {
            onError('Payment system not available');
            return;
        }

        // Create transaction on backend
        const transactionData = await createPaddleTransaction(packageId, customAmount);
        if (!transactionData) {
            onError('Failed to initialize payment');
            return;
        }

        // Open Paddle checkout overlay
        window.Paddle.Checkout.open({
            items: [
                {
                    priceId: transactionData.priceId,
                    quantity: 1
                }
            ],
            customData: transactionData.customData,
            customer: {
                email: transactionData.customer.email
            },
            settings: {
                displayMode: 'overlay',
                theme: 'dark',
                locale: 'en',
                successUrl: `${window.location.origin}/settings/billing?payment=success&txn=${transactionData.transactionId}`,
                allowLogout: false
            },
            // Callback when checkout completes successfully
            successCallback: async (data: any) => {
                console.log('Paddle checkout success:', data);
                
                // Verify transaction with backend (webhook should handle this, but verify as backup)
                try {
                    const verifyResponse = await authFetch('/api/paddle/verify-transaction', {
                        method: 'POST',
                        body: JSON.stringify({
                            paddleTransactionId: data.transactionId,
                            internalTransactionId: transactionData.transactionId
                        }),
                    });

                    if (verifyResponse.ok) {
                        const result = await verifyResponse.json();
                        onSuccess({
                            success: true,
                            transactionId: data.transactionId,
                            credits: result.credits || transactionData.credits
                        });
                    } else {
                        // Webhook will handle credit addition, just show success
                        onSuccess({
                            success: true,
                            transactionId: data.transactionId,
                            credits: transactionData.credits
                        });
                    }
                } catch (error) {
                    // Even if verification fails, show success (webhook will handle it)
                    onSuccess({
                        success: true,
                        transactionId: data.transactionId,
                        credits: transactionData.credits
                    });
                }
            },
            // Callback when user closes checkout without completing
            closeCallback: () => {
                console.log('Paddle checkout closed');
                onClose?.();
            }
        });

    } catch (error: any) {
        console.error('Paddle checkout error:', error);
        onError(error.message || 'Payment failed');
    }
};

// ============================================
// PACKAGE HELPERS
// ============================================

/**
 * Get available packages with Paddle pricing
 */
export const getPaddlePackages = async (): Promise<PaddlePackage[]> => {
    try {
        const response = await authFetch('/api/paddle/packages');
        if (!response.ok) {
            throw new Error('Failed to fetch packages');
        }
        const data = await response.json();
        return data.packages || [];
    } catch (error) {
        console.error('Error fetching Paddle packages:', error);
        return [];
    }
};

/**
 * Check if Paddle is configured
 */
export const isPaddleConfigured = async (): Promise<boolean> => {
    const config = await getPaddleConfig();
    return config?.configured || false;
};

// ============================================
// COUPON FUNCTIONS (Shared)
// ============================================

export interface Coupon {
    code: string;
    couponType: 'discount' | 'signup_bonus' | 'referral' | 'promo';
    creditAmount: number;
    discountPercent: number;
    discountAmount?: number;
    minPurchase?: number;
    maxDiscount?: number;
    validUntil: string;
    isActive: boolean;
    newUserOnly: boolean;
    description?: string;
}

interface CouponRow {
    code: string;
    coupon_type: string;
    credit_amount: number;
    discount_percent: number;
    discount_amount: number | null;
    min_purchase: number | null;
    max_discount: number | null;
    valid_until: string;
    is_active: boolean;
    new_user_only: boolean;
    description: string | null;
}

/**
 * Validate a coupon code
 */
export const validateCoupon = async (code: string): Promise<Coupon | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .gte('valid_until', new Date().toISOString())
            .single() as { data: CouponRow | null; error: any };

        if (error || !data) return null;

        return {
            code: data.code,
            couponType: data.coupon_type as Coupon['couponType'],
            creditAmount: data.credit_amount || 0,
            discountPercent: data.discount_percent || 0,
            discountAmount: data.discount_amount ?? undefined,
            minPurchase: data.min_purchase ?? undefined,
            maxDiscount: data.max_discount ?? undefined,
            validUntil: data.valid_until,
            isActive: data.is_active,
            newUserOnly: data.new_user_only,
            description: data.description ?? undefined
        };
    } catch (error) {
        console.error('Error validating coupon:', error);
        return null;
    }
};

/**
 * Apply discount to amount
 */
export const applyDiscount = (amount: number, coupon: Coupon): number => {
    let discount = 0;

    if (coupon.discountPercent > 0) {
        discount = (amount * coupon.discountPercent) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
        }
    } else if (coupon.discountAmount) {
        discount = coupon.discountAmount;
    }

    return Math.max(0, amount - discount);
};

// ============================================
// PAYMENT HISTORY
// ============================================

export interface PaymentHistory {
    id: string;
    amount: number;
    currency: string;
    credits: number;
    provider: 'paddle' | 'stripe' | 'razorpay';
    status: 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled';
    transactionId: string;
    createdAt: string;
}

interface PaymentHistoryRow {
    id: string;
    amount: string;
    currency: string;
    credits: number;
    provider: string;
    status: string;
    provider_transaction_id: string;
    created_at: string;
}

/**
 * Get payment history
 */
export const getPaymentHistory = async (limit: number = 20): Promise<PaymentHistory[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit) as { data: PaymentHistoryRow[] | null; error: any };

        if (error) throw error;

        return (data || []).map(p => ({
            id: p.id,
            amount: Number(p.amount),
            currency: p.currency,
            credits: p.credits,
            provider: p.provider as PaymentHistory['provider'],
            status: p.status as PaymentHistory['status'],
            transactionId: p.provider_transaction_id,
            createdAt: p.created_at
        }));
    } catch (error) {
        console.error('Error fetching payment history:', error);
        return [];
    }
};
