import { X, Lightning, Check, CircleNotch, Warning, CreditCard, Plus, Minus } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { 
    openPaddleCheckout,
    initializePaddle,
    PaymentResult,
    validateCoupon,
    applyDiscount,
    Coupon,
    PRICING_CONFIG,
    QUICK_AMOUNTS
} from '../../services/paddleService';

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
    const [step, setStep] = useState<'amount' | 'processing' | 'success'>('amount');
    const [amount, setAmount] = useState<string>('20');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
    const [paddleReady, setPaddleReady] = useState(false);
    
    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);

    // Initialize Paddle on mount
    useEffect(() => {
        const init = async () => {
            const ready = await initializePaddle();
            setPaddleReady(ready);
        };
        init();
    }, []);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('amount');
            setAmount('20');
            setError(null);
            setPaymentResult(null);
            setCouponCode('');
            setAppliedCoupon(null);
            setCouponError(null);
        }
    }, [isOpen]);

    const handleAmountChange = (value: string) => {
        // Only allow whole numbers for dynamic pricing
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
        setAmount((current + 10).toString());
    };

    const decrementAmount = () => {
        const current = parseInt(amount) || 0;
        if (current > PRICING_CONFIG.minAmount) {
            setAmount((current - 10).toString());
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        
        setCouponLoading(true);
        setCouponError(null);
        
        const coupon = await validateCoupon(couponCode);
        
        if (coupon) {
            setAppliedCoupon(coupon);
        } else {
            setCouponError('Invalid or expired coupon code');
        }
        
        setCouponLoading(false);
    };

    const getFinalAmount = (): number => {
        const baseAmount = parseInt(amount) || 0;
        if (!appliedCoupon) return baseAmount;
        return applyDiscount(baseAmount, appliedCoupon);
    };

    const getCreditsToAdd = (): number => {
        // $1 = 1 credit
        return parseInt(amount) || 0;
    };

    const handleProceedToPayment = async () => {
        const numAmount = parseInt(amount);
        
        if (!numAmount || numAmount < PRICING_CONFIG.minAmount) {
            setError(`Minimum amount is $${PRICING_CONFIG.minAmount}`);
            return;
        }

        if (numAmount > PRICING_CONFIG.maxAmount) {
            setError(`Maximum amount is $${PRICING_CONFIG.maxAmount}. Contact sales for larger amounts.`);
            return;
        }

        if (!Number.isInteger(numAmount)) {
            setError('Amount must be a whole number');
            return;
        }
        
        if (!paddleReady) {
            setError('Payment system is initializing. Please try again.');
            return;
        }
        
        setIsLoading(true);
        setError(null);

        // Open Paddle checkout with dynamic amount
        await openPaddleCheckout(
            numAmount, // Just pass the amount - backend handles quantity
            (result) => {
                setPaymentResult(result);
                setStep('success');
                setIsLoading(false);
                onSuccess(result);
            },
            (err) => {
                setError(err);
                setIsLoading(false);
            },
            () => {
                // User closed checkout without completing
                setIsLoading(false);
            }
        );
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
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
                                Balance: ${currentBalance.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-textMuted" />
                    </button>
                </div>

                {/* Content */}
                <div className="relative p-6">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                            <Warning size={20} weight="fill" className="text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Paddle not ready warning */}
                    {!paddleReady && step === 'amount' && (
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
                                    Enter amount (USD)
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={decrementAmount}
                                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        <Minus size={20} className="text-textMuted" />
                                    </button>
                                    <div className="flex-1 relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-primary">$</span>
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
                                    $1 = 1 credit • Min $20 • Max $10,000
                                </p>
                            </div>

                            {/* Quick Amounts */}
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-2">Quick add</label>
                                <div className="flex gap-2">
                                    {QUICK_AMOUNTS.map((quickAmount) => (
                                        <button
                                            key={quickAmount}
                                            onClick={() => handleQuickAmount(quickAmount)}
                                            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                                                parseFloat(amount) === quickAmount
                                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                                    : 'bg-white/[0.02] border-white/5 text-textMuted hover:bg-white/[0.05] hover:border-white/10'
                                            }`}
                                        >
                                            ${quickAmount}
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
                                {couponError && (
                                    <p className="text-xs text-red-400 mt-1">{couponError}</p>
                                )}
                                {appliedCoupon && (
                                    <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                                        <span className="text-xs text-emerald-400">
                                            Coupon applied: {appliedCoupon.discountPercent}% off
                                        </span>
                                        <button 
                                            onClick={() => setAppliedCoupon(null)}
                                            className="text-xs text-textMuted hover:text-textMain"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-textMuted">Amount</span>
                                    <span className="text-textMain">${parseFloat(amount) || 0}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-400">Discount ({appliedCoupon.discountPercent}%)</span>
                                        <span className="text-emerald-400">
                                            -${((parseFloat(amount) || 0) - getFinalAmount()).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                                    <span className="text-textMain font-medium">Credits to add</span>
                                    <span className="text-primary font-bold">{getCreditsToAdd()} credits</span>
                                </div>
                            </div>

                            {/* Payment Security Note */}
                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                <CreditCard size={20} className="text-primary flex-shrink-0" />
                                <p className="text-xs text-textMuted">
                                    Secure payment via Paddle. All major cards accepted.
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
                                ${paymentResult.credits?.toFixed(2)} has been added to your account.
                            </p>
                            <p className="text-sm text-textMuted/70 mb-4">
                                Your balance will be updated in a few seconds.
                            </p>
                            {paymentResult.newBalance !== undefined && (
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl inline-block">
                                    <div className="text-sm text-textMuted mb-1">New Balance</div>
                                    <div className="text-2xl font-bold text-primary">
                                        ${paymentResult.newBalance.toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative p-6 border-t border-white/5 bg-background/50">
                    {step === 'amount' && (
                        <button
                            onClick={handleProceedToPayment}
                            disabled={!parseFloat(amount) || parseFloat(amount) < 1 || isLoading || !paddleReady}
                            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <CircleNotch size={20} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Add ${getFinalAmount().toFixed(2)}
                                </>
                            )}
                        </button>
                    )}

                    {step === 'success' && (
                        <button
                            onClick={() => {
                                onClose();
                                // Refresh the page to show updated balance
                                window.location.reload();
                            }}
                            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BuyCreditsModal;
