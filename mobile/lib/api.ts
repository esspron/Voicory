import { supabase } from './supabase';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://voicory-backend-783942490798.asia-south1.run.app';

export async function authFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...options?.headers,
    },
  });

  return response;
}

export async function authFetchJSON<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await authFetch(path, options);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<T>;
}
