import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';

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
      {/* Emoji button */}
      <TouchableOpacity style={styles.iconBtn}>
        <Text style={styles.iconText}>😊</Text>
      </TouchableOpacity>

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

      {/* Attachment */}
      {!hasText && (
        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.iconText}>📎</Text>
        </TouchableOpacity>
      )}

      {/* Send / Mic */}
      <TouchableOpacity
        style={[styles.sendBtn, hasText && styles.sendBtnActive]}
        onPress={hasText ? handleSend : undefined}
        disabled={disabled}
      >
        <Text style={styles.sendIcon}>{hasText ? '➤' : '🎤'}</Text>
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
  iconText: {
    fontSize: 22,
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
  sendIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
});
