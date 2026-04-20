// ============================================
// RAZORPAY PAYMENT SERVICE
// Dynamic pricing: INR for India, USD for intl
// Credits stored in USD. Live forex at purchase time.
// ============================================

import { authFetch } from '../lib/api';
import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export interface RazorpayOrderResponse {
    orderId: string;
    amount: number;       // in paise
    amountInr: number;    // in rupees
    currency: string;
    credits: number;      // USD credits to add
    rateUsed: number;     // forex rate at order time
    keyId: string;        // Razorpay key_id for checkout
}

export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    credits?: number;
    newBalance?: number;
    error?: string;
}

export interface ForexRate {
    usdInr: number;
    cachedFor: string;
}

// ============================================
// CONFIG
// ============================================

export const PRICING_CONFIG = {
    pricePerCredit: 1,   // $1 = 1 credit
    minAmountUsd: 5,
    maxAmountUsd: 10000,
    minAmountInr: 400,
    maxAmountInr: 1000000,
};

// Quick amounts in USD (converted to INR at display time)
export const QUICK_AMOUNTS_USD = [10, 25, 50, 100, 250];
// Quick amounts in INR
export const QUICK_AMOUNTS_INR = [500, 1000, 2500, 5000, 10000];

// ============================================
// RAZORPAY SCRIPT LOADER
// ============================================

declare global {
    interface Window {
        Razorpay: any;
    }
}

let razorpayLoaded = false;

export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            razorpayLoaded = true;
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => { razorpayLoaded = true; resolve(true); };
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// ============================================
// FOREX
// ============================================

let cachedForexRate: { rate: number; ts: number } | null = null;
const FOREX_CACHE_TTL = 10 * 60 * 1000; // 10 min client-side

export const getForexRate = async (): Promise<number> => {
    // Return client-side cached rate if fresh
    if (cachedForexRate && Date.now() - cachedForexRate.ts < FOREX_CACHE_TTL) {
        return cachedForexRate.rate;
    }

    try {
        const response = await authFetch('/api/paddle/forex');
        if (response.ok) {
            const data: ForexRate = await response.json();
            cachedForexRate = { rate: data.usdInr, ts: Date.now() };
            return data.usdInr;
        }
    } catch (e) {
        // Fall through
    }

    return cachedForexRate?.rate || 85; // Stale cache or fallback
};

// ============================================
// CREATE ORDER & CHECKOUT
// ============================================

export const openRazorpayCheckout = async (
    amount: number,
    currency: 'USD' | 'INR',
    onSuccess: (result: PaymentResult) => void,
    onError: (error: string) => void,
    onClose?: () => void,
): Promise<void> => {
    try {
        // Load script
        if (!razorpayLoaded) {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                onError('Failed to load payment system. Please refresh.');
                return;
            }
        }

        // Validate
        if (currency === 'USD') {
            if (amount < PRICING_CONFIG.minAmountUsd || amount > PRICING_CONFIG.maxAmountUsd) {
                onError(`Amount must be between $${PRICING_CONFIG.minAmountUsd} and $${PRICING_CONFIG.maxAmountUsd}`);
                return;
            }
        } else {
            if (amount < PRICING_CONFIG.minAmountInr || amount > PRICING_CONFIG.maxAmountInr) {
                onError(`Amount must be between ₹${PRICING_CONFIG.minAmountInr} and ₹${PRICING_CONFIG.maxAmountInr.toLocaleString('en-IN')}`);
                return;
            }
        }

        // Create order on backend
        const body = currency === 'USD'
            ? { amountUsd: amount }
            : { amountInr: amount };

        const response = await authFetch('/api/payments/razorpay/create-order', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.json();
            onError(err.error || 'Failed to create order');
            return;
        }

        const orderData: RazorpayOrderResponse = await response.json();

        // Get user email for prefill
        const { data: { user } } = await supabase.auth.getUser();

        // Open Razorpay Checkout
        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'Voicory',
            description: `${orderData.credits.toFixed(2)} Credits`,
            order_id: orderData.orderId,
            prefill: {
                email: user?.email || '',
            },
            theme: {
                color: '#00d4aa',
                backdrop_color: 'rgba(0,0,0,0.7)',
            },
            modal: {
                ondismiss: () => {
                    onClose?.();
                },
                confirm_close: true,
                escape: true,
                animation: true,
            },
            handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                // Verify payment on backend
                try {
                    const verifyRes = await authFetch('/api/payments/razorpay/verify', {
                        method: 'POST',
                        body: JSON.stringify({
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            credits: orderData.credits,
                        }),
                    });

                    if (verifyRes.ok) {
                        const result = await verifyRes.json();
                        onSuccess({
                            success: true,
                            transactionId: response.razorpay_payment_id,
                            credits: result.credits || orderData.credits,
                            newBalance: result.newBalance,
                        });
                    } else {
                        // Verification failed but payment may still succeed via webhook
                        onSuccess({
                            success: true,
                            transactionId: response.razorpay_payment_id,
                            credits: orderData.credits,
                        });
                    }
                } catch {
                    // Even if verify call fails, payment likely succeeded — webhook handles it
                    onSuccess({
                        success: true,
                        transactionId: response.razorpay_payment_id,
                        credits: orderData.credits,
                    });
                }
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
            onError(response.error?.description || 'Payment failed');
        });
        rzp.open();
    } catch (error: any) {
        onError(error.message || 'Payment failed');
    }
};

// ============================================
// COUPON FUNCTIONS (reused from paddleService)
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
            .single();

        if (error || !data) return null;

        return {
            code: data.code,
            couponType: data.coupon_type,
            creditAmount: data.credit_amount || 0,
            discountPercent: data.discount_percent || 0,
            discountAmount: data.discount_amount ?? undefined,
            minPurchase: data.min_purchase ?? undefined,
            maxDiscount: data.max_discount ?? undefined,
            validUntil: data.valid_until,
            isActive: data.is_active,
            newUserOnly: data.new_user_only,
            description: data.description ?? undefined,
        };
    } catch {
        return null;
    }
};

export const applyDiscount = (amount: number, coupon: Coupon): number => {
    let discount = 0;
    if (coupon.discountPercent > 0) {
        discount = (amount * coupon.discountPercent) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
    } else if (coupon.discountAmount) {
        discount = coupon.discountAmount;
    }
    return Math.max(0, amount - discount);
};

// ============================================
// FORMAT HELPERS
// ============================================

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};
