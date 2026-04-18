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
import { LinearGradient } from 'expo-linear-gradient';
import { SearchBar } from '../components/SearchBar';
import { FilterChips } from '../components/FilterChips';
import { CustomerCard } from '../components/CustomerCard';
import { EmptyState } from '../components/EmptyState';
import { getCustomers } from '../services/customerService';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { Customer } from '../types';

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
        <Text style={styles.subtitle}>Manage your customer relationships</Text>
      </View>
      
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name or phone..."
      />
      
      <FilterChips 
        options={FILTER_OPTIONS} 
        selected={filter} 
        onSelect={setFilter} 
      />
      
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
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
            icon="people"
            title="No customers found"
            message={search ? 'Try a different search.' : 'Add your first customer.'}
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/customers/new' as any)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color={theme.colors.background} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background,
  },
  listContent: { 
    paddingBottom: 100,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger + '15',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.danger + '30',
    gap: 12,
  },
  errorText: { 
    color: theme.colors.danger, 
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
  },
  loadingMore: { 
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    ...theme.shadow.card,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
