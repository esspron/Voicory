import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../components/SearchBar';
import { FilterChips } from '../components/FilterChips';
import { CustomerCard } from '../components/CustomerCard';
import { EmptyState } from '../components/EmptyState';
import { getCustomers } from '../services/customerService';
import supabase from '../lib/supabase';
import { Customer } from '../types';

const COLORS = {
  background: '#0a0f1a',
  primary: '#00d4aa',
  text: '#ffffff',
  textSecondary: '#9ca3af',
};

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Recent', value: 'recent' },
  { label: 'Hot Leads', value: 'hot_leads' },
];

const PAGE_SIZE = 20;

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const fetchCustomers = useCallback(
    async (reset: boolean = false) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const offset = reset ? 0 : offsetRef.current;
        const data = await getCustomers(user.id, {
          search: search || undefined,
          filter: filter as any,
          limit: PAGE_SIZE,
          offset,
        });

        if (reset) {
          setCustomers(data);
          offsetRef.current = data.length;
        } else {
          setCustomers((prev) => [...prev, ...data]);
          offsetRef.current += data.length;
        }
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load customers');
      }
    },
    [filter, search]
  );

  useEffect(() => {
    setLoading(true);
    fetchCustomers(true).finally(() => setLoading(false));
  }, [fetchCustomers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers(true);
    setRefreshing(false);
  }, [fetchCustomers]);

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchCustomers(false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchCustomers]);

  const ListHeader = () => (
    <View>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Customers</Text>
      </View>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name or phone..."
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
    <View style={styles.container}>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={(c) => router.push(`/customers/${c.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No customers found"
            message={search ? 'Try a different search.' : 'Add your first customer.'}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 16 }} />
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/customers/new' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#0a0f1a" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  screenHeader: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  errorBanner: { backgroundColor: '#ef444422', marginHorizontal: 16, marginBottom: 4, borderRadius: 8, padding: 12 },
  errorText: { color: '#ef4444', fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
