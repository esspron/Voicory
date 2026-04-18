/**
 * hooks/useNetworkStatus.ts
 *
 * Detects online/offline connectivity using AppState + periodic fetch pings.
 * Works without @react-native-community/netinfo or expo-network.
 *
 * Returns:
 *  - isOnline: boolean (true = connected, false = offline)
 *  - isChecking: boolean (true during the initial check)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const PING_URL = 'https://www.google.com/generate_204';
const PING_INTERVAL_MS = 15_000;      // check every 15s when app is active
const PING_TIMEOUT_MS = 5_000;
const RETRY_WHEN_OFFLINE_MS = 5_000;  // recheck faster when known offline

async function ping(): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(PING_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.status === 204 || res.ok;
  } catch {
    clearTimeout(id);
    return false;
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const scheduleCheck = useCallback((online: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = online ? PING_INTERVAL_MS : RETRY_WHEN_OFFLINE_MS;
    timerRef.current = setTimeout(checkNow, delay);
  }, []);

  const checkNow = useCallback(async () => {
    if (!isMounted.current) return;
    const online = await ping();
    if (!isMounted.current) return;
    setIsOnline(online);
    setIsChecking(false);
    scheduleCheck(online);
  }, [scheduleCheck]);

  useEffect(() => {
    isMounted.current = true;

    // Initial check
    checkNow();

    // Re-check when app comes to foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkNow();
      } else {
        // Cancel scheduled checks when backgrounded to save battery
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [checkNow]);

  return { isOnline, isChecking };
}
