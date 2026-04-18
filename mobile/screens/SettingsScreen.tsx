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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileCard}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
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
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
              thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.textTertiary}
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
          onPress={() => openLink('https://help.voicory.com')}
        />
        <Separator />
        <SettingsRow
          icon="mail"
          label="Contact Support"
          chevron
          onPress={() => openLink('mailto:support@voicory.com')}
        />
        <Separator />
        <SettingsRow
          icon="bug"
          label="Report Issue"
          chevron
          onPress={() => openLink('mailto:bugs@voicory.com')}
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
        <Ionicons name="log-out" size={20} color={theme.colors.danger} />
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
          color={theme.colors.textSecondary} 
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
            color={theme.colors.textTertiary} 
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
    backgroundColor: theme.colors.background,
  },
  content: { 
    paddingBottom: 40,
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: theme.colors.background,
  },
  pageHeader: { 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 32,
  },
  pageTitle: { 
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    marginBottom: 32,
    borderWidth: theme.card.borderWidth,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
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
    color: theme.colors.text, 
    fontSize: 20,
    fontWeight: theme.fontWeight.extrabold,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileInfo: { 
    flex: 1,
  },
  profileName: { 
    color: theme.colors.text, 
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
    marginBottom: 4,
  },
  profileEmail: { 
    color: theme.colors.textSecondary, 
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planBadge: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  planText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.5,
  },
  creditsBalance: {
    color: theme.colors.success,
    fontSize: 13,
    fontWeight: theme.fontWeight.semibold,
  },
  sectionHeader: { 
    color: theme.colors.textSecondary, 
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.card.borderWidth,
    borderColor: theme.colors.border,
    marginBottom: 24,
    overflow: 'hidden',
    ...theme.shadow.card,
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
    color: theme.colors.text, 
    fontSize: 16,
    fontWeight: theme.fontWeight.medium,
  },
  rowRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  separator: { 
    height: 1, 
    backgroundColor: theme.colors.border, 
    marginLeft: 58,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.danger + '10',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger + '30',
    marginBottom: 32,
  },
  signOutText: { 
    color: theme.colors.danger, 
    fontSize: 16,
    fontWeight: theme.fontWeight.semibold,
  },
  version: { 
    textAlign: 'center', 
    color: theme.colors.textTertiary, 
    fontSize: 12,
    fontWeight: theme.fontWeight.medium,
  },
});
