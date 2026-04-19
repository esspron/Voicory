import { create } from 'zustand';
import { Customer } from '../types';
import { getCustomers, getCustomerById, updateCustomer, createCustomer } from '../services/customerService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerFilters {
  search?: string;
  filter?: 'all' | 'recent' | 'hot_leads';
}

interface PaginationState {
  page: number;
  hasMore: boolean;
  limit: number;
}

interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  filters: CustomerFilters;
  pagination: PaginationState;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSaving: boolean;
  error: string | null;
}

interface CustomerActions {
  fetchCustomers: (userId: string, reset?: boolean) => Promise<void>;
  fetchMoreCustomers: (userId: string) => Promise<void>;
  fetchCustomerById: (customerId: string) => Promise<void>;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<void>;
  createCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'interaction_count'>) => Promise<Customer | null>;
  setSelectedCustomer: (customer: Customer | null) => void;
  setFilters: (filters: CustomerFilters) => void;
  resetCustomerStore: () => void;
}

type CustomerStore = CustomerState & CustomerActions;

// ─── Initial State ────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

const initialState: CustomerState = {
  customers: [],
  selectedCustomer: null,
  filters: { filter: 'all' },
  pagination: { page: 0, hasMore: true, limit: PAGE_LIMIT },
  isLoading: false,
  isLoadingMore: false,
  isSaving: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  ...initialState,

  fetchCustomers: async (userId, reset = true) => {
    set({ isLoading: true, error: null });
    if (reset) {
      set({ customers: [], pagination: { page: 0, hasMore: true, limit: PAGE_LIMIT } });
    }
    try {
      const { filters } = get();
      const data = await getCustomers(userId, {
        ...filters,
        limit: PAGE_LIMIT,
        offset: 0,
      });
      set({
        customers: data,
        pagination: { page: 1, hasMore: data.length === PAGE_LIMIT, limit: PAGE_LIMIT },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load customers';
      if (__DEV__) console.error('[CustomerStore] fetchCustomers error:', message);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMoreCustomers: async (userId) => {
    const { pagination, isLoadingMore, filters, customers } = get();
    if (!pagination.hasMore || isLoadingMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const offset = pagination.page * pagination.limit;
      const data = await getCustomers(userId, {
        ...filters,
        limit: PAGE_LIMIT,
        offset,
      });
      set({
        customers: [...customers, ...data],
        pagination: {
          ...pagination,
          page: pagination.page + 1,
          hasMore: data.length === PAGE_LIMIT,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load more customers';
      if (__DEV__) console.error('[CustomerStore] fetchMoreCustomers error:', message);
      set({ error: message });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  fetchCustomerById: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      const customer = await getCustomerById(customerId);
      set({ selectedCustomer: customer });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load customer';
      if (__DEV__) console.error('[CustomerStore] fetchCustomerById error:', message);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateCustomer: async (customerId, updates) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await updateCustomer(customerId, updates);
      set((state) => ({
        customers: state.customers.map((c) => (c.id === customerId ? updated : c)),
        selectedCustomer:
          state.selectedCustomer?.id === customerId ? updated : state.selectedCustomer,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update customer';
      if (__DEV__) console.error('[CustomerStore] updateCustomer error:', message);
      set({ error: message });
    } finally {
      set({ isSaving: false });
    }
  },

  createCustomer: async (customer) => {
    set({ isSaving: true, error: null });
    try {
      const created = await createCustomer(customer);
      set((state) => ({ customers: [created, ...state.customers] }));
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create customer';
      if (__DEV__) console.error('[CustomerStore] createCustomer error:', message);
      set({ error: message });
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

  setFilters: (filters) => set({ filters }),

  resetCustomerStore: () => set({ ...initialState }),
}));
