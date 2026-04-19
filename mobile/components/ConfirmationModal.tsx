import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet } from './BottomSheet';
import { colors as C, typography, spacing, radii } from '../lib/theme';

export interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;

  /** Ionicons icon name shown in the circle at top */
  icon?: string;
  /** Gradient colors for the icon circle. Defaults to danger red. */
  iconGradient?: [string, string];

  title: string;
  message?: string;

  confirmLabel?: string;
  cancelLabel?: string;

  /** When true, confirm button renders in red/destructive style */
  destructive?: boolean;

  loading?: boolean;
}

/**
 * A polished confirmation dialog built on BottomSheet.
 * Use for destructive actions (sign out, delete) or important confirmations.
 */
export function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  icon = 'alert-circle',
  iconGradient,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}: ConfirmationModalProps) {
  const gradColors: [string, string] = iconGradient ?? (
    destructive ? ['#EF4444', '#DC2626'] : [C.primary, C.primaryDark]
  );

  const confirmBg = destructive ? C.danger : C.primary;
  const confirmTextColor = destructive ? '#fff' : C.bg;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={gradColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Ionicons name={icon as any} size={28} color="#fff" />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Message */}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: confirmBg }, loading && styles.btnDisabled]}
          onPress={onConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.confirmText, { color: confirmTextColor }]}>{confirmLabel}</Text>
          )}
        </TouchableOpacity>

        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onClose}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: C.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    ...typography.body,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmBtn: {
    width: '100%',
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    ...typography.buttonLg,
  },
  cancelBtn: {
    width: '100%',
    height: 52,
    backgroundColor: C.surfaceRaised,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 4,
  },
  cancelText: {
    ...typography.button,
    color: C.textSecondary,
  },
});
