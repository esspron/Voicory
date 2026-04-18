import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SearchBar } from '../components/SearchBar';
import { FilterChips } from '../components/FilterChips';
import { CallCard } from '../components/CallCard';
import { EmptyState } from '../components/EmptyState';
import { getCalls } from '../services/callService';
import supabase from '../lib/supabase';
import { CallLog } from '../types';

const COLORS = {
  background: '#0a0f1a',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  primary: '#00d4aa',
};

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Missed', value: 'missed' },
  { label: 'Failed', value: 'failed' },
];

const PAGE_SIZE = 20;

export default function CallLogsScreen() {
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
  const userIdRef = useRef<string | null>(null);

  const fetchCalls = useCallback(
    async (reset: boolean = false) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userIdRef.current = user.id;

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
    fetchCalls(true).finally(() => setLoading(false));
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

  const ListHeader = () => (
    <View>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Call Logs</Text>
      </View>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by phone number..."
      />
      <FilterChips options={FILTER_OPTIONS} selected={filter} onSelect={setFilter} />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={calls}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeader}
      renderItem={({ item }) => (
        <CallCard
          call={item}
          onPress={(call) => router.push(`/calls/${call.id}` as any)}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="call-outline"
          title="No calls found"
          message={search ? 'Try a different search.' : 'No calls yet.'}
        />
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={{ paddingVertical: 16 }}
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
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  errorBanner: {
    backgroundColor: '#ef444422',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: '#ef4444', fontSize: 13 },
});
