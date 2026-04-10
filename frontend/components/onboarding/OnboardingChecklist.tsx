/**
 * OnboardingChecklist — shown on the dashboard until user completes all 4 steps.
 * Auto-detects completion state from Supabase. Dismissible once all done.
 *
 * Steps:
 * 1. Create your first assistant
 * 2. Add a phone number (Twilio or Exotel)
 * 3. Top up credits ($20 minimum)
 * 4. Make your first call (call_logs count > 0)
 */

import {
    Robot,
    Phone,
    CurrencyDollar,
    Headset,
    CheckCircle,
    Circle,
    ArrowRight,
    X,
    Confetti,
    Sparkle,
} from '@phosphor-icons/react';
import { useCurrency } from '../../contexts/CurrencyContext';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../../services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistStep {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    gradient: string;
    done: boolean;
    action: string;
    actionPath: string;
}

interface OnboardingState {
    hasAssistant: boolean;
    hasPhoneNumber: boolean;
    hasCredits: boolean;
    hasCall: boolean;
}

const DISMISSED_KEY = 'voicory_onboarding_dismissed';

// ─── Component ────────────────────────────────────────────────────────────────

const OnboardingChecklist: React.FC = () => {
    const navigate = useNavigate();
    const { isIndia } = useCurrency();
    const [state, setState] = useState<OnboardingState>({
        hasAssistant: false,
        hasPhoneNumber: false,
        hasCredits: false,
        hasCall: false,
    });
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    const [celebrating, setCelebrating] = useState(false);

    // Load dismissal from localStorage
    useEffect(() => {
        const isDismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
        if (isDismissed) setDismissed(true);
    }, []);

    // Check onboarding state from Supabase
    useEffect(() => {
        const check = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const userId = session.user.id;

                // Run all checks in parallel
                const [assistantsRes, phonesRes, profileRes, callsRes] = await Promise.all([
                    supabase
                        .from('assistants')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId),
                    supabase
                        .from('phone_numbers')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId)
                        .is('deleted_at', null),
                    supabase
                        .from('user_profiles')
                        .select('credits_balance')
                        .eq('user_id', userId)
                        .single(),
                    supabase
                        .from('call_logs')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId),
                ]);

                const newState: OnboardingState = {
                    hasAssistant: (assistantsRes.count ?? 0) > 0,
                    hasPhoneNumber: (phonesRes.count ?? 0) > 0,
                    hasCredits: parseFloat(profileRes.data?.credits_balance ?? '0') >= 1,
                    hasCall: (callsRes.count ?? 0) > 0,
                };

                setState(newState);

                // Celebrate when all done (first time)
                const allDone = Object.values(newState).every(Boolean);
                const wasNotAllDone = !Object.values(state).every(Boolean);
                if (allDone && wasNotAllDone && !dismissed) {
                    setCelebrating(true);
                    setTimeout(() => setCelebrating(false), 3000);
                }
            } catch (err) {
                console.error('Onboarding check failed:', err);
            } finally {
                setLoading(false);
            }
        };

        check();
    }, []);

    const allDone = !loading && Object.values(state).every(Boolean);
    const completedCount = Object.values(state).filter(Boolean).length;

    // Don't render if dismissed
    if (dismissed) return null;

    const steps: ChecklistStep[] = [
        {
            id: 'assistant',
            title: 'Create your assistant',
            description: 'Set up your AI agent — name, voice, system prompt.',
            icon: Robot,
            gradient: 'from-violet-500 to-purple-600',
            done: state.hasAssistant,
            action: state.hasAssistant ? 'View' : 'Create',
            actionPath: '/assistants',
        },
        {
            id: 'phone',
            title: 'Add a phone number',
            description: 'Connect a Twilio or Exotel number to go live.',
            icon: Phone,
            gradient: 'from-blue-500 to-cyan-600',
            done: state.hasPhoneNumber,
            action: state.hasPhoneNumber ? 'Manage' : 'Add Number',
            actionPath: '/phone-numbers',
        },
        {
            id: 'credits',
            title: 'Top up credits',
            description: isIndia ? 'Add at least ₹1,500 to start making calls.' : 'Add at least $20 to start making calls.',
            icon: CurrencyDollar,
            gradient: 'from-emerald-500 to-teal-600',
            done: state.hasCredits,
            action: state.hasCredits ? 'View Billing' : 'Add Credits',
            actionPath: '/settings/billing',
        },
        {
            id: 'call',
            title: 'Make your first call',
            description: 'Dial out or wait for an inbound — your AI handles it.',
            icon: Headset,
            gradient: 'from-amber-500 to-orange-600',
            done: state.hasCall,
            action: state.hasCall ? 'View Logs' : 'Start Calling',
            actionPath: '/phone-numbers',
        },
    ];

    // Find the first incomplete step
    const nextStepIndex = steps.findIndex(s => !s.done);

    if (loading) {
        return (
            <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 animate-pulse">
                <div className="h-5 w-48 bg-white/10 rounded mb-4" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="h-28 bg-white/5 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`relative bg-surface/80 backdrop-blur-xl border rounded-2xl p-6 overflow-hidden transition-all duration-500 ${
            allDone ? 'border-emerald-500/30' : 'border-white/5'
        }`}>
            {/* Glow when all done */}
            {allDone && (
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-emerald-500/5 pointer-events-none" />
            )}

            {/* Header */}
            <div className="relative flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    {allDone ? (
                        <Confetti size={24} weight="fill" className="text-emerald-400" />
                    ) : (
                        <Sparkle size={24} weight="fill" className="text-primary" />
                    )}
                    <div>
                        <h3 className="text-base font-semibold text-textMain">
                            {allDone ? "You're all set! 🎉" : 'Get started with Voicory'}
                        </h3>
                        <p className="text-xs text-textMuted mt-0.5">
                            {allDone
                                ? 'Your assistant is live and ready for calls.'
                                : `${completedCount} of 4 steps complete`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Progress bar */}
                    {!allDone && (
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-700"
                                    style={{ width: `${(completedCount / 4) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-textMuted font-medium">{completedCount}/4</span>
                        </div>
                    )}

                    {/* Dismiss button */}
                    <button
                        onClick={() => {
                            localStorage.setItem(DISMISSED_KEY, 'true');
                            setDismissed(true);
                        }}
                        className="p-1.5 rounded-lg text-textMuted hover:text-textMain hover:bg-white/5 transition-colors"
                        title="Dismiss"
                    >
                        <X size={16} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Steps grid */}
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isNext = idx === nextStepIndex;
                    const isDone = step.done;

                    return (
                        <button
                            key={step.id}
                            onClick={() => navigate(step.actionPath)}
                            className={`
                                group relative p-4 rounded-xl border text-left transition-all duration-200
                                ${isDone
                                    ? 'border-emerald-500/20 bg-emerald-500/5 cursor-default'
                                    : isNext
                                        ? 'border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10'
                                        : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                                }
                            `}
                        >
                            {/* Pulse ring for next step */}
                            {isNext && !isDone && (
                                <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                                </span>
                            )}

                            {/* Icon */}
                            <div className={`
                                w-9 h-9 rounded-lg flex items-center justify-center mb-3
                                bg-gradient-to-br ${step.gradient}
                                ${isDone ? 'opacity-60' : 'opacity-100'}
                                shadow-lg
                            `}>
                                <Icon size={18} weight="fill" className="text-white" />
                            </div>

                            {/* Title + status */}
                            <div className="flex items-start justify-between gap-1 mb-1">
                                <p className={`text-sm font-semibold leading-tight ${isDone ? 'text-textMuted line-through' : 'text-textMain'}`}>
                                    {step.title}
                                </p>
                                {isDone
                                    ? <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
                                    : <Circle size={16} weight="regular" className="text-white/20 shrink-0 mt-0.5" />
                                }
                            </div>

                            {/* Description */}
                            <p className="text-xs text-textMuted leading-relaxed mb-3">
                                {step.description}
                            </p>

                            {/* CTA */}
                            {!isDone && (
                                <div className={`
                                    flex items-center gap-1 text-xs font-medium
                                    ${isNext ? 'text-primary' : 'text-textMuted group-hover:text-textMain'}
                                    transition-colors
                                `}>
                                    {step.action}
                                    <ArrowRight
                                        size={12}
                                        weight="bold"
                                        className="group-hover:translate-x-0.5 transition-transform"
                                    />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* All done banner */}
            {allDone && (
                <div className="relative mt-4 flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={18} weight="fill" className="text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">
                            Setup complete — your AI assistant is live!
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.setItem(DISMISSED_KEY, 'true');
                            setDismissed(true);
                        }}
                        className="text-xs text-textMuted hover:text-textMain transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
};

export default OnboardingChecklist;
