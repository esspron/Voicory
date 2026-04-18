import React, { useState, useRef, useEffect } from 'react';
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
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../lib/theme';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Rect,
  Circle,
} from 'react-native-svg';

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
          <SvgGrad id="suVGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2EC7B7" />
            <Stop offset="100%" stopColor="#26AFA1" />
          </SvgGrad>
          <SvgGrad id="suBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1B1E23" />
            <Stop offset="100%" stopColor="#15181C" />
          </SvgGrad>
        </Defs>
        <Rect x="0" y="0" width="40" height="40" rx="8" ry="8" fill="url(#suBgGrad)" />
        <Rect x="0.5" y="0.5" width="39" height="39" rx="7.5" ry="7.5" stroke="#2EC7B7" strokeWidth="1" opacity="0.18" fill="none" />
        <Path
          d="M22.23 6.97C27.42 10.11 29.51 18.39 26.33 23.74C25.33 25.44 24.55 27.11 24.05 28.66C23.85 25.52 23.39 23.04 22.65 20.64C21.76 17.73 21.34 16.53 20.45 13.78C18.51 7.82 13.98 6.77 12.00 6.77C9.99 6.77 7.51 7.51 6.00 9.68L6.66 10.41C7.90 9.06 9.87 9.21 10.80 11.42C12.35 15.06 13.20 19.63 14.83 24.59C16.30 28.93 23.23 25.36 23.23 33.23L24.20 33.23C24.20 31.25 25.36 27.07 27.61 23.62C30.17 19.67 34.00 12.54 34.00 6.97Z"
          fill="url(#suVGrad)"
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Animated success checkmark ──────────────────────────────────────────────

function SuccessCheckmark() {
  const scale = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 160 });
    ring1.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    ring2.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 1.6]) }],
    opacity: interpolate(ring1.value, [0, 0.3, 1], [0.5, 0.3, 0]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2.2]) }],
    opacity: interpolate(ring2.value, [0, 0.4, 1], [0.3, 0.15, 0]),
  }));

  return (
    <View style={s.checkmarkContainer}>
      <Animated.View style={[s.successRing, ring2Style]} />
      <Animated.View style={[s.successRing, ring1Style]} />
      <Animated.View style={[s.successCircle, circleStyle]}>
        <Ionicons name="checkmark" size={42} color="#fff" />
      </Animated.View>
    </View>
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

function getPasswordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pwd.length === 0) return { level: 0, label: '', color: 'transparent' };
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const score = [pwd.length >= 8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score <= 2) return { level: 1, label: 'Weak', color: colors.danger };
  if (score <= 3) return { level: 2, label: 'Fair', color: colors.warning };
  return { level: 3, label: 'Strong', color: colors.success };
}

// ─── Password strength bar ────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const { level, label, color } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <View style={s.strengthWrap}>
      <View style={s.strengthBarRow}>
        {([1, 2, 3] as const).map((i) => (
          <View
            key={i}
            style={[
              s.strengthSegment,
              { backgroundColor: level >= i ? color : '#1f2937' },
            ]}
          />
        ))}
      </View>
      <Text style={[s.strengthLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

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
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ── Entrance animations ──
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const cardTranslateY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const submitScale = useSharedValue(1);

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

  const submitBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  // ── Inline validation ──
  const emailValid = isValidEmail(email);
  const showEmailHint = emailTouched && email.length > 0;
  const passwordsMatch = password === confirmPassword;
  const showConfirmHint = confirmTouched && confirmPassword.length > 0;

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required.';
    if (!emailValid) return 'Enter a valid email address.';
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

  const onPressIn = () => { submitScale.value = withTiming(0.97, { duration: 80 }); };
  const onPressOut = () => { submitScale.value = withSpring(1, { damping: 10, stiffness: 200 }); };

  // ── Success state ──
  if (success) {
    return (
      <View style={s.container}>
        <BackgroundOrbs />
        <Animated.View entering={FadeIn.duration(400)} style={s.successWrap}>
          <SuccessCheckmark />
          <Text style={s.successTitle}>Check your inbox</Text>
          <Text style={s.successText}>
            We sent a confirmation email to{'\n'}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{email}</Text>.
            {'\n'}Click the link to activate your account.
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
            <Text style={s.cardTitle}>Create account</Text>
            <Text style={s.cardSubtitle}>Get started with Voicory for free</Text>

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
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
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

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password</Text>
              <View style={[s.inputWrapper, focusedField === 'password' && s.inputFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? colors.primary : '#6b7280'}
                />
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
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#6b7280"
                  />
                </Pressable>
              </View>
              <PasswordStrengthBar password={password} />
            </View>

            {/* Confirm Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Confirm password</Text>
              <View style={[
                s.inputWrapper,
                focusedField === 'confirm' && s.inputFocused,
                showConfirmHint && !passwordsMatch && s.inputError,
                showConfirmHint && passwordsMatch && s.inputSuccess,
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={
                    showConfirmHint && !passwordsMatch
                      ? colors.danger
                      : showConfirmHint && passwordsMatch
                      ? colors.success
                      : focusedField === 'confirm'
                      ? colors.primary
                      : '#6b7280'
                  }
                />
                <TextInput
                  ref={confirmRef}
                  style={s.input}
                  placeholder="Repeat password"
                  placeholderTextColor="#4b5563"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => { setFocusedField(null); setConfirmTouched(true); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  editable={!loading}
                />
                {showConfirmHint && (
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordsMatch ? colors.success : colors.danger}
                  />
                )}
              </View>
              {showConfirmHint && !passwordsMatch && (
                <Text style={s.fieldHintError}>Passwords do not match</Text>
              )}
            </View>

            {/* Create Account Button */}
            <Animated.View style={[{ marginTop: 6 }, submitBtnStyle]}>
              <Pressable
                onPress={handleSignUp}
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
                    <Text style={s.primaryBtnText}>Create Account</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Sign In Link */}
            <View style={s.signupRow}>
              <Text style={s.signupText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={s.signupLink}>Sign in</Text>
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
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },

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
  inputSuccess: {
    borderColor: colors.success,
    backgroundColor: 'rgba(34,197,94,0.04)',
  },
  input: { flex: 1, fontSize: 15, color: '#ffffff', height: '100%' as any },

  // Password strength
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBarRow: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', minWidth: 40, textAlign: 'right' },

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
  checkmarkContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.success,
  },
  successCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  successText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
