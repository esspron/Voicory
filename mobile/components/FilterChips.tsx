import { colors as C } from '../lib/theme';
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import * as haptics from '../lib/haptics';

interface FilterChipsProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
}

export function FilterChips({ options, selected, onSelect, style }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => { haptics.selectionTap(); onSelect(opt.value); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 10,
    flexDirection: 'row',
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  chipSelected: {
    backgroundColor: C.primaryMuted,
    borderColor: C.primary,
  },
  label: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelSelected: {
    color: C.primary,
    fontWeight: '700',
  },
});
