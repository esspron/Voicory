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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

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

const APP_VERSION = '1.0.0';

interface UserProfile {
  organization_name?: string;
  organization_email?: string;
  plan_type?: string;
  credits_balance?: number;
  voice_minutes_used?: number;
  voice_minutes_limit?: number;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data } = await supabase
        .from('user_profiles')
        .select('organization_name, organization_email, plan_type, credits_balance, voice_minutes_used, voice_minutes_limit')
        .eq('user_id', user.id)
        .maybeSingle();

      setProfile(data || {});
    } catch (err) {
      console.error('Error loading profile:', err);
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

  const getInitials = (email?: string): string => {
    if (!email) return 'U';
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileCard}>
        <LinearGradient
          colors={[C.primary, C.primary + 'dd']}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>
            {getInitials(user?.email)}
          </Text>
        </LinearGradient>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile?.organization_name || user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          
          <View style={styles.badgeRow}>
            {profile?.plan_type && (
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{profile.plan_type.toUpperCase()}</Text>
              </View>
            )}
            {profile?.credits_balance !== undefined && (
              <Text style={styles.creditsBalance}>
                ₹{(profile.credits_balance * 84).toFixed(0)} credits
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Account Section */}
      <Text style={styles.sectionHeader}>ACCOUNT</Text>
      <View style={styles.menuCard}>
        <SettingsRow
          icon="person"
          label="Profile"
          chevron
          onPress={() => router.push('/profile' as any)}
        />
        <Separator />
        <SettingsRow
          icon="card"
          label="Billing"
          chevron
          onPress={() => router.push('/billing' as any)}
        />
        <Separator />
        <SettingsRow
          icon="notifications"
          label="Notifications"
          right={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: C.border, true: C.primaryMuted }}
              thumbColor={notificationsEnabled ? C.primary : C.textFaint}
            />
          }
        />
      </View>

      {/* Support Section */}
      <Text style={styles.sectionHeader}>SUPPORT</Text>
      <View style={styles.menuCard}>
        <SettingsRow
          icon="help-circle"
          label="Help Center"
          chevron
          onPress={() => openLink('https://www.voicory.com/help')}
        />
        <Separator />
        <SettingsRow
          icon="mail"
          label="Contact Support"
          chevron
          onPress={() => openLink('mailto:hello@voicory.com')}
        />
        <Separator />
        <SettingsRow
          icon="bug"
          label="Report Issue"
          chevron
          onPress={() => openLink('mailto:hello@voicory.com?subject=Bug%20Report')}
        />
      </View>

      {/* Legal Section */}
      <Text style={styles.sectionHeader}>LEGAL</Text>
      <View style={styles.menuCard}>
        <SettingsRow
          icon="shield-checkmark"
          label="Privacy Policy"
          chevron
          onPress={() => openLink('https://voicory.com/privacy')}
        />
        <Separator />
        <SettingsRow
          icon="document-text"
          label="Terms of Service"
          chevron
          onPress={() => openLink('https://voicory.com/terms')}
        />
        <Separator />
        <SettingsRow
          icon="information-circle"
          label="About Voicory"
          chevron
          onPress={() => openLink('https://www.voicory.com')}
        />
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.signOutBtn, loggingOut && { opacity: 0.6 }]}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out" size={20} color={C.danger} />
        <Text style={styles.signOutText}>
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </Text>
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
        <Ionicons 
          name={icon} 
          size={22} 
          color={C.textMuted} 
          style={styles.rowIcon} 
        />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {right}
        {chevron && (
          <Ionicons 
            name="chevron-forward" 
            size={18} 
            color={C.textFaint} 
          />
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
  container: { 
    flex: 1, 
    backgroundColor: C.bg,
  },
  content: { 
    paddingBottom: 40,
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: C.bg,
  },
  pageHeader: { 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 44, 
    paddingBottom: 32,
  },
  pageTitle: { 
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: { 
    color: C.text, 
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileInfo: { 
    flex: 1,
  },
  profileName: { 
    color: C.text, 
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: { 
    color: C.textMuted, 
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planBadge: {
    backgroundColor: C.primaryMuted,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.primary + '40',
  },
  planText: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  creditsBalance: {
    color: C.success,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: { 
    color: C.textMuted, 
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: C.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  rowIcon: {
    marginRight: 16,
  },
  rowLabel: { 
    color: C.text, 
    fontSize: 16,
    fontWeight: '500',
  },
  rowRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  separator: { 
    height: 1, 
    backgroundColor: C.border, 
    marginLeft: 58,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.danger + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.danger + '30',
    marginBottom: 32,
  },
  signOutText: { 
    color: C.danger, 
    fontSize: 16,
    fontWeight: '600',
  },
  version: { 
    textAlign: 'center', 
    color: C.textFaint, 
    fontSize: 12,
    fontWeight: '500',
  },
});
