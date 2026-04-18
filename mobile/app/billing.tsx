import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

function WalletIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="wg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00d4aa" />
          <Stop offset="1" stopColor="#0099ff" />
        </LinearGradient>
      </Defs>
      <Rect x="6" y="12" width="36" height="26" rx="4" stroke="url(#wg)" strokeWidth="2.5" fill="none" />
      <Path d="M6 20H42" stroke="url(#wg)" strokeWidth="2" />
      <Rect x="30" y="24" width="8" height="6" rx="2" fill="url(#wg)" opacity="0.3" />
      <Path d="M34 27H34.01" stroke="url(#wg)" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export default function BillingScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const credits = profile?.credits_balance ?? 0;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Billing & Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Balance Card */}
        <View style={s.balanceCard}>
          <WalletIcon />
          <Text style={s.balanceLabel}>Available Credits</Text>
          <Text style={s.balanceValue}>₹{(credits * 84).toFixed(2)}</Text>
          <Text style={s.balanceUsd}>${credits.toFixed(2)} USD</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => Linking.openURL('https://app.voicory.com/billing')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#000" />
          <Text style={s.addBtnText}>Add Credits</Text>
        </TouchableOpacity>

        <Text style={s.note}>
          You'll be redirected to the web app to manage billing and add credits via Paddle.
        </Text>

        {/* Plan Info */}
        {profile?.plan_type && (
          <View style={s.planCard}>
            <Text style={s.planLabel}>Current Plan</Text>
            <Text style={s.planValue}>{profile.plan_type}</Text>
          </View>
        )}

        {/* Usage */}
        {profile && (
          <View style={s.planCard}>
            <Text style={s.planLabel}>Voice Minutes Used</Text>
            <Text style={s.planValue}>
              {profile.voice_minutes_used ?? 0} / {profile.voice_minutes_limit ?? '∞'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b14' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16, paddingHorizontal: 16,
    backgroundColor: '#0d1420', borderBottomWidth: 1, borderBottomColor: '#1a2332',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 24, gap: 20 },
  balanceCard: {
    backgroundColor: '#0d1420', borderRadius: 20, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: '#1a2332', gap: 8,
  },
  balanceLabel: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  balanceValue: { fontSize: 36, fontWeight: '800', color: '#00d4aa' },
  balanceUsd: { fontSize: 14, color: '#4b5563' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00d4aa', borderRadius: 14, height: 52,
  },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  note: { fontSize: 12, color: '#4b5563', textAlign: 'center', lineHeight: 18 },
  planCard: {
    backgroundColor: '#0d1420', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#1a2332',
  },
  planLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  planValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
