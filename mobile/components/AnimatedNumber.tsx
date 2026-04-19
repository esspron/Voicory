/**
 * AnimatedNumber — Smoothly animates a numeric value change.
 * Useful for dashboard stats that update in real-time.
 *
 * @param value - The target number to animate to
 * @param style - Optional TextStyle overrides
 * @param prefix - Optional prefix string (e.g. "$")
 * @param suffix - Optional suffix string (e.g. "%")
 * @param decimals - Number of decimal places to display
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════════
// AnimatedNumber — counts from 0 to target with ease-out cubic
// Supports prefix (₹), suffix (%), comma-formatting, decimals
// ═══════════════════════════════════════════════════════════════════════════════

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle | TextStyle[];
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
  duration?: number;
}

export function AnimatedNumber({
  value,
  style,
  prefix = '',
  suffix = '',
  decimals = 0,
  delay = 0,
  duration = 900,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayed(0);
      return;
    }

    const startTime = Date.now() + delay;
    let rafId: ReturnType<typeof setTimeout>;

    const step = () => {
      const now = Date.now();
      if (now < startTime) {
        rafId = setTimeout(step, 16);
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startRef.current + (value - startRef.current) * eased;
      setDisplayed(current);
      if (progress < 1) {
        rafId = setTimeout(step, 16);
      } else {
        setDisplayed(value);
      }
    };

    rafId = setTimeout(step, 16);
    return () => clearTimeout(rafId);
  }, [value, delay, duration]);

  const formatted =
    decimals > 0
      ? displayed.toFixed(decimals)
      : Math.floor(displayed).toLocaleString('en-IN');

  return (
    <Text style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}
