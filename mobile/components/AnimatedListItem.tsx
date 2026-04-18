/**
 * AnimatedListItem.tsx — Staggered FlatList item entrance animation
 * Wraps any content; use inside FlatList's renderItem for staggered fadeInUp.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { fadeInUp } from '../lib/animations';

interface Props {
  index: number;
  staggerMs?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedListItem({ index, staggerMs = 55, children, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    fadeInUp(
      { opacity, translateY },
      { delay: index * staggerMs, duration: 260 }
    ).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default AnimatedListItem;
