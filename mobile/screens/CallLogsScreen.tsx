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
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
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
        <Text style={styles.subtitle}>Track all your voice interactions</Text>
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            title="No calls found"
            message={search ? 'Try a different search.' : 'No calls yet.'}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={theme.colors.primary}
              style={styles.loadingMore}
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
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  screenTitle: { 
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: theme.colors.danger + '15',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.danger + '30',
  },
  errorText: { 
    color: theme.colors.danger, 
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
  },
  loadingMore: { 
    paddingVertical: 20,
  },
});
