import React from 'react';
import { View, StyleSheet, Platform, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../lib/theme';

interface ScreenContainerProps extends ViewProps {
  /** Override background color */
  bg?: string;
  /** Include bottom padding for tab bar */
  withTabBar?: boolean;
  children: React.ReactNode;
}

/**
 * Standard screen wrapper with safe area insets.
 * Use this instead of manual paddingTop calculations.
 */
export function ScreenContainer({ bg, withTabBar, children, style, ...rest }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg ?? colors.bg,
          paddingTop: insets.top,
          paddingBottom: withTabBar ? 0 : insets.bottom,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
