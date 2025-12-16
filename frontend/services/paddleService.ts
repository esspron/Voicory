// ============================================
// PADDLE PAYMENT SERVICE - Hybrid Billing
// Supports: Prepaid credits + Monthly post-paid usage
// Uses Paddle.js checkout overlay integration
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
    subscriptionsEnabled: boolean;
}

export interface BillingConfig {
    pricingModel: 'hybrid';
    billingModes: {
        prepaid: {
            enabled: boolean;
            pricePerCredit: number;
            minAmount: number;
            maxAmount: number;
            description: string;
        };
        postpaid: {
            enabled: boolean;
            description: string;
            billingCycle: string;
        };
    };
    currency: string;
    paddlePriceId: string;
    paddleConfigured: boolean;
}

export interface BillingStatus {
    success: boolean;
    billingMode: 'prepaid' | 'postpaid';
    creditsBalance: number;
    paddleCustomerId: string | null;
    subscription: {
        id: string;
        status: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        nextBilledAt: string;
    } | null;
    currentUsage: {
        periodStart: string;
        periodEnd: string;
        totalCost: number;
        breakdown: {
            llm: number;
            tts: number;
            stt: number;
            calls: number;
        };
    };
}

export interface UsageSummary {
    success: boolean;
    summary: {
        periodStart: string;
        periodEnd: string;
        status: string;
        totals: {
            llm: { tokens: number; cost: number };
            tts: { seconds: number; cost: number };
            stt: { seconds: number; cost: number };
            calls: { minutes: number; cost: number };
            total: number;
        };
        billedAt: string | null;
        paidAt: string | null;
    };
    recentUsage: Array<{
        usage_type: string;
        provider: string;
        model: string;
        cost_usd: string;
        created_at: string;
    }>;
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
    quantity: number;
    credits: number;
    customData: {
        userId: string;
        transactionId: string;
        credits: number;
    };
    customer: {
        email: string;
    };
}

export interface TransactionHistory {
    success: boolean;
    transactions: Array<{
        id: string;
        paddleId: string;
        type: string;
        amount: number;
        credits: number;
        status: string;
        createdAt: string;
    }>;
    hasMore: boolean;
}

// Legacy type for backward compatibility
export interface DynamicPricingConfig {
    pricingModel: string;
    pricePerCredit: number;
    minAmount: number;
    maxAmount: number;
    currency: string;
    paddlePriceId: string;
    paddleConfigured: boolean;
}

// ============================================
// DYNAMIC PRICING CONFIG
// $1 = 1 Credit, min $20, max $10,000
// ============================================

export const PRICING_CONFIG = {
    pricePerCredit: 1, // $1 = 1 credit
    minAmount: 20,
    maxAmount: 10000,
    currency: 'USD'
};

// Quick add amounts for UI
export const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

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
// PADDLE CHECKOUT - DYNAMIC PRICING
// ============================================

/**
 * Create a transaction on the backend with dynamic amount
 */
export const createPaddleTransaction = async (
    amount: number
): Promise<CreateTransactionResponse | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const response = await authFetch('/api/paddle/create-transaction', {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create transaction');
        }

        return await response.json();
    } catch (error: unknown) {
        console.error('Error creating Paddle transaction:', error);
        throw error;
    }
};

/**
 * Open Paddle checkout overlay with dynamic pricing
 * @param amount - Amount in USD (also equals credits since $1 = 1 credit)
 */
export const openPaddleCheckout = async (
    amount: number,
    onSuccess: (result: PaymentResult) => void,
    onError: (error: string) => void,
    onClose?: () => void
): Promise<void> => {
    try {
        // Validate amount
        if (amount < PRICING_CONFIG.minAmount) {
            onError(`Minimum amount is $${PRICING_CONFIG.minAmount}`);
            return;
        }
        if (amount > PRICING_CONFIG.maxAmount) {
            onError(`Maximum amount is $${PRICING_CONFIG.maxAmount}. Contact sales for larger amounts.`);
            return;
        }
        if (!Number.isInteger(amount)) {
            onError('Amount must be a whole number');
            return;
        }

        // Initialize Paddle if not already
        const initialized = await initializePaddle();
        if (!initialized) {
            onError('Payment system not available. Please refresh and try again.');
            return;
        }

        // Create transaction on backend
        const transactionData = await createPaddleTransaction(amount);
        if (!transactionData) {
            onError('Failed to initialize payment. Please try again.');
            return;
        }

        // Open Paddle checkout overlay with quantity-based pricing
        window.Paddle.Checkout.open({
            items: [
                {
                    priceId: transactionData.priceId,
                    quantity: transactionData.quantity // This determines the total: $1 × quantity
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
                // Don't set successUrl - let the overlay close and trigger successCallback
                // so we can show our own success dialog
                allowLogout: false
            },
            // Callback when checkout completes successfully
            successCallback: async (data: unknown) => {
                console.log('Paddle checkout success:', data);
                // Type assertion for Paddle callback data
                const paddleData = data as { transactionId?: string; transaction?: { id: string } };
                const transactionId = paddleData.transactionId || paddleData.transaction?.id || 'unknown';
                
                // Verify transaction with backend (webhook should handle this, but verify as backup)
                try {
                    const verifyResponse = await authFetch('/api/paddle/verify-transaction', {
                        method: 'POST',
                        body: JSON.stringify({
                            paddleTransactionId: transactionId,
                            internalTransactionId: transactionData.transactionId
                        }),
                    });

                    if (verifyResponse.ok) {
                        const result = await verifyResponse.json();
                        onSuccess({
                            success: true,
                            transactionId: transactionId,
                            credits: result.credits || transactionData.credits
                        });
                    } else {
                        // Webhook will handle credit addition, just show success
                        onSuccess({
                            success: true,
                            transactionId: transactionId,
                            credits: transactionData.credits
                        });
                    }
                } catch (error) {
                    // Even if verification fails, show success (webhook will handle it)
                    onSuccess({
                        success: true,
                        transactionId: transactionId,
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
// PRICING HELPERS
// ============================================

/**
 * Get dynamic pricing configuration from backend
 */
export const getDynamicPricingConfig = async (): Promise<DynamicPricingConfig | null> => {
    try {
        const response = await authFetch('/api/paddle/packages');
        if (!response.ok) {
            throw new Error('Failed to fetch pricing config');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching pricing config:', error);
        return null;
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
// ============================================
// BILLING MODE MANAGEMENT
// ============================================

/**
 * Get user's billing status including mode, credits, and current usage
 */
export const getBillingStatus = async (): Promise<BillingStatus | null> => {
    try {
        const response = await authFetch('/api/paddle/billing-status');
        if (!response.ok) {
            throw new Error('Failed to fetch billing status');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching billing status:', error);
        return null;
    }
};

/**
 * Get billing configuration (supported billing modes)
 */
export const getBillingConfig = async (): Promise<BillingConfig | null> => {
    try {
        const response = await authFetch('/api/paddle/packages');
        if (!response.ok) {
            throw new Error('Failed to fetch billing config');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching billing config:', error);
        return null;
    }
};

/**
 * Switch billing mode between prepaid and postpaid
 */
export const switchBillingMode = async (mode: 'prepaid' | 'postpaid'): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
        const response = await authFetch('/api/paddle/switch-billing-mode', {
            method: 'POST',
            body: JSON.stringify({ mode }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, error: data.error || 'Failed to switch billing mode' };
        }
        
        return { success: true, message: data.message };
    } catch (error: any) {
        console.error('Error switching billing mode:', error);
        return { success: false, error: error.message || 'Failed to switch billing mode' };
    }
};

/**
 * Get usage summary for a billing period
 */
export const getUsageSummary = async (period?: string): Promise<UsageSummary | null> => {
    try {
        const url = period ? `/api/paddle/usage-summary?period=${period}` : '/api/paddle/usage-summary';
        const response = await authFetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch usage summary');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching usage summary:', error);
        return null;
    }
};

/**
 * Get transaction history (both prepaid and postpaid)
 */
export const getTransactionHistory = async (limit: number = 20, offset: number = 0): Promise<TransactionHistory | null> => {
    try {
        const response = await authFetch(`/api/paddle/transactions?limit=${limit}&offset=${offset}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        return null;
    }
};

// ============================================
// SUBSCRIPTION MANAGEMENT (Post-paid)
// ============================================

/**
 * Start subscription checkout for post-paid billing
 */
export const startSubscriptionCheckout = async (
    onSuccess: () => void,
    onError: (error: string) => void,
    onClose?: () => void
): Promise<void> => {
    try {
        // Initialize Paddle if not already
        const initialized = await initializePaddle();
        if (!initialized) {
            onError('Payment system not available. Please refresh and try again.');
            return;
        }

        // Get subscription setup data from backend
        const response = await authFetch('/api/paddle/create-subscription', {
            method: 'POST',
        });

        if (!response.ok) {
            const errorData = await response.json();
            onError(errorData.error || 'Failed to start subscription');
            return;
        }

        const subscriptionData = await response.json();

        // Open Paddle checkout for subscription
        window.Paddle.Checkout.open({
            items: [
                {
                    priceId: subscriptionData.priceId,
                    quantity: 1
                }
            ],
            customData: subscriptionData.customData,
            customer: {
                email: subscriptionData.customer.email
            },
            settings: {
                displayMode: 'overlay',
                theme: 'dark',
                locale: 'en',
                successUrl: `${window.location.origin}/settings/billing?subscription=success`,
                allowLogout: false
            },
            successCallback: () => {
                console.log('Subscription checkout completed');
                onSuccess();
            },
            closeCallback: () => {
                console.log('Subscription checkout closed');
                onClose?.();
            }
        });

    } catch (error: any) {
        console.error('Subscription checkout error:', error);
        onError(error.message || 'Failed to start subscription');
    }
};

// ============================================
// FORMAT HELPERS
// ============================================

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Format date for display
 */
export const formatBillingDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Get billing period display text
 */
export const getBillingPeriodText = (start: string, end: string): string => {
    return `${formatBillingDate(start)} - ${formatBillingDate(end)}`;
};