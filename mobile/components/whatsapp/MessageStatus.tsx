import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

type MessageStatusType = 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusProps {
  status: MessageStatusType;
  size?: number;
}

/** Single grey tick SVG */
function SingleTick({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Polyline
        points="2,6 5,9 10,3"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Double tick SVG */
function DoubleTick({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size + 4} height={size} viewBox="0 0 16 12">
      {/* first tick */}
      <Polyline
        points="1,6 4,9 9,3"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* second tick offset right */}
      <Polyline
        points="5,6 8,9 13,3"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function MessageStatus({ status, size = 14 }: MessageStatusProps) {
  if (status === 'failed') {
    return (
      <Text style={[styles.base, { fontSize: size, color: '#ef4444' }]}>✕</Text>
    );
  }
  if (status === 'sent') {
    return <SingleTick size={size} color="rgba(255,255,255,0.45)" />;
  }
  if (status === 'delivered') {
    return <DoubleTick size={size} color="rgba(255,255,255,0.45)" />;
  }
  if (status === 'read') {
    return <DoubleTick size={size} color="#53bdeb" />;
  }
  return null;
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '700',
  },
});
