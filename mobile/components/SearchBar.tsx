import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchBar({ 
  value, 
  onChangeText, 
  placeholder = 'Search...', 
  style 
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons 
        name="search" 
        size={20} 
        color={theme.colors.textTertiary} 
        style={styles.icon} 
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.input.borderWidth,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    height: theme.input.height,
  },
  icon: { 
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.fontWeight.medium,
  },
});
