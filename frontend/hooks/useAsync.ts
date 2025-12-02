import { useState, useCallback } from 'react';

/**
 * Possible states for an async operation
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Return type for the useAsync hook
 */
export interface UseAsyncReturn<T, E = Error> {
  /** Current data from the last successful execution */
  data: T | null;
  /** Error from the last failed execution */
  error: E | null;
  /** Current status of the async operation */
  status: AsyncStatus;
  /** Whether the operation is currently loading */
  isLoading: boolean;
  /** Whether the operation completed successfully */
  isSuccess: boolean;
  /** Whether the operation failed */
  isError: boolean;
  /** Execute the async function */
  execute: (...args: Parameters<() => Promise<T>>) => Promise<T | null>;
  /** Reset state to initial values */
  reset: () => void;
}

/**
 * Custom hook for handling async operations with loading, error, and success states.
 * Perfect for API calls, form submissions, and any async operation that needs state tracking.
 *
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount (default: false)
 * @returns Object with data, error, status, and control functions
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, error, isLoading, execute } = useAsync(fetchUsers);
 *
 * // With immediate execution
 * const { data: users } = useAsync(fetchUsers, true);
 *
 * // In a component
 * const { data, isLoading, error, execute } = useAsync(
 *   () => api.createAssistant(formData)
 * );
 *
 * const handleSubmit = async () => {
 *   const result = await execute();
 *   if (result) {
 *     toast.success('Assistant created!');
 *   }
 * };
 * ```
 */
export function useAsync<T, E = Error>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = false
): UseAsyncReturn<T, E> {
  const [status, setStatus] = useState<AsyncStatus>(immediate ? 'loading' : 'idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    setStatus('loading');
    setError(null);

    try {
      const response = await asyncFunction();
      setData(response);
      setStatus('success');
      return response;
    } catch (err) {
      setError(err as E);
      setStatus('error');
      return null;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  // Execute immediately if specified
  // Using a ref pattern to handle initial execution
  if (immediate && status === 'idle') {
    setStatus('loading');
    asyncFunction()
      .then((response) => {
        setData(response);
        setStatus('success');
      })
      .catch((err: E) => {
        setError(err);
        setStatus('error');
      });
  }

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    execute,
    reset,
  };
}

/**
 * Hook variant that accepts parameters for the async function.
 * Use this when your async function needs dynamic arguments.
 *
 * @example
 * ```tsx
 * const { execute, isLoading } = useAsyncCallback(
 *   (id: string) => api.deleteAssistant(id)
 * );
 *
 * const handleDelete = (assistantId: string) => {
 *   execute(assistantId);
 * };
 * ```
 */
export function useAsyncCallback<T, Args extends unknown[], E = Error>(
  asyncFunction: (...args: Args) => Promise<T>
): Omit<UseAsyncReturn<T, E>, 'execute'> & {
  execute: (...args: Args) => Promise<T | null>;
} {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setStatus('loading');
      setError(null);

      try {
        const response = await asyncFunction(...args);
        setData(response);
        setStatus('success');
        return response;
      } catch (err) {
        setError(err as E);
        setStatus('error');
        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    execute,
    reset,
  };
}
