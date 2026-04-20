import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

export type Currency = 'USD' | 'INR';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    currencySymbol: string;
    formatAmount: (amountUSD: number, options?: FormatOptions) => string;
    convertToDisplay: (amountInUSD: number) => number;
    convertToUsd: (amountInLocal: number) => number;
    isIndia: boolean;
    loaded: boolean;
    usdInrRate: number;
}

interface FormatOptions {
    decimals?: number;
    showSymbol?: boolean;
}

const FALLBACK_RATE = 85;
const RATE_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<Currency>('USD');
    const [loaded, setLoaded] = useState(false);
    const [usdInrRate, setUsdInrRate] = useState(FALLBACK_RATE);
    const rateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch live forex rate
    const fetchForexRate = useCallback(async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/paddle/forex`);
            if (res.ok) {
                const data = await res.json();
                if (data.usdInr && typeof data.usdInr === 'number') {
                    setUsdInrRate(data.usdInr);
                }
            }
        } catch {
            // Keep existing rate
        }
    }, []);

    // Load currency from user profile + start forex polling
    useEffect(() => {
        // Fetch forex rate immediately and then every 10 min
        fetchForexRate();
        rateInterval.current = setInterval(fetchForexRate, RATE_REFRESH_INTERVAL);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                try {
                    const { data } = await supabase
                        .from('user_profiles')
                        .select('currency, country')
                        .eq('user_id', session.user.id)
                        .single();

                    if (data?.currency === 'INR' || data?.country === 'IN') {
                        setCurrencyState('INR');
                    } else {
                        setCurrencyState('USD');
                    }
                } catch {
                    // default stays USD
                }
            } else if (event === 'SIGNED_OUT') {
                setCurrencyState('USD');
            }
            setLoaded(true);
        });

        return () => {
            subscription.unsubscribe();
            if (rateInterval.current) clearInterval(rateInterval.current);
        };
    }, [fetchForexRate]);

    const setCurrency = useCallback((c: Currency) => {
        setCurrencyState(c);
    }, []);

    const currencySymbol = currency === 'INR' ? '₹' : '$';
    const isIndia = currency === 'INR';

    const convertToDisplay = useCallback((amountInUSD: number): number => {
        if (currency === 'INR') return amountInUSD * usdInrRate;
        return amountInUSD;
    }, [currency, usdInrRate]);

    const convertToUsd = useCallback((amountInLocal: number): number => {
        if (currency === 'INR') return amountInLocal / usdInrRate;
        return amountInLocal;
    }, [currency, usdInrRate]);

    const formatAmount = useCallback((amountUSD: number, options?: FormatOptions): string => {
        const { decimals, showSymbol = true } = options || {};

        if (currency === 'INR') {
            const inr = amountUSD * usdInrRate;
            // For small amounts show 2 decimals, for large amounts show whole numbers
            const dp = inr < 10 ? 2 : 0;
            const formatted = dp === 0
                ? Math.round(inr).toLocaleString('en-IN')
                : inr.toFixed(2);
            return showSymbol ? `₹${formatted}` : formatted;
        }

        const dp = decimals ?? (amountUSD < 0.01 ? 6 : 2);
        const formatted = amountUSD.toFixed(dp);
        return showSymbol ? `$${formatted}` : formatted;
    }, [currency, usdInrRate]);

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrency,
            currencySymbol,
            formatAmount,
            convertToDisplay,
            convertToUsd,
            isIndia,
            loaded,
            usdInrRate,
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
