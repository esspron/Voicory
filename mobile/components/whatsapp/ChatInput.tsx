import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as C } from '../../lib/theme';
import { ActionSheet, ActionSheetItem } from '../ActionSheet';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const ATTACHMENT_ITEMS: ActionSheetItem[] = [
  {
    icon: 'image-outline',
    label: 'Photo & Video',
    sublabel: 'Share from your gallery',
    onPress: () => { /* future: image picker */ },
  },
  {
    icon: 'camera-outline',
    label: 'Camera',
    sublabel: 'Take a photo or video',
    onPress: () => { /* future: camera */ },
  },
  {
    icon: 'document-outline',
    label: 'Document',
    sublabel: 'Share a file',
    onPress: () => { /* future: file picker */ },
  },
  {
    icon: 'location-outline',
    label: 'Location',
    sublabel: 'Share your current location',
    onPress: () => { /* future: location */ },
  },
];

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachmentSheetVisible, setAttachmentSheetVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const micOpacity = useRef(new Animated.Value(1)).current;

  const hasText = text.trim().length > 0;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sendScale, {
        toValue: hasText ? 1 : 0.8,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
      }),
      Animated.timing(micOpacity, {
        toValue: hasText ? 0 : 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [hasText]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    // Press-scale animation
    Animated.sequence([
      Animated.spring(sendScale, {
        toValue: 0.85,
        useNativeDriver: true,
        damping: 10,
        stiffness: 200,
      }),
      Animated.spring(sendScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
      }),
    ]).start();

    onSend(trimmed);
    setText('');
  };

  return (
    <>
    <View style={styles.container}>
      {/* Attachment */}
      <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => setAttachmentSheetVisible(true)}>
        <Ionicons name="attach-outline" size={22} color={C.textMuted} />
      </TouchableOpacity>

      {/* Input pill */}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={C.textFaint}
          multiline
          maxLength={4096}
          returnKeyType="default"
          editable={!disabled}
        />
      </View>

      {/* Mic / Send */}
      {hasText ? (
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            disabled={disabled}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={18} color="#000" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View style={{ opacity: micOpacity }}>
          <TouchableOpacity style={styles.micBtn} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={22} color={C.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>

      <ActionSheet
        visible={attachmentSheetVisible}
        onClose={() => setAttachmentSheetVisible(false)}
        title="Share Attachment"
        items={ATTACHMENT_ITEMS}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#0b141a',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1a2332',
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#1f2c34',
    borderRadius: 22,
    overflow: 'hidden',
  },
  input: {
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 40,
    lineHeight: 20,
  },
  micBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00d4aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
