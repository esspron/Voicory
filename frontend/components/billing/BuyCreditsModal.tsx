import { X, Lightning, Check, CircleNotch, Warning, CreditCard, Plus, Minus } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import {
    openRazorpayCheckout,
    loadRazorpayScript,
    PaymentResult,
    validateCoupon,
    applyDiscount,
    Coupon,
    PRICING_CONFIG,
    QUICK_AMOUNTS_USD,
    QUICK_AMOUNTS_INR,
} from '../../services/razorpayService';
import { useCurrency } from '../../contexts/CurrencyContext';

interface BuyCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: PaymentResult) => void;
    currentBalance: number;
}

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    currentBalance,
}) => {
    const [step, setStep] = useState<'amount' | 'processing' | 'success' | 'failed'>('amount');
    const [amount, setAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
    const [razorpayReady, setRazorpayReady] = useState(false);
    const { currency, currencySymbol, formatAmount, isIndia, usdInrRate } = useCurrency();

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);

    const quickAmounts = isIndia ? QUICK_AMOUNTS_INR : QUICK_AMOUNTS_USD;
    const defaultAmount = isIndia ? '1000' : '25';

    // Load Razorpay script on mount
    useEffect(() => {
        loadRazorpayScript().then(setRazorpayReady);
    }, []);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep('amount');
            setAmount('');
            setError(null);
            setPaymentResult(null);
            setCouponCode('');
            setAppliedCoupon(null);
            setCouponError(null);
        } else {
            setAmount(defaultAmount);
        }
    }, [isOpen, defaultAmount]);

    const handleAmountChange = (value: string) => {
        const sanitized = value.replace(/[^0-9]/g, '');
        setAmount(sanitized);
        setError(null);
    };

    const handleQuickAmount = (quickAmount: number) => {
        setAmount(quickAmount.toString());
        setError(null);
    };

    const incrementAmount = () => {
        const current = parseInt(amount) || 0;
        const step = isIndia ? 500 : 10;
        setAmount((current + step).toString());
    };

    const decrementAmount = () => {
        const current = parseInt(amount) || 0;
        const step = isIndia ? 500 : 10;
        const min = isIndia ? PRICING_CONFIG.minAmountInr : PRICING_CONFIG.minAmountUsd;
        if (current > min) setAmount((current - step).toString());
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError(null);
        const coupon = await validateCoupon(couponCode);
        if (coupon) setAppliedCoupon(coupon);
        else setCouponError('Invalid or expired coupon code');
        setCouponLoading(false);
    };

    const getCreditsToAdd = (): number => {
        const num = parseInt(amount) || 0;
        if (isIndia) {
            // INR → USD credits at live rate
            return Math.round((num / usdInrRate) * 100) / 100;
        }
        return num; // USD = credits
    };

    const getFinalDisplayAmount = (): number => {
        const num = parseInt(amount) || 0;
        if (!appliedCoupon) return num;
        return applyDiscount(num, appliedCoupon);
    };

    const handleProceedToPayment = async () => {
        const numAmount = parseInt(amount);
        const min = isIndia ? PRICING_CONFIG.minAmountInr : PRICING_CONFIG.minAmountUsd;
        const max = isIndia ? PRICING_CONFIG.maxAmountInr : PRICING_CONFIG.maxAmountUsd;

        if (!numAmount || numAmount < min) {
            setError(`Minimum amount is ${currencySymbol}${min.toLocaleString(isIndia ? 'en-IN' : 'en-US')}`);
            return;
        }
        if (numAmount > max) {
            setError(`Maximum amount is ${currencySymbol}${max.toLocaleString(isIndia ? 'en-IN' : 'en-US')}. Contact sales for larger amounts.`);
            return;
        }
        if (!razorpayReady) {
            setError('Payment system is initializing. Please try again.');
            return;
        }

        setIsLoading(true);
        setError(null);

        await openRazorpayCheckout(
            numAmount,
            isIndia ? 'INR' : 'USD',
            (result) => {
                setPaymentResult(result);
                setStep('success');
                setIsLoading(false);
                onSuccess(result);
            },
            (err) => {
                setError(err);
                setStep('failed');
                setIsLoading(false);
            },
            () => {
                setIsLoading(false);
            }
        );
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Ambient glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="relative flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                            <Lightning size={24} weight="fill" className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-textMain">Add Funds</h2>
                            <p className="text-sm text-textMuted">
                                Balance: {formatAmount(currentBalance)}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-textMuted" />
                    </button>
                </div>

                {/* Content */}
                <div className="relative p-6">
                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                            <Warning size={20} weight="fill" className="text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Razorpay not ready */}
                    {!razorpayReady && step === 'amount' && (
                        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                            <CircleNotch size={20} className="text-amber-400 animate-spin" />
                            <p className="text-sm text-amber-400">Initializing payment system...</p>
                        </div>
                    )}

                    {/* Step: Enter Amount */}
                    {step === 'amount' && (
                        <div className="space-y-6">
                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-3">
                                    Enter amount ({isIndia ? 'INR' : 'USD'})
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={decrementAmount}
                                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        <Minus size={20} className="text-textMuted" />
                                    </button>
                                    <div className="flex-1 relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-primary">
                                            {currencySymbol}
                                        </span>
                                        <input
                                            type="text"
                                            value={amount}
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            className="w-full bg-background border border-white/10 rounded-xl px-4 py-4 pl-10 text-3xl font-bold text-textMain text-center outline-none focus:border-primary transition-colors"
                                            placeholder="0"
                                        />
                                    </div>
                                    <button
                                        onClick={incrementAmount}
                                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        <Plus size={20} className="text-textMuted" />
                                    </button>
                                </div>
                                <p className="text-xs text-textMuted mt-2 text-center">
                                    {isIndia
                                        ? `₹${usdInrRate.toFixed(1)} = 1 credit • Min ₹${PRICING_CONFIG.minAmountInr.toLocaleString('en-IN')}`
                                        : `$1 = 1 credit • Min $${PRICING_CONFIG.minAmountUsd}`}
                                </p>
                            </div>

                            {/* Quick Amounts */}
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-2">Quick add</label>
                                <div className="flex gap-2">
                                    {quickAmounts.map((qa) => (
                                        <button
                                            key={qa}
                                            onClick={() => handleQuickAmount(qa)}
                                            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                                                parseInt(amount) === qa
                                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                                    : 'bg-white/[0.02] border-white/5 text-textMuted hover:bg-white/[0.05] hover:border-white/10'
                                            }`}
                                        >
                                            {isIndia ? `₹${qa.toLocaleString('en-IN')}` : `$${qa}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Coupon Code */}
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-2">Have a coupon?</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="Enter coupon code"
                                        className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary placeholder:text-textMuted/50"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={!couponCode.trim() || couponLoading}
                                        className="px-4 py-2.5 bg-surface border border-white/10 text-textMain text-sm font-medium rounded-xl hover:bg-surfaceHover transition-colors disabled:opacity-50"
                                    >
                                        {couponLoading ? <CircleNotch size={16} className="animate-spin" /> : 'Apply'}
                                    </button>
                                </div>
                                {couponError && <p className="text-xs text-red-400 mt-1">{couponError}</p>}
                                {appliedCoupon && (
                                    <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                                        <span className="text-xs text-emerald-400">
                                            Coupon applied: {appliedCoupon.discountPercent}% off
                                        </span>
                                        <button onClick={() => setAppliedCoupon(null)} className="text-xs text-textMuted hover:text-textMain">
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-textMuted">Amount</span>
                                    <span className="text-textMain">{currencySymbol}{parseInt(amount) || 0}</span>
                                </div>
                                {isIndia && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-textMuted">Rate</span>
                                        <span className="text-textMuted">₹{usdInrRate.toFixed(2)}/USD</span>
                                    </div>
                                )}
                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-400">Discount ({appliedCoupon.discountPercent}%)</span>
                                        <span className="text-emerald-400">
                                            -{currencySymbol}{((parseInt(amount) || 0) - getFinalDisplayAmount()).toFixed(0)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                                    <span className="text-textMain font-medium">Credits to add</span>
                                    <span className="text-primary font-bold">{getCreditsToAdd().toFixed(2)} credits</span>
                                </div>
                            </div>

                            {/* Payment Security */}
                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                <CreditCard size={20} className="text-primary flex-shrink-0" />
                                <p className="text-xs text-textMuted">
                                    Secure payment via Razorpay. UPI, cards, net banking accepted.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && paymentResult && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} weight="bold" className="text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-textMain mb-2">Payment Successful!</h3>
                            <p className="text-textMuted mb-6">
                                {paymentResult.credits?.toFixed(2)} credits have been added to your account.
                            </p>
                            {paymentResult.newBalance !== undefined && (
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl inline-block">
                                    <div className="text-sm text-textMuted mb-1">New Balance</div>
                                    <div className="text-2xl font-bold text-primary">
                                        {formatAmount(paymentResult.newBalance)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Failed */}
                    {step === 'failed' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Warning size={32} weight="bold" className="text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-textMain mb-2">Payment Failed</h3>
                            <p className="text-textMuted mb-4">
                                {error || 'Something went wrong with your payment.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative p-6 border-t border-white/5 bg-background/50">
                    {step === 'amount' && (
                        <button
                            onClick={handleProceedToPayment}
                            disabled={!parseInt(amount) || isLoading || !razorpayReady}
                            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <><CircleNotch size={20} className="animate-spin" /> Processing...</>
                            ) : (
                                <>Pay {currencySymbol}{getFinalDisplayAmount().toLocaleString(isIndia ? 'en-IN' : 'en-US')}</>
                            )}
                        </button>
                    )}
                    {step === 'success' && (
                        <button
                            onClick={() => { onClose(); window.location.reload(); }}
                            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            Done
                        </button>
                    )}
                    {step === 'failed' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setStep('amount'); setError(null); }}
                                className="flex-1 px-6 py-3 bg-surface border border-white/10 text-textMain font-semibold rounded-xl hover:bg-surfaceHover transition-colors"
                            >
                                Try Again
                            </button>
                            <button onClick={onClose}
                                className="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-textMuted font-semibold rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BuyCreditsModal;
