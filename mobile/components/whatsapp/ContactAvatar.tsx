import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AVATAR_COLORS = [
  '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22',
  '#e74c3c', '#1bbc9b', '#16a085', '#8e44ad', '#d35400',
  '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#7f8c8d',
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
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface ContactAvatarProps {
  name: string;
  profilePictureUrl?: string;
  size?: number;
}

export default function ContactAvatar({ name, profilePictureUrl, size = 48 }: ContactAvatarProps) {
  const bgColor = useMemo(() => getColorForName(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bgColor,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };

  const textStyle = {
    color: '#ffffff',
    fontSize: size * 0.35,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  };

  // Show initials fallback when no profile picture URL is provided
  // Profile picture display can be implemented later when needed
  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{initials}</Text>
    </View>
  );
}