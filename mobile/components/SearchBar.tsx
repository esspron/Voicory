import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Design tokens
const C = {
  bg: '#050a12',
  surface: '#0c1219',
  surfaceRaised: '#111a24',
  border: '#1a2332',
  borderLight: '#1a233350',
  primary: '#00d4aa',
  primaryMuted: '#00d4aa18',
  secondary: '#0099ff',
  text: '#f0f2f5',
  textMuted: '#7a8599',
  textFaint: '#3d4a5c',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};

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
        color={C.textFaint} 
        style={styles.icon} 
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
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
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    height: 44,
  },
  icon: { 
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 16,
    fontWeight: '500',
  },
});
