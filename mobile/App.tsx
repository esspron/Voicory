import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './contexts/AuthContext';
import WhatsAppScreen from './screens/WhatsAppScreen';
import ChatScreen from './screens/ChatScreen';
import ContactInfoScreen from './screens/ContactInfoScreen';
import { WhatsAppContact } from './types/whatsapp';

export type RootStackParamList = {
  WhatsAppScreen: undefined;
  ChatScreen: { contact: WhatsAppContact };
  ContactInfoScreen: { contact: WhatsAppContact };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="WhatsAppScreen"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="WhatsAppScreen" component={WhatsAppScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="ContactInfoScreen" component={ContactInfoScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
