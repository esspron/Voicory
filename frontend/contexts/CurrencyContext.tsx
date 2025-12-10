import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type Currency = 'USD' | 'INR';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    currencySymbol: string;
    formatAmount: (amount: number, options?: FormatOptions) => string;
    convertToDisplay: (amountInUSD: number) => number;
}

interface FormatOptions {
    decimals?: number;
    showSymbol?: boolean;
}

const CURRENCY_CONFIG: Record<Currency, { symbol: string; exchangeRate: number; locale: string }> = {
    USD: { symbol: '$', exchangeRate: 1, locale: 'en-US' },
    INR: { symbol: '₹', exchangeRate: 83, locale: 'en-IN' }, // Approximate exchange rate
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Default to USD, can be extended to persist in localStorage or user profile
    const [currency, setCurrency] = useState<Currency>('USD');

    const currencyConfig = CURRENCY_CONFIG[currency];
    const currencySymbol = currencyConfig.symbol;

    const convertToDisplay = useCallback((amountInUSD: number): number => {
        return amountInUSD * currencyConfig.exchangeRate;
    }, [currencyConfig.exchangeRate]);

    const formatAmount = useCallback((amount: number, options?: FormatOptions): string => {
        const { decimals = 2, showSymbol = true } = options || {};
        const displayAmount = convertToDisplay(amount);
        const formattedNumber = displayAmount.toFixed(decimals);
        
        return showSymbol ? `${currencySymbol}${formattedNumber}` : formattedNumber;
    }, [convertToDisplay, currencySymbol]);

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrency,
            currencySymbol,
            formatAmount,
            convertToDisplay,
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
