import { colors as C } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonListItem } from '../components/Skeleton';
import { AnimatedListItem } from '../components/AnimatedListItem';
import * as haptics from '../lib/haptics';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../components/SearchBar';
import { FilterChips } from '../components/FilterChips';
import { CallCard } from '../components/CallCard';
import { EmptyState } from '../components/EmptyState';
import { getCalls } from '../services/callService';
import { supabase } from '../lib/supabase';
import { CallLog } from '../types';

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Inbound', value: 'inbound' },
  { label: 'Outbound', value: 'outbound' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

const PAGE_SIZE = 20;

// ─── Date grouping helpers ──────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const callDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (callDay.getTime() === today.getTime()) return 'Today';
  if (callDay.getTime() === yesterday.getTime()) return 'Yesterday';

  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function groupCallsByDate(calls: CallLog[]): { title: string; data: CallLog[] }[] {
  const groups: Record<string, CallLog[]> = {};
  const order: string[] = [];

  for (const call of calls) {
    const ts = call.started_at || call.created_at;
    const label = getDateLabel(ts);
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(call);
  }

  return order.map((title) => ({ title, data: groups[title] }));
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CallLogsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const [slowLoad, setSlowLoad] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCalls = useCallback(
    async (reset: boolean = false) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const offset = reset ? 0 : offsetRef.current;
        const data = await getCalls(user.id, {
          status: filter,
          search: search || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        if (reset) {
          setCalls(data);
          offsetRef.current = data.length;
        } else {
          setCalls((prev) => [...prev, ...data]);
          offsetRef.current += data.length;
        }
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load calls');
      }
    },
    [filter, search]
  );

  useEffect(() => {
    setLoading(true);
    setSlowLoad(false);
    slowTimerRef.current = setTimeout(() => setSlowLoad(true), 10000);
    fetchCalls(true).finally(() => {
      setLoading(false);
      setSlowLoad(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    });
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [fetchCalls]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCalls(true);
    setRefreshing(false);
  }, [fetchCalls]);

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchCalls(false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchCalls]);

  // Stats summary (completed / total)
  const completedCount = useMemo(
    () => calls.filter((c) => c.status === 'completed').length,
    [calls]
  );

  // Grouped sections for SectionList
  const sections = useMemo(() => groupCallsByDate(calls), [calls]);

  // ─── Loading state (skeleton) ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.skeletonHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.screenTitle}>Calls</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
        {slowLoad && (
          <View style={styles.slowLoadBanner}>
            <Ionicons name="time-outline" size={15} color={C.textMuted} />
            <Text style={styles.slowLoadText}>Taking longer than usual…</Text>
          </View>
        )}
      </View>
    );
  }

  // ─── List header (title + search + filters + error) ───────────────────
  const ListHeader = () => (
    <View>
      {/* Screen title + stats summary */}
      <View style={styles.screenHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Calls</Text>
          {calls.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <View style={[styles.statDot, { backgroundColor: C.success }]} />
                <Text style={styles.statText}>{completedCount} completed</Text>
              </View>
              <View style={[styles.statPill, styles.statPillTotal]}>
                <Text style={styles.statTextMuted}>{calls.length} total</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by phone number..."
      />

      <FilterChips
        options={FILTER_OPTIONS}
        selected={filter}
        onSelect={setFilter}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={15} color={C.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.errorRetryBtn}>
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  const ListEmpty = () => (
    <EmptyState
      icon="call"
      title="No calls yet"
      message="Calls from your voice agents will appear here"
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        )}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index % 20}>
            <CallCard
              call={item}
              onPress={(call) => router.push(`/calls/${call.id}` as any)}
            />
          </AnimatedListItem>
        )}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonListItem key={i} />
              ))}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  listContent: {
    paddingBottom: 40,
  },
  skeletonHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.successMuted,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.success + '30',
  },
  statPillTotal: {
    backgroundColor: C.surfaceRaised,
    borderColor: C.border,
  },
  statDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.success,
  },
  statTextMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  // Section date headers
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 10,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.textMuted,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  errorBanner: {
    backgroundColor: C.danger + '15',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.danger + '30',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.danger + '20',
    borderRadius: 8,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  slowLoadText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },
  loadingMoreContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
