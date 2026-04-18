import { colors as C } from '../../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../../lib/haptics';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createCustomer } from '../../services/customerService';
import { supabase } from '../../lib/supabase';

interface FormState {
  name: string;
  phone_number: string;
  email: string;
  source: string;
}

interface FormErrors {
  name?: string;
  phone_number?: string;
  email?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!form.phone_number.trim()) errors.phone_number = 'Phone number is required';
  else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone_number.trim()))
    errors.phone_number = 'Enter a valid phone number';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid email address';
  return errors;
}

export default function NewCustomerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: '',
    phone_number: '',
    email: '',
    source: 'manual',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      haptics.error();
      return;
    }
    setSubmitting(true);
    haptics.lightTap();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await createCustomer({
        user_id: user.id,
        name: form.name.trim(),
        phone_number: form.phone_number.trim(),
        email: form.email.trim() || undefined,
        source: form.source,
        updated_at: new Date().toISOString(),
      } as any);

      haptics.success();
      setSuccess(true);
      // Success animation
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => router.back(), 1200);
      });
    } catch (err: any) {
      haptics.error();
      setErrors({ phone_number: err.message || 'Failed to create customer' });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, styles.successContainer, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.successContent, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={C.bg} />
          </LinearGradient>
          <Text style={styles.successTitle}>Customer Added!</Text>
          <Text style={styles.successMessage}>{form.name} has been saved.</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Nav bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Add Customer</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Header */}
          <View style={styles.formHeader}>
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.formHeaderIcon}>
              <Ionicons name="person-add" size={24} color={C.bg} />
            </LinearGradient>
            <Text style={styles.formHeaderTitle}>New Contact</Text>
            <Text style={styles.formHeaderSub}>Fill in the details below to add a customer</Text>
          </View>

          {/* Form fields */}
          <View style={styles.formCard}>
            <FormField
              label="Full Name"
              required
              icon="person-outline"
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="e.g. Rahul Sharma"
              error={errors.name}
              autoCapitalize="words"
            />

            <FormField
              label="Phone Number"
              required
              icon="call-outline"
              value={form.phone_number}
              onChangeText={(v) => setField('phone_number', v)}
              placeholder="+91 98765 43210"
              error={errors.phone_number}
              keyboardType="phone-pad"
            />

            <FormField
              label="Email Address"
              icon="mail-outline"
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              placeholder="customer@example.com"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Source selector */}
            <View style={styles.fieldWrap}>
              <View style={styles.fieldLabelRow}>
                <Ionicons name="git-branch-outline" size={14} color={C.textMuted} />
                <Text style={styles.fieldLabel}>Source</Text>
              </View>
              <View style={styles.sourceRow}>
                {(['manual', 'inbound', 'outbound', 'whatsapp'] as const).map((src) => (
                  <TouchableOpacity
                    key={src}
                    style={[styles.sourceChip, form.source === src && styles.sourceChipActive]}
                    onPress={() => setField('source', src)}
                  >
                    <Text style={[styles.sourceChipText, form.source === src && styles.sourceChipTextActive]}>
                      {src}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
              {submitting ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color={C.bg} style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>Add Customer</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  required,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  required?: boolean;
  icon: any;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={icon} size={14} color={C.textMuted} />
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={{ color: C.danger }}> *</Text>}
        </Text>
      </View>
      <View style={[styles.inputWrap, focused && styles.inputFocused, !!error && styles.inputError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color={C.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  successContainer: { alignItems: 'center', justifyContent: 'center' },
  successContent: { alignItems: 'center', gap: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
  successMessage: { color: C.textSecondary, fontSize: 14 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { flex: 1, textAlign: 'center', color: C.text, fontSize: 17, fontWeight: '600' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  formHeader: { alignItems: 'center', marginBottom: 28, gap: 10 },
  formHeaderIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  formHeaderTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
  formHeaderSub: { color: C.textMuted, fontSize: 14, textAlign: 'center' },

  formCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },

  fieldWrap: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },

  inputWrap: {
    backgroundColor: C.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  inputFocused: { borderColor: C.primary + '80', backgroundColor: C.surfaceElevated },
  inputError: { borderColor: C.danger + '60' },
  input: { color: C.text, fontSize: 15 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { color: C.danger, fontSize: 12 },

  sourceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.border,
  },
  sourceChipActive: { backgroundColor: C.primaryMuted, borderColor: C.primary + '60' },
  sourceChipText: { color: C.textMuted, fontSize: 13, textTransform: 'capitalize' },
  sourceChipTextActive: { color: C.primary, fontWeight: '700' },

  submitBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitText: { color: C.bg, fontSize: 16, fontWeight: '700' },
});
