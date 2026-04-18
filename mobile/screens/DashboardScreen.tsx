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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatCard } from '../components/StatCard';
import { CallCard } from '../components/CallCard';
import { EmptyState } from '../components/EmptyState';
import { getDashboardStats } from '../services/analyticsService';
import { getCalls } from '../services/callService';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { DashboardStats, CallLog } from '../types';

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const statsCards = stats
    ? [
        {
          title: 'Total Calls',
          value: String(stats.totalCalls),
          icon: 'call' as const,
          gradientColors: ['#00d4aa', '#00b894'] as [string, string],
        },
        {
          title: 'Avg Duration',
          value: formatDuration(stats.avgDuration),
          icon: 'time' as const,
          gradientColors: ['#f59e0b', '#d97706'] as [string, string],
        },
        {
          title: 'Total Cost',
          value: `₹${stats.totalCost.toFixed(2)}`,
          icon: 'wallet' as const,
          gradientColors: ['#22c55e', '#16a34a'] as [string, string],
        },
        {
          title: 'Success Rate',
          value: `${stats.successRate.toFixed(1)}%`,
          icon: 'trending-up' as const,
          gradientColors: ['#0099ff', '#0077cc'] as [string, string],
        },
      ]
    : [];

  const ListHeader = () => (
    <View>
      {/* Decorative Background Orbs */}
      <View style={styles.backgroundOrbs}>
        <LinearGradient
          colors={['#00d4aa', 'transparent']}
          style={[styles.orb, styles.orb1]}
        />
        <LinearGradient
          colors={['#0099ff', 'transparent']}
          style={[styles.orb, styles.orb2]}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
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
          <LinearGradient
            colors={[theme.colors.primary + '15', 'transparent']}
            style={styles.creditsGradientBorder}
          />
          <View style={styles.creditsContent}>
            <View>
              <Text style={styles.creditsLabel}>CREDITS BALANCE</Text>
              <Text style={styles.creditsValue}>₹{stats.creditsBalance.toFixed(2)}</Text>
            </View>
            <TouchableOpacity onPress={handleAddCredits}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.addCreditsBtn}
              >
                <Ionicons name="add" size={18} color={theme.colors.background} />
                <Text style={styles.addCreditsText}>Add Credits</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    <View style={styles.container}>
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
              message="Make your first call to see stats here."
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background,
  },
  listContent: { 
    paddingBottom: 32,
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: theme.colors.background,
  },
  backgroundOrbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  orb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.03,
  },
  orb1: {
    top: -50,
    left: -50,
  },
  orb2: {
    top: 100,
    right: -80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    zIndex: 1,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerTitle: { 
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger + '15',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.danger + '30',
    gap: 12,
  },
  errorText: { 
    color: theme.colors.danger, 
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: { 
    paddingHorizontal: 16, 
    marginBottom: 20,
  },
  statsRow: { 
    flexDirection: 'row', 
    gap: 16,
    marginBottom: 16,
  },
  creditsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  creditsGradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  creditsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  creditsLabel: { 
    color: theme.colors.textSecondary, 
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  creditsValue: { 
    color: theme.colors.text, 
    fontSize: 28,
    fontWeight: '800',
  },
  addCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  addCreditsText: { 
    color: theme.colors.background, 
    fontWeight: '700', 
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionTitle: { 
    color: theme.colors.text, 
    fontSize: 20,
    fontWeight: '700',
  },
  seeAll: { 
    color: theme.colors.primary, 
    fontSize: 14,
    fontWeight: '600',
  },
});
