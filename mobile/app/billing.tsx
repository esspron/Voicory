import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors as C } from '../lib/theme';
import { useAuthStore } from '../stores/authStore';

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function AnimatedProgressBar({
  value,
  max,
  color,
  delay = 0,
}: {
  value: number;
  max: number;
  color: string;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={pb.track}>
      <Animated.View
        style={[
          pb.fill,
          {
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const pb = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  name,
  price,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <View style={[planCard.container, highlighted && planCard.highlighted]}>
      {highlighted && (
        <View style={planCard.badge}>
          <Text style={planCard.badgeText}>CURRENT</Text>
        </View>
      )}
      <Text style={planCard.name}>{name}</Text>
      <Text style={planCard.price}>{price}</Text>
      <View style={planCard.divider} />
      {features.map((f, i) => (
        <View key={i} style={planCard.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color={highlighted ? C.primary : C.textFaint} />
          <Text style={[planCard.feature, highlighted && { color: C.textSecondary }]}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

const planCard = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  highlighted: {
    borderColor: C.primary + '60',
    backgroundColor: C.primaryMuted,
  },
  badge: {
    backgroundColor: C.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#000', letterSpacing: 0.5 },
  name: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  price: { fontSize: 22, fontWeight: '800', color: C.primary, marginBottom: 12 },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  feature: { fontSize: 13, color: C.textFaint, flex: 1 },
});

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TransactionRow({
  label,
  date,
  amount,
  positive,
}: {
  label: string;
  date: string;
  amount: string;
  positive?: boolean;
}) {
  return (
    <View style={txRow.row}>
      <View style={txRow.iconWrap}>
        <Ionicons
          name={positive ? 'add-circle' : 'remove-circle'}
          size={20}
          color={positive ? C.success : C.danger}
        />
      </View>
      <View style={txRow.info}>
        <Text style={txRow.label}>{label}</Text>
        <Text style={txRow.date}>{date}</Text>
      </View>
      <Text style={[txRow.amount, { color: positive ? C.success : C.danger }]}>
        {positive ? '+' : ''}{amount}
      </Text>
    </View>
  );
}

const txRow = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: { width: 34, marginRight: 14, alignItems: 'center' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: C.text },
  date: { fontSize: 12, color: C.textFaint, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuthStore();

  const credits = profile?.credits_balance ?? 0;
  const minutesUsed = profile?.voice_minutes_used ?? 0;
  const minutesLimit = profile?.voice_minutes_limit ?? 100;
  const planType = profile?.plan_type ?? 'Starter';
  const inrBalance = (credits * 84).toFixed(2);

  // Mock transactions for UI
  const transactions = [
    { label: 'Credits Added', date: 'Apr 18, 2026', amount: '₹840', positive: true },
    { label: 'Voice Call Usage', date: 'Apr 17, 2026', amount: '₹126', positive: false },
    { label: 'Credits Added', date: 'Apr 10, 2026', amount: '₹420', positive: true },
    { label: 'Voice Call Usage', date: 'Apr 09, 2026', amount: '₹63', positive: false },
  ];

  return (
    <View style={s.container}>
      {/* ── Blur Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Billing & Credits</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Credit Balance ── */}
        <LinearGradient
          colors={['#00b894', '#0099ff', '#0066cc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLabel}>Available Balance</Text>
              <Text style={s.heroAmount}>₹{inrBalance}</Text>
              <Text style={s.heroUsd}>${credits.toFixed(2)} USD</Text>
            </View>
            <View style={s.walletIconWrap}>
              <Ionicons name="wallet" size={32} color="rgba(255,255,255,0.9)" />
            </View>
          </View>

          <TouchableOpacity
            style={s.addCreditsBtn}
            onPress={() => Linking.openURL('https://app.voicory.com/billing')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color="#000" />
            <Text style={s.addCreditsBtnText}>Add Credits</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Usage Breakdown ── */}
        <Text style={s.sectionTitle}>Usage This Month</Text>
        <View style={s.card}>
          <View style={s.usageRow}>
            <View style={s.usageMeta}>
              <View style={[s.usageDot, { backgroundColor: C.primary }]} />
              <Text style={s.usageLabel}>Voice Minutes</Text>
              <Text style={s.usageValue}>{minutesUsed} / {minutesLimit} min</Text>
            </View>
            <AnimatedProgressBar
              value={minutesUsed}
              max={minutesLimit}
              color={C.primary}
              delay={100}
            />
          </View>

          <View style={[s.usageRow, { marginTop: 20 }]}>
            <View style={s.usageMeta}>
              <View style={[s.usageDot, { backgroundColor: C.secondary }]} />
              <Text style={s.usageLabel}>Calls Made</Text>
              <Text style={s.usageValue}>24 / 100</Text>
            </View>
            <AnimatedProgressBar
              value={24}
              max={100}
              color={C.secondary}
              delay={250}
            />
          </View>

          <View style={[s.usageRow, { marginTop: 20 }]}>
            <View style={s.usageMeta}>
              <View style={[s.usageDot, { backgroundColor: C.warning }]} />
              <Text style={s.usageLabel}>Credits Used</Text>
              <Text style={s.usageValue}>₹{(credits * 84 * 0.3).toFixed(0)} spent</Text>
            </View>
            <AnimatedProgressBar
              value={credits * 0.3}
              max={credits || 1}
              color={C.warning}
              delay={400}
            />
          </View>
        </View>

        {/* ── Plan Comparison ── */}
        <Text style={s.sectionTitle}>Plans</Text>
        <View style={s.plansRow}>
          <PlanCard
            name="Starter"
            price="₹0/mo"
            features={['100 min/mo', '1 assistant', 'Email support']}
            highlighted={planType === 'Starter'}
          />
          <View style={{ width: 12 }} />
          <PlanCard
            name="Growth"
            price="₹999/mo"
            features={['500 min/mo', '5 assistants', 'Priority support']}
            highlighted={planType === 'Growth'}
          />
        </View>

        <Text style={s.webNote}>
          Upgrade plans via the web app at app.voicory.com
        </Text>

        {/* ── Transaction History ── */}
        <Text style={s.sectionTitle}>Transaction History</Text>
        <View style={s.card}>
          {transactions.map((tx, i) => (
            <React.Fragment key={i}>
              <TransactionRow {...tx} />
              {i < transactions.length - 1 && <View style={s.txDivider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
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

  content: { padding: 20, gap: 0 },

  // Hero card
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  heroLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 6 },
  heroAmount: { fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroUsd: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  walletIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 48,
  },
  addCreditsBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },

  // Sections
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    marginBottom: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 28,
  },

  // Usage
  usageRow: {},
  usageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  usageDot: { width: 8, height: 8, borderRadius: 4 },
  usageLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  usageValue: { fontSize: 13, color: C.textFaint, fontWeight: '500' },

  // Plans
  plansRow: { flexDirection: 'row', marginBottom: 12 },
  webNote: {
    fontSize: 12,
    color: C.textFaint,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },

  // Transactions
  txDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
});
