/**
 * PressableScale.tsx — Drop-in replacement for TouchableOpacity
 * Scales to 0.97 on press with a spring animation and bounces back on release.
 * Accepts the same props as TouchableOpacity.
 */

import React, { useRef, useCallback } from 'react';
import {
  Animated,
  Pressable,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { pressIn, pressOut } from '../lib/animations';

interface Props {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** Override the pressed scale (default 0.97) */
  scaleValue?: number;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
}

export function PressableScale({
  onPress,
  onLongPress,
  disabled,
  style,
  children,
  hitSlop,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (!disabled) pressIn(scale);
  }, [disabled]);

  const handlePressOut = useCallback(() => {
    pressOut(scale);
  }, []);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={{ opacity: 1 }}
    >
      <Animated.View
        style={[style, { transform: [{ scale }] }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default PressableScale;
