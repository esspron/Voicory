import { loadStripe, Stripe } from '@stripe/stripe-js';

import { authFetch } from '../lib/api';
import { supabase } from './supabase';

// ============================================
// PAYMENT SERVICE - Stripe & Razorpay Integration
// ============================================

// Initialize Stripe
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ============================================
// TYPES
// ============================================

export interface PaymentProvider {
    id: 'stripe' | 'razorpay';
    name: string;
    description: string;
    icon: string;
    available: boolean;
    currencies: string[];
}

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    priceINR: number;
    priceUSD: number;
    popular?: boolean;
    savings?: string;
}

export interface PaymentIntent {
    id: string;
    clientSecret?: string;
    orderId?: string;
    amount: number;
    currency: string;
    provider: 'stripe' | 'razorpay';
    status: 'pending' | 'completed' | 'failed';
}

export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    credits?: number;
    newBalance?: number;
    error?: string;
}

// ============================================
// CREDIT PACKAGES
// ============================================

export const CREDIT_PACKAGES: CreditPackage[] = [
    {
        id: 'starter',
        name: 'Starter',
        credits: 100,
        priceINR: 99,
        priceUSD: 1.20,
    },
    {
        id: 'basic',
        name: 'Basic',
        credits: 500,
        priceINR: 449,
        priceUSD: 5.40,
        savings: '10% off'
    },
    {
        id: 'popular',
        name: 'Popular',
        credits: 1000,
        priceINR: 799,
        priceUSD: 9.60,
        popular: true,
        savings: '20% off'
    },
    {
        id: 'pro',
        name: 'Pro',
        credits: 2500,
        priceINR: 1799,
        priceUSD: 21.60,
        savings: '28% off'
    },
    {
        id: 'business',
        name: 'Business',
        credits: 5000,
        priceINR: 3299,
        priceUSD: 39.60,
        savings: '34% off'
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        credits: 10000,
        priceINR: 5999,
        priceUSD: 72,
        savings: '40% off'
    }
];

// ============================================
// PAYMENT PROVIDERS
// ============================================

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
    {
        id: 'razorpay',
        name: 'Razorpay',
        description: 'UPI, Cards, Net Banking (India)',
        icon: '🇮🇳',
        available: true,
        currencies: ['INR']
    },
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'International Cards',
        icon: '💳',
        available: true,
        currencies: ['USD', 'EUR', 'GBP', 'INR']
    }
];

// ============================================
// STRIPE FUNCTIONS
// ============================================

/**
 * Create a Stripe payment intent
 */
export const createStripePaymentIntent = async (
    packageId: string,
    currency: 'USD' | 'INR' = 'USD'
): Promise<{ clientSecret: string; paymentIntentId: string } | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
        if (!pkg) throw new Error('Invalid package');

        const amount = currency === 'INR' ? pkg.priceINR : pkg.priceUSD;
        const amountInCents = Math.round(amount * 100);

        const response = await authFetch('/api/payments/stripe/create-intent', {
            method: 'POST',
            body: JSON.stringify({
                userId: user.id,
                packageId,
                amount: amountInCents,
                currency: currency.toLowerCase(),
                credits: pkg.credits
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        return {
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId
        };
    } catch (error: any) {
        console.error('Error creating Stripe payment intent:', error);
        return null;
    }
};

/**
 * Confirm Stripe payment and add credits
 */
export const confirmStripePayment = async (
    paymentIntentId: string
): Promise<PaymentResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const response = await authFetch('/api/payments/stripe/confirm', {
            method: 'POST',
            body: JSON.stringify({
                userId: user.id,
                paymentIntentId
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to confirm payment');
        }

        const data = await response.json();
        return {
            success: true,
            transactionId: data.transactionId,
            credits: data.credits,
            newBalance: data.newBalance
        };
    } catch (error: any) {
        console.error('Error confirming Stripe payment:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get Stripe instance
 */
export const getStripe = (): Promise<Stripe | null> => {
    return stripePromise;
};

// ============================================
// RAZORPAY FUNCTIONS
// ============================================

declare global {
    interface Window {
        Razorpay: any;
    }
}

/**
 * Load Razorpay script
 */
export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

/**
 * Create a Razorpay order
 */
export const createRazorpayOrder = async (
    packageId: string
): Promise<{ orderId: string; amount: number; currency: string } | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
        if (!pkg) throw new Error('Invalid package');

        const response = await authFetch('/api/payments/razorpay/create-order', {
            method: 'POST',
            body: JSON.stringify({
                userId: user.id,
                packageId,
                amount: pkg.priceINR * 100, // Razorpay expects paise
                credits: pkg.credits
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create order');
        }

        const data = await response.json();
        return {
            orderId: data.orderId,
            amount: data.amount,
            currency: data.currency
        };
    } catch (error: any) {
        console.error('Error creating Razorpay order:', error);
        return null;
    }
};

/**
 * Open Razorpay checkout
 */
export const openRazorpayCheckout = async (
    packageId: string,
    onSuccess: (result: PaymentResult) => void,
    onError: (error: string) => void
): Promise<void> => {
    try {
        // Load Razorpay script
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
            onError('Failed to load payment gateway');
            return;
        }

        // Get user info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            onError('User not authenticated');
            return;
        }

        // Get package
        const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
        if (!pkg) {
            onError('Invalid package');
            return;
        }

        // Create order
        const order = await createRazorpayOrder(packageId);
        if (!order) {
            onError('Failed to create payment order');
            return;
        }

        // Razorpay options
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
            amount: order.amount,
            currency: order.currency,
            name: 'Voicory',
            description: `${pkg.credits} Credits - ${pkg.name} Package`,
            order_id: order.orderId,
            prefill: {
                email: user.email || '',
            },
            theme: {
                color: '#2EC7B7'
            },
            handler: async (response: any) => {
                // Verify payment on backend
                try {
                    const verifyResponse = await authFetch('/api/payments/razorpay/verify', {
                        method: 'POST',
                        body: JSON.stringify({
                            userId: user.id,
                            orderId: order.orderId,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            credits: pkg.credits
                        }),
                    });

                    if (!verifyResponse.ok) {
                        const error = await verifyResponse.json();
                        onError(error.error || 'Payment verification failed');
                        return;
                    }

                    const data = await verifyResponse.json();
                    onSuccess({
                        success: true,
                        transactionId: response.razorpay_payment_id,
                        credits: data.credits,
                        newBalance: data.newBalance
                    });
                } catch (error: any) {
                    onError(error.message || 'Payment verification failed');
                }
            },
            modal: {
                ondismiss: () => {
                    onError('Payment cancelled');
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    } catch (error: any) {
        console.error('Razorpay checkout error:', error);
        onError(error.message || 'Payment failed');
    }
};

// ============================================
// COUPON FUNCTIONS
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

export interface CouponRedemptionResult {
    success: boolean;
    couponType?: string;
    creditAmount?: number;
    discountPercent?: number;
    newBalance?: number;
    message?: string;
    error?: string;
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
 * Redeem a coupon code (for promo/signup_bonus coupons that give credits)
 */
export const redeemCoupon = async (code: string): Promise<CouponRedemptionResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const response = await authFetch('/api/coupons/redeem', {
            method: 'POST',
            body: JSON.stringify({
                userId: user.id,
                couponCode: code
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to redeem coupon'
            };
        }

        return result;
    } catch (error) {
        console.error('Error redeeming coupon:', error);
        return {
            success: false,
            error: 'Failed to redeem coupon'
        };
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
    provider: 'stripe' | 'razorpay';
    status: 'completed' | 'pending' | 'failed' | 'refunded';
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
// AUTO RELOAD SETTINGS
// ============================================

export interface AutoReloadSettings {
    enabled: boolean;
    reloadAmount: number;
    threshold: number;
    paymentMethodId?: string;
}

interface AutoReloadSettingsRow {
    auto_reload_enabled: boolean | null;
    auto_reload_amount: number | null;
    auto_reload_threshold: number | null;
    default_payment_method: string | null;
}

/**
 * Get auto reload settings
 */
export const getAutoReloadSettings = async (): Promise<AutoReloadSettings | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_profiles')
            .select('auto_reload_enabled, auto_reload_amount, auto_reload_threshold, default_payment_method')
            .eq('user_id', user.id)
            .single() as { data: AutoReloadSettingsRow | null; error: any };

        if (error || !data) return null;

        return {
            enabled: data.auto_reload_enabled || false,
            reloadAmount: data.auto_reload_amount || 500,
            threshold: data.auto_reload_threshold || 100,
            paymentMethodId: data.default_payment_method || undefined
        };
    } catch (error) {
        console.error('Error fetching auto reload settings:', error);
        return null;
    }
};

/**
 * Update auto reload settings
 */
export const updateAutoReloadSettings = async (settings: Partial<AutoReloadSettings>): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const updateData: Record<string, unknown> = {};
        if (settings.enabled !== undefined) updateData.auto_reload_enabled = settings.enabled;
        if (settings.reloadAmount !== undefined) updateData.auto_reload_amount = settings.reloadAmount;
        if (settings.threshold !== undefined) updateData.auto_reload_threshold = settings.threshold;
        if (settings.paymentMethodId !== undefined) updateData.default_payment_method = settings.paymentMethodId;

        const { error } = await (supabase
            .from('user_profiles') as any)
            .update(updateData)
            .eq('user_id', user.id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating auto reload settings:', error);
        return false;
    }
};
