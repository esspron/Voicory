/**
 * stores/index.ts — Barrel export for all Zustand stores.
 * Import stores from this file for consistent, single-path access.
 */
export { useAppStore } from './appStore';
export type { } from './appStore';

export { useAuthStore } from './authStore';
export type { UserProfile, OrgInfo } from './authStore';

export { useCallStore } from './callStore';

export { useCustomerStore } from './customerStore';
