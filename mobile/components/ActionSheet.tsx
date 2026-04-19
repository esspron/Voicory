import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { colors as C, radii, typography } from '../lib/theme';

export interface ActionSheetItem {
  /** Ionicons icon name */
  icon: string;
  label: string;
  /** Optional sublabel shown below the label */
  sublabel?: string;
  /** Renders item in red/destructive style */
  destructive?: boolean;
  /** Disables this item */
  disabled?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Optional title shown at the top of the sheet */
  title?: string;
  items: ActionSheetItem[];
}

/**
 * ActionSheet — a list of action items rendered inside a BottomSheet.
 * Each item has an icon, label, and optional destructive styling.
 */
export function ActionSheet({ visible, onClose, title, items }: ActionSheetProps) {
  const handlePress = (item: ActionSheetItem) => {
    if (item.disabled) return;
    onClose();
    // Small delay so sheet closes before action fires
    setTimeout(() => item.onPress(), 150);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : null}

        <View style={styles.list}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const iconColor = item.destructive ? C.danger : item.disabled ? C.textFaint : C.text;
            const labelColor = item.destructive ? C.danger : item.disabled ? C.textFaint : C.text;

            return (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={[
                    styles.item,
                    item.destructive && styles.itemDestructive,
                    item.disabled && styles.itemDisabled,
                  ]}
                  onPress={() => handlePress(item)}
                  disabled={item.disabled}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconWrap,
                    item.destructive ? styles.iconWrapDestructive : styles.iconWrapDefault,
                  ]}>
                    <Ionicons name={item.icon as any} size={20} color={iconColor} />
                  </View>

                  <View style={styles.labelWrap}>
                    <Text style={[styles.label, { color: labelColor }]}>{item.label}</Text>
                    {item.sublabel ? (
                      <Text style={styles.sublabel}>{item.sublabel}</Text>
                    ) : null}
                  </View>

                  {!item.disabled && (
                    <Ionicons name="chevron-forward" size={16} color={C.textFaint} />
                  )}
                </TouchableOpacity>

                {!isLast && <View style={styles.sep} />}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    ...typography.caption,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -4,
    letterSpacing: 0.3,
  },
  list: {
    backgroundColor: C.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    minHeight: 58,
  },
  itemDestructive: {
    backgroundColor: C.dangerMuted,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDefault: {
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.border,
  },
  iconWrapDestructive: {
    backgroundColor: C.dangerMuted,
    borderWidth: 1,
    borderColor: C.danger + '40',
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    ...typography.bodyLg,
    fontWeight: '500',
  },
  sublabel: {
    ...typography.captionSm,
    color: C.textMuted,
    marginTop: 2,
  },
  sep: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 66,
  },
});
