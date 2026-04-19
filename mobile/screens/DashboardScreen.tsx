import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Animated as RNAnimated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGrad,
  RadialGradient,
  Stop,
  Ellipse,
  Rect,
} from 'react-native-svg';
import { getDashboardData, DashboardData, CreditHealth, AgentPerformance } from '../services/analyticsService';
import { getCalls } from '../services/callService';
import { supabase } from '../lib/supabase';
import { CallLog } from '../types';
import { colors as C, typography, spacing, radii, shadows } from '../lib/theme';
import { useWebLink } from '../hooks/useWebLink';
import { SkeletonDashboard } from '../components/Skeleton';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { MiniChart } from '../components/MiniChart';
import { ProgressRing } from '../components/ProgressRing';

const { width: SW } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getGreeting(orgName: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return orgName ? `${salutation}, ${orgName}` : salutation;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM ABSTRACT SVG ILLUSTRATIONS
// Geometric gradient art — no cartoons
// ═══════════════════════════════════════════════════════════════════════════════

/** Hero geometric mesh — used in credit card background */
function MeshBackground({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="mg1" cx="20%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#00d4aa" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="mg2" cx="85%" cy="70%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#0099ff" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#0099ff" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="mg3" cx="50%" cy="10%" rx="40%" ry="40%">
          <Stop offset="0" stopColor="#7c3aed" stopOpacity="0.10" />
          <Stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Gradient blobs */}
      <Ellipse cx={width * 0.18} cy={height * 0.3} rx={width * 0.45} ry={height * 0.55} fill="url(#mg1)" />
      <Ellipse cx={width * 0.85} cy={height * 0.7} rx={width * 0.4} ry={height * 0.5} fill="url(#mg2)" />
      <Ellipse cx={width * 0.5} cy={0} rx={width * 0.35} ry={height * 0.4} fill="url(#mg3)" />
      {/* Subtle grid lines */}
      {[0.25, 0.5, 0.75].map((xFrac, i) => (
        <Path
          key={`vl${i}`}
          d={`M${width * xFrac} 0 L${width * xFrac} ${height}`}
          stroke="#00d4aa"
          strokeWidth="0.4"
          strokeOpacity="0.07"
        />
      ))}
      {[0.33, 0.66].map((yFrac, i) => (
        <Path
          key={`hl${i}`}
          d={`M0 ${height * yFrac} L${width} ${height * yFrac}`}
          stroke="#0099ff"
          strokeWidth="0.4"
          strokeOpacity="0.05"
        />
      ))}
      {/* Diagonal accent line */}
      <Path
        d={`M0 ${height} L${width * 0.6} 0`}
        stroke="#00d4aa"
        strokeWidth="0.5"
        strokeOpacity="0.08"
      />
    </Svg>
  );
}

/** Geometric abstract icon for "waiting for calls" state */
function WaveformIllustration() {
  return (
    <Svg width={80} height={64} viewBox="0 0 80 64" fill="none">
      <Defs>
        <SvgGrad id="wv" x1="0" y1="0" x2="80" y2="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00d4aa" />
          <Stop offset="1" stopColor="#0099ff" />
        </SvgGrad>
      </Defs>
      {/* Waveform bars — geometric and premium */}
      {[4, 12, 28, 44, 56, 68, 76].map((x, i) => {
        const heights = [16, 32, 48, 64, 40, 28, 14];
        const h = heights[i];
        return (
          <Rect
            key={i}
            x={x}
            y={(64 - h) / 2}
            width={6}
            height={h}
            rx={3}
            fill="url(#wv)"
            opacity={0.5 + i * 0.07}
          />
        );
      })}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREDIT CARD — Apple Card style gradient mesh
// ═══════════════════════════════════════════════════════════════════════════════

const RING_SZ = 76;
const RING_SW = 5;
const RING_R = (RING_SZ - RING_SW) / 2;
const RING_C = 2 * Math.PI * RING_R;

const URGENCY = {
  healthy: { color: '#22c55e', label: 'Healthy' },
  watch: { color: '#f59e0b', label: 'Watch' },
  low: { color: '#f97316', label: 'Low' },
  critical: { color: '#ef4444', label: 'Critical' },
};

function CreditRing({ health }: { health: CreditHealth }) {
  const pct = Math.min(health.daysRemaining / 30, 1);
  const offset = RING_C * (1 - pct);
  const u = URGENCY[health.urgency];

  return (
    <View style={{ width: RING_SZ, height: RING_SZ, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SZ} height={RING_SZ} style={StyleSheet.absoluteFill}>
        <Circle cx={RING_SZ / 2} cy={RING_SZ / 2} r={RING_R} stroke={C.border} strokeWidth={RING_SW} fill="none" />
        <Circle
          cx={RING_SZ / 2} cy={RING_SZ / 2} r={RING_R}
          stroke={u.color} strokeWidth={RING_SW} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_C}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${RING_SZ / 2} ${RING_SZ / 2})`}
        />
      </Svg>
      <Text style={[s.ringNum, { color: u.color }]}>
        {health.daysRemaining >= 999 ? '∞' : Math.floor(health.daysRemaining)}
      </Text>
      <Text style={s.ringUnit}>days</Text>
    </View>
  );
}

function CreditCard({ ch }: { ch: CreditHealth }) {
  const CARD_W = SW - 40;
  const CARD_H = 120;

  return (
    <View style={[s.creditCard, { width: CARD_W, height: CARD_H }]}>
      {/* Mesh background */}
      <MeshBackground width={CARD_W} height={CARD_H} />
      {/* Inner border glow */}
      <View style={s.creditCardInnerBorder} />

      <View style={s.creditMain}>
        <Text style={s.creditLabel}>Credit Balance</Text>
        <AnimatedNumber
          value={ch.balanceInr}
          prefix="₹"
          style={s.creditAmount}
          decimals={ch.balanceInr < 100 ? 2 : 0}
        />
        <Text style={s.creditSub}>
          ${ch.balanceUsd.toFixed(2)}
          {ch.dailyBurnInr > 0 ? `  ·  ₹${ch.dailyBurnInr.toFixed(0)}/day` : '  ·  No spend yet'}
        </Text>
      </View>
      <CreditRing health={ch} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT PERFORMANCE — Mini progress rings instead of flat bars
// ═══════════════════════════════════════════════════════════════════════════════

const AGENT_RING_SZ = 44;

function AgentRow({ agent, index }: { agent: AgentPerformance; index: number }) {
  const rateColor = agent.successRate > 80 ? C.success : agent.successRate > 50 ? C.warning : C.danger;
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(index * 80, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[s.agentRow, animStyle, index > 0 && { borderTopWidth: 1, borderTopColor: C.borderLight }]}>
      <View style={s.agentIconWrap}>
        <Ionicons name="hardware-chip-outline" size={16} color={C.primary} />
      </View>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={s.agentName} numberOfLines={1}>{agent.assistantName}</Text>
        <Text style={s.agentSub}>{agent.totalCalls} calls · {Math.round(agent.avgDurationSec)}s avg</Text>
      </View>
      <ProgressRing
        value={agent.successRate}
        size={AGENT_RING_SZ}
        strokeWidth={3.5}
        color={rateColor}
        label={`${Math.round(agent.successRate)}%`}
        labelStyle={{ fontSize: 10, fontWeight: '800' } as any}
      />
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP CHECKLIST — animated checkmarks via Reanimated
// ═══════════════════════════════════════════════════════════════════════════════

interface SetupStep {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  done: boolean;
  action?: () => void;
}

function AnimatedCheckmark({ done, index }: { done: boolean; index: number }) {
  const scale = useSharedValue(done ? 1 : 0);
  const opacity = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    if (done) {
      scale.value = withDelay(index * 120, withSpring(1, { damping: 12, stiffness: 200 }));
      opacity.value = withDelay(index * 120, withTiming(1, { duration: 200 }));
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [done]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: done ? C.primary : 'transparent',
    borderColor: done ? C.primary : C.border,
  }));

  return (
    <Animated.View style={[s.setupCheck, containerStyle]}>
      {done ? (
        <Animated.View style={iconStyle}>
          <Ionicons name="checkmark" size={14} color={C.bg} />
        </Animated.View>
      ) : (
        <Text style={s.setupCheckNum}>{index + 1}</Text>
      )}
    </Animated.View>
  );
}

function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const doneCount = steps.filter(s => s.done).length;
  const progress = doneCount / steps.length;
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(progress, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%` as any,
  }));

  return (
    <View style={s.setupCard}>
      <View style={s.setupHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.setupTitle}>Get started</Text>
          <Text style={s.setupProgress}>{doneCount} of {steps.length} complete</Text>
        </View>
        <View style={s.setupBarTrack}>
          <Animated.View style={[s.setupBarFill, barStyle]} />
        </View>
      </View>

      {steps.map((step, i) => (
        <TouchableOpacity
          key={step.key}
          style={[s.setupStep, i === steps.length - 1 && { borderBottomWidth: 0 }]}
          onPress={step.action}
          activeOpacity={step.action ? 0.7 : 1}
          disabled={step.done}
        >
          <AnimatedCheckmark done={step.done} index={i} />
          <View style={{ flex: 1 }}>
            <Text style={[s.setupStepTitle, step.done && s.setupStepDone]}>{step.title}</Text>
            <Text style={s.setupStepSub}>{step.subtitle}</Text>
          </View>
          {!step.done && step.action && (
            <Ionicons name="chevron-forward" size={16} color={C.textFaint} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECENT CALLS — with Today / Yesterday time grouping
// ═══════════════════════════════════════════════════════════════════════════════

function formatGroup(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function groupCallsByDate(calls: CallLog[]): { label: string; calls: CallLog[] }[] {
  const groups: Record<string, CallLog[]> = {};
  for (const call of calls) {
    const d = new Date(call.created_at);
    const label = formatGroup(d);
    if (!groups[label]) groups[label] = [];
    groups[label].push(call);
  }
  return Object.entries(groups).map(([label, calls]) => ({ label, calls }));
}

function CallRow({ call, onPress }: { call: CallLog; onPress: () => void }) {
  const isIn = call.direction === 'inbound';
  const dur = call.duration_seconds ?? 0;
  const m = Math.floor(dur / 60);
  const sec = dur % 60;
  const timeStr = m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
  const phone = call.phone_number || (isIn ? call.from_number : call.to_number) || 'Unknown';
  const statusColor = call.status === 'completed' ? C.success
    : call.status === 'failed' ? C.danger
    : call.status === 'in-progress' ? C.warning
    : C.textFaint;

  const timeStr2 = new Date(call.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <TouchableOpacity style={s.callRow} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={isIn ? [C.secondary + '25', C.secondary + '10'] : [C.primary + '25', C.primary + '10']}
        style={s.callDir}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'} size={14} color={isIn ? C.secondary : C.primary} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={s.callPhone} numberOfLines={1}>{phone}</Text>
        <Text style={s.callMeta}>{call.assistant?.name ?? 'Agent'}  ·  {timeStr2}</Text>
      </View>
      <View style={s.callRight}>
        <Text style={s.callDur}>{timeStr}</Text>
        <View style={[s.callDot, { backgroundColor: statusColor }]} />
      </View>
    </TouchableOpacity>
  );
}

function GroupedCallList({ calls, onCallPress }: { calls: CallLog[]; onCallPress: (id: string) => void }) {
  const groups = groupCallsByDate(calls);
  return (
    <>
      {groups.map(({ label, calls: groupCalls }) => (
        <View key={label}>
          <View style={s.callGroupHeader}>
            <Text style={s.callGroupLabel}>{label}</Text>
            <View style={s.callGroupLine} />
          </View>
          <View style={s.callGroupCard}>
            {groupCalls.map((call, i) => (
              <CallRow
                key={call.id}
                call={call}
                onPress={() => onCallPress(call.id)}
              />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openLink: openWebLink } = useWebLink();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [slowLoad, setSlowLoad] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch org name for greeting
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('owner_id', user.id)
        .single();
      if (orgData?.name) setOrgName(orgData.name);

      const [dashData, callsData] = await Promise.all([
        getDashboardData(user.id),
        getCalls(user.id, { limit: 10 }),
      ]);
      setData(dashData);
      setRecentCalls(callsData);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setSlowLoad(false);
    slowTimerRef.current = setTimeout(() => setSlowLoad(true), 10000);
    loadData().finally(() => {
      setLoading(false);
      setSlowLoad(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    });
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Header fade-in
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-10);
  useEffect(() => {
    if (!loading) {
      headerOpacity.value = withTiming(1, { duration: 400 });
      headerY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  }, [loading]);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  // Staggered section entrance (RN Animated — separate from reanimated)
  const sectionAnims = useRef(
    Array.from({ length: 5 }, () => ({
      opacity: new RNAnimated.Value(0),
      translateY: new RNAnimated.Value(20),
    }))
  ).current;

  useEffect(() => {
    if (!loading) {
      RNAnimated.stagger(
        70,
        sectionAnims.map(({ opacity, translateY }) =>
          RNAnimated.parallel([
            RNAnimated.timing(opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            RNAnimated.timing(translateY, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        )
      ).start();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <SkeletonDashboard />
        {slowLoad && (
          <View style={s.slowLoadBanner}>
            <Ionicons name="time-outline" size={15} color={C.textMuted} />
            <Text style={s.slowLoadText}>Taking longer than usual…</Text>
          </View>
        )}
      </View>
    );
  }

  const ch = data?.creditHealth;
  const stats = data?.stats;
  const agents = data?.agentPerformance ?? [];
  const assistantsList = data?.assistantsList ?? [];
  const activity = data?.dailyActivity?.map(d => d.count) ?? [];
  const hasCalls = (stats?.totalCalls ?? 0) > 0;
  const hasAgents = (data?.assistantCount ?? 0) > 0 || agents.length > 0;
  const greeting = getGreeting(orgName);

  const setupSteps: SetupStep[] = [
    {
      key: 'credits',
      title: 'Add credits',
      subtitle: ch && ch.balanceInr > 0 ? `₹${ch.balanceInr.toFixed(0)} loaded` : 'Fund your account to start making calls',
      icon: 'wallet',
      done: (ch?.balanceInr ?? 0) > 0,
      action: () => router.push('/billing' as any),
    },
    {
      key: 'agent',
      title: 'Create a voice agent',
      subtitle: hasAgents
        ? `${data?.assistantCount ?? agents.length} agent${(data?.assistantCount ?? agents.length) > 1 ? 's' : ''} created`
        : 'Set up your AI assistant',
      icon: 'hardware-chip',
      done: hasAgents,
      action: () => openWebLink('createAssistant'),
    },
    {
      key: 'call',
      title: 'Make your first call',
      subtitle: hasCalls ? `${stats!.totalCalls} calls this week` : 'Test your agent with a live call',
      icon: 'call',
      done: hasCalls,
      action: () => openWebLink('dashboard'),
    },
  ];

  const allSetupDone = setupSteps.every(st => st.done);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.primary}
          colors={[C.primary]}
        />
      }
    >
      {/* ── Header ── */}
      <Animated.View style={[s.header, { paddingTop: insets.top + 12 }, headerStyle]}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.title}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={s.iconBtn}>
          <Ionicons name="refresh" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Error ── */}
      {error && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={16} color={C.danger} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={s.errorRetryBtn}>
            <Text style={s.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════
          WEB DASHBOARD QUICK ACTION
      ════════════════════════════════════════════════════════════════ */}
      <TouchableOpacity
        onPress={() => openWebLink('dashboard')}
        activeOpacity={0.8}
        style={s.webDashBtn}
      >
        <LinearGradient
          colors={[C.primaryMuted, C.secondaryMuted]}
          style={s.webDashGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="globe-outline" size={16} color={C.primary} />
          <Text style={s.webDashText}>Web Dashboard</Text>
          <Ionicons name="open-outline" size={14} color={C.textFaint} style={{ marginLeft: 'auto' }} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ════════════════════════════════════════════════════════════════
          CREDIT URGENCY BANNER
      ════════════════════════════════════════════════════════════════ */}
      {ch && (ch.urgency === 'critical' || ch.urgency === 'low') && (
        <View style={[s.urgencyBanner, { borderColor: URGENCY[ch.urgency].color + '35' }]}>
          <Ionicons
            name={ch.urgency === 'critical' ? 'warning' : 'alert-circle-outline'}
            size={16}
            color={URGENCY[ch.urgency].color}
          />
          <Text style={[s.urgencyText, { color: URGENCY[ch.urgency].color }]}>
            {ch.urgency === 'critical'
              ? `Calls stop in ${Math.max(Math.floor(ch.daysRemaining), 0)} days`
              : `~${Math.floor(ch.daysRemaining)} days of credits left`}
          </Text>
          <TouchableOpacity onPress={() => router.push('/billing' as any)}>
            <Text style={[s.urgencyAction, { color: URGENCY[ch.urgency].color }]}>Top up →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CREDIT CARD — Apple Card style gradient mesh
      ════════════════════════════════════════════════════════════════ */}
      {ch && (
        <RNAnimated.View style={{ opacity: sectionAnims[0].opacity, transform: [{ translateY: sectionAnims[0].translateY }] }}>
          <View style={s.creditCardWrap}>
            <CreditCard ch={ch} />
          </View>

          {(ch.urgency === 'critical' || ch.urgency === 'low') && (
            <TouchableOpacity onPress={() => router.push('/billing' as any)} activeOpacity={0.85} style={{ marginHorizontal: spacing.xl, marginBottom: spacing.xxl }}>
              <LinearGradient
                colors={ch.urgency === 'critical' ? ['#ef4444', '#dc2626'] : [C.primary, C.primaryDark] as [string, string]}
                style={s.addCreditsFull}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#000" style={{ marginRight: 8 }} />
                <Text style={s.addCreditsFullText}>Add Credits</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </RNAnimated.View>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SETUP CHECKLIST
      ════════════════════════════════════════════════════════════════ */}
      {!allSetupDone && (
        <RNAnimated.View style={{ opacity: sectionAnims[1].opacity, transform: [{ translateY: sectionAnims[1].translateY }] }}>
          <SetupChecklist steps={setupSteps} />
        </RNAnimated.View>
      )}

      {/* ════════════════════════════════════════════════════════════════
          KEY METRICS — always visible
      ════════════════════════════════════════════════════════════════ */}
      {stats && (
        <RNAnimated.View style={[{ opacity: sectionAnims[2].opacity, transform: [{ translateY: sectionAnims[2].translateY }] }, s.weekSection]}>
          <View style={s.weekHeader}>
            <Text style={s.sectionLabel}>This week</Text>
            {activity.length > 0 && hasCalls && <MiniChart data={activity} width={72} height={28} />}
          </View>

          <LinearGradient
            colors={[C.surface, C.surfaceRaised] as [string, string]}
            style={s.metricCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={s.metric}>
              <AnimatedNumber value={stats.totalCalls} style={s.metricNum} delay={0} />
              <Text style={s.metricLabel}>Calls</Text>
            </View>
            <View style={s.metricSep} />
            <View style={s.metric}>
              <AnimatedNumber value={stats.successRate} style={s.metricNum} suffix="%" decimals={0} delay={100} />
              <Text style={s.metricLabel}>Success</Text>
            </View>
            <View style={s.metricSep} />
            <View style={s.metric}>
              <AnimatedNumber value={Math.round(stats.avgDuration)} style={s.metricNum} suffix="s" delay={200} />
              <Text style={s.metricLabel}>Avg call</Text>
            </View>
          </LinearGradient>

          <View style={{ height: 10 }} />

          <LinearGradient
            colors={[C.surface, C.surfaceRaised] as [string, string]}
            style={s.metricCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={s.metric}>
              <AnimatedNumber
                value={stats.totalCost}
                prefix="₹"
                style={s.metricNum}
                decimals={0}
                delay={300}
              />
              <Text style={s.metricLabel}>Total Cost</Text>
            </View>
            <View style={s.metricSep} />
            <View style={s.metric}>
              <AnimatedNumber value={data?.assistantCount ?? 0} style={s.metricNum} delay={400} />
              <Text style={s.metricLabel}>Agents</Text>
            </View>
            <View style={s.metricSep} />
            <View style={s.metric}>
              <AnimatedNumber value={ch?.balanceInr ?? 0} prefix="₹" style={s.metricNum} decimals={0} delay={500} />
              <Text style={s.metricLabel}>Balance</Text>
            </View>
          </LinearGradient>
        </RNAnimated.View>
      )}

      {/* ════════════════════════════════════════════════════════════════
          AGENT PERFORMANCE — mini progress rings
      ════════════════════════════════════════════════════════════════ */}
      {hasAgents && (
        <RNAnimated.View style={[{ opacity: sectionAnims[3].opacity, transform: [{ translateY: sectionAnims[3].translateY }] }, s.agentSection]}>
          <Text style={s.sectionLabel}>Agents</Text>
          <LinearGradient
            colors={[C.surface, C.surfaceRaised] as [string, string]}
            style={s.agentCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {agents.length > 0 ? (
              agents.slice(0, 4).map((a, i) => (
                <AgentRow key={a.assistantId} agent={a} index={i} />
              ))
            ) : (
              assistantsList.slice(0, 4).map((a, i) => (
                <View key={a.id} style={[s.agentRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.borderLight }]}>
                  <View style={s.agentIconWrap}>
                    <Ionicons name="hardware-chip-outline" size={16} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.agentName} numberOfLines={1}>{a.name || 'Unnamed Agent'}</Text>
                    <Text style={s.agentSub}>No calls yet</Text>
                  </View>
                </View>
              ))
            )}
          </LinearGradient>
        </RNAnimated.View>
      )}

      {/* ════════════════════════════════════════════════════════════════
          RECENT CALLS — grouped by Today / Yesterday
      ════════════════════════════════════════════════════════════════ */}
      {hasCalls ? (
        <RNAnimated.View style={[{ opacity: sectionAnims[4].opacity, transform: [{ translateY: sectionAnims[4].translateY }] }, s.callsSection]}>
          <View style={s.callsSectionHeader}>
            <Text style={s.sectionLabel}>Recent calls</Text>
            <TouchableOpacity onPress={() => router.push('/calls' as any)}>
              <Text style={s.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <GroupedCallList calls={recentCalls} onCallPress={(id) => router.push(`/calls/${id}` as any)} />
        </RNAnimated.View>
      ) : allSetupDone ? (
        /* Setup done, no calls yet — waiting state */
        <View style={s.waitingCard}>
          <LinearGradient
            colors={[C.primary + '18', C.secondary + '10'] as [string, string]}
            style={s.waitingIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <WaveformIllustration />
          </LinearGradient>
          <Text style={s.waitingTitle}>Waiting for calls</Text>
          <Text style={s.waitingSub}>Your agents are live. Incoming calls will appear here.</Text>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textMuted,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  // Web Dashboard quick action
  webDashBtn: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.primary + '25',
  },
  webDashGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  webDashText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: C.danger + '12',
    borderWidth: 1,
    borderColor: C.danger + '25',
  },
  errorText: { color: C.danger, fontSize: 13, flex: 1, fontWeight: '500' },
  errorRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.danger + '20',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: C.danger + '40',
  },
  errorRetryText: { color: C.danger, fontSize: 12, fontWeight: '700' },

  slowLoadBanner: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  slowLoadText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },

  // Urgency banner
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: C.surface,
  },
  urgencyText: { fontSize: 13, fontWeight: '600', flex: 1 },
  urgencyAction: { fontSize: 13, fontWeight: '700' },

  // Credit card
  creditCardWrap: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: C.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: C.borderFocus,
    overflow: 'hidden',
  },
  creditCardInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: C.primary + '12',
  },
  creditMain: { flex: 1 },
  creditLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textFaint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  creditAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
    lineHeight: 42,
  },
  creditSub: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 5,
    fontWeight: '500',
  },

  ringNum: { fontSize: 18, fontWeight: '800', lineHeight: 20 },
  ringUnit: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -1,
  },

  // Add credits
  addCreditsFull: {
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addCreditsFullText: { fontSize: 15, fontWeight: '700', color: '#000' },

  // Setup
  setupCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    backgroundColor: C.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  setupHeader: { padding: 20, paddingBottom: 16 },
  setupTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 },
  setupProgress: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  setupBarTrack: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  setupBarFill: {
    height: 3,
    backgroundColor: C.primary,
    borderRadius: 2,
  },
  setupStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  setupCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupCheckNum: { fontSize: 12, fontWeight: '700', color: C.textFaint },
  setupStepTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 1 },
  setupStepDone: { color: C.textMuted, textDecorationLine: 'line-through' },
  setupStepSub: { fontSize: 12, color: C.textMuted },

  // Week metrics
  weekSection: { marginHorizontal: spacing.xl, marginBottom: spacing.xxl },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: spacing.xl,
    ...shadows.md,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricNum: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 3 },
  metricLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  metricSep: { width: 1, height: 28, backgroundColor: C.border },

  // Agents
  agentSection: { marginHorizontal: spacing.xl, marginBottom: spacing.xxl },
  agentCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  agentIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: { fontSize: 14, fontWeight: '600', color: C.text },
  agentSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  agentRingPct: { fontSize: 10, fontWeight: '800' },

  // Calls
  callsSection: { marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  callsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  seeAll: { fontSize: 13, fontWeight: '600', color: C.primary },

  callGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  callGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  callGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.borderLight,
  },
  callGroupCard: {
    backgroundColor: C.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  callDir: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callPhone: { fontSize: 15, fontWeight: '600', color: C.text },
  callMeta: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  callRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callDur: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  callDot: { width: 7, height: 7, borderRadius: 4 },

  // Waiting
  waitingCard: {
    marginHorizontal: spacing.xl,
    padding: 36,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: C.border,
    ...shadows.md,
  },
  waitingIconWrap: {
    width: 96,
    height: 80,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    marginTop: 20,
  },
  waitingSub: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 19,
  },
});
