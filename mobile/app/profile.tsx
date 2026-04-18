import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors as C } from '../lib/theme';
import { supabase } from '../lib/supabase';

// ─── Field Component ──────────────────────────────────────────────────────────
function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  editable = true,
  iconName,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  editable?: boolean;
  iconName: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={ff.container}>
      <Text style={ff.label}>{label}</Text>
      <View
        style={[
          ff.inputWrap,
          focused && ff.focused,
          !editable && ff.disabled,
        ]}
      >
        <Ionicons name={iconName as any} size={18} color={editable ? C.textMuted : C.textFaint} style={ff.icon} />
        <TextInput
          style={[ff.input, !editable && ff.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {!editable && (
          <Ionicons name="lock-closed" size={14} color={C.textFaint} style={ff.lockIcon} />
        )}
      </View>
    </View>
  );
}

const ff = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 8, letterSpacing: 0.2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    height: 52,
    paddingHorizontal: 14,
  },
  focused: {
    borderColor: C.primary + '60',
    backgroundColor: C.primaryMuted,
  },
  disabled: {
    backgroundColor: C.surface,
    borderColor: C.border + '80',
  },
  icon: { marginRight: 10 },
  lockIcon: { marginLeft: 8 },
  input: { flex: 1, color: C.text, fontSize: 15, fontWeight: '500' },
  inputDisabled: { color: C.textFaint },
});

// ─── Avatar Placeholder ────────────────────────────────────────────────────────
function AvatarUpload({ initials }: { initials: string }) {
  return (
    <TouchableOpacity style={av.container} activeOpacity={0.8}>
      <LinearGradient
        colors={[C.primary, C.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={av.gradient}
      >
        <Text style={av.initials}>{initials}</Text>
      </LinearGradient>
      <View style={av.badge}>
        <Ionicons name="camera" size={14} color="#fff" />
      </View>
      <Text style={av.hint}>Tap to upload photo</Text>
    </TouchableOpacity>
  );
}

const av = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  gradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.primary + '40',
  },
  initials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  badge: {
    position: 'absolute',
    bottom: 38,
    right: '35%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  hint: { fontSize: 12, color: C.textFaint, fontWeight: '500' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      const { data } = await supabase
        .from('user_profiles')
        .select('organization_name, organization_email, phone_number')
        .eq('user_id', u.id)
        .maybeSingle();
      if (data) {
        setOrgName(data.organization_name || '');
        setOrgEmail(data.organization_email || '');
        setPhone(data.phone_number || '');
      }
    } catch (err) {
      if (__DEV__) console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          organization_name: orgName,
          organization_email: orgEmail,
          phone_number: phone,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (email?: string) => {
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
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar ── */}
        <AvatarUpload initials={getInitials(user?.email)} />

        {/* ── Account Info Card ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="shield-checkmark" size={16} color={C.primary} />
            <Text style={s.cardTitle}>Account Details</Text>
          </View>

          <FormField
            label="Email Address"
            value={user?.email || ''}
            placeholder="you@example.com"
            iconName="mail"
            editable={false}
          />
        </View>

        {/* ── Organization Card ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="business" size={16} color={C.secondary} />
            <Text style={s.cardTitle}>Organization</Text>
          </View>

          <FormField
            label="Organization Name"
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Acme Corp"
            iconName="business"
            autoCapitalize="words"
          />

          <FormField
            label="Organization Email"
            value={orgEmail}
            onChangeText={setOrgEmail}
            placeholder="contact@company.com"
            iconName="mail-open"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 9876543210"
            iconName="call"
            keyboardType="phone-pad"
          />
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.7 }, saved && s.savedBtn]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : saved ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={s.saveBtnText}>Saved!</Text>
            </>
          ) : (
            <>
              <Ionicons name="save" size={18} color="#000" />
              <Text style={s.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.footerNote}>
          Changes apply to your Voicory account immediately.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  content: { paddingHorizontal: 16 },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, letterSpacing: 0.2 },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.primary,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  savedBtn: {
    backgroundColor: C.success,
    shadowColor: C.success,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },

  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textFaint,
    lineHeight: 18,
    marginBottom: 8,
  },
});
