import { useState, useCallback } from 'react';

/**
 * Custom hook for managing clipboard operations with feedback state.
 * Provides copy functionality with automatic success/failure state management.
 *
 * @param duration - How long to show the "copied" state (default: 2000ms)
 * @returns Object with copy function, copied state, and error state
 *
 * @example
 * ```tsx
 * const { copy, copied, error } = useClipboard();
 *
 * <button onClick={() => copy(apiKey)}>
 *   {copied ? 'Copied!' : 'Copy API Key'}
 * </button>
 * ```
 */
export function useClipboard(duration: number = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    async (text: string) => {
      if (!navigator?.clipboard) {
        setError(new Error('Clipboard API not supported'));
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setError(null);

        setTimeout(() => {
          setCopied(false);
        }, duration);

        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to copy'));
        setCopied(false);
        return false;
      }
    },
    [duration]
  );

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  return { copy, copied, error, reset };
}
