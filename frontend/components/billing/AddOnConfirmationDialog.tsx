import { Warning, X, CircleNotch, Check, Phone, Database, CurrencyDollar, Info, Plus, Minus } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { 
    AddonType, 
    ADDON_PRICING, 
    activateAddon, 
    deactivateAddon,
    updateConcurrencyQuantity,
    ActivateAddonResult,
    UserAddon
} from '../../services/addonsService';

// ============================================
// TYPES
// ============================================

interface AddOnConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    addonType: AddonType;
    currentBalance: number;
    existingAddon?: UserAddon | null;
    onSuccess: (result: ActivateAddonResult) => void;
}

type DialogStep = 'configure' | 'confirm' | 'processing' | 'success' | 'error' | 'insufficient';

// ============================================
// COMPONENT
// ============================================

const AddOnConfirmationDialog: React.FC<AddOnConfirmationDialogProps> = ({
    isOpen,
    onClose,
    addonType,
    currentBalance,
    existingAddon,
    onSuccess,
}) => {
    const [step, setStep] = useState<DialogStep>('configure');
    const [quantity, setQuantity] = useState(existingAddon?.quantity || 1);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ActivateAddonResult | null>(null);

    const pricing = ADDON_PRICING[addonType];
    const isConcurrency = addonType === 'reserved_concurrency';

    // Calculate costs
    const totalCost = quantity * pricing.pricePerUnit;
    const hasSufficientBalance = currentBalance >= totalCost;

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep('configure');
            setQuantity(existingAddon?.quantity || 1);
            setError(null);
            setResult(null);
        }
    }, [isOpen, existingAddon]);

    const handleConfirm = () => {
        if (!hasSufficientBalance) {
            setStep('insufficient');
            return;
        }
        setStep('confirm');
    };

    const handleActivate = async () => {
        setStep('processing');
        setError(null);

        try {
            let activateResult: ActivateAddonResult;

            // If already active and just changing quantity
            if (existingAddon?.isActive && isConcurrency) {
                const updateResult = await updateConcurrencyQuantity(quantity);
                activateResult = {
                    success: updateResult.success,
                    amountCharged: updateResult.amountCharged,
                    newBalance: updateResult.newBalance,
                    error: updateResult.error,
                    required: updateResult.required,
                    available: updateResult.available,
                };
            } else {
                activateResult = await activateAddon(addonType, quantity);
            }

            if (activateResult.success) {
                setResult(activateResult);
                setStep('success');
            } else if (activateResult.error === 'Insufficient balance') {
                setStep('insufficient');
            } else {
                setError(activateResult.error || 'Failed to activate add-on');
                setStep('error');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setStep('error');
        }
    };

    const handleDeactivate = async () => {
        setStep('processing');
        setError(null);

        try {
            const deactivateResult = await deactivateAddon(addonType);
            
            if (deactivateResult.success) {
                setResult({ success: true, amountCharged: 0 });
                onSuccess({ success: true, amountCharged: 0 });
                onClose();
            } else {
                setError(deactivateResult.error || 'Failed to deactivate add-on');
                setStep('error');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setStep('error');
        }
    };

    const handleSuccess = () => {
        if (result) {
            onSuccess(result);
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Dialog */}
            <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="relative p-6 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                            {isConcurrency ? (
                                <Phone size={24} weight="duotone" className="text-primary" />
                            ) : (
                                <Database size={24} weight="duotone" className="text-primary" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-textMain">
                                {existingAddon?.isActive ? 'Manage' : 'Activate'} Add-on
                            </h2>
                            <p className="text-sm text-textMuted">{pricing.displayName}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Configure Step */}
                    {step === 'configure' && (
                        <div className="space-y-6">
                            {/* Description */}
                            <div className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                                <Info size={18} className="text-primary mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-textMuted">{pricing.tooltip}</p>
                            </div>

                            {/* Quantity Selector (for concurrency) */}
                            {isConcurrency && (
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-3">
                                        Number of Call Lines
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            disabled={quantity <= 1}
                                            className="w-10 h-10 flex items-center justify-center bg-surface border border-white/10 rounded-lg hover:bg-surfaceHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Minus size={18} weight="bold" />
                                        </button>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                            className="w-20 text-center bg-background border border-white/10 rounded-lg py-2 text-textMain font-semibold outline-none focus:border-primary"
                                        />
                                        <button
                                            onClick={() => setQuantity(Math.min(100, quantity + 1))}
                                            disabled={quantity >= 100}
                                            className="w-10 h-10 flex items-center justify-center bg-surface border border-white/10 rounded-lg hover:bg-surfaceHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus size={18} weight="bold" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Cost Summary */}
                            <div className="bg-background/50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-textMuted">Price per {isConcurrency ? 'line' : 'month'}</span>
                                    <span className="text-textMain font-medium">${pricing.pricePerUnit}/mo</span>
                                </div>
                                {isConcurrency && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-textMuted">Quantity</span>
                                        <span className="text-textMain font-medium">× {quantity}</span>
                                    </div>
                                )}
                                <div className="border-t border-white/5 pt-3 flex justify-between">
                                    <span className="text-textMain font-medium">Monthly Total</span>
                                    <span className="text-primary font-bold text-lg">${totalCost}/mo</span>
                                </div>
                            </div>

                            {/* Balance Warning */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${hasSufficientBalance ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                <CurrencyDollar size={20} className={hasSufficientBalance ? 'text-emerald-400' : 'text-red-400'} />
                                <div>
                                    <p className="text-sm text-textMain">
                                        Current Balance: <span className="font-bold">${currentBalance.toFixed(2)}</span>
                                    </p>
                                    {!hasSufficientBalance && (
                                        <p className="text-xs text-red-400 mt-0.5">
                                            Need ${(totalCost - currentBalance).toFixed(2)} more to activate
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {existingAddon?.isActive && (
                                    <button
                                        onClick={handleDeactivate}
                                        className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-medium rounded-xl hover:bg-red-500/20 transition-colors"
                                    >
                                        Deactivate
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    disabled={!hasSufficientBalance}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {existingAddon?.isActive ? 'Update' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Confirm Step */}
                    {step === 'confirm' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                    <CurrencyDollar size={32} weight="duotone" className="text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-textMain mb-2">
                                    Confirm Activation
                                </h3>
                                <p className="text-textMuted">
                                    <span className="text-primary font-bold">${totalCost}</span> will be deducted from your balance
                                </p>
                            </div>

                            <div className="bg-background/50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-textMuted">Add-on</span>
                                    <span className="text-textMain">{pricing.displayName}</span>
                                </div>
                                {isConcurrency && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-textMuted">Lines</span>
                                        <span className="text-textMain">{quantity}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-textMuted">Billing Cycle</span>
                                    <span className="text-textMain">Monthly (renews automatically)</span>
                                </div>
                                <div className="border-t border-white/5 pt-2 mt-2 flex justify-between">
                                    <span className="text-textMain font-medium">Amount to Charge</span>
                                    <span className="text-primary font-bold">${totalCost}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('configure')}
                                    className="flex-1 px-4 py-2.5 bg-surface border border-white/10 text-textMain font-medium rounded-xl hover:bg-surfaceHover transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleActivate}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                                >
                                    Confirm & Pay
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Processing Step */}
                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <CircleNotch size={48} className="animate-spin text-primary mx-auto mb-4" />
                            <p className="text-textMain font-medium">Processing...</p>
                            <p className="text-sm text-textMuted mt-1">Please wait while we activate your add-on</p>
                        </div>
                    )}

                    {/* Success Step */}
                    {step === 'success' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <Check size={32} weight="bold" className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-textMain mb-2">
                                    Add-on Activated!
                                </h3>
                                <p className="text-textMuted">
                                    {pricing.displayName} is now active on your account.
                                </p>
                            </div>

                            {result && (
                                <div className="bg-background/50 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-textMuted">Amount Charged</span>
                                        <span className="text-primary font-bold">${result.amountCharged}</span>
                                    </div>
                                    {result.newBalance !== undefined && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-textMuted">New Balance</span>
                                            <span className="text-textMain font-medium">${result.newBalance.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {result.nextBillingDate && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-textMuted">Next Billing</span>
                                            <span className="text-textMain">{new Date(result.nextBillingDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleSuccess}
                                className="w-full px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {/* Error Step */}
                    {step === 'error' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                                <Warning size={32} weight="bold" className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-textMain mb-2">
                                    Activation Failed
                                </h3>
                                <p className="text-textMuted">{error || 'Something went wrong. Please try again.'}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-surface border border-white/10 text-textMain font-medium rounded-xl hover:bg-surfaceHover transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => setStep('configure')}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Insufficient Balance Step */}
                    {step === 'insufficient' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center">
                                <CurrencyDollar size={32} weight="bold" className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-textMain mb-2">
                                    Insufficient Balance
                                </h3>
                                <p className="text-textMuted">
                                    You need <span className="text-orange-400 font-bold">${totalCost}</span> but only have <span className="text-textMain font-bold">${currentBalance.toFixed(2)}</span>.
                                </p>
                                <p className="text-textMuted mt-2">
                                    Please add <span className="text-primary font-bold">${(totalCost - currentBalance).toFixed(2)}</span> more to activate this add-on.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-surface border border-white/10 text-textMain font-medium rounded-xl hover:bg-surfaceHover transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        // Trigger buy credits modal (handled by parent)
                                        window.dispatchEvent(new CustomEvent('open-buy-credits'));
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                                >
                                    Add Funds
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddOnConfirmationDialog;
