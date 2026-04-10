/**
 * GeoIP & Currency Service
 * Detects user's country and sets appropriate currency
 * India → INR (₹), Others → USD ($)
 */

export interface GeoInfo {
  country: string;       // ISO2 e.g. "IN", "US"
  currency: string;      // "INR" or "USD"
  currencySymbol: string; // "₹" or "$"
  isIndia: boolean;
}

export const DEFAULT_GEO: GeoInfo = {
  country: 'US',
  currency: 'USD',
  currencySymbol: '$',
  isIndia: false,
};

/**
 * Detect country via ipapi.co (free, no key needed, 1000 req/day)
 */
export async function detectGeo(): Promise<GeoInfo> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return DEFAULT_GEO;
    const data = await res.json();
    const country = (data.country_code || 'US').toUpperCase();
    const isIndia = country === 'IN';
    return {
      country,
      currency: isIndia ? 'INR' : 'USD',
      currencySymbol: isIndia ? '₹' : '$',
      isIndia,
    };
  } catch {
    return DEFAULT_GEO;
  }
}

/**
 * Format a credit amount for display using user's currency
 * Credits are always 1:1 with USD internally.
 * For INR display: multiply by ~84 (fixed rate)
 */
const INR_RATE = 84; // 1 USD = ₹84 (update quarterly)
export const MIN_TOPUP_USD = 20;
export const MIN_TOPUP_INR = 1500; // ≈ $18 (slight discount for India)

export function formatCredits(usdAmount: number, currency: string, currencySymbol: string): string {
  if (currency === 'INR') {
    const inr = Math.round(usdAmount * INR_RATE);
    return `${currencySymbol}${inr.toLocaleString('en-IN')}`;
  }
  return `${currencySymbol}${usdAmount.toFixed(2)}`;
}

export function formatBalance(usdCredits: number, currency: string, currencySymbol: string): string {
  if (currency === 'INR') {
    const inr = Math.round(usdCredits * INR_RATE);
    return `${currencySymbol}${inr.toLocaleString('en-IN')}`;
  }
  return `${currencySymbol}${usdCredits.toFixed(2)}`;
}

export function getQuickAmounts(currency: string): number[] {
  // These are USD amounts passed to Paddle; Paddle converts to INR for Indian cards
  if (currency === 'INR') return [20, 50, 100, 200, 500]; // Paddle handles INR conversion
  return [20, 50, 100, 200, 500];
}

export function getMinTopup(currency: string): number {
  return MIN_TOPUP_USD; // Always $20 minimum (Paddle converts to ₹~1680 for INR)
}

export function displayAmount(usdAmount: number, currency: string, currencySymbol: string): string {
  if (currency === 'INR') {
    return `${currencySymbol}${Math.round(usdAmount * INR_RATE).toLocaleString('en-IN')}`;
  }
  return `${currencySymbol}${usdAmount}`;
}

export function pricingLabel(perUnit: number, unit: string, currency: string, currencySymbol: string): string {
  if (currency === 'INR') {
    const inr = (perUnit * INR_RATE).toFixed(2);
    return `${currencySymbol}${inr}/${unit}`;
  }
  return `${currencySymbol}${perUnit}/${unit}`;
}
