import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../lib/theme';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Circle, G } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Custom SVG Logo ─────────────────────────────────────────────────────────

function VoicoryLogo({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Defs>
        <SvgGrad id="logoGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00d4aa" />
          <Stop offset="1" stopColor="#0099ff" />
        </SvgGrad>
        <SvgGrad id="bgGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#162033" />
          <Stop offset="1" stopColor="#0d1520" />
        </SvgGrad>
      </Defs>
      <Circle cx="28" cy="28" r="28" fill="url(#bgGrad)" />
      {/* V lettermark with sound waves */}
      <Path d="M18 16L28 40L38 16" stroke="url(#logoGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Sound wave arcs */}
      <Path d="M40 22C42 24 42 32 40 34" stroke="url(#logoGrad)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <Path d="M43 19C46 23 46 33 43 37" stroke="url(#logoGrad)" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
    </Svg>
  );
}

// ─── Google Icon SVG ─────────────────────────────────────────────────────────

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

// ─── Decorative Orbs ─────────────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.orb, { top: -60, right: -40, width: 200, height: 200, backgroundColor: '#00d4aa', opacity: 0.04 }]} />
      <View style={[s.orb, { top: 120, left: -80, width: 160, height: 160, backgroundColor: '#0099ff', opacity: 0.03 }]} />
      <View style={[s.orb, { bottom: 60, right: -60, width: 180, height: 180, backgroundColor: '#00d4aa', opacity: 0.025 }]} />
    </View>
  );
}

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await signIn(email.trim(), password);
      if (authError) setError(authError.message);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) setError(authError.message);
    } catch {
      setError('Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <BackgroundOrbs />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Brand ─── */}
          <View style={s.brandSection}>
            <View style={s.logoWrapper}>
              <VoicoryLogo size={64} />
            </View>
            <Text style={s.brandName}>Voicory</Text>
            <Text style={s.brandTagline}>Intelligent voice AI for your business</Text>
          </View>

          {/* ─── Form Card ─── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSubtitle}>Sign in to continue</Text>

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
                  placeholder="Enter your password"
                  placeholderTextColor="#4b5563"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={10}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                </Pressable>
              </View>
            </View>

            {/* Sign In */}
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSignIn}
              disabled={loading || googleLoading}
            >
              <LinearGradient
                colors={['#00d4aa', '#00b894']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.primaryBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={s.primaryBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or continue with</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Google */}
            <Pressable
              style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.85 }]}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <GoogleIcon size={18} />
                  <Text style={s.googleBtnText}>Google</Text>
                </>
              )}
            </Pressable>

            {/* Signup */}
            <View style={s.signupRow}>
              <Text style={s.signupText}>Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable>
                  <Text style={s.signupLink}>Create one</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {/* Footer */}
          <Text style={s.footer}>By continuing, you agree to our Terms & Privacy Policy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b14' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  orb: { position: 'absolute', borderRadius: 9999 },

  // Brand
  brandSection: { alignItems: 'center', marginBottom: 36 },
  logoWrapper: {
    marginBottom: 16,
    shadowColor: '#00d4aa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  brandTagline: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: '#0d1420',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1a2332',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  errorText: { flex: 1, fontSize: 13, color: '#ff6b6b', lineHeight: 18 },

  // Fields
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1f2937',
    paddingHorizontal: 14,
    gap: 10,
    height: 52,
  },
  inputFocused: {
    borderColor: '#00d4aa',
    backgroundColor: '#0f1a28',
    shadowColor: '#00d4aa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  input: { flex: 1, fontSize: 15, color: '#ffffff', height: '100%' as any },

  // Primary Button
  primaryBtn: { marginTop: 6, borderRadius: 14, overflow: 'hidden' },
  primaryBtnGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#000000', letterSpacing: 0.3 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22, gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1f2937' },
  dividerText: { fontSize: 12, color: '#4b5563', letterSpacing: 0.3 },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#1f2937',
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#e5e7eb' },

  // Signup
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { fontSize: 14, color: '#6b7280' },
  signupLink: { fontSize: 14, fontWeight: '700', color: '#00d4aa' },

  // Footer
  footer: { textAlign: 'center', fontSize: 11, color: '#374151', marginTop: 24, lineHeight: 16 },
});
