import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../lib/theme';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Rect } from 'react-native-svg';

function VoicoryLogo({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Defs>
        <SvgGrad id="vGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#2EC7B7" />
          <Stop offset="100%" stopColor="#26AFA1" />
        </SvgGrad>
        <SvgGrad id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1B1E23" />
          <Stop offset="100%" stopColor="#15181C" />
        </SvgGrad>
      </Defs>
      <Rect x="0" y="0" width="40" height="40" rx="8" ry="8" fill="url(#bgGrad)" />
      <Rect x="0.5" y="0.5" width="39" height="39" rx="7.5" ry="7.5" stroke="#2EC7B7" strokeWidth="1" opacity="0.15" fill="none" />
      <Path
        d="M22.23 6.97C27.42 10.11 29.51 18.39 26.33 23.74C25.33 25.44 24.55 27.11 24.05 28.66C23.85 25.52 23.39 23.04 22.65 20.64C21.76 17.73 21.34 16.53 20.45 13.78C18.51 7.82 13.98 6.77 12.00 6.77C9.99 6.77 7.51 7.51 6.00 9.68L6.66 10.41C7.90 9.06 9.87 9.21 10.80 11.42C12.35 15.06 13.20 19.63 14.83 24.59C16.30 28.93 23.23 25.36 23.23 33.23L24.20 33.23C24.20 31.25 25.36 27.07 27.61 23.62C30.17 19.67 34.00 12.54 34.00 6.97Z"
        fill="url(#vGradient)"
      />
    </Svg>
  );
}

function BackgroundOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.orb, { top: -60, right: -40, width: 200, height: 200, backgroundColor: '#00d4aa', opacity: 0.04 }]} />
      <View style={[s.orb, { top: 120, left: -80, width: 160, height: 160, backgroundColor: '#0099ff', opacity: 0.03 }]} />
      <View style={[s.orb, { bottom: 60, right: -60, width: 180, height: 180, backgroundColor: '#00d4aa', opacity: 0.025 }]} />
    </View>
  );
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await signUp(email.trim(), password);
      if (authError) setError(authError.message);
      else setSuccess(true);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={s.container}>
        <BackgroundOrbs />
        <View style={s.successWrap}>
          <View style={s.successCircle}>
            <Ionicons name="checkmark" size={40} color={colors.success} />
          </View>
          <Text style={s.successTitle}>Check your inbox</Text>
          <Text style={s.successText}>
            We sent a confirmation email to{'\n'}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{email}</Text>.
            {'\n'}Click the link to activate your account.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}>
              <LinearGradient
                colors={['#00d4aa', '#00b894']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.primaryBtnGradient}
              >
                <Text style={s.primaryBtnText}>Back to Sign In</Text>
              </LinearGradient>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <BackgroundOrbs />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={s.brandSection}>
            <View style={s.logoWrapper}><VoicoryLogo size={64} /></View>
            <Text style={s.brandName}>VOICORY</Text>
            <Text style={s.brandTagline}>Intelligent voice AI for your business</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Create account</Text>
            <Text style={s.cardSubtitle}>Get started with Voicory for free</Text>

            {error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#ff6b6b" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Email address</Text>
              <View style={[s.inputWrapper, focusedField === 'email' && s.inputFocused]}>
                <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? '#00d4aa' : '#6b7280'} />
                <TextInput
                  style={s.input}
                  placeholder="name@company.com"
                  placeholderTextColor="#4b5563"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password</Text>
              <View style={[s.inputWrapper, focusedField === 'password' && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? '#00d4aa' : '#6b7280'} />
                <TextInput
                  ref={passwordRef}
                  style={[s.input, { flex: 1 }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#4b5563"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={10}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Confirm password</Text>
              <View style={[s.inputWrapper, focusedField === 'confirm' && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'confirm' ? '#00d4aa' : '#6b7280'} />
                <TextInput
                  ref={confirmRef}
                  style={s.input}
                  placeholder="Repeat password"
                  placeholderTextColor="#4b5563"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Create Account */}
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient
                colors={['#00d4aa', '#00b894']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.primaryBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={s.primaryBtnText}>Create Account</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Sign In Link */}
            <View style={s.signupRow}>
              <Text style={s.signupText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable><Text style={s.signupLink}>Sign in</Text></Pressable>
              </Link>
            </View>
          </View>

          <Text style={s.footer}>By continuing, you agree to our Terms & Privacy Policy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b14' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  orb: { position: 'absolute', borderRadius: 9999 },

  brandSection: { alignItems: 'center', marginBottom: 36 },
  logoWrapper: {
    marginBottom: 16,
    shadowColor: '#00d4aa', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  brandName: { fontSize: 36, fontFamily: 'Ahsing', color: '#2EC7B7', letterSpacing: 2 },
  brandTagline: { marginTop: 6, fontSize: 14, color: '#6b7280', letterSpacing: 0.3 },

  card: {
    backgroundColor: '#0d1420', borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: '#1a2332',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
  },
  errorText: { flex: 1, fontSize: 13, color: '#ff6b6b', lineHeight: 18 },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111827', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#1f2937', paddingHorizontal: 14, height: 52,
  },
  inputFocused: {
    borderColor: '#00d4aa', backgroundColor: '#0f1a28',
    shadowColor: '#00d4aa', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1, shadowRadius: 8,
  },
  input: { flex: 1, fontSize: 15, color: '#ffffff', height: '100%' as any },

  primaryBtn: { marginTop: 6, borderRadius: 14, overflow: 'hidden' },
  primaryBtnGradient: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#000000', letterSpacing: 0.3 },

  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { fontSize: 14, color: '#6b7280' },
  signupLink: { fontSize: 14, fontWeight: '700', color: '#00d4aa' },

  footer: { textAlign: 'center', fontSize: 11, color: '#374151', marginTop: 24, lineHeight: 16 },

  // Success state
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 16 },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.successMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.success + '30',
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  successText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
