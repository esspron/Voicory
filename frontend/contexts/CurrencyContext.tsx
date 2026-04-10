import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type Currency = 'USD' | 'INR';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    currencySymbol: string;
    formatAmount: (amountUSD: number, options?: FormatOptions) => string;
    convertToDisplay: (amountInUSD: number) => number;
    isIndia: boolean;
    loaded: boolean;
}

interface FormatOptions {
    decimals?: number;
    showSymbol?: boolean;
}

const INR_RATE = 84; // 1 USD = ₹84 — update quarterly

const CURRENCY_CONFIG: Record<Currency, { symbol: string; exchangeRate: number; locale: string }> = {
    USD: { symbol: '$', exchangeRate: 1, locale: 'en-US' },
    INR: { symbol: '₹', exchangeRate: INR_RATE, locale: 'en-IN' },
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<Currency>('USD');
    const [loaded, setLoaded] = useState(false);

    // Load currency from user profile on auth state change
    useEffect(() => {
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

        return () => subscription.unsubscribe();
    }, []);

    const setCurrency = useCallback((c: Currency) => {
        setCurrencyState(c);
    }, []);

    const currencyConfig = CURRENCY_CONFIG[currency];
    const currencySymbol = currencyConfig.symbol;
    const isIndia = currency === 'INR';

    const convertToDisplay = useCallback((amountInUSD: number): number => {
        return amountInUSD * currencyConfig.exchangeRate;
    }, [currencyConfig.exchangeRate]);

    const formatAmount = useCallback((amountUSD: number, options?: FormatOptions): string => {
        const { decimals, showSymbol = true } = options || {};

        if (currency === 'INR') {
            const inr = Math.round(amountUSD * INR_RATE);
            const formatted = inr.toLocaleString('en-IN');
            return showSymbol ? `₹${formatted}` : formatted;
        }

        const dp = decimals ?? (amountUSD < 0.01 ? 6 : 2);
        const formatted = amountUSD.toFixed(dp);
        return showSymbol ? `$${formatted}` : formatted;
    }, [currency]);

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrency,
            currencySymbol,
            formatAmount,
            convertToDisplay,
            isIndia,
            loaded,
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
