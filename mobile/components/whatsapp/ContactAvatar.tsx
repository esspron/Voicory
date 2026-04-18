import React, { useMemo } from 'react';
import { View, Text, Image } from 'react-native';
import { colors as C } from '../../lib/theme';

const AVATAR_COLORS = [
  '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22',
  '#e74c3c', '#16a085', '#8e44ad', '#d35400', '#2980b9',
  '#27ae60', '#f39c12', '#c0392b', '#7f8c8d', '#1bbc9b',
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface ContactAvatarProps {
  name: string;
  profilePictureUrl?: string;
  size?: number;
  showOnline?: boolean;
}

export default function ContactAvatar({
  name,
  profilePictureUrl,
  size = 48,
  showOnline = false,
}: ContactAvatarProps) {
  const bgColor = useMemo(() => getColorForName(name || '?'), [name]);
  const initials = useMemo(() => getInitials(name || '?'), [name]);
  const indicatorSize = Math.round(size * 0.3);
  const indicatorOffset = Math.round(size * 0.04);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {profilePictureUrl ? (
          <Image
            source={{ uri: profilePictureUrl }}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              color: '#ffffff',
              fontSize: size * 0.35,
              fontWeight: '700',
              letterSpacing: 0.5,
            }}
          >
            {initials}
          </Text>
        )}
      </View>
      {showOnline && (
        <View
          style={{
            position: 'absolute',
            bottom: indicatorOffset,
            right: indicatorOffset,
            width: indicatorSize,
            height: indicatorSize,
            borderRadius: indicatorSize / 2,
            backgroundColor: '#25d366',
            borderWidth: 2,
            borderColor: C.bg,
          }}
        />
      )}
    </View>
  );
}
