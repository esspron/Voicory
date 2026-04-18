import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../lib/theme';
import { Platform } from 'react-native';

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
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: theme.fontWeight.semibold,
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
                size={26} // Slightly larger icons
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
