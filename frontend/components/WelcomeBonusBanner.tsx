import { Gift, X, Sparkle, Check, ArrowRight } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/authService';

interface WelcomeBonusBannerProps {
    onDismiss?: () => void;
}

const WelcomeBonusBanner: React.FC<WelcomeBonusBannerProps> = ({ onDismiss }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<'checking' | 'available' | 'claimed' | 'claiming' | 'error' | 'hidden'>('hidden');
    const [bonusAmount, setBonusAmount] = useState<number>(2000);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // TODO: Implement applyWelcomeBonus and getWelcomeBonusStatus in AuthContext/AuthService
    // For now, the welcome bonus feature is disabled
    useEffect(() => {
        // checkBonusStatus();
        void setBonusAmount; // Mark as used
        void setShowSuccess;
        void setError;
        void onDismiss;
        void user;
    }, [user, onDismiss]);

    const checkBonusStatus = async () => {
        // Feature not implemented - hide the banner
        setStatus('hidden');
    };

    const handleClaimBonus = async () => {
        // Feature not implemented
        setStatus('hidden');
    };

    const handleDismiss = () => {
        setStatus('hidden');
        onDismiss?.();
    };

    // Feature disabled - always return null
    if (status === 'hidden' || status === 'checking') {
        return null;
    }

    // Keep void references to avoid unused variable errors
    void checkBonusStatus;
    void handleClaimBonus;
    void handleDismiss;
    void bonusAmount;
    void showSuccess;
    void error;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-emerald-500/10 p-6 mb-6">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Close button */}
            {status !== 'claiming' && status !== 'claimed' && (
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-1.5 text-textMuted hover:text-textMain hover:bg-white/10 rounded-lg transition-colors z-10"
                >
                    <X size={18} />
                </button>
            )}

            <div className="relative flex items-center gap-6">
                {/* Icon */}
                <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-emerald-500/30 flex items-center justify-center border border-white/10">
                        {status === 'claimed' ? (
                            <Check size={32} weight="bold" className="text-emerald-400" />
                        ) : (
                            <Gift size={32} weight="duotone" className="text-primary" />
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {status === 'claimed' || showSuccess ? (
                        <>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkle size={18} weight="fill" className="text-emerald-400 animate-pulse" />
                                <h3 className="text-lg font-semibold text-emerald-400">
                                    Welcome Bonus Claimed!
                                </h3>
                            </div>
                            <p className="text-textMuted">
                                ${bonusAmount.toLocaleString()} credits have been added to your account. Start building amazing voice AI experiences!
                            </p>
                        </>
                    ) : status === 'error' ? (
                        <>
                            <h3 className="text-lg font-semibold text-textMain mb-1">
                                Oops! Something went wrong
                            </h3>
                            <p className="text-red-400 text-sm">
                                {error}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkle size={18} weight="fill" className="text-primary animate-pulse" />
                                <h3 className="text-lg font-semibold text-textMain">
                                    🎉 Welcome! Claim Your Free ${bonusAmount.toLocaleString()} Credits
                                </h3>
                            </div>
                            <p className="text-textMuted">
                                As a new user, you get ${bonusAmount.toLocaleString()} free credits to explore our voice AI platform.
                            </p>
                        </>
                    )}
                </div>

                {/* Action button */}
                {status === 'available' && (
                    <button
                        onClick={handleClaimBonus}
                        className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-primary to-emerald-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Gift size={20} weight="bold" />
                        Claim Now
                        <ArrowRight size={18} weight="bold" />
                    </button>
                )}

                {status === 'claiming' && (
                    <div className="flex-shrink-0 px-6 py-3 bg-surface/50 rounded-xl flex items-center gap-2 text-textMuted">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Claiming...
                    </div>
                )}

                {status === 'error' && (
                    <button
                        onClick={handleClaimBonus}
                        className="flex-shrink-0 px-5 py-2.5 bg-surface border border-white/10 text-textMain rounded-xl hover:bg-surfaceHover transition-colors text-sm font-medium"
                    >
                        Try Again
                    </button>
                )}
            </div>

            {/* Confetti effect for success */}
            {showSuccess && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                backgroundColor: ['#22d3ee', '#10b981', '#f59e0b', '#8b5cf6'][i % 4],
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${1 + Math.random()}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default WelcomeBonusBanner;
