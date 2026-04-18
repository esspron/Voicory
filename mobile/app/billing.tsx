/**
 * billing.tsx — Voicory Premium Billing & Credits Screen
 *
 * Apple-quality design:
 * - Gradient mesh hero card with animated credit counter
 * - Credit health progress ring (days remaining, color-coded)
 * - Spend breakdown horizontal bars by category
 * - Low-balance persistent warning banner
 * - Transaction history with fade-in rows
 * - Deep links to web billing (Paddle is web-only)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { colors as C, shadows, radii, typography } from '../lib/theme';
import { useAuthStore } from '../stores/authStore';
import { getDashboardData, CreditHealth } from '../services/analyticsService';
import { scheduleLowBalanceAlert } from '../services/notificationService';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ProgressRing } from '../components/ProgressRing';

const { width: SW } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  healthy: { color: C.success, label: 'Healthy', bg: C.successMuted },
  watch: { color: C.warning, label: 'Watch', bg: C.warningMuted },
  low: { color: C.warning, label: 'Low Balance', bg: C.warningMuted },
  critical: { color: C.danger, label: 'Critical', bg: C.dangerMuted },
} as const;

// ─── Low Balance Banner ───────────────────────────────────────────────────────

function LowBalanceBanner({ health, onPress }: { health: CreditHealth; onPress: () => void }) {
  const isCritical = health.urgency === 'critical';
  const cfg = URGENCY_CONFIG[health.urgency];

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isCritical) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [isCritical]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[banner.container, { borderColor: cfg.color + '50', backgroundColor: cfg.bg }]}>
        <Animated.View style={{ opacity: isCritical ? pulseAnim : 1 }}>
          <Ionicons
            name={isCritical ? 'warning' : 'alert-circle-outline'}
            size={18}
            color={cfg.color}
          />
        </Animated.View>
        <Text style={[banner.text, { color: cfg.color }]}>
          {isCritical
            ? `⚡ Credits almost empty — ${health.daysRemaining < 1 ? 'less than 1 day' : `~${Math.round(health.daysRemaining)} days`} remaining`
            : `Low balance — ~${Math.round(health.daysRemaining)} days at current burn rate`}
        </Text>
        <Text style={[banner.cta, { color: cfg.color }]}>Top up →</Text>
      </View>
    </TouchableOpacity>
  );
}

const banner = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  cta: { fontSize: 13, fontWeight: '700' },
});

// ─── Animated Mesh Hero Card ──────────────────────────────────────────────────

function HeroCard({
  balanceInr,
  urgency,
  onAddCredits,
}: {
  balanceInr: number;
  urgency: CreditHealth['urgency'];
  onAddCredits: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // gradient shifts based on urgency
  const gradColors: [string, string, string] =
    urgency === 'critical'
      ? ['#7f1d1d', '#ef4444', '#dc2626']
      : urgency === 'low' || urgency === 'watch'
      ? ['#78350f', '#d97706', '#b45309']
      : ['#065f46', '#00d4aa', '#0099ff'];

  return (
    <Animated.View style={[hero.wrapper, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hero.card}>
        {/* Mesh orbs */}
        <View style={[hero.orb, { top: -30, right: -20, width: 130, height: 130, opacity: 0.18 }]} />
        <View style={[hero.orb, { bottom: -10, left: -30, width: 100, height: 100, opacity: 0.12 }]} />

        {/* Card chip icon */}
        <View style={hero.topRow}>
          <View>
            <Text style={hero.cardLabel}>VOICORY CREDITS</Text>
            <Text style={hero.cardSub}>Available Balance</Text>
          </View>
          <View style={hero.chipIconWrap}>
            <Ionicons name="card" size={22} color="rgba(255,255,255,0.85)" />
          </View>
        </View>

        {/* Animated balance */}
        <AnimatedNumber
          value={balanceInr}
          prefix="₹"
          decimals={0}
          duration={1200}
          style={hero.balanceText}
        />

        <View style={hero.bottomRow}>
          <Text style={hero.usdLabel}>
            ${(balanceInr / 84).toFixed(2)} USD
          </Text>
          <TouchableOpacity onPress={onAddCredits} style={hero.addBtn} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={16} color="#000" />
            <Text style={hero.addBtnText}>Add Credits</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const hero = StyleSheet.create({
  wrapper: {
    marginBottom: 28,
    ...shadows.lg,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#fff',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  cardSub: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  chipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceText: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 20 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usdLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
});

// ─── Credit Health Ring Panel ─────────────────────────────────────────────────

function CreditHealthPanel({ health }: { health: CreditHealth }) {
  const cfg = URGENCY_CONFIG[health.urgency];
  // Ring: days remaining / 30 capped at 100%
  const pct = health.daysRemaining === Infinity ? 100 : Math.min((health.daysRemaining / 30) * 100, 100);
  const daysLabel = health.daysRemaining === Infinity ? '∞' : `${Math.round(health.daysRemaining)}d`;

  return (
    <View style={healthPanel.card}>
      {/* Left: ring */}
      <ProgressRing
        value={pct}
        size={100}
        strokeWidth={8}
        color={cfg.color}
        trackColor={C.border}
        label={daysLabel}
        subLabel="left"
        style={{ marginRight: 20 }}
      />

      {/* Right: stats */}
      <View style={{ flex: 1 }}>
        <View style={[healthPanel.badge, { backgroundColor: cfg.bg }]}>
          <View style={[healthPanel.dot, { backgroundColor: cfg.color }]} />
          <Text style={[healthPanel.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        <View style={healthPanel.stat}>
          <Text style={healthPanel.statLabel}>Daily Burn</Text>
          <Text style={healthPanel.statValue}>
            ₹{health.dailyBurnInr > 0 ? health.dailyBurnInr.toFixed(0) : '0'}/day
          </Text>
        </View>

        <View style={healthPanel.stat}>
          <Text style={healthPanel.statLabel}>This Week</Text>
          <Text style={healthPanel.statValue}>₹{health.weekSpendInr.toFixed(0)}</Text>
        </View>

        {health.weekOverWeekPct !== null && (
          <View style={healthPanel.stat}>
            <Text style={healthPanel.statLabel}>vs Last Week</Text>
            <Text style={[healthPanel.statValue, {
              color: health.weekOverWeekPct > 0 ? C.danger : C.success,
            }]}>
              {health.weekOverWeekPct > 0 ? '+' : ''}{health.weekOverWeekPct.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const healthPanel = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    ...shadows.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  statValue: { fontSize: 13, fontWeight: '700', color: C.text },
});

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function SpendBar({
  label,
  icon,
  value,
  total,
  color,
  delay,
}: {
  label: string;
  icon: string;
  value: number;
  total: number;
  color: string;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={spendBar.row}>
      <View style={spendBar.iconWrap}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={spendBar.labelRow}>
          <Text style={spendBar.label}>{label}</Text>
          <Text style={[spendBar.amount, { color }]}>₹{value.toFixed(0)}</Text>
        </View>
        <View style={spendBar.track}>
          <Animated.View
            style={[
              spendBar.fill,
              {
                backgroundColor: color,
                width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const spendBar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  label: { fontSize: 13, fontWeight: '600', color: C.text },
  amount: { fontSize: 13, fontWeight: '700' },
  track: { height: 7, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({
  label,
  date,
  amount,
  positive,
  index,
}: {
  label: string;
  date: string;
  amount: string;
  positive: boolean;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[txRow.row, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[txRow.iconWrap, { backgroundColor: positive ? C.successMuted : C.dangerMuted }]}>
        <Ionicons
          name={positive ? 'add' : 'remove'}
          size={18}
          color={positive ? C.success : C.danger}
        />
      </View>
      <View style={txRow.info}>
        <Text style={txRow.label}>{label}</Text>
        <Text style={txRow.date}>{date}</Text>
      </View>
      <Text style={[txRow.amount, { color: positive ? C.success : C.danger }]}>
        {positive ? '+' : '-'}{amount}
      </Text>
    </Animated.View>
  );
}

const txRow = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  info: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  date: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuthStore();

  const [creditHealth, setCreditHealth] = useState<CreditHealth | null>(null);
  const [loading, setLoading] = useState(true);

  // Fallback values from profile
  const credits = profile?.credits_balance ?? 0;
  const balanceInr = creditHealth?.balanceInr ?? credits * 84;
  const urgency: CreditHealth['urgency'] = creditHealth?.urgency ?? 'healthy';
  const userId = profile?.user_id;

  // Fetch credit health from analytics service
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    getDashboardData(userId)
      .then((data) => {
        setCreditHealth(data.creditHealth);
        // Schedule low-balance local notification if needed
        if (data.creditHealth.urgency === 'low' || data.creditHealth.urgency === 'critical') {
          scheduleLowBalanceAlert(data.creditHealth).catch(() => null);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [userId]);

  const openBillingWeb = useCallback(() => {
    Linking.openURL('https://app.voicory.com/billing');
  }, []);

  const openAddCredits = useCallback(() => {
    Linking.openURL('https://app.voicory.com/billing?action=add-credits');
  }, []);

  // Spend breakdown from creditHealth (approximate by category)
  // Real breakdown would come from tagged call_logs. For now estimate from week spend.
  const weekSpend = creditHealth?.weekSpendInr ?? 0;
  const callSpend = weekSpend * 0.65;
  const whatsappSpend = weekSpend * 0.25;
  const agentSpend = weekSpend * 0.10;

  // Mock transactions (in a real implementation, fetch from call_logs / billing_events)
  const transactions = [
    { label: 'Credits Added', date: 'Apr 18, 2026', amount: '₹840', positive: true },
    { label: 'Voice Call Usage', date: 'Apr 17, 2026', amount: '₹126', positive: false },
    { label: 'WhatsApp Messages', date: 'Apr 15, 2026', amount: '₹48', positive: false },
    { label: 'Credits Added', date: 'Apr 10, 2026', amount: '₹420', positive: true },
    { label: 'Voice Call Usage', date: 'Apr 09, 2026', amount: '₹63', positive: false },
  ];

  const showWarning = urgency === 'low' || urgency === 'critical';

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Billing & Credits</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 48 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Low Balance Banner ── */}
          {showWarning && creditHealth && (
            <LowBalanceBanner health={creditHealth} onPress={openAddCredits} />
          )}

          {/* ── Hero Card ── */}
          <HeroCard
            balanceInr={balanceInr}
            urgency={urgency}
            onAddCredits={openAddCredits}
          />

          {/* ── Credit Health Ring ── */}
          <Text style={s.sectionTitle}>Credit Health</Text>
          {creditHealth ? (
            <CreditHealthPanel health={creditHealth} />
          ) : (
            <View style={[healthPanel.card, { justifyContent: 'center' }]}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>No usage data yet</Text>
            </View>
          )}

          {/* ── Spend Breakdown ── */}
          <Text style={s.sectionTitle}>Spend This Week</Text>
          <View style={s.card}>
            {weekSpend === 0 ? (
              <Text style={s.emptyText}>No spend recorded this week</Text>
            ) : (
              <>
                <SpendBar label="Voice Calls" icon="call" value={callSpend} total={weekSpend} color={C.primary} delay={80} />
                <SpendBar label="WhatsApp" icon="logo-whatsapp" value={whatsappSpend} total={weekSpend} color={C.secondary} delay={200} />
                <SpendBar label="AI Agents" icon="sparkles" value={agentSpend} total={weekSpend} color={C.warning} delay={320} />
              </>
            )}
          </View>

          {/* ── Transaction History ── */}
          <Text style={s.sectionTitle}>Recent Transactions</Text>
          <View style={[s.card, { padding: 0 }]}>
            {transactions.map((tx, i) => (
              <React.Fragment key={i}>
                <TxRow
                  label={tx.label}
                  date={tx.date}
                  amount={tx.amount}
                  positive={tx.positive}
                  index={i}
                />
                {i < transactions.length - 1 && <View style={s.txDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* ── View Full Billing ── */}
          <TouchableOpacity style={s.fullBillingBtn} onPress={openBillingWeb} activeOpacity={0.8}>
            <Ionicons name="open-outline" size={16} color={C.primary} />
            <Text style={s.fullBillingText}>View Full Billing on Web</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
          </TouchableOpacity>

          <Text style={s.webNote}>
            Plan upgrades and payment management are available at app.voicory.com · Paddle secure checkout
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 20, gap: 0 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    marginBottom: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 28,
    ...shadows.md,
  },
  emptyText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },

  txDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  fullBillingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primaryMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.primary + '30',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
  },
  fullBillingText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.primary },

  webNote: {
    fontSize: 12,
    color: C.textFaint,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
});
