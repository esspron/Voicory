import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedScrollHandler,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Ellipse,
  Rect,
  Path,
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
  Polygon,
  ClipPath,
} from 'react-native-svg';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radii } from '../lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ONBOARDING_KEY = 'voicory_onboarding_complete';

// ─── SVG Illustrations ──────────────────────────────────────────────────────

/** Screen 1: AI Voice Agents — phone + waveform */
const VoiceAgentIllustration = () => (
  <Svg width={280} height={260} viewBox="0 0 280 260">
    <Defs>
      <LinearGradient id="phoneGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.15" />
        <Stop offset="1" stopColor="#0099ff" stopOpacity="0.08" />
      </LinearGradient>
      <LinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#00d4aa" stopOpacity="0" />
        <Stop offset="0.5" stopColor="#00d4aa" stopOpacity="1" />
        <Stop offset="1" stopColor="#00d4aa" stopOpacity="0" />
      </LinearGradient>
      <LinearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#00d4aa" />
        <Stop offset="1" stopColor="#0099ff" />
      </LinearGradient>
      <LinearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.2" />
        <Stop offset="1" stopColor="#00d4aa" stopOpacity="0" />
      </LinearGradient>
    </Defs>

    {/* Background orbit rings */}
    <Circle cx="140" cy="130" r="110" stroke="#00d4aa" strokeOpacity="0.06" strokeWidth="1" fill="none" />
    <Circle cx="140" cy="130" r="85" stroke="#00d4aa" strokeOpacity="0.08" strokeWidth="1" fill="none" />
    <Circle cx="140" cy="130" r="60" stroke="#00d4aa" strokeOpacity="0.12" strokeWidth="1" fill="none" />

    {/* Phone body */}
    <Rect x="100" y="40" width="80" height="140" rx="16" fill="url(#phoneGrad)" stroke="#00d4aa" strokeOpacity="0.4" strokeWidth="1.5" />
    <Rect x="106" y="50" width="68" height="110" rx="8" fill="#0c1219" />

    {/* Phone screen content — mini waveform */}
    <Line x1="116" y1="100" x2="164" y2="100" stroke="#1a2332" strokeWidth="1" />
    <Path d="M116 100 L124 100 L126 88 L128 112 L130 95 L132 105 L134 100 L136 100 L138 92 L140 108 L142 96 L144 104 L146 100 L148 100 L150 94 L152 106 L154 100 L164 100"
      stroke="#00d4aa" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

    {/* Screen glow */}
    <Rect x="106" y="50" width="68" height="40" rx="8" fill="url(#glowGrad)" />

    {/* Phone notch */}
    <Rect x="125" y="43" width="30" height="6" rx="3" fill="#1a2332" />

    {/* Phone home indicator */}
    <Rect x="128" y="170" width="24" height="3" rx="1.5" fill="#00d4aa" fillOpacity="0.4" />

    {/* Waveform bars — left side, external */}
    <Rect x="52" y="105" width="6" height="20" rx="3" fill="url(#accentGrad)" opacity="0.5" />
    <Rect x="62" y="95" width="6" height="40" rx="3" fill="url(#accentGrad)" opacity="0.8" />
    <Rect x="72" y="110" width="6" height="10" rx="3" fill="url(#accentGrad)" opacity="0.4" />
    <Rect x="82" y="100" width="6" height="30" rx="3" fill="url(#accentGrad)" opacity="0.6" />

    {/* Waveform bars — right side, external */}
    <Rect x="192" y="108" width="6" height="14" rx="3" fill="url(#accentGrad)" opacity="0.4" />
    <Rect x="202" y="98" width="6" height="34" rx="3" fill="url(#accentGrad)" opacity="0.7" />
    <Rect x="212" y="105" width="6" height="20" rx="3" fill="url(#accentGrad)" opacity="0.5" />
    <Rect x="222" y="102" width="6" height="26" rx="3" fill="url(#accentGrad)" opacity="0.6" />

    {/* Signal dots */}
    <Circle cx="50" cy="70" r="4" fill="#00d4aa" fillOpacity="0.6" />
    <Circle cx="230" cy="70" r="3" fill="#0099ff" fillOpacity="0.6" />
    <Circle cx="60" cy="170" r="2.5" fill="#00d4aa" fillOpacity="0.4" />
    <Circle cx="220" cy="175" r="3.5" fill="#0099ff" fillOpacity="0.5" />

    {/* AI indicator chip top right */}
    <Rect x="196" y="42" width="46" height="22" rx="11" fill="#0c1219" stroke="#00d4aa" strokeOpacity="0.5" strokeWidth="1" />
    <Circle cx="209" cy="53" r="5" fill="#00d4aa" fillOpacity="0.8" />
    <Rect x="218" y="49" width="18" height="3" rx="1.5" fill="#00d4aa" fillOpacity="0.4" />
    <Rect x="218" y="55" width="12" height="3" rx="1.5" fill="#00d4aa" fillOpacity="0.25" />

    {/* Connection lines */}
    <Line x1="100" y1="115" x2="88" y2="115" stroke="#00d4aa" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" />
    <Line x1="180" y1="115" x2="192" y2="115" stroke="#00d4aa" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" />
  </Svg>
);

/** Screen 2: Smart Customer Insights — analytics dashboard */
const InsightsIllustration = () => (
  <Svg width={280} height={260} viewBox="0 0 280 260">
    <Defs>
      <LinearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#111a24" />
        <Stop offset="1" stopColor="#0c1219" />
      </LinearGradient>
      <LinearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#00d4aa" />
        <Stop offset="1" stopColor="#00d4aa" stopOpacity="0.3" />
      </LinearGradient>
      <LinearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#0099ff" />
        <Stop offset="1" stopColor="#0099ff" stopOpacity="0.3" />
      </LinearGradient>
      <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.3" />
        <Stop offset="0.5" stopColor="#00d4aa" />
        <Stop offset="1" stopColor="#0099ff" />
      </LinearGradient>
    </Defs>

    {/* Main dashboard card */}
    <Rect x="30" y="20" width="220" height="220" rx="20" fill="url(#cardBg)" stroke="#1a2332" strokeWidth="1.5" />

    {/* Header row */}
    <Rect x="46" y="36" width="80" height="8" rx="4" fill="#243040" />
    <Rect x="46" y="50" width="50" height="6" rx="3" fill="#1a2332" />
    <Rect x="196" y="36" width="38" height="20" rx="10" fill="#00d4aa" fillOpacity="0.15" />
    <Rect x="202" y="42" width="26" height="8" rx="4" fill="#00d4aa" fillOpacity="0.5" />

    {/* KPI row */}
    <Rect x="46" y="74" width="55" height="44" rx="10" fill="#0c1219" stroke="#1a2332" strokeWidth="1" />
    <Rect x="55" y="84" width="28" height="6" rx="3" fill="#00d4aa" fillOpacity="0.6" />
    <Rect x="55" y="95" width="20" height="5" rx="2.5" fill="#243040" />
    <Rect x="55" y="103" width="24" height="5" rx="2.5" fill="#243040" />

    <Rect x="112" y="74" width="55" height="44" rx="10" fill="#0c1219" stroke="#1a2332" strokeWidth="1" />
    <Rect x="121" y="84" width="28" height="6" rx="3" fill="#0099ff" fillOpacity="0.6" />
    <Rect x="121" y="95" width="20" height="5" rx="2.5" fill="#243040" />
    <Rect x="121" y="103" width="24" height="5" rx="2.5" fill="#243040" />

    <Rect x="178" y="74" width="56" height="44" rx="10" fill="#0c1219" stroke="#1a2332" strokeWidth="1" />
    <Rect x="187" y="84" width="28" height="6" rx="3" fill="#22c55e" fillOpacity="0.6" />
    <Rect x="187" y="95" width="20" height="5" rx="2.5" fill="#243040" />
    <Rect x="187" y="103" width="24" height="5" rx="2.5" fill="#243040" />

    {/* Bar chart area */}
    <Rect x="46" y="132" width="188" height="80" rx="10" fill="#0c1219" stroke="#1a2332" strokeWidth="1" />

    {/* Chart grid lines */}
    <Line x1="58" y1="148" x2="222" y2="148" stroke="#1a2332" strokeWidth="0.5" />
    <Line x1="58" y1="160" x2="222" y2="160" stroke="#1a2332" strokeWidth="0.5" />
    <Line x1="58" y1="172" x2="222" y2="172" stroke="#1a2332" strokeWidth="0.5" />
    <Line x1="58" y1="184" x2="222" y2="184" stroke="#1a2332" strokeWidth="0.5" />

    {/* Bar chart bars — 7 days */}
    <Rect x="64"  y="168" width="12" height="16" rx="3" fill="url(#barGrad1)" />
    <Rect x="82"  y="155" width="12" height="29" rx="3" fill="url(#barGrad1)" />
    <Rect x="100" y="162" width="12" height="22" rx="3" fill="url(#barGrad2)" />
    <Rect x="118" y="150" width="12" height="34" rx="3" fill="url(#barGrad1)" />
    <Rect x="136" y="158" width="12" height="26" rx="3" fill="url(#barGrad2)" />
    <Rect x="154" y="145" width="12" height="39" rx="3" fill="url(#barGrad1)" />
    <Rect x="172" y="153" width="12" height="31" rx="3" fill="url(#barGrad2)" />
    <Rect x="190" y="148" width="12" height="36" rx="3" fill="url(#barGrad1)" />
    <Rect x="208" y="155" width="12" height="29" rx="3" fill="url(#barGrad1)" />

    {/* Trend line overlay */}
    <Path d="M70 172 L88 162 L106 167 L124 156 L142 163 L160 152 L178 158 L196 153 L214 158"
      stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

    {/* Active dot on trend line */}
    <Circle cx="160" cy="152" r="3.5" fill="#00d4aa" />
    <Circle cx="160" cy="152" r="6" fill="#00d4aa" fillOpacity="0.2" />

    {/* Bottom labels */}
    <Rect x="64"  y="196" width="12" height="4" rx="2" fill="#243040" />
    <Rect x="100" y="196" width="12" height="4" rx="2" fill="#243040" />
    <Rect x="136" y="196" width="12" height="4" rx="2" fill="#243040" />
    <Rect x="172" y="196" width="12" height="4" rx="2" fill="#243040" />
    <Rect x="208" y="196" width="12" height="4" rx="2" fill="#243040" />

    {/* Floating chip */}
    <Rect x="155" y="10" width="70" height="24" rx="12" fill="#0c1219" stroke="#00d4aa" strokeOpacity="0.4" strokeWidth="1" />
    <Circle cx="170" cy="22" r="5" fill="#00d4aa" fillOpacity="0.7" />
    <Rect x="180" y="18" width="36" height="8" rx="4" fill="#00d4aa" fillOpacity="0.3" />
  </Svg>
);

/** Screen 3: WhatsApp Integration — messaging bubbles */
const WhatsAppIllustration = () => (
  <Svg width={280} height={260} viewBox="0 0 280 260">
    <Defs>
      <LinearGradient id="waBg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.12" />
        <Stop offset="1" stopColor="#0099ff" stopOpacity="0.06" />
      </LinearGradient>
      <LinearGradient id="waPrimary" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#00d4aa" />
        <Stop offset="1" stopColor="#00b894" />
      </LinearGradient>
      <LinearGradient id="waSecondary" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0099ff" />
        <Stop offset="1" stopColor="#0077cc" />
      </LinearGradient>
    </Defs>

    {/* Chat container */}
    <Rect x="40" y="18" width="200" height="224" rx="20" fill="url(#waBg)" stroke="#1a2332" strokeWidth="1.5" />

    {/* Chat header */}
    <Rect x="40" y="18" width="200" height="48" rx="20" fill="#111a24" />
    <Rect x="40" y="38" width="200" height="28" fill="#111a24" />
    <Circle cx="68" cy="42" r="14" fill="#0c1219" stroke="#1a2332" strokeWidth="1" />
    {/* Avatar inner */}
    <Circle cx="68" cy="40" r="5" fill="#00d4aa" fillOpacity="0.6" />
    <Path d="M60 51 Q68 46 76 51" stroke="#00d4aa" strokeOpacity="0.6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <Rect x="88" y="35" width="50" height="8" rx="4" fill="#243040" />
    <Rect x="88" y="47" width="30" height="6" rx="3" fill="#1a2332" />
    {/* Online dot */}
    <Circle cx="78" cy="52" r="5" fill="#0c1219" />
    <Circle cx="78" cy="52" r="3.5" fill="#22c55e" />

    {/* Received message bubble 1 */}
    <Rect x="52" y="82" width="130" height="36" rx="12" fill="#111a24" stroke="#1a2332" strokeWidth="1" />
    <Rect x="52" y="93" width="130" height="25" rx="0" fill="#111a24" />
    <Path d="M52 93 L44 98 L52 103 Z" fill="#111a24" />
    <Rect x="62" y="92" width="80" height="7" rx="3.5" fill="#243040" />
    <Rect x="62" y="104" width="50" height="5" rx="2.5" fill="#1a2332" />

    {/* Sent message bubble 1 */}
    <Rect x="98" y="132" width="140" height="36" rx="12" fill="url(#waPrimary)" />
    <Rect x="98" y="143" width="140" height="25" rx="0" fill="url(#waPrimary)" />
    <Path d="M238 143 L246 148 L238 153 Z" fill="#00b894" />
    <Rect x="108" y="142" width="90" height="7" rx="3.5" fill="#ffffff" fillOpacity="0.3" />
    <Rect x="108" y="154" width="60" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.2" />
    {/* Double tick */}
    <Path d="M196 166 L199 169 L206 162" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M200 166 L203 169 L210 162" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

    {/* Received message bubble 2 */}
    <Rect x="52" y="182" width="110" height="30" rx="12" fill="#111a24" stroke="#1a2332" strokeWidth="1" />
    <Rect x="52" y="193" width="110" height="19" rx="0" fill="#111a24" />
    <Path d="M52 193 L44 198 L52 203 Z" fill="#111a24" />
    <Rect x="62" y="191" width="65" height="7" rx="3.5" fill="#243040" />
    <Rect x="62" y="201" width="40" height="5" rx="2.5" fill="#1a2332" />

    {/* Input bar */}
    <Rect x="52" y="224" width="176" height="10" rx="5" fill="#0c1219" />

    {/* AI bot badge */}
    <Rect x="170" y="70" width="70" height="22" rx="11" fill="#0c1219" stroke="#00d4aa" strokeOpacity="0.5" strokeWidth="1" />
    <Circle cx="184" cy="81" r="5" fill="url(#waPrimary)" />
    <Rect x="193" y="77" width="38" height="8" rx="4" fill="#00d4aa" fillOpacity="0.3" />
  </Svg>
);

/** Screen 4: Get Started — abstract AI network */
const GetStartedIllustration = () => (
  <Svg width={280} height={260} viewBox="0 0 280 260">
    <Defs>
      <LinearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#00d4aa" />
        <Stop offset="1" stopColor="#0099ff" />
      </LinearGradient>
      <LinearGradient id="nodeGrad1" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.8" />
        <Stop offset="1" stopColor="#00d4aa" stopOpacity="0.3" />
      </LinearGradient>
      <LinearGradient id="nodeGrad2" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0099ff" stopOpacity="0.8" />
        <Stop offset="1" stopColor="#0099ff" stopOpacity="0.3" />
      </LinearGradient>
      <LinearGradient id="bgGlow" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.12" />
        <Stop offset="1" stopColor="#00d4aa" stopOpacity="0" />
      </LinearGradient>
    </Defs>

    {/* Outer rings */}
    <Circle cx="140" cy="130" r="115" stroke="#00d4aa" strokeOpacity="0.04" strokeWidth="1" fill="none" />
    <Circle cx="140" cy="130" r="90" stroke="#00d4aa" strokeOpacity="0.07" strokeWidth="1" fill="none" />
    <Circle cx="140" cy="130" r="65" stroke="#00d4aa" strokeOpacity="0.1" strokeWidth="1" fill="none" />

    {/* Connection lines from center to satellites */}
    <Line x1="140" y1="130" x2="60"  y2="65"  stroke="#00d4aa" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
    <Line x1="140" y1="130" x2="220" y2="65"  stroke="#0099ff" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
    <Line x1="140" y1="130" x2="46"  y2="155" stroke="#00d4aa" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
    <Line x1="140" y1="130" x2="234" y2="155" stroke="#0099ff" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
    <Line x1="140" y1="130" x2="100" y2="215" stroke="#00d4aa" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
    <Line x1="140" y1="130" x2="180" y2="215" stroke="#0099ff" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />

    {/* Core node */}
    <Circle cx="140" cy="130" r="34" fill="#00d4aa" fillOpacity="0.08" />
    <Circle cx="140" cy="130" r="26" fill="#00d4aa" fillOpacity="0.12" />
    <Circle cx="140" cy="130" r="18" fill="url(#coreGrad)" />
    {/* Core icon — voice waveform */}
    <Path d="M131 130 L133 124 L135 136 L137 127 L139 133 L141 130 L143 127 L145 133 L147 130 L149 130"
      stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* Satellite nodes */}
    {/* Top-left: voice */}
    <Circle cx="60" cy="65" r="18" fill="url(#nodeGrad1)" />
    <Rect x="52" y="61" width="16" height="8" rx="4" fill="#000" fillOpacity="0.4" />
    <Circle cx="60" cy="65" r="4" fill="#000" fillOpacity="0.3" />

    {/* Top-right: analytics */}
    <Circle cx="220" cy="65" r="18" fill="url(#nodeGrad2)" />
    <Rect x="213" y="60" width="4" height="10" rx="2" fill="#000" fillOpacity="0.4" />
    <Rect x="219" y="63" width="4" height="7" rx="2" fill="#000" fillOpacity="0.4" />
    <Rect x="225" y="58" width="4" height="12" rx="2" fill="#000" fillOpacity="0.4" />

    {/* Mid-left: phone */}
    <Circle cx="46" cy="155" r="18" fill="url(#nodeGrad1)" />
    <Rect x="39" y="147" width="14" height="22" rx="4" fill="#000" fillOpacity="0.4" />
    <Circle cx="46" cy="166" r="2" fill="#000" fillOpacity="0.6" />

    {/* Mid-right: message */}
    <Circle cx="234" cy="155" r="18" fill="url(#nodeGrad2)" />
    <Rect x="226" y="148" width="16" height="12" rx="4" fill="#000" fillOpacity="0.4" />
    <Path d="M230 160 L226 164" stroke="#000" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />

    {/* Bottom-left: brain */}
    <Circle cx="100" cy="215" r="15" fill="url(#nodeGrad1)" />
    <Circle cx="97" cy="213" r="4" fill="#000" fillOpacity="0.3" />
    <Circle cx="103" cy="213" r="4" fill="#000" fillOpacity="0.3" />
    <Path d="M97 217 Q100 220 103 217" stroke="#000" strokeOpacity="0.4" strokeWidth="1" fill="none" />

    {/* Bottom-right: check */}
    <Circle cx="180" cy="215" r="15" fill="url(#nodeGrad2)" />
    <Path d="M174 215 L178 219 L186 211" stroke="#000" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* Floating accent dots */}
    <Circle cx="140" cy="22" r="3" fill="#00d4aa" fillOpacity="0.5" />
    <Circle cx="238" cy="110" r="2.5" fill="#0099ff" fillOpacity="0.5" />
    <Circle cx="40" cy="108" r="2" fill="#00d4aa" fillOpacity="0.4" />
  </Svg>
);

// ─── Slide Data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    key: 'voice',
    title: 'AI Voice Agents',
    subtitle: 'Deploy intelligent voice agents that handle customer calls 24/7 — no humans required.',
    Illustration: VoiceAgentIllustration,
    accent: colors.primary,
  },
  {
    key: 'insights',
    title: 'Smart Customer\nInsights',
    subtitle: 'Understand every conversation. Track performance, sentiment, and conversion in real time.',
    Illustration: InsightsIllustration,
    accent: colors.secondary,
  },
  {
    key: 'whatsapp',
    title: 'WhatsApp\nIntegration',
    subtitle: 'Engage customers on WhatsApp with AI-powered messaging that feels personal at scale.',
    Illustration: WhatsAppIllustration,
    accent: '#25D366',
  },
  {
    key: 'start',
    title: 'Your AI Team\nStarts Here',
    subtitle: 'Set up your first voice agent in minutes. Join thousands of businesses automating with Voicory.',
    Illustration: GetStartedIllustration,
    accent: colors.primary,
  },
] as const;

// ─── Dot Indicator ────────────────────────────────────────────────────────────

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
}

const Dot: React.FC<DotProps> = ({ index, scrollX }) => {
  const animStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const width = interpolate(scrollX.value, inputRange, [6, 20, 6], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animStyle,
        { backgroundColor: colors.primary },
      ]}
    />
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
    onMomentumEnd: (e) => {
      const idx = Math.round(e.contentOffset.x / SCREEN_WIDTH);
      runOnJS(setCurrentIndex)(idx);
    },
  });

  const scrollToIndex = useCallback((idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
    setCurrentIndex(idx);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  }, [currentIndex, scrollToIndex]);

  const completeOnboarding = useCallback(async (path: 'signup' | 'login') => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace(path === 'signup' ? '/(auth)/register' : '/(auth)/login');
  }, []);

  const handleSkip = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  }, []);

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 16 }]}
          onPress={handleSkip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <SlideItem key={slide.key} slide={slide} index={index} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        {isLast ? (
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => completeOnboarding('signup')}
              activeOpacity={0.85}
            >
              <ExpoLinearGradient
                colors={['#00d4aa', '#0099ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Get Started Free</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => completeOnboarding('login')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>I have an account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <ExpoLinearGradient
              colors={['#00d4aa', '#0099ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>Next →</Text>
            </ExpoLinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Slide Item ───────────────────────────────────────────────────────────────

interface SlideItemProps {
  slide: typeof SLIDES[number];
  index: number;
  scrollX: SharedValue<number>;
}

const SlideItem: React.FC<SlideItemProps> = ({ slide, index, scrollX }) => {
  const { Illustration } = slide;

  const illustrationStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const translateX = interpolate(scrollX.value, inputRange, [-40, 0, 40], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
    return { transform: [{ translateX }, { scale }], opacity };
  });

  const textStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 0.5) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 0.5) * SCREEN_WIDTH];
    const translateY = interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY }], opacity };
  });

  return (
    <View style={styles.slide}>
      {/* Illustration */}
      <Animated.View style={[styles.illustrationContainer, illustrationStyle]}>
        {/* Glow behind illustration */}
        <View style={[styles.illustrationGlow, { backgroundColor: slide.accent + '15' }]} />
        <Illustration />
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  illustrationGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -10,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...typography.displaySm,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  skipBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  nextBtn: {
    width: '100%',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  nextBtnText: {
    ...typography.buttonLg,
    color: '#000',
  },
  ctaRow: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  primaryBtnText: {
    ...typography.buttonLg,
    color: '#000',
  },
  secondaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
