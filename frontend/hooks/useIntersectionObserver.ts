import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  /** Root element for intersection (default: viewport) */
  root?: Element | null;
  /** Margin around root (e.g., "10px 20px") */
  rootMargin?: string;
  /** Threshold(s) at which callback fires (0-1) */
  threshold?: number | number[];
  /** Only trigger once when element becomes visible */
  triggerOnce?: boolean;
  /** Skip observation if condition is false */
  skip?: boolean;
}

interface UseIntersectionObserverReturn {
  /** Ref to attach to the observed element */
  ref: React.RefObject<HTMLElement | null>;
  /** Whether element is currently in view */
  inView: boolean;
  /** The raw IntersectionObserverEntry */
  entry: IntersectionObserverEntry | null;
}

/**
 * Custom hook for detecting when an element enters or leaves the viewport.
 * Useful for lazy loading, animations on scroll, infinite scroll, and analytics.
 *
 * @param options - Configuration options
 * @returns Object with ref, inView state, and entry
 *
 * @example
 * ```tsx
 * // Basic usage - animate when in view
 * const { ref, inView } = useIntersectionObserver();
 *
 * <motion.div ref={ref} animate={{ opacity: inView ? 1 : 0 }}>
 *   Content
 * </motion.div>
 *
 * // Lazy load images
 * const { ref, inView } = useIntersectionObserver({ triggerOnce: true });
 *
 * <div ref={ref}>
 *   {inView && <img src={heavyImage} alt="..." />}
 * </div>
 *
 * // Infinite scroll
 * const { ref, inView } = useIntersectionObserver({ threshold: 0.5 });
 *
 * useEffect(() => {
 *   if (inView && hasMore) {
 *     loadMoreItems();
 *   }
 * }, [inView]);
 *
 * <div ref={ref}>Loading more...</div>
 * ```
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    triggerOnce = false,
    skip = false,
  } = options;

  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Skip if not supported or if skip option is true
    if (typeof IntersectionObserver === 'undefined' || skip) return;

    // Skip if already triggered once
    if (triggerOnce && hasTriggered.current) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([observerEntry]) => {
        if (observerEntry) {
          setEntry(observerEntry);
          setInView(observerEntry.isIntersecting);

          if (observerEntry.isIntersecting && triggerOnce) {
            hasTriggered.current = true;
            observer.disconnect();
          }
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce, skip]);

  return { ref, inView, entry };
}

/**
 * Hook for tracking scroll position relative to an element.
 * Returns a progress value from 0 to 1 as the element scrolls through the viewport.
 *
 * @example
 * ```tsx
 * const { ref, progress } = useScrollProgress();
 *
 * <motion.div
 *   ref={ref}
 *   style={{ opacity: progress, scale: 0.8 + (0.2 * progress) }}
 * >
 *   Parallax Content
 * </motion.div>
 * ```
 */
export function useScrollProgress() {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Calculate progress: 0 when element enters bottom, 1 when leaves top
    const elementTop = rect.top;
    const elementHeight = rect.height;

    // Progress from 0 (element bottom at viewport bottom) to 1 (element top at viewport top)
    const rawProgress = 1 - (elementTop + elementHeight) / (windowHeight + elementHeight);

    // Clamp between 0 and 1
    setProgress(Math.max(0, Math.min(1, rawProgress)));
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return { ref, progress };
}
