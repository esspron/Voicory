import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect, Defs, LinearGradient as SvgGrad, Stop, G } from 'react-native-svg';
import { getDashboardData, DashboardData, CreditHealth, AgentPerformance } from '../services/analyticsService';
import { getCalls } from '../services/callService';
import { supabase } from '../lib/supabase';
import { CallLog } from '../types';

const { width: SW } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — single source of truth
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  bg: '#050a12',
  surface: '#0c1219',
  surfaceRaised: '#111a24',
  border: '#1a2332',
  borderLight: '#1a233350',
  primary: '#00d4aa',
  primaryMuted: '#00d4aa18',
  secondary: '#0099ff',
  text: '#f0f2f5',
  textMuted: '#7a8599',
  textFaint: '#3d4a5c',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SVG ILLUSTRATIONS — hand-drawn quality, not clip art
// ═══════════════════════════════════════════════════════════════════════════════

function RocketIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      <Defs>
        <SvgGrad id="rk1" x1="40" y1="20" x2="80" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.15" />
          <Stop offset="1" stopColor="#0099ff" stopOpacity="0.05" />
        </SvgGrad>
        <SvgGrad id="rk2" x1="50" y1="30" x2="70" y2="85" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00d4aa" />
          <Stop offset="1" stopColor="#0099ff" />
        </SvgGrad>
      </Defs>
      <Circle cx="60" cy="60" r="50" fill="url(#rk1)" />
      {/* Rocket body */}
      <Path d="M60 25C55 40 50 55 50 70C50 78 54 85 60 88C66 85 70 78 70 70C70 55 65 40 60 25Z" fill="url(#rk2)" opacity="0.9" />
      {/* Window */}
      <Circle cx="60" cy="55" r="6" fill={C.bg} />
      <Circle cx="60" cy="55" r="4" fill="#00d4aa" opacity="0.3" />
      {/* Fins */}
      <Path d="M50 72L40 85L50 80Z" fill="#00d4aa" opacity="0.5" />
      <Path d="M70 72L80 85L70 80Z" fill="#00d4aa" opacity="0.5" />
      {/* Exhaust */}
      <Path d="M55 88Q60 100 65 88" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.6" />
      <Path d="M57 90Q60 97 63 90" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Stars */}
      <Circle cx="25" cy="30" r="1.5" fill={C.textMuted} opacity="0.5" />
      <Circle cx="90" cy="25" r="1" fill={C.textMuted} opacity="0.4" />
      <Circle cx="95" cy="60" r="1.5" fill={C.textMuted} opacity="0.3" />
      <Circle cx="20" cy="75" r="1" fill={C.textMuted} opacity="0.5" />
      <Circle cx="85" cy="85" r="1" fill={C.textMuted} opacity="0.3" />
    </Svg>
  );
}

function PhoneWaveIllustration() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Rect x="14" y="6" width="20" height="36" rx="4" stroke={C.primary} strokeWidth="1.5" fill="none" opacity="0.4" />
      <Circle cx="24" cy="38" r="2" fill={C.primary} opacity="0.3" />
      {/* Sound waves */}
      <Path d="M36 18C38 20 38 28 36 30" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <Path d="M40 15C43 19 43 29 40 33" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREDIT RING — SVG donut
// ═══════════════════════════════════════════════════════════════════════════════

const RING_SZ = 80;
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
        <Circle cx={RING_SZ/2} cy={RING_SZ/2} r={RING_R} stroke={C.border} strokeWidth={RING_SW} fill="none" />
        <Circle
          cx={RING_SZ/2} cy={RING_SZ/2} r={RING_R}
          stroke={u.color} strokeWidth={RING_SW} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_C}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${RING_SZ/2} ${RING_SZ/2})`}
        />
      </Svg>
      <Text style={[s.ringNum, { color: u.color }]}>
        {health.daysRemaining >= 999 ? '∞' : Math.floor(health.daysRemaining)}
      </Text>
      <Text style={s.ringUnit}>days</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPARKLINE
// ═══════════════════════════════════════════════════════════════════════════════

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const h = 28;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: h }}>
      {data.map((v, i) => (
        <View key={i} style={{
          width: 4, borderRadius: 2,
          height: Math.max((v / max) * h, 2),
          backgroundColor: i === data.length - 1 ? C.primary : C.primary + '35',
        }} />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP CHECKLIST — shown when user has no calls
// ═══════════════════════════════════════════════════════════════════════════════

interface SetupStep {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  done: boolean;
  action?: () => void;
}

function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const doneCount = steps.filter(s => s.done).length;

  return (
    <View style={s.setupCard}>
      <View style={s.setupHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.setupTitle}>Get started</Text>
          <Text style={s.setupProgress}>{doneCount} of {steps.length} complete</Text>
        </View>
        {/* Progress bar */}
        <View style={s.setupBarTrack}>
          <View style={[s.setupBarFill, { width: `${(doneCount / steps.length) * 100}%` }]} />
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
          <View style={[s.setupCheck, step.done && s.setupCheckDone]}>
            {step.done ? (
              <Ionicons name="checkmark" size={14} color={C.bg} />
            ) : (
              <Text style={s.setupCheckNum}>{i + 1}</Text>
            )}
          </View>
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
// AGENT ROW
// ═══════════════════════════════════════════════════════════════════════════════

function AgentRow({ agent }: { agent: AgentPerformance }) {
  const rateColor = agent.successRate > 80 ? C.success : agent.successRate > 50 ? C.warning : C.danger;
  return (
    <View style={s.agentRow}>
      <View style={s.agentIcon}>
        <Ionicons name="hardware-chip-outline" size={16} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.agentName} numberOfLines={1}>{agent.assistantName}</Text>
        <Text style={s.agentSub}>{agent.totalCalls} calls · {Math.round(agent.avgDurationSec)}s avg</Text>
      </View>
      <View style={s.agentRateBox}>
        <Text style={[s.agentRate, { color: rateColor }]}>{agent.successRate.toFixed(0)}%</Text>
        <View style={s.agentBarTrack}>
          <View style={[s.agentBarFill, { width: `${Math.min(agent.successRate, 100)}%`, backgroundColor: rateColor }]} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALL ROW — inline, not a separate component. Tighter.
// ═══════════════════════════════════════════════════════════════════════════════

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

  const ago = (() => {
    const diff = Date.now() - new Date(call.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <TouchableOpacity style={s.callRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.callDir, { backgroundColor: isIn ? C.secondary + '15' : C.primary + '15' }]}>
        <Ionicons name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'} size={14} color={isIn ? C.secondary : C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.callPhone} numberOfLines={1}>{phone}</Text>
        <Text style={s.callMeta}>{call.assistant?.name ?? 'Agent'} · {ago}</Text>
      </View>
      <View style={s.callRight}>
        <Text style={s.callDur}>{timeStr}</Text>
        <View style={[s.callDot, { backgroundColor: statusColor }]} />
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const [dashData, callsData] = await Promise.all([
        getDashboardData(user.id),
        getCalls(user.id, { limit: 5 }),
      ]);
      setData(dashData);
      setRecentCalls(callsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  const ch = data?.creditHealth;
  const stats = data?.stats;
  const agents = data?.agentPerformance ?? [];
  const activity = data?.dailyActivity?.map(d => d.count) ?? [];
  const hasCalls = (stats?.totalCalls ?? 0) > 0;
  const hasAgents = agents.length > 0;

  // Setup steps — derived from actual state
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
      subtitle: hasAgents ? `${agents.length} agent${agents.length > 1 ? 's' : ''} active` : 'Set up your AI assistant',
      icon: 'hardware-chip',
      done: hasAgents,
      action: () => Linking.openURL('https://app.voicory.com/assistants'),
    },
    {
      key: 'call',
      title: 'Make your first call',
      subtitle: hasCalls ? `${stats!.totalCalls} calls this week` : 'Test your agent with a live call',
      icon: 'call',
      done: hasCalls,
      action: () => Linking.openURL('https://app.voicory.com'),
    },
  ];

  const allSetupDone = setupSteps.every(st => st.done);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{data?.greeting ?? 'Hello'}</Text>
          <Text style={s.title}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={s.iconBtn}>
          <Ionicons name="refresh" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={16} color={C.danger} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CREDIT HEALTH — always visible, adapts to urgency */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {ch && (
        <>
          {/* Urgency banner — only when it matters */}
          {(ch.urgency === 'critical' || ch.urgency === 'low') && (
            <View style={[s.urgencyBanner, { borderColor: URGENCY[ch.urgency].color + '30' }]}>
              <Ionicons name={ch.urgency === 'critical' ? 'warning' : 'alert-circle-outline'} size={16} color={URGENCY[ch.urgency].color} />
              <Text style={[s.urgencyText, { color: URGENCY[ch.urgency].color }]}>
                {ch.urgency === 'critical'
                  ? `Calls stop in ${Math.max(Math.floor(ch.daysRemaining), 0)} days`
                  : `~${Math.floor(ch.daysRemaining)} days of credits left`}
              </Text>
              <TouchableOpacity onPress={() => router.push('/billing' as any)}>
                <Text style={[s.urgencyAction, { color: URGENCY[ch.urgency].color }]}>Top up</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.creditCard}>
            <View style={s.creditMain}>
              {/* The hero number */}
              <Text style={s.creditAmount}>₹{ch.balanceInr >= 1000 ? `${(ch.balanceInr / 1000).toFixed(1)}k` : ch.balanceInr.toFixed(0)}</Text>
              <Text style={s.creditSub}>${ch.balanceUsd.toFixed(2)} · {ch.dailyBurnInr > 0 ? `₹${ch.dailyBurnInr.toFixed(0)}/day` : 'No spend yet'}</Text>
            </View>
            <CreditRing health={ch} />
          </View>

          {/* Healthy state: subtle add credits */}
          {(ch.urgency === 'critical' || ch.urgency === 'low') ? (
            <TouchableOpacity onPress={() => router.push('/billing' as any)} activeOpacity={0.8}>
              <LinearGradient
                colors={ch.urgency === 'critical' ? ['#ef4444', '#dc2626'] as [string, string] : [C.primary, '#00b894'] as [string, string]}
                style={s.addCreditsFull}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={s.addCreditsFullText}>Add Credits</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SETUP CHECKLIST — when not fully onboarded */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {!allSetupDone && (
        <SetupChecklist steps={setupSteps} />
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* THIS WEEK — only when there's data */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {hasCalls && stats && (
        <View style={s.weekSection}>
          <View style={s.weekHeader}>
            <Text style={s.sectionLabel}>This week</Text>
            {activity.length > 0 && <Sparkline data={activity} />}
          </View>

          <View style={s.metricRow}>
            <View style={s.metric}>
              <Text style={s.metricNum}>{stats.totalCalls}</Text>
              <Text style={s.metricLabel}>Calls</Text>
            </View>
            <View style={s.metricSep} />
            <View style={s.metric}>
              <Text style={s.metricNum}>{stats.successRate.toFixed(0)}%</Text>
              <Text style={s.metricLabel}>Success</Text>
            </View>
            <View style={s.metricSep} />
            <View style={s.metric}>
              <Text style={s.metricNum}>{Math.round(stats.avgDuration)}s</Text>
              <Text style={s.metricLabel}>Avg call</Text>
            </View>
            <View style={s.metricSep} />
            <View style={s.metric}>
              <Text style={s.metricNum}>₹{stats.totalCost >= 1000 ? `${(stats.totalCost / 1000).toFixed(1)}k` : stats.totalCost.toFixed(0)}</Text>
              <Text style={s.metricLabel}>Spent</Text>
            </View>
          </View>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* AGENT PERFORMANCE — only when agents exist */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {hasAgents && (
        <View style={s.agentSection}>
          <Text style={s.sectionLabel}>Agents</Text>
          <View style={s.agentList}>
            {agents.slice(0, 4).map(a => <AgentRow key={a.assistantId} agent={a} />)}
          </View>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* RECENT CALLS */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {hasCalls ? (
        <View style={s.callsSection}>
          <View style={s.callsSectionHeader}>
            <Text style={s.sectionLabel}>Recent calls</Text>
            <TouchableOpacity onPress={() => router.push('/calls' as any)}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentCalls.map(call => (
            <CallRow key={call.id} call={call} onPress={() => router.push(`/calls/${call.id}` as any)} />
          ))}
        </View>
      ) : allSetupDone ? (
        /* All setup done but no calls yet — waiting state */
        <View style={s.waitingCard}>
          <PhoneWaveIllustration />
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 24,
  },
  greeting: { fontSize: 13, fontWeight: '500', color: C.textFaint, letterSpacing: 0.3, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 16,
    padding: 14, borderRadius: 12, backgroundColor: C.danger + '10', borderWidth: 1, borderColor: C.danger + '25',
  },
  errorText: { color: C.danger, fontSize: 13, flex: 1, fontWeight: '500' },

  // Urgency
  urgencyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, backgroundColor: C.surface,
  },
  urgencyText: { fontSize: 13, fontWeight: '600', flex: 1 },
  urgencyAction: { fontSize: 13, fontWeight: '700' },

  // Credit card
  creditCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 8, padding: 20,
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  creditMain: { flex: 1 },
  creditAmount: { fontSize: 40, fontWeight: '800', color: C.text, letterSpacing: -1, lineHeight: 44 },
  creditSub: { fontSize: 13, color: C.textMuted, marginTop: 4, fontWeight: '500' },

  ringNum: { fontSize: 20, fontWeight: '800', lineHeight: 22 },
  ringUnit: { fontSize: 9, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: -1 },

  // Add credits
  addCreditsFull: {
    marginHorizontal: 20, marginBottom: 24, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  addCreditsFullText: { fontSize: 15, fontWeight: '700', color: '#000' },

  // Setup
  setupCard: { marginHorizontal: 20, marginBottom: 24, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  setupHeader: { padding: 20, paddingBottom: 16 },
  setupTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 },
  setupProgress: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  setupBarTrack: { height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 12 },
  setupBarFill: { height: 3, backgroundColor: C.primary, borderRadius: 2 },
  setupStep: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  setupCheck: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  setupCheckDone: { backgroundColor: C.primary, borderColor: C.primary },
  setupCheckNum: { fontSize: 12, fontWeight: '700', color: C.textFaint },
  setupStepTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 1 },
  setupStepDone: { color: C.textMuted, textDecorationLine: 'line-through' },
  setupStepSub: { fontSize: 12, color: C.textMuted },

  // Week metrics
  weekSection: { marginHorizontal: 20, marginBottom: 24 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  metricRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingVertical: 18,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricNum: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 3 },
  metricLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  metricSep: { width: 1, height: 28, backgroundColor: C.border },

  // Agents
  agentSection: { marginHorizontal: 20, marginBottom: 24 },
  agentList: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginTop: 12, overflow: 'hidden' },
  agentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  agentIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: C.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  agentName: { fontSize: 14, fontWeight: '600', color: C.text },
  agentSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  agentRateBox: { alignItems: 'flex-end', width: 52 },
  agentRate: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  agentBarTrack: { width: 44, height: 3, borderRadius: 2, backgroundColor: C.border },
  agentBarFill: { height: 3, borderRadius: 2 },

  // Calls
  callsSection: { marginHorizontal: 20, marginBottom: 8 },
  callsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600', color: C.primary },
  callRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  callDir: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  callPhone: { fontSize: 15, fontWeight: '600', color: C.text },
  callMeta: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  callRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callDur: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  callDot: { width: 7, height: 7, borderRadius: 4 },

  // Waiting
  waitingCard: {
    marginHorizontal: 20, padding: 32, alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  waitingTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 16 },
  waitingSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
});
