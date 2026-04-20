'use strict';
/**
 * forex.js — Live USD/INR exchange rate service
 *
 * Fetches live rate from exchangerate.host (free, no API key needed).
 * Caches in Redis for 15 minutes to avoid hammering the API.
 * Falls back to last-known rate → hardcoded floor if all else fails.
 *
 * Usage:
 *   const { getUsdInrRate, convertUsdToInr, convertInrToUsd } = require('./forex');
 *   const rate = await getUsdInrRate();     // e.g. 84.52
 *   const inr  = await convertUsdToInr(10); // e.g. 845.2
 *   const usd  = await convertInrToUsd(845);// e.g. 9.994
 */

const { cacheGet, cacheSet } = require('./cache');

const CACHE_KEY = 'forex:usdinr';
const CACHE_TTL = 900; // 15 minutes
const FALLBACK_RATE = 85; // Last-resort hardcoded floor

/**
 * Fetch live USD/INR rate from multiple free sources (with fallback chain).
 */
async function fetchLiveRate() {
    const sources = [
        {
            name: 'exchangerate-api',
            url: 'https://open.er-api.com/v6/latest/USD',
            parse: (json) => json?.rates?.INR,
        },
        {
            name: 'frankfurter',
            url: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR',
            parse: (json) => json?.rates?.INR,
        },
    ];

    for (const source of sources) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(source.url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) continue;

            const json = await res.json();
            const rate = source.parse(json);

            if (rate && typeof rate === 'number' && rate > 50 && rate < 150) {
                console.log(`[forex] ${source.name}: USD/INR = ${rate}`);
                return rate;
            }
        } catch (e) {
            console.warn(`[forex] ${source.name} failed:`, e.message);
        }
    }

    return null;
}

/**
 * Get the current USD/INR rate (cached).
 * @returns {Promise<number>} The exchange rate
 */
async function getUsdInrRate() {
    // 1. Check Redis cache
    try {
        const cached = await cacheGet(CACHE_KEY);
        if (cached) {
            const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
            if (parsed.rate && Date.now() - parsed.ts < CACHE_TTL * 1000) {
                return parsed.rate;
            }
        }
    } catch (e) {
        // Cache miss, continue
    }

    // 2. Fetch live
    const liveRate = await fetchLiveRate();

    if (liveRate) {
        // Cache it
        try {
            await cacheSet(CACHE_KEY, JSON.stringify({ rate: liveRate, ts: Date.now() }), CACHE_TTL);
        } catch (e) {
            console.warn('[forex] cache write failed:', e.message);
        }
        return liveRate;
    }

    // 3. Try stale cache (any age)
    try {
        const stale = await cacheGet(CACHE_KEY);
        if (stale) {
            const parsed = typeof stale === 'string' ? JSON.parse(stale) : stale;
            if (parsed.rate) {
                console.warn(`[forex] using stale rate: ${parsed.rate}`);
                return parsed.rate;
            }
        }
    } catch (e) {
        // Fall through
    }

    // 4. Hardcoded fallback
    console.error(`[forex] all sources failed, using fallback rate: ${FALLBACK_RATE}`);
    return FALLBACK_RATE;
}

/**
 * Convert USD to INR at live rate.
 * @param {number} usd - Amount in USD
 * @returns {Promise<{inr: number, rate: number}>}
 */
async function convertUsdToInr(usd) {
    const rate = await getUsdInrRate();
    return { inr: Math.round(usd * rate * 100) / 100, rate };
}

/**
 * Convert INR to USD at live rate.
 * @param {number} inr - Amount in INR
 * @returns {Promise<{usd: number, rate: number}>}
 */
async function convertInrToUsd(inr) {
    const rate = await getUsdInrRate();
    return { usd: Math.round((inr / rate) * 1000000) / 1000000, rate };
}

module.exports = { getUsdInrRate, convertUsdToInr, convertInrToUsd };
