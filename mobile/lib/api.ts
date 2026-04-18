/**
 * lib/api.ts — Centralized API client for Voicory mobile
 *
 * Features:
 *  - Auth token injection from Supabase session
 *  - Retry logic (3 retries with exponential backoff)
 *  - Timeout handling (10s default)
 *  - Error normalization
 *  - Request/response logging in __DEV__
 *  - 401 → global logout via registered callback
 */

import { supabase } from './supabase';

// ─── Config ────────────────────────────────────────────────────────────────────

export const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined) ||
  'https://voicory-backend-783942490798.asia-south1.run.app';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

// ─── Global 401 handler ────────────────────────────────────────────────────────

type LogoutCallback = () => void | Promise<void>;
let _onUnauthorized: LogoutCallback | null = null;

/**
 * Register a global callback to handle 401 responses (auto-logout).
 * Typically called once in the root layout or AuthContext.
 */
export function registerUnauthorizedHandler(cb: LogoutCallback): void {
  _onUnauthorized = cb;
}

// ─── Error types ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message?: string) {
    super(message ?? `API error ${status}: ${body}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends NetworkError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
    promise.then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
}

function isRetryable(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  if (err instanceof NetworkError) return true;
  if (err instanceof ApiError) {
    // Retry 5xx (except 501 Not Implemented) and 429
    return err.status === 429 || (err.status >= 500 && err.status !== 501);
  }
  return false;
}

// ─── Core fetch wrapper ────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  /** Override retry count (default: MAX_RETRIES) */
  maxRetries?: number;
  /** Skip auth header injection */
  skipAuth?: boolean;
}

async function _doFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, skipAuth = false, ...fetchInit } = options;

  // Inject auth token
  let authHeader: Record<string, string> = {};
  if (!skipAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      authHeader = { Authorization: `Bearer ${session.access_token}` };
    }
  }

  const finalInit: RequestInit = {
    ...fetchInit,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(fetchInit.headers as Record<string, string> | undefined),
    },
  };

  if (__DEV__) {
    console.log(`[API] → ${finalInit.method ?? 'GET'} ${url}`);
  }

  let response: Response;
  try {
    response = await withTimeout(fetch(url, finalInit), timeoutMs);
  } catch (err) {
    if (err instanceof TimeoutError || err instanceof NetworkError) throw err;
    throw new NetworkError('Network request failed', err);
  }

  if (__DEV__) {
    console.log(`[API] ← ${response.status} ${url}`);
  }

  return response;
}

/**
 * Low-level fetch with retry + auth + timeout. Returns raw Response.
 */
export async function authFetch(
  path: string,
  options: FetchOptions = {},
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 200ms, 400ms, 800ms
      await sleep(200 * Math.pow(2, attempt - 1));
    }

    let response: Response;
    try {
      response = await _doFetch(url, options);
    } catch (err) {
      lastError = err;
      if (isRetryable(err) && attempt < maxRetries) continue;
      throw err;
    }

    // Handle 401 globally
    if (response.status === 401) {
      if (_onUnauthorized) {
        await _onUnauthorized();
      }
      throw new ApiError(401, 'Unauthorized', 'Session expired. Please log in again.');
    }

    // Retry 5xx / 429
    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
      // For 429, respect Retry-After if present
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const waitMs = (parseInt(retryAfter, 10) || 1) * 1000;
        await sleep(Math.min(waitMs, 8_000));
      }
      lastError = new ApiError(response.status, await response.clone().text());
      continue;
    }

    return response;
  }

  throw lastError ?? new NetworkError('Request failed after retries');
}

/**
 * Fetch JSON with retry + auth. Throws ApiError on non-2xx.
 */
export async function authFetchJSON<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await authFetch(path, options);

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

/**
 * POST helper — automatically JSON-serializes body.
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  options: FetchOptions = {},
): Promise<T> {
  return authFetchJSON<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * GET helper.
 */
export async function apiGet<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  return authFetchJSON<T>(path, { method: 'GET', ...options });
}
