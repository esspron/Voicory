import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as C } from '../../lib/theme';
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
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function getTextBody(msg: WhatsAppMessage): string {
  const c = msg.content;
  if (!c) return '';
  if (typeof c === 'string') return c;
  return c?.text?.body ?? c?.body ?? c?.caption ?? '';
}

function getMediaUrl(msg: WhatsAppMessage): string | undefined {
  const c = msg.content;
  if (!c || typeof c === 'string') return undefined;
  return c?.image?.url ?? c?.audio?.url ?? c?.document?.url ?? c?.media_url ?? c?.url;
}

const INCOMING_COLOR = '#1f2c34';
const OUTGOING_START = '#005c4b';
const OUTGOING_END = '#006e59';

export default function ChatBubble({ message, showTail, onImagePress }: ChatBubbleProps) {
  const isOutgoing = message.direction === 'outbound';
  const isBot = message.is_from_bot === true && !isOutgoing;
  const body = getTextBody(message);
  const mediaUrl = getMediaUrl(message);

  const renderContent = () => {
    if (message.message_type === 'image' && mediaUrl) {
      return (
        <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress?.(mediaUrl)}>
          <Image source={{ uri: mediaUrl }} style={styles.imageThumb} resizeMode="cover" />
          {body ? <Text style={styles.messageText}>{body}</Text> : null}
        </TouchableOpacity>
      );
    }
    if (message.message_type === 'audio') {
      return (
        <View style={styles.audioContainer}>
          <View style={styles.audioPlayBtn}>
            <Text style={{ color: '#fff', fontSize: 13 }}>▶</Text>
          </View>
          <View style={styles.waveform}>
            {[3, 6, 9, 5, 8, 4, 7, 10, 6, 4, 8, 5].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  { height: h * 2, backgroundColor: isOutgoing ? 'rgba(255,255,255,0.5)' : '#8696a0' },
                ]}
              />
            ))}
          </View>
        </View>
      );
    }
    return <Text style={styles.messageText}>{body}</Text>;
  };

  const bubbleInner = (
    <View style={[styles.bubbleInner, isOutgoing ? styles.outgoingInner : styles.incomingInner]}>
      {isBot && (
        <View style={styles.botBadge}>
          <Text style={styles.botBadgeText}>⚡ bot</Text>
        </View>
      )}
      {renderContent()}
      <View style={styles.timestampRow}>
        <Text style={styles.timestamp}>{formatTime(message.message_timestamp)}</Text>
        {isOutgoing && (
          <MessageStatus status={message.status} size={13} />
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.row, isOutgoing ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubbleWrapper, isOutgoing ? styles.wrapperRight : styles.wrapperLeft]}>
        {/* Bubble background */}
        {isOutgoing ? (
          <LinearGradient
            colors={[OUTGOING_START, OUTGOING_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.bubble,
              styles.bubbleOut,
              showTail && styles.bubbleOutTail,
            ]}
          >
            {bubbleInner}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.bubble,
              styles.bubbleIn,
              showTail && styles.bubbleInTail,
              { backgroundColor: INCOMING_COLOR },
            ]}
          >
            {bubbleInner}
          </View>
        )}

        {/* Tail */}
        {showTail && isOutgoing && (
          <View style={styles.tailOutContainer}>
            <View style={styles.tailOut} />
          </View>
        )}
        {showTail && !isOutgoing && (
          <View style={styles.tailInContainer}>
            <View style={styles.tailIn} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 1,
    paddingHorizontal: 8,
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  bubbleWrapper: {
    maxWidth: '78%',
    position: 'relative',
  },
  wrapperLeft: { marginLeft: 4 },
  wrapperRight: { marginRight: 4 },

  bubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
  },
  bubbleOut: {
    borderTopRightRadius: 10,
  },
  bubbleOutTail: {
    borderTopRightRadius: 3,
  },
  bubbleIn: {
    borderTopLeftRadius: 10,
  },
  bubbleInTail: {
    borderTopLeftRadius: 3,
  },

  bubbleInner: {},
  incomingInner: {},
  outgoingInner: {},

  botBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 5,
  },
  botBadgeText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 3,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // Tails using border trick — outgoing (right side)
  tailOutContainer: {
    position: 'absolute',
    top: 0,
    right: -7,
    width: 9,
    height: 14,
    overflow: 'hidden',
  },
  tailOut: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderLeftWidth: 9,
    borderTopColor: OUTGOING_START,
    borderLeftColor: 'transparent',
  },

  // Tails — incoming (left side)
  tailInContainer: {
    position: 'absolute',
    top: 0,
    left: -7,
    width: 9,
    height: 14,
    overflow: 'hidden',
  },
  tailIn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderRightWidth: 9,
    borderTopColor: INCOMING_COLOR,
    borderRightColor: 'transparent',
  },

  imageThumb: { width: 200, height: 150, borderRadius: 7, marginBottom: 4 },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 180,
  },
  audioPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  waveBar: { width: 3, borderRadius: 2 },
});
