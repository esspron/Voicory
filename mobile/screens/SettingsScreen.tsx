import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import supabase from '../lib/supabase';

const COLORS = {
  background: '#0a0f1a',
  surface: '#111827',
  surfaceLight: '#1f2937',
  primary: '#00d4aa',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
  danger: '#ef4444',
};

const APP_VERSION = '1.0.0';

interface UserProfile {
  name?: string;
  email?: string;
  organization?: string;
  avatar_url?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('full_name, email, organization, avatar_url')
        .eq('user_id', user.id)
        .single();

      setProfile({
        name: data?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        organization: data?.organization,
        avatar_url: data?.avatar_url,
      });
    } catch {
      // ignore — show partial data
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await supabase.auth.signOut();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
          {profile?.organization ? (
            <Text style={styles.profileOrg}>{profile.organization}</Text>
          ) : null}
        </View>
      </View>

      {/* Preferences Section */}
      <Text style={styles.sectionLabel}>Preferences</Text>
      <View style={styles.menuCard}>
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          right={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '99' }}
              thumbColor={notificationsEnabled ? COLORS.primary : '#9ca3af'}
            />
          }
        />
        <Separator />
        <SettingsRow
          icon="moon-outline"
          label="Theme"
          right={<Text style={styles.valueText}>Dark</Text>}
        />
      </View>

      {/* About Section */}
      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.menuCard}>
        <SettingsRow
          icon="information-circle-outline"
          label="About Voicory"
          chevron
          onPress={() => router.push('/about' as any)}
        />
        <Separator />
        <SettingsRow
          icon="shield-outline"
          label="Privacy Policy"
          chevron
          onPress={() => openLink('https://voicory.com/privacy')}
        />
        <Separator />
        <SettingsRow
          icon="document-text-outline"
          label="Terms of Service"
          chevron
          onPress={() => openLink('https://voicory.com/terms')}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.75}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Voicory v{APP_VERSION}</Text>
    </ScrollView>
  );
}

function SettingsRow({
  icon,
  label,
  right,
  chevron,
  onPress,
}: {
  icon: any;
  label: string;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.settingsRow}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {right}
        {chevron && (
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  pageHeader: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  profileEmail: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  profileOrg: { color: COLORS.primary, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 20, marginBottom: 6 },
  menuCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowLabel: { color: COLORS.text, fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueText: { color: COLORS.textSecondary, fontSize: 14 },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.danger + '18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger + '44',
    marginBottom: 24,
  },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12 },
});
