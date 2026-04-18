import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { WhatsAppMessage } from '../../types/whatsapp';
import MessageStatus from './MessageStatus';

interface ChatBubbleProps {
  message: WhatsAppMessage;
  showTail: boolean; // first message in a group from same sender
  onImagePress?: (url: string) => void;
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

export default function ChatBubble({ message, showTail, onImagePress }: ChatBubbleProps) {
  const isOutgoing = message.direction === 'outbound';

  const bubbleStyle = isOutgoing
    ? [styles.bubble, styles.outgoing, !showTail && styles.noTailRadius]
    : [styles.bubble, styles.incoming, !showTail && styles.noTailRadiusIncoming];

  const renderContent = () => {
    if (message.message_type === 'image' && message.media_url) {
      return (
        <TouchableOpacity onPress={() => onImagePress?.(message.media_url!)}>
          <Image
            source={{ uri: message.media_url }}
            style={styles.imageThumb}
            resizeMode="cover"
          />
          {message.body ? (
            <Text style={[styles.messageText, isOutgoing ? styles.outgoingText : styles.incomingText]}>
              {message.body}
            </Text>
          ) : null}
        </TouchableOpacity>
      );
    }

    if (message.message_type === 'audio') {
      return (
        <View style={styles.audioContainer}>
          <View style={styles.audioPlayBtn}>
            <Text style={styles.audioPlayIcon}>▶</Text>
          </View>
          {/* Waveform bars */}
          <View style={styles.waveform}>
            {[3, 6, 9, 5, 8, 4, 7, 10, 6, 4, 8, 5].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: h * 2,
                    backgroundColor: isOutgoing ? 'rgba(255,255,255,0.5)' : '#8696a0',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.audioDuration}>0:00</Text>
        </View>
      );
    }

    // Default: text / document / template
    return (
      <Text style={[styles.messageText, isOutgoing ? styles.outgoingText : styles.incomingText]}>
        {message.body}
      </Text>
    );
  };

  return (
    <View style={[styles.row, isOutgoing ? styles.rowRight : styles.rowLeft]}>
      {/* The bubble */}
      <View style={bubbleStyle}>
        {renderContent()}

        {/* Timestamp row inside bubble */}
        <View style={styles.timestampRow}>
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
          {isOutgoing && (
            <View style={styles.statusIcon}>
              <MessageStatus status={message.status} size={13} />
            </View>
          )}
        </View>

        {/* Triangle tail */}
        {showTail && (
          isOutgoing
            ? <View style={styles.tailOutgoing} />
            : <View style={styles.tailIncoming} />
        )}
      </View>
    </View>
  );
}

const INCOMING_COLOR = '#1f2c34';
const OUTGOING_COLOR = '#005c4b';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 1,
    paddingHorizontal: 10,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
    position: 'relative',
  },
  incoming: {
    backgroundColor: INCOMING_COLOR,
    borderTopLeftRadius: 2, // where tail attaches
    marginLeft: 8,
  },
  outgoing: {
    backgroundColor: OUTGOING_COLOR,
    borderTopRightRadius: 2,
    marginRight: 8,
  },
  noTailRadius: {
    borderTopRightRadius: 8,
  },
  noTailRadiusIncoming: {
    borderTopLeftRadius: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  incomingText: {
    color: '#ffffff',
  },
  outgoingText: {
    color: '#ffffff',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 3,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  statusIcon: {
    marginLeft: 2,
  },
  // Tail triangles using borders
  tailOutgoing: {
    position: 'absolute',
    top: 0,
    right: -8,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 10,
    borderTopColor: OUTGOING_COLOR,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  tailIncoming: {
    position: 'absolute',
    top: 0,
    left: -8,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: INCOMING_COLOR,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  imageThumb: {
    width: 200,
    height: 150,
    borderRadius: 6,
    marginBottom: 4,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 180,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayIcon: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 2,
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  audioDuration: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
});
