import { X, Ticket, CircleNotch, Check, Warning, Gift, CurrencyDollar } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

import { validateCoupon, redeemCoupon, Coupon, CouponRedemptionResult } from '../../services/paymentService';

interface ApplyCouponModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (coupon: Coupon) => void;
    onCreditsRedeemed?: (amount: number) => void;
}

const ApplyCouponModal: React.FC<ApplyCouponModalProps> = ({
    isOpen,
    onClose,
    onApply,
    onCreditsRedeemed
}) => {
    const [couponCode, setCouponCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validatedCoupon, setValidatedCoupon] = useState<Coupon | null>(null);
    const [redemptionResult, setRedemptionResult] = useState<CouponRedemptionResult | null>(null);

    const handleValidate = async () => {
        if (!couponCode.trim()) {
            setError('Please enter a coupon code');
            return;
        }

        setIsLoading(true);
        setError(null);
        setValidatedCoupon(null);
        setRedemptionResult(null);

        const coupon = await validateCoupon(couponCode);

        if (coupon) {
            setValidatedCoupon(coupon);
        } else {
            setError('Invalid or expired coupon code');
        }

        setIsLoading(false);
    };

    const handleApply = () => {
        if (validatedCoupon) {
            onApply(validatedCoupon);
            onClose();
            resetState();
        }
    };

    const handleRedeem = async () => {
        if (!validatedCoupon) return;

        setIsRedeeming(true);
        setError(null);

        const result = await redeemCoupon(validatedCoupon.code);
        setRedemptionResult(result);

        if (result.success && result.creditAmount) {
            onCreditsRedeemed?.(result.creditAmount);
        } else if (!result.success) {
            setError(result.error || 'Failed to redeem coupon');
        }

        setIsRedeeming(false);
    };

    const resetState = () => {
        setCouponCode('');
        setValidatedCoupon(null);
        setError(null);
        setRedemptionResult(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    if (!isOpen) return null;

    const isCreditCoupon = validatedCoupon && 
        ['signup_bonus', 'promo', 'referral'].includes(validatedCoupon.couponType) && 
        validatedCoupon.creditAmount > 0;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                {/* Ambient glow */}
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/10 blur-3xl pointer-events-none" />
                
                {/* Header */}
                <div className="relative flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                            <Ticket size={24} weight="fill" className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-textMain">Redeem Coupon</h2>
                            <p className="text-sm text-textMuted">Enter a promo or discount code</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-textMuted" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Redemption Success */}
                    {redemptionResult?.success && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Gift size={32} weight="fill" className="text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-emerald-400 mb-1">
                                {redemptionResult.message || 'Coupon Redeemed!'}
                            </h3>
                            {redemptionResult.creditAmount && (
                                <p className="text-textMuted">
                                    ${redemptionResult.creditAmount.toLocaleString()} credits added to your account
                                </p>
                            )}
                            <button
                                onClick={handleClose}
                                className="mt-4 px-6 py-2.5 bg-emerald-500/20 text-emerald-400 font-medium rounded-xl hover:bg-emerald-500/30 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {/* Input and validation */}
                    {!redemptionResult?.success && (
                        <>
                            <div>
                                <label className="text-xs font-medium text-textMuted block mb-2">Coupon Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(e.target.value.toUpperCase());
                                            setError(null);
                                            setValidatedCoupon(null);
                                        }}
                                        placeholder="SAVE20"
                                        className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-3 text-textMain outline-none focus:border-primary placeholder:text-textMuted/50 font-mono text-lg tracking-wider"
                                        onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                                    />
                                    <button
                                        onClick={handleValidate}
                                        disabled={isLoading || !couponCode.trim()}
                                        className="px-4 py-3 bg-surface border border-white/10 text-textMain font-medium rounded-xl hover:bg-surfaceHover transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <CircleNotch size={20} className="animate-spin" />
                                        ) : (
                                            'Check'
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                                    <Warning size={18} weight="fill" className="text-red-400" />
                                    <span className="text-sm text-red-400">{error}</span>
                                </div>
                            )}

                            {/* Validated Coupon */}
                            {validatedCoupon && (
                                <div className={`p-4 rounded-xl ${isCreditCoupon ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-primary/10 border border-primary/20'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Check size={18} weight="bold" className={isCreditCoupon ? 'text-emerald-400' : 'text-primary'} />
                                        <span className={`text-sm font-medium ${isCreditCoupon ? 'text-emerald-400' : 'text-primary'}`}>
                                            {isCreditCoupon ? 'Free Credits Coupon!' : 'Valid Discount Coupon!'}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-textMuted">Code</span>
                                            <span className="text-textMain font-mono">{validatedCoupon.code}</span>
                                        </div>
                                        
                                        {isCreditCoupon ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-textMuted">Credits</span>
                                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                    <CurrencyDollar size={14} />
                                                    {validatedCoupon.creditAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-textMuted">Discount</span>
                                                <span className="text-primary font-semibold">
                                                    {validatedCoupon.discountPercent > 0 
                                                        ? `${validatedCoupon.discountPercent}% off`
                                                        : `$${validatedCoupon.discountAmount} off`
                                                    }
                                                </span>
                                            </div>
                                        )}

                                        {validatedCoupon.description && (
                                            <div className="text-xs text-textMuted mt-2 pt-2 border-t border-white/5">
                                                {validatedCoupon.description}
                                            </div>
                                        )}
                                        
                                        {validatedCoupon.newUserOnly && (
                                            <div className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                                                <Warning size={12} weight="fill" />
                                                New users only
                                            </div>
                                        )}
                                        
                                        {!isCreditCoupon && validatedCoupon.minPurchase && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-textMuted">Min. Purchase</span>
                                                <span className="text-textMain">${validatedCoupon.minPurchase}</span>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between text-sm">
                                            <span className="text-textMuted">Valid Until</span>
                                            <span className="text-textMain">
                                                {new Date(validatedCoupon.validUntil).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {validatedCoupon && !redemptionResult?.success && (
                    <div className="p-6 border-t border-white/5 bg-background/50">
                        {isCreditCoupon ? (
                            <button
                                onClick={handleRedeem}
                                disabled={isRedeeming}
                                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-500/80 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isRedeeming ? (
                                    <>
                                        <CircleNotch size={18} className="animate-spin" />
                                        Redeeming...
                                    </>
                                ) : (
                                    <>
                                        <Gift size={18} weight="bold" />
                                        Redeem ${validatedCoupon.creditAmount.toLocaleString()} Credits
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleApply}
                                className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <Check size={18} weight="bold" />
                                Apply to Purchase
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ApplyCouponModal;
