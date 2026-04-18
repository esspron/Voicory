import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { WhatsAppMessage } from '../../types/whatsapp';
import MessageStatus from './MessageStatus';

interface ChatBubbleProps {
  message: WhatsAppMessage;
  showTail: boolean;
  onImagePress?: (url: string) => void;
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return ''; }
}

/** Extract text body from JSONB content field */
function getTextBody(msg: WhatsAppMessage): string {
  const c = msg.content;
  if (!c) return '';
  if (typeof c === 'string') return c;
  // WhatsApp webhook formats: {text:{body:"..."}} or {body:"..."} or {caption:"..."}
  return c?.text?.body ?? c?.body ?? c?.caption ?? '';
}

function getMediaUrl(msg: WhatsAppMessage): string | undefined {
  const c = msg.content;
  if (!c || typeof c === 'string') return undefined;
  return c?.image?.url ?? c?.audio?.url ?? c?.document?.url ?? c?.media_url ?? c?.url;
}

export default function ChatBubble({ message, showTail, onImagePress }: ChatBubbleProps) {
  const isOutgoing = message.direction === 'outbound';
  const body = getTextBody(message);
  const mediaUrl = getMediaUrl(message);

  const bubbleStyle = isOutgoing
    ? [styles.bubble, styles.outgoing, !showTail && styles.noTailRadius]
    : [styles.bubble, styles.incoming, !showTail && styles.noTailRadiusIncoming];

  const renderContent = () => {
    if (message.message_type === 'image' && mediaUrl) {
      return (
        <TouchableOpacity onPress={() => onImagePress?.(mediaUrl)}>
          <Image source={{ uri: mediaUrl }} style={styles.imageThumb} resizeMode="cover" />
          {body ? <Text style={styles.messageText}>{body}</Text> : null}
        </TouchableOpacity>
      );
    }
    if (message.message_type === 'audio') {
      return (
        <View style={styles.audioContainer}>
          <View style={styles.audioPlayBtn}><Text style={{ color: '#fff', fontSize: 14 }}>▶</Text></View>
          <View style={styles.waveform}>
            {[3,6,9,5,8,4,7,10,6,4,8,5].map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: h * 2, backgroundColor: isOutgoing ? 'rgba(255,255,255,0.5)' : '#8696a0' }]} />
            ))}
          </View>
        </View>
      );
    }
    return <Text style={styles.messageText}>{body}</Text>;
  };

  return (
    <View style={[styles.row, isOutgoing ? styles.rowRight : styles.rowLeft]}>
      <View style={bubbleStyle}>
        {renderContent()}
        <View style={styles.timestampRow}>
          <Text style={styles.timestamp}>{formatTime(message.message_timestamp)}</Text>
          {isOutgoing && <MessageStatus status={message.status} size={13} />}
        </View>
        {showTail && (isOutgoing ? <View style={styles.tailOutgoing} /> : <View style={styles.tailIncoming} />)}
      </View>
    </View>
  );
}

const INCOMING = '#1f2c34';
const OUTGOING = '#005c4b';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 1, paddingHorizontal: 10 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 8, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4, position: 'relative' },
  incoming: { backgroundColor: INCOMING, borderTopLeftRadius: 2, marginLeft: 8 },
  outgoing: { backgroundColor: OUTGOING, borderTopRightRadius: 2, marginRight: 8 },
  noTailRadius: { borderTopRightRadius: 8 },
  noTailRadiusIncoming: { borderTopLeftRadius: 8 },
  messageText: { fontSize: 15, lineHeight: 20, color: '#ffffff' },
  timestampRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2, gap: 3 },
  timestamp: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  tailOutgoing: { position: 'absolute', top: 0, right: -8, width: 0, height: 0, borderTopWidth: 10, borderLeftWidth: 10, borderTopColor: OUTGOING, borderLeftColor: 'transparent' },
  tailIncoming: { position: 'absolute', top: 0, left: -8, width: 0, height: 0, borderTopWidth: 10, borderRightWidth: 10, borderTopColor: INCOMING, borderRightColor: 'transparent' },
  imageThumb: { width: 200, height: 150, borderRadius: 6, marginBottom: 4 },
  audioContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, minWidth: 180 },
  audioPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  waveBar: { width: 3, borderRadius: 2 },
});
