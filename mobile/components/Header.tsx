/**
 * Header — Standard screen header component.
 * Shows a title, optional back button, and optional right-side action buttons.
 * Handles safe-area top inset automatically.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radii } from '../lib/theme';
import * as haptics from '../lib/haptics';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface HeaderAction {
  /** Ionicons icon name */
  icon: string;
  onPress: () => void;
  /** Accessible label */
  label?: string;
  /** Colour for icon */
  color?: string;
}

interface HeaderProps {
  /** Screen title shown in the centre */
  title: string;
  /** Whether to show back button on the left (default: true) */
  showBack?: boolean;
  /** Override the default back handler */
  onBack?: () => void;
  /** Optional right-side action button */
  rightAction?: HeaderAction;
  /** Extra vertical padding below header content (default: 0) */
  bottomPadding?: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Header({
  title,
  showBack = true,
  onBack,
  rightAction,
  bottomPadding = 0,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    haptics.lightTap();
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleRightAction = () => {
    haptics.lightTap();
    rightAction?.onPress();
  };

  const topPad = insets.top > 0 ? insets.top : Platform.OS === 'android' ? 24 : 44;

  return (
    <View style={styles.wrapper}>
      {/* Dark gradient background — creates a semi-transparent glass feel */}
      <LinearGradient
        colors={['rgba(5,10,18,0.97)', 'rgba(5,10,18,0.85)', 'rgba(5,10,18,0.0)']}
        locations={[0, 0.82, 1]}
        style={[styles.gradient, { paddingTop: topPad }]}
      >
        <View style={[styles.row, { paddingBottom: bottomPadding }]}>
          {/* Left — Back button */}
          <View style={styles.side}>
            {showBack && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleBack}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Centre — Title */}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {/* Right — Action button */}
          <View style={styles.side}>
            {rightAction && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleRightAction}
                activeOpacity={0.7}
                accessibilityLabel={rightAction.label ?? 'Action'}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={rightAction.icon as any}
                  size={22}
                  color={rightAction.color ?? colors.text}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  gradient: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: spacing.sm,
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    ...typography.h3,
    letterSpacing: -0.2,
  },
});
