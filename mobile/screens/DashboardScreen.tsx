import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { CallCard } from '../components/CallCard';
import { EmptyState } from '../components/EmptyState';
import { getDashboardData, DashboardData, CreditHealth, AgentPerformance } from '../services/analyticsService';
import { getCalls } from '../services/callService';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { CallLog } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatCompact(n: number): string {
  if (n >= 10000) return `₹${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}

// ── Credit Ring ──────────────────────────────────────────────────────────────
// SVG donut ring that fills based on urgency

const RING_SIZE = 88;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const URGENCY_COLORS = {
  healthy: '#22c55e',
  watch: '#f59e0b',
  low: '#f97316',
  critical: '#ef4444',
};

function CreditRing({ health }: { health: CreditHealth }) {
  // Show percentage of "runway" — cap at 30 days as 100%
  const pct = Math.min(health.daysRemaining / 30, 1);
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct);
  const color = URGENCY_COLORS[health.urgency];

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
        {/* Background track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#1a2332"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      {/* Center text */}
      <Text style={[s.ringDays, { color }]}>
        {health.daysRemaining >= 999 ? '∞' : Math.floor(health.daysRemaining)}
      </Text>
      <Text style={s.ringLabel}>days</Text>
    </View>
  );
}

// ── Mini Sparkline ───────────────────────────────────────────────────────────

function Sparkline({ data, color = '#00d4aa' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const barWidth = 4;
  const gap = 3;
  const totalW = data.length * (barWidth + gap) - gap;
  const height = 32;

  return (
    <View style={{ width: totalW, height, flexDirection: 'row', alignItems: 'flex-end', gap }}>
      {data.map((val, i) => {
        const h = Math.max((val / max) * height, 2);
        const isToday = i === data.length - 1;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: h,
              borderRadius: 2,
              backgroundColor: isToday ? color : color + '40',
            }}
          />
        );
      })}
    </View>
  );
}

// ── Trend Arrow ──────────────────────────────────────────────────────────────

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct > 0;
  const color = up ? '#ef4444' : '#22c55e'; // Up spend = bad (red), down = good (green)
  return (
    <View style={[s.trendBadge, { backgroundColor: color + '15' }]}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={color} />
      <Text style={[s.trendText, { color }]}>{Math.abs(pct).toFixed(0)}%</Text>
    </View>
  );
}

// ── Agent Row ────────────────────────────────────────────────────────────────

function AgentRow({ agent }: { agent: AgentPerformance }) {
  const barPct = Math.min(agent.successRate, 100);
  return (
    <View style={s.agentRow}>
      <View style={s.agentLeft}>
        <View style={s.agentDot}>
          <Ionicons name="hardware-chip-outline" size={16} color="#00d4aa" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.agentName} numberOfLines={1}>{agent.assistantName}</Text>
          <View style={s.agentMeta}>
            <Text style={s.agentMetaText}>{agent.totalCalls} calls</Text>
            <View style={s.metaSep} />
            <Text style={s.agentMetaText}>{formatDuration(agent.avgDurationSec)} avg</Text>
          </View>
        </View>
      </View>
      <View style={s.agentRight}>
        <Text style={[s.agentRate, { color: agent.successRate > 80 ? '#22c55e' : agent.successRate > 50 ? '#f59e0b' : '#ef4444' }]}>
          {agent.successRate.toFixed(0)}%
        </Text>
        <View style={s.agentBarTrack}>
          <View style={[s.agentBarFill, { width: `${barPct}%`, backgroundColor: agent.successRate > 80 ? '#22c55e' : agent.successRate > 50 ? '#f59e0b' : '#ef4444' }]} />
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── DASHBOARD ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

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
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#00d4aa" />
      </View>
    );
  }

  const ch = data?.creditHealth;
  const stats = data?.stats;
  const agents = data?.agentPerformance ?? [];
  const activity = data?.dailyActivity?.map(d => d.count) ?? [];

  const ListHeader = () => (
    <View>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{data?.greeting ?? 'Hello'}</Text>
          <Text style={s.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#00d4aa" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── SECTION 1: CREDIT HEALTH ── */}
      {/* The #1 thing: "Am I running out of money?" */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {ch && (
        <View style={s.section}>
          {/* Critical/Low urgency banner */}
          {(ch.urgency === 'critical' || ch.urgency === 'low') && (
            <View style={[s.urgencyBanner, { backgroundColor: URGENCY_COLORS[ch.urgency] + '12', borderColor: URGENCY_COLORS[ch.urgency] + '30' }]}>
              <Ionicons
                name={ch.urgency === 'critical' ? 'warning' : 'alert-circle-outline'}
                size={18}
                color={URGENCY_COLORS[ch.urgency]}
              />
              <Text style={[s.urgencyText, { color: URGENCY_COLORS[ch.urgency] }]}>
                {ch.urgency === 'critical'
                  ? `Calls will stop in ~${Math.max(Math.floor(ch.daysRemaining), 0)} days. Top up now.`
                  : `Credits running low — ~${Math.floor(ch.daysRemaining)} days remaining.`}
              </Text>
            </View>
          )}

          <View style={s.creditCard}>
            {/* Left: ring + runway */}
            <CreditRing health={ch} />

            {/* Right: numbers */}
            <View style={s.creditRight}>
              <Text style={s.creditBalance}>₹{ch.balanceInr.toFixed(0)}</Text>
              <Text style={s.creditUsd}>${ch.balanceUsd.toFixed(2)} USD</Text>

              <View style={s.creditBurnRow}>
                <Text style={s.creditBurnLabel}>
                  ₹{ch.dailyBurnInr.toFixed(0)}/day
                </Text>
                <TrendBadge pct={ch.weekOverWeekPct} />
              </View>
            </View>
          </View>

          {/* Add Credits — prominence based on urgency */}
          <TouchableOpacity
            onPress={() => router.push('/billing' as any)}
            activeOpacity={0.8}
          >
            {ch.urgency === 'critical' || ch.urgency === 'low' ? (
              <LinearGradient
                colors={ch.urgency === 'critical' ? ['#ef4444', '#dc2626'] as [string, string] : ['#00d4aa', '#00b894'] as [string, string]}
                style={s.addCreditsBtnFull}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add-circle" size={18} color="#000" />
                <Text style={s.addCreditsTextBold}>Add Credits Now</Text>
              </LinearGradient>
            ) : (
              <View style={s.addCreditsSubtle}>
                <Ionicons name="add-circle-outline" size={16} color="#6b7280" />
                <Text style={s.addCreditsTextSubtle}>Add Credits</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── SECTION 2: THIS WEEK'S PULSE ── */}
      {/* Quick read: what happened, is my AI performing? */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {stats && (
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>This Week</Text>
            {activity.length > 0 && <Sparkline data={activity} />}
          </View>

          <View style={s.metricsGrid}>
            <MetricTile
              label="Calls"
              value={String(stats.totalCalls)}
              icon="call"
              color="#00d4aa"
            />
            <MetricTile
              label="Avg Duration"
              value={formatDuration(stats.avgDuration)}
              icon="time"
              color="#f59e0b"
            />
            <MetricTile
              label="Spent"
              value={formatCompact(stats.totalCost)}
              icon="wallet"
              color="#0099ff"
            />
            <MetricTile
              label="Success"
              value={`${stats.successRate.toFixed(0)}%`}
              icon="checkmark-circle"
              color={stats.successRate > 80 ? '#22c55e' : stats.successRate > 50 ? '#f59e0b' : '#ef4444'}
            />
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── SECTION 3: AGENT PERFORMANCE ── */}
      {/* "Which of my AI agents is actually working?" */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {agents.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Agent Performance</Text>
          <View style={s.agentList}>
            {agents.slice(0, 4).map(a => (
              <AgentRow key={a.assistantId} agent={a} />
            ))}
          </View>
        </View>
      )}

      {/* ── Recent Calls Header ── */}
      <View style={[s.sectionHeaderRow, { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 }]}>
        <Text style={s.sectionTitle}>Recent Calls</Text>
        <TouchableOpacity onPress={() => router.push('/calls' as any)}>
          <Text style={s.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList
        data={recentCalls}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <CallCard
            call={item}
            onPress={(call) => router.push(`/calls/${call.id}` as any)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="call"
              title="No calls yet"
              message="Your AI agents haven't received any calls this week."
            />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4aa" colors={['#00d4aa']} />
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ── Metric Tile (compact stat in 2×2 grid) ──────────────────────────────────

function MetricTile({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={s.metricTile}>
      <View style={[s.metricIconBg, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── STYLES ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b14' },
  listContent: { paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#060b14' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 20,
  },
  greeting: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#0d1420',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1a2332',
  },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ef444415', marginHorizontal: 20, marginBottom: 16,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ef444430',
  },
  errorText: { color: '#ef4444', fontSize: 14, flex: 1 },

  // Sections
  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  seeAll: { color: '#00d4aa', fontSize: 14, fontWeight: '600' },

  // ── Credit Health ──
  urgencyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14,
  },
  urgencyText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },

  creditCard: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    backgroundColor: '#0d1420', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#1a2332',
  },
  creditRight: { flex: 1 },
  creditBalance: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 2 },
  creditUsd: { fontSize: 13, color: '#4b5563', marginBottom: 12 },
  creditBurnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditBurnLabel: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },

  // Ring
  ringDays: { fontSize: 22, fontWeight: '800' },
  ringLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: -2 },

  // Trend badge
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  trendText: { fontSize: 11, fontWeight: '700' },

  // Add credits variations
  addCreditsBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, marginTop: 14,
  },
  addCreditsTextBold: { fontSize: 15, fontWeight: '700', color: '#000' },
  addCreditsSubtle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12,
  },
  addCreditsTextSubtle: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  // ── Metrics Grid ──
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricTile: {
    width: (SCREEN_W - 40 - 12) / 2 - 1, // 2 columns with gap
    backgroundColor: '#0d1420', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1a2332',
  },
  metricIconBg: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  metricLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 },

  // ── Agent Performance ──
  agentList: {
    backgroundColor: '#0d1420', borderRadius: 20, borderWidth: 1, borderColor: '#1a2332',
    overflow: 'hidden', marginTop: 12,
  },
  agentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a233250',
  },
  agentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  agentDot: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#00d4aa12',
    alignItems: 'center', justifyContent: 'center',
  },
  agentName: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  agentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agentMetaText: { fontSize: 12, color: '#6b7280' },
  metaSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#374151' },
  agentRight: { alignItems: 'flex-end', marginLeft: 12, width: 56 },
  agentRate: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  agentBarTrack: { width: 48, height: 3, borderRadius: 2, backgroundColor: '#1a2332' },
  agentBarFill: { height: 3, borderRadius: 2 },
});
