import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../lib/theme';

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
            onPress={() => onSelect(opt.value)}
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
    paddingVertical: 8,
    gap: 12,
    flexDirection: 'row',
    paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.card.borderWidth,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: theme.fontWeight.semibold,
  },
  labelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
});
