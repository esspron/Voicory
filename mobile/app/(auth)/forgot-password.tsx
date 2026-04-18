import React, { useState, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../lib/theme';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Rect } from 'react-native-svg';

// ─── VoicoryLogo with glow pulse ─────────────────────────────────────────────

function VoicoryLogo({ size = 56, glowAnim }: { size?: number; glowAnim: import("react-native-reanimated").SharedValue<number> }) {
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glowAnim.value, [0, 1], [0.2, 0.55]),
    shadowRadius: interpolate(glowAnim.value, [0, 1], [12, 28]),
  }));

  return (
    <Animated.View style={[{ shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, elevation: 12 }, glowStyle]}>
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Defs>
          <SvgGrad id="fpVGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2EC7B7" />
            <Stop offset="100%" stopColor="#26AFA1" />
          </SvgGrad>
          <SvgGrad id="fpBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1B1E23" />
            <Stop offset="100%" stopColor="#15181C" />
          </SvgGrad>
        </Defs>
        <Rect x="0" y="0" width="40" height="40" rx="8" ry="8" fill="url(#fpBgGrad)" />
        <Rect x="0.5" y="0.5" width="39" height="39" rx="7.5" ry="7.5" stroke="#2EC7B7" strokeWidth="1" opacity="0.18" fill="none" />
        <Path
          d="M22.23 6.97C27.42 10.11 29.51 18.39 26.33 23.74C25.33 25.44 24.55 27.11 24.05 28.66C23.85 25.52 23.39 23.04 22.65 20.64C21.76 17.73 21.34 16.53 20.45 13.78C18.51 7.82 13.98 6.77 12.00 6.77C9.99 6.77 7.51 7.51 6.00 9.68L6.66 10.41C7.90 9.06 9.87 9.21 10.80 11.42C12.35 15.06 13.20 19.63 14.83 24.59C16.30 28.93 23.23 25.36 23.23 33.23L24.20 33.23C24.20 31.25 25.36 27.07 27.61 23.62C30.17 19.67 34.00 12.54 34.00 6.97Z"
          fill="url(#fpVGrad)"
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Background orbs ─────────────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.orb, { top: -60, right: -40, width: 200, height: 200, backgroundColor: colors.primary, opacity: 0.04 }]} />
      <View style={[s.orb, { top: 120, left: -80, width: 160, height: 160, backgroundColor: colors.secondary, opacity: 0.03 }]} />
      <View style={[s.orb, { bottom: 60, right: -60, width: 180, height: 180, backgroundColor: colors.primary, opacity: 0.025 }]} />
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // ── Entrance animations ──
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const cardTranslateY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    cardTranslateY.value = withSpring(0, { damping: 18, stiffness: 100, delay: 150 } as any);
    cardOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }, () => {
      glowAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    });
  }, []);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // ── Email inline validation ──
  const emailValid = isValidEmail(email);
  const showEmailHint = emailTouched && email.length > 0;

  const handleReset = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!isValidEmail(email.trim())) { setError('Please enter a valid email address.'); return; }
    setError(null);
    setLoading(true);
    try {
      if (typeof resetPassword === 'function') {
        const { error: authError } = await resetPassword(email.trim());
        if (authError) { setError(authError.message); return; }
      }
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onPressIn = () => { btnScale.value = withTiming(0.97, { duration: 80 }); };
  const onPressOut = () => { btnScale.value = withSpring(1, { damping: 10, stiffness: 200 }); };

  // ── Success state ──
  if (success) {
    return (
      <View style={s.container}>
        <BackgroundOrbs />
        <Animated.View entering={FadeIn.duration(400)} style={s.successWrap}>
          <View style={s.successIcon}>
            <Ionicons name="mail" size={38} color={colors.primary} />
          </View>
          <Text style={s.successTitle}>Check your inbox</Text>
          <Text style={s.successText}>
            We sent a password reset link to{'\n'}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{email}</Text>.
            {'\n\n'}The link expires in 24 hours.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={{ width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
              <LinearGradient
                colors={['#00d4aa', '#00b894']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.primaryBtnGradient}
              >
                <Text style={s.primaryBtnText}>Back to Sign In</Text>
              </LinearGradient>
            </Pressable>
          </Link>
          <Pressable onPress={() => { setSuccess(false); setEmail(''); }} style={{ marginTop: 12 }}>
            <Text style={s.resendText}>Didn't receive it? Try again</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <BackgroundOrbs />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Brand ─── */}
          <Animated.View style={[s.brandSection, brandStyle]}>
            <View style={s.logoWrapper}>
              <VoicoryLogo size={64} glowAnim={glowAnim} />
            </View>
            <Text style={s.brandName}>VOICORY</Text>
            <Text style={s.brandTagline}>Intelligent voice AI for your business</Text>
          </Animated.View>

          {/* ─── Form Card ─── */}
          <Animated.View style={[s.card, cardAnimStyle]}>
            {/* Back button */}
            <Pressable onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={s.backBtnText}>Back to Sign In</Text>
            </Pressable>

            <Text style={s.cardTitle}>Reset password</Text>
            <Text style={s.cardSubtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            {error && (
              <Animated.View entering={FadeIn.duration(200)} style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={s.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Email address</Text>
              <View style={[
                s.inputWrapper,
                focusedField === 'email' && s.inputFocused,
                showEmailHint && !emailValid && s.inputError,
              ]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={
                    showEmailHint && !emailValid
                      ? colors.danger
                      : focusedField === 'email'
                      ? colors.primary
                      : '#6b7280'
                  }
                />
                <TextInput
                  style={s.input}
                  placeholder="name@company.com"
                  placeholderTextColor="#4b5563"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => { setFocusedField(null); setEmailTouched(true); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  editable={!loading}
                />
                {showEmailHint && (
                  <Ionicons
                    name={emailValid ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={emailValid ? colors.success : colors.danger}
                  />
                )}
              </View>
              {showEmailHint && !emailValid && (
                <Text style={s.fieldHintError}>Enter a valid email address</Text>
              )}
            </View>

            {/* Send Reset Link Button */}
            <Animated.View style={[{ marginTop: 6 }, btnStyle]}>
              <Pressable
                onPress={handleReset}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={loading}
                style={{ borderRadius: 14, overflow: 'hidden' }}
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
                    <Text style={s.primaryBtnText}>Send Reset Link</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Signup link */}
            <View style={s.signupRow}>
              <Text style={s.signupText}>Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable>
                  <Text style={s.signupLink}>Create one</Text>
                </Pressable>
              </Link>
            </View>
          </Animated.View>

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
  logoWrapper: { marginBottom: 16 },
  brandName: { fontSize: 36, fontFamily: 'Ahsing', color: '#2EC7B7', letterSpacing: 2 },
  brandTagline: { marginTop: 6, fontSize: 14, color: '#6b7280', letterSpacing: 0.3 },

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

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  cardTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  errorText: { flex: 1, fontSize: 13, color: '#ff6b6b', lineHeight: 18 },

  // Fields
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 8, letterSpacing: 0.3 },
  fieldHintError: { marginTop: 5, fontSize: 11, color: colors.danger },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1f2937',
    paddingHorizontal: 14,
    height: 52,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#0f1a28',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  input: { flex: 1, fontSize: 15, color: '#ffffff', height: '100%' as any },

  // Button
  primaryBtnGradient: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#000000', letterSpacing: 0.3 },

  // Signup link
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { fontSize: 14, color: '#6b7280' },
  signupLink: { fontSize: 14, fontWeight: '700', color: colors.primary },

  // Footer
  footer: { textAlign: 'center', fontSize: 11, color: '#374151', marginTop: 24, lineHeight: 16 },

  // Success
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  successIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '30',
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  successText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  resendText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
