import { colors as C, typography, spacing, radii } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { ConfirmationModal } from '../components/ConfirmationModal';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences,
} from '../services/notificationService';

const APP_VERSION = '1.0.0';

interface UserProfile {
  organization_name?: string;
  organization_email?: string;
  plan_type?: string;
  credits_balance?: number;
  voice_minutes_used?: number;
  voice_minutes_limit?: number;
}

// ─── Icon circle colors per category ─────────────────────────────────────────
const ICON_COLORS: Record<string, [string, string]> = {
  person: ['#5B8DEF', '#3366CC'],
  card: ['#00C48C', '#00A878'],
  notifications: ['#F5A623', '#E8941A'],
  moon: ['#7B68EE', '#6A5ACD'],
  'help-circle': ['#4CAF50', '#388E3C'],
  mail: ['#2196F3', '#1976D2'],
  bug: ['#FF7043', '#E64A19'],
  'shield-checkmark': ['#9C27B0', '#7B1FA2'],
  'document-text': ['#607D8B', '#455A64'],
  'information-circle': ['#00BCD4', '#0097A7'],
  'log-out': ['#EF4444', '#DC2626'],
};

function IconCircle({ name, size = 20 }: { name: string; size?: number }) {
  const colors = ICON_COLORS[name] ?? ['#6B7280', '#4B5563'];
  return (
    <LinearGradient
      colors={colors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={iconCircleStyles.circle}
    >
      <Ionicons name={name as any} size={size} color="#fff" />
    </LinearGradient>
  );
}

const iconCircleStyles = StyleSheet.create({
  circle: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    call_alerts: true,
    whatsapp_alerts: true,
    billing_alerts: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    loadProfile();
    loadNotificationPreferences().then(setNotifPrefs);
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      const { data } = await supabase
        .from('user_profiles')
        .select('organization_name, organization_email, plan_type, credits_balance, voice_minutes_used, voice_minutes_limit')
        .eq('user_id', u.id)
        .maybeSingle();
      setProfile(data || {});
    } catch (err) {
      if (__DEV__) console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    setShowSignOutModal(false);
    router.replace('/login' as any);
  };

  const handleToggleNotifPref = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    setSavingPrefs(true);
    await saveNotificationPreferences(updated).catch(() => {});
    setSavingPrefs(false);
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  const getInitials = (email?: string): string => {
    if (!email) return 'U';
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Profile Section ── */}
        <LinearGradient
          colors={['#0d1e30', '#061524', C.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.heroSection, { paddingTop: insets.top + 24 }]}
        >
          {/* Avatar with edit overlay */}
          <View style={s.avatarContainer}>
            <LinearGradient
              colors={[C.primary, C.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.avatarGradient}
            >
              <Text style={s.avatarText}>{getInitials(user?.email)}</Text>
            </LinearGradient>
            <TouchableOpacity
              style={s.editAvatarBtn}
              onPress={() => router.push('/profile' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={s.heroName}>
            {profile?.organization_name || user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={s.heroEmail}>{user?.email || ''}</Text>

          <View style={s.heroBadgeRow}>
            {profile?.plan_type && (
              <View style={s.planBadge}>
                <Text style={s.planText}>{profile.plan_type.toUpperCase()}</Text>
              </View>
            )}
            {profile?.credits_balance !== undefined && (
              <View style={s.creditsBadge}>
                <Ionicons name="flash" size={12} color={C.primary} />
                <Text style={s.creditsText}>
                  ₹{(profile.credits_balance * 84).toFixed(0)} credits
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ── Account Group ── */}
        <SectionHeader label="Account" />
        <View style={s.menuCard}>
          <SettingsRow
            icon="person"
            label="Profile"
            subtitle="Edit your name and contact"
            chevron
            onPress={() => router.push('/profile' as any)}
          />
          <Sep />
          <SettingsRow
            icon="card"
            label="Billing & Credits"
            subtitle={profile?.plan_type ? `${profile.plan_type} plan` : 'Manage payments'}
            chevron
            onPress={() => router.push('/billing' as any)}
          />
          <Sep />
          <SettingsRow
            icon="notifications"
            label="Notifications"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: C.border, true: C.primaryGlow }}
                thumbColor={notificationsEnabled ? C.primary : '#6b7280'}
                ios_backgroundColor={C.border}
              />
            }
          />
          <Sep />
          <SettingsRow
            icon="moon"
            label="Dark Mode"
            subtitle="Always on for best experience"
            right={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: C.border, true: '#7B68EE40' }}
                thumbColor={darkModeEnabled ? '#7B68EE' : '#6b7280'}
                ios_backgroundColor={C.border}
              />
            }
          />
        </View>

        {/* ── Notification Preferences ── */}
        <SectionHeader label="Notification Preferences" />
        <View style={s.menuCard}>
          <SettingsRow
            icon="notifications"
            label="Call Alerts"
            subtitle="Notify when a call starts or ends"
            right={
              <Switch
                value={notifPrefs.call_alerts}
                onValueChange={(v) => handleToggleNotifPref('call_alerts', v)}
                trackColor={{ false: C.border, true: C.primaryGlow }}
                thumbColor={notifPrefs.call_alerts ? C.primary : '#6b7280'}
                ios_backgroundColor={C.border}
              />
            }
          />
          <Sep />
          <SettingsRow
            icon="chatbubble"
            label="WhatsApp Alerts"
            subtitle="Notify on new WhatsApp messages"
            right={
              <Switch
                value={notifPrefs.whatsapp_alerts}
                onValueChange={(v) => handleToggleNotifPref('whatsapp_alerts', v)}
                trackColor={{ false: C.border, true: '#25D36640' }}
                thumbColor={notifPrefs.whatsapp_alerts ? '#25D366' : '#6b7280'}
                ios_backgroundColor={C.border}
              />
            }
          />
          <Sep />
          <SettingsRow
            icon="card"
            label="Billing Alerts"
            subtitle="Low credits, payments & invoices"
            right={
              <Switch
                value={notifPrefs.billing_alerts}
                onValueChange={(v) => handleToggleNotifPref('billing_alerts', v)}
                trackColor={{ false: C.border, true: C.secondaryMuted }}
                thumbColor={notifPrefs.billing_alerts ? C.secondary : '#6b7280'}
                ios_backgroundColor={C.border}
              />
            }
          />
        </View>

        {/* ── Support Group ── */}
        <SectionHeader label="Support" />
        <View style={s.menuCard}>
          <SettingsRow
            icon="help-circle"
            label="Help Center"
            chevron
            onPress={() => openLink('https://www.voicory.com/help')}
          />
          <Sep />
          <SettingsRow
            icon="mail"
            label="Contact Support"
            chevron
            onPress={() => openLink('mailto:hello@voicory.com')}
          />
          <Sep />
          <SettingsRow
            icon="bug"
            label="Report an Issue"
            chevron
            onPress={() => openLink('mailto:hello@voicory.com?subject=Bug%20Report')}
          />
        </View>

        {/* ── Legal Group ── */}
        <SectionHeader label="Legal" />
        <View style={s.menuCard}>
          <SettingsRow
            icon="shield-checkmark"
            label="Privacy Policy"
            chevron
            onPress={() => openLink('https://voicory.com/privacy')}
          />
          <Sep />
          <SettingsRow
            icon="document-text"
            label="Terms of Service"
            chevron
            onPress={() => openLink('https://voicory.com/terms')}
          />
          <Sep />
          <SettingsRow
            icon="information-circle"
            label="About Voicory"
            chevron
            onPress={() => openLink('https://www.voicory.com')}
          />
        </View>

        {/* ── Sign Out ── */}
        <TouchableOpacity
          style={s.signOutBtn}
          onPress={() => setShowSignOutModal(true)}
          activeOpacity={0.7}
        >
          <IconCircle name="log-out" />
          <Text style={s.signOutText}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={18} color={C.danger + '80'} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* ── Version ── */}
        <View style={s.versionContainer}>
          <Text style={s.versionText}>Made with ❤️ by Voicory</Text>
          <Text style={s.versionNum}>Version {APP_VERSION}</Text>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOut}
        icon="log-out"
        iconGradient={['#EF4444', '#DC2626']}
        title="Sign Out?"
        message="You'll be signed out of your Voicory account on this device."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        destructive
        loading={loggingOut}
      />
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={s.sectionHeader}>{label.toUpperCase()}</Text>
  );
}

function SettingsRow({
  icon,
  label,
  subtitle,
  right,
  chevron,
  onPress,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View style={s.rowWrap}>
      <IconCircle name={icon} />
      <View style={s.rowContent}>
        <Text style={s.rowLabel}>{label}</Text>
        {subtitle ? <Text style={s.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={s.rowRight}>
        {right}
        {chevron && <Ionicons name="chevron-forward" size={18} color={C.textFaint} />}
      </View>
    </View>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={{}}>
        {inner}
      </PressableScale>
    );
  }
  return inner;
}

function Sep() {
  return <View style={s.sep} />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatarGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.primary + '40',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4, textAlign: 'center' },
  heroEmail: { fontSize: 14, color: C.textMuted, marginBottom: spacing.lg, textAlign: 'center' },
  heroBadgeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  planBadge: {
    backgroundColor: C.primaryMuted,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.primary + '40',
  },
  planText: { color: C.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.success + '15',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.success + '30',
  },
  creditsText: { color: C.success, fontSize: 12, fontWeight: '600' },

  // Menu
  sectionHeader: {
    color: C.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    marginTop: spacing.xxl,
  },
  menuCard: {
    backgroundColor: C.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    minHeight: 58,
  },
  rowContent: { flex: 1 },
  rowLabel: { color: C.text, fontSize: 16, fontWeight: '500' },
  rowSubtitle: { color: C.textFaint, fontSize: 12, fontWeight: '400', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 64,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    backgroundColor: C.danger + '10',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.danger + '25',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    minHeight: 58,
  },
  signOutText: { color: C.danger, fontSize: 16, fontWeight: '600', flex: 1 },

  // Version
  versionContainer: { alignItems: 'center', marginTop: 36, gap: 4 },
  versionText: { color: C.textFaint, fontSize: 13, fontWeight: '500' },
  versionNum: { color: C.textFaint + '80', fontSize: 11, fontWeight: '500' },
});
