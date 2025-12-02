import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Custom hook for responsive design based on Tailwind breakpoints.
 * Uses matchMedia for performance and accurate breakpoint detection.
 *
 * @param breakpoints - Custom breakpoint values (optional)
 * @returns Object with current breakpoint and boolean helpers
 *
 * @example
 * ```tsx
 * const { isMobile, isDesktop, breakpoint, isAbove, isBelow } = useBreakpoint();
 *
 * // Conditional rendering
 * {isMobile ? <MobileNav /> : <DesktopNav />}
 *
 * // Specific breakpoint checks
 * {isAbove('md') && <Sidebar />}
 * {isBelow('lg') && <MobileMenu />}
 * ```
 */
export function useBreakpoint(breakpoints: BreakpointConfig = defaultBreakpoints) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('md');
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      // Determine current breakpoint
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    // Initial check
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoints]);

  const isAbove = (breakpoint: Breakpoint): boolean => {
    return windowWidth >= breakpoints[breakpoint];
  };

  const isBelow = (breakpoint: Breakpoint): boolean => {
    return windowWidth < breakpoints[breakpoint];
  };

  const isBetween = (min: Breakpoint, max: Breakpoint): boolean => {
    return windowWidth >= breakpoints[min] && windowWidth < breakpoints[max];
  };

  return {
    breakpoint: currentBreakpoint,
    windowWidth,
    // Convenience booleans
    isMobile: windowWidth < breakpoints.md,
    isTablet: isBetween('md', 'lg'),
    isDesktop: windowWidth >= breakpoints.lg,
    // Utility functions
    isAbove,
    isBelow,
    isBetween,
  };
}

/**
 * Simple hook to check if viewport is mobile size.
 * Lighter alternative when you only need mobile detection.
 *
 * @param breakpoint - Max width to consider "mobile" (default: 768)
 * @returns boolean indicating if viewport is mobile
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * ```
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    setIsMobile(query.matches);

    // Listen for changes
    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, [breakpoint]);

  return isMobile;
}
