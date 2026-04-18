import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

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

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Dashboard',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  {
    name: 'calls',
    title: 'Calls',
    icon: 'call-outline',
    iconFocused: 'call',
  },
  {
    name: 'customers',
    title: 'Customers',
    icon: 'people-outline',
    iconFocused: 'people',
  },
  {
    name: 'whatsapp',
    title: 'WhatsApp',
    icon: 'chatbubble-ellipses-outline',
    iconFocused: 'chatbubble-ellipses',
  },
  {
    name: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    iconFocused: 'settings',
  },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textFaint,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
