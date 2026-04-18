import { colors as C } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonListItem } from '../components/Skeleton';
import * as haptics from '../lib/haptics';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
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
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Calls</Text>
          {calls.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{calls.length}</Text>
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
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
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
            icon="call"
            title="No calls yet"
            message="Calls from your voice agents will appear here"
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={C.primary}
              style={styles.loadingMore}
            />
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
    paddingBottom: 32,
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: C.bg,
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: C.primaryMuted,
    borderColor: C.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
  errorBanner: {
    backgroundColor: C.danger + '15',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.danger + '30',
  },
  errorText: { 
    color: C.danger, 
    fontSize: 14,
    fontWeight: '500',
  },
  loadingMore: { 
    paddingVertical: 20,
  },
});
