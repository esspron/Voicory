import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Text input */}
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type a message"
        placeholderTextColor="#8696a0"
        multiline
        maxLength={4096}
        returnKeyType="default"
        editable={!disabled}
      />

      {/* Attachment (only when no text) */}
      {!hasText && (
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="attach-outline" size={22} color="#8696a0" />
        </TouchableOpacity>
      )}

      {/* Send button */}
      <TouchableOpacity
        style={[styles.sendBtn, hasText && styles.sendBtnActive]}
        onPress={hasText ? handleSend : undefined}
        disabled={disabled}
      >
        <Ionicons name="send" size={18} color={hasText ? '#fff' : '#8696a0'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2d3748',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    backgroundColor: '#1f2c34',
    color: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 40,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d3748',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  sendBtnActive: {
    backgroundColor: '#00d4aa',
  },
});
