import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useDebounce, useDebouncedCallback } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Initial value
    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated' });

    // Value should still be initial (not yet debounced)
    expect(result.current).toBe('initial');

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'd' });
    act(() => vi.advanceTimersByTime(100));

    // Still waiting for debounce
    expect(result.current).toBe('a');

    // Complete debounce
    act(() => vi.advanceTimersByTime(200));

    // Should have latest value
    expect(result.current).toBe('d');
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('initial');

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('updated');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Call multiple times rapidly
    act(() => {
      result.current('a');
      result.current('b');
      result.current('c');
    });

    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled();

    // Wait for debounce
    act(() => vi.advanceTimersByTime(300));

    // Should be called once with last argument
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('c');
  });
});
