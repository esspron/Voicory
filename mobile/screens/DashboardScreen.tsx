import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatCard } from '../components/StatCard';
import { CallCard } from '../components/CallCard';
import { EmptyState } from '../components/EmptyState';
import { getDashboardStats } from '../services/analyticsService';
import { getCalls } from '../services/callService';
import { supabase } from '../lib/supabase';
import { DashboardStats, CallLog } from '../types';

const COLORS = {
  background: '#0a0f1a',
  surface: '#111827',
  surfaceLight: '#1f2937',
  primary: '#00d4aa',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
};

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [statsData, callsData] = await Promise.all([
        getDashboardStats(user.id, 7),
        getCalls(user.id, { limit: 5 }),
      ]);

      setStats(statsData);
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

  const handleAddCredits = () => {
    router.push('/billing' as any);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const statsCards = stats
    ? [
        {
          title: 'Total Calls',
          value: String(stats.totalCalls),
          icon: 'call-outline' as const,
          iconColor: '#60a5fa',
        },
        {
          title: 'Avg Duration',
          value: formatDuration(stats.avgDuration),
          icon: 'timer-outline' as const,
          iconColor: '#fb923c',
        },
        {
          title: 'Total Cost',
          value: `₹${stats.totalCost.toFixed(2)}`,
          icon: 'wallet-outline' as const,
          iconColor: '#4ade80',
        },
        {
          title: 'Success Rate',
          value: `${stats.successRate.toFixed(1)}%`,
          icon: 'trending-up-outline' as const,
          iconColor: '#c084fc',
        },
      ]
    : [];

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          {statsCards.slice(0, 2).map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </View>
        <View style={styles.statsRow}>
          {statsCards.slice(2, 4).map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </View>
      </View>

      {/* Credits Card */}
      {stats && (
        <View style={styles.creditsCard}>
          <View>
            <Text style={styles.creditsLabel}>Credits Balance</Text>
            <Text style={styles.creditsValue}>₹{stats.creditsBalance.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.addCreditsBtn} onPress={handleAddCredits}>
            <Ionicons name="add" size={16} color="#0a0f1a" />
            <Text style={styles.addCreditsText}>Add Credits</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chart Placeholder */}
      <View style={styles.chartPlaceholder}>
        <Ionicons name="bar-chart-outline" size={32} color={COLORS.border} />
        <Text style={styles.chartText}>Usage chart coming soon</Text>
      </View>

      {/* Recent Calls Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Calls</Text>
        <TouchableOpacity onPress={() => router.push('/calls' as any)}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
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
            icon="call-outline"
            title="No calls yet"
            message="Make your first call to see stats here."
          />
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: '#ef444422',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: '#ef4444', fontSize: 13 },
  statsGrid: { paddingHorizontal: 12, marginBottom: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 0 },
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  creditsLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  creditsValue: { color: COLORS.primary, fontSize: 28, fontWeight: '800' },
  addCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addCreditsText: { color: '#0a0f1a', fontWeight: '700', fontSize: 14 },
  chartPlaceholder: {
    height: 120,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chartText: { color: COLORS.textSecondary, fontSize: 13 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  seeAll: { color: COLORS.primary, fontSize: 13 },
});
