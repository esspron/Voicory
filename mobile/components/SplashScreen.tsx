import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Voicory Logo SVG ─────────────────────────────────────────────────────────

function VoicoryLogo({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Glow backdrop */}
      <Circle cx="36" cy="36" r="36" fill="url(#glow)" />
      {/* Waveform bars — voice / audio motif */}
      <Path
        d="M16 36 L16 36"
        stroke={colors.primary}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bar 1 — short */}
      <Path d="M16 32 L16 40" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
      {/* Bar 2 — tall */}
      <Path d="M24 22 L24 50" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
      {/* Bar 3 — tallest */}
      <Path d="M32 16 L32 56" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
      {/* Bar 4 — tall */}
      <Path d="M40 22 L40 50" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
      {/* Bar 5 — medium */}
      <Path d="M48 26 L48 46" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
      {/* Bar 6 — short */}
      <Path d="M56 32 L56 40" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────

function AnimatedBar({ delay, minH, maxH }: { delay: number; minH: number; maxH: number }) {
  const height = useSharedValue(minH);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(maxH, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(minH, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 3.5,
          borderRadius: 2,
          backgroundColor: colors.primary,
          alignSelf: 'center',
          marginHorizontal: 3,
        },
        style,
      ]}
    />
  );
}

// ─── Sweep Line ───────────────────────────────────────────────────────────────

const SWEEP_W = SCREEN_W * 0.7;

function SweepLine() {
  const translateX = useSharedValue(-SWEEP_W);

  useEffect(() => {
    translateX.value = withDelay(
      400,
      withRepeat(
        withTiming(SWEEP_W, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.sweepContainer}>
      {/* Track */}
      <View style={styles.sweepTrack} />
      {/* Moving glow */}
      <Animated.View style={[styles.sweepGlowWrapper, style]}>
        <LinearGradient
          colors={['transparent', colors.primary, colors.primaryDark, colors.primary, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.sweepGlow}
        />
      </Animated.View>
    </View>
  );
}

// ─── SplashScreen ─────────────────────────────────────────────────────────────

export function SplashScreen() {
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Logo entrance
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) });
    logoOpacity.value = withTiming(1, { duration: 500 });

    // Text fade in after logo
    textOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      {
        translateY: interpolate(textOpacity.value, [0, 1], [12, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Background glow orb */}
      <Animated.View style={[styles.glowOrb, glowStyle]} pointerEvents="none" />

      {/* Logo */}
      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <VoicoryLogo size={80} />
      </Animated.View>

      {/* Animated waveform bars */}
      <View style={styles.waveform}>
        <AnimatedBar delay={0}   minH={8}  maxH={32} />
        <AnimatedBar delay={120} minH={14} maxH={48} />
        <AnimatedBar delay={240} minH={20} maxH={60} />
        <AnimatedBar delay={360} minH={14} maxH={48} />
        <AnimatedBar delay={120} minH={8}  maxH={32} />
      </View>

      {/* Brand name */}
      <Animated.Text style={[styles.brandName, textStyle]}>
        VOICORY
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, textStyle]}>
        AI-Powered Voice Agents
      </Animated.Text>

      {/* Sweep loading bar */}
      <View style={styles.sweepWrapper}>
        <SweepLine />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050a12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.04,
    // iOS shadow for soft glow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 80,
    elevation: 0,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    marginBottom: 28,
  },
  brandName: {
    fontFamily: 'Ahsing',
    fontSize: 36,
    letterSpacing: 8,
    color: colors.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 0,
  },
  sweepWrapper: {
    position: 'absolute',
    bottom: 80,
    width: SWEEP_W,
  },
  sweepContainer: {
    width: SWEEP_W,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  sweepTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  sweepGlowWrapper: {
    position: 'absolute',
    top: 0,
    left: -60,
    width: 120,
    height: 2,
  },
  sweepGlow: {
    width: 120,
    height: 2,
    borderRadius: 1,
  },
});
