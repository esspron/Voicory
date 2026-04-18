import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const C = {
  bg: '#050a12',
  surface: '#0c1219',
  surfaceRaised: '#111a24',
  border: '#1a2332',
  primary: '#00d4aa',
  text: '#f0f2f5',
  textMuted: '#7a8599',
  textFaint: '#3d4a5c',
  danger: '#ef4444',
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [phone, setPhone] = useState('');

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
        .select('organization_name, organization_email, phone_number')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setOrgName(data.organization_name || '');
        setOrgEmail(data.organization_email || '');
        setPhone(data.phone_number || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
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
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Email</Text>
          <Text style={s.fieldReadonly}>{user?.email || ''}</Text>

          <Text style={[s.fieldLabel, { marginTop: 20 }]}>Organization Name</Text>
          <TextInput
            style={s.input}
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Your company name"
            placeholderTextColor={C.textFaint}
          />

          <Text style={[s.fieldLabel, { marginTop: 20 }]}>Organization Email</Text>
          <TextInput
            style={s.input}
            value={orgEmail}
            onChangeText={setOrgEmail}
            placeholder="contact@company.com"
            placeholderTextColor={C.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[s.fieldLabel, { marginTop: 20 }]}>Phone Number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 9876543210"
            placeholderTextColor={C.textFaint}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  section: { marginTop: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, letterSpacing: 0.5, marginHorizontal: 20, marginBottom: 10 },
  card: {
    backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 20,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 8 },
  fieldReadonly: { fontSize: 15, color: C.textFaint, fontWeight: '500' },
  input: {
    backgroundColor: C.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, height: 48, color: C.text, fontSize: 15,
  },
  saveBtn: {
    marginHorizontal: 16, marginTop: 24, height: 50, borderRadius: 14,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
