/**
 * Custom React Hooks
 *
 * A collection of reusable hooks for common patterns in the Voicory Dashboard.
 * All hooks are typed, documented, and follow React best practices.
 *
 * @module hooks
 */

// Debounce hooks for search, API calls, and expensive operations
export { useDebounce, useDebouncedCallback } from './useDebounce';

// LocalStorage hook with cross-tab sync
export { useLocalStorage } from './useLocalStorage';

// Async operation state management
export { useAsync, useAsyncCallback } from './useAsync';
export type { AsyncStatus, UseAsyncReturn } from './useAsync';

// Clipboard operations
export { useClipboard } from './useClipboard';

// Responsive design helpers
export { useBreakpoint, useIsMobile } from './useBreakpoint';

// Intersection Observer for lazy loading and scroll animations
export { useIntersectionObserver, useScrollProgress } from './useIntersectionObserver';
