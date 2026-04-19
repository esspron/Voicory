/**
 * appStore — Zustand store for global app UI state.
 * Tracks tab badge counts, notification state, and app-level loading flags.
 */
import { create } from 'zustand';
import Constants from 'expo-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

type NetworkStatus = 'online' | 'offline';

interface AppState {
  onboardingComplete: boolean;
  networkStatus: NetworkStatus;
  appVersion: string;
  lastSyncAt: number | null; // Unix timestamp (ms)
}

interface AppActions {
  setOnboardingComplete: (complete: boolean) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  setLastSyncAt: (ts: number) => void;
  resetAppStore: () => void;
}

type AppStore = AppState & AppActions;

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  onboardingComplete: false,
  networkStatus: 'online',
  appVersion: (Constants.expoConfig?.version as string) ?? '1.0.0',
  lastSyncAt: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),

  setNetworkStatus: (status) => set({ networkStatus: status }),

  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),

  resetAppStore: () => set({ ...initialState }),
}));
