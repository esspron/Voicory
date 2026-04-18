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
  TouchableOpacity,
  Text,
  Platform,
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
import { Customer } from '../types';


const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Recent', value: 'recent' },
  { label: 'Hot Leads', value: 'hot_leads' },
];

const PAGE_SIZE = 20;

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
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
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Customers</Text>
          {customers.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{customers.length}</Text>
            </View>
          )}
        </View>
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
          <Ionicons name="alert-circle" size={16} color={C.danger} />
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
        data={customers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={(c) => router.push(`/customer/${c.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title="No customers yet"
            message="Customers are added automatically when they call your agents"
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/customers/new' as any)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[C.primary, C.primary + 'dd']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color={C.bg} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: C.bg,
  },
  listContent: { 
    paddingBottom: 100,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.danger + '15',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.danger + '30',
    gap: 12,
  },
  errorText: { 
    color: C.danger, 
    fontSize: 14,
    fontWeight: '500',
  },
  loadingMore: { 
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
