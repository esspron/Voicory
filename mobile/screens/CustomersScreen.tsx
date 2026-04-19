import { colors as C, typography, spacing, radii } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonListItem } from '../components/Skeleton';
import { AnimatedListItem } from '../components/AnimatedListItem';
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
  Animated,
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
  const fabScale = useRef(new Animated.Value(1)).current;
  const [slowLoad, setSlowLoad] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setSlowLoad(false);
    slowTimerRef.current = setTimeout(() => setSlowLoad(true), 10000);
    fetchCustomers(true).finally(() => {
      setLoading(false);
      setSlowLoad(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    });
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
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
          <TouchableOpacity onPress={onRefresh} style={styles.errorRetryBtn}>
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: 24 }}>
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index % 20}>
            <CustomerCard
              customer={item}
              onPress={(c) => router.push(`/customer/${c.id}` as any)}
            />
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title="No contacts yet"
            message={"Customers are added automatically\nwhen they call your agents"}
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

      {/* FAB with glow + scale animation */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          onPress={() => {
            haptics.mediumTap();
            router.push('/customers/new' as any);
          }}
          onPressIn={() =>
            Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, speed: 60, bounciness: 4 }).start()
          }
          onPressOut={() =>
            Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start()
          }
          activeOpacity={1}
          style={styles.fabTouchable}
        >
          <LinearGradient
            colors={[C.primary, C.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={26} color={C.bg} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
    paddingHorizontal: spacing.xl, 
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
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
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
    marginHorizontal: spacing.xl,
    marginVertical: 8,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: C.danger + '30',
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
    borderRadius: radii.sm,
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
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  slowLoadText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },
  loadingMore: { 
    paddingVertical: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 30,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
  },
  fabTouchable: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
