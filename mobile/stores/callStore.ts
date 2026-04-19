import { create } from 'zustand';
import { CallLog } from '../types';
import { getCalls, getCallById } from '../services/callService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallFilters {
  status?: string;
  search?: string;
}

interface PaginationState {
  page: number;
  hasMore: boolean;
  limit: number;
}

interface CallState {
  calls: CallLog[];
  selectedCall: CallLog | null;
  filters: CallFilters;
  pagination: PaginationState;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface CallActions {
  fetchCalls: (userId: string, reset?: boolean) => Promise<void>;
  fetchMoreCalls: (userId: string) => Promise<void>;
  fetchCallById: (callId: string) => Promise<void>;
  setSelectedCall: (call: CallLog | null) => void;
  setFilters: (filters: CallFilters) => void;
  resetCallStore: () => void;
}

type CallStore = CallState & CallActions;

// ─── Initial State ────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

const initialState: CallState = {
  calls: [],
  selectedCall: null,
  filters: {},
  pagination: { page: 0, hasMore: true, limit: PAGE_LIMIT },
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCallStore = create<CallStore>((set, get) => ({
  ...initialState,

  fetchCalls: async (userId, reset = true) => {
    set({ isLoading: true, error: null });
    if (reset) {
      set({ calls: [], pagination: { page: 0, hasMore: true, limit: PAGE_LIMIT } });
    }
    try {
      const { filters } = get();
      const data = await getCalls(userId, {
        ...filters,
        limit: PAGE_LIMIT,
        offset: 0,
      });
      set({
        calls: data,
        pagination: { page: 1, hasMore: data.length === PAGE_LIMIT, limit: PAGE_LIMIT },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load calls';
      if (__DEV__) console.error('[CallStore] fetchCalls error:', message);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMoreCalls: async (userId) => {
    const { pagination, isLoadingMore, filters, calls } = get();
    if (!pagination.hasMore || isLoadingMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const offset = pagination.page * pagination.limit;
      const data = await getCalls(userId, {
        ...filters,
        limit: PAGE_LIMIT,
        offset,
      });
      set({
        calls: [...calls, ...data],
        pagination: {
          ...pagination,
          page: pagination.page + 1,
          hasMore: data.length === PAGE_LIMIT,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load more calls';
      if (__DEV__) console.error('[CallStore] fetchMoreCalls error:', message);
      set({ error: message });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  fetchCallById: async (callId) => {
    set({ isLoading: true, error: null });
    try {
      const call = await getCallById(callId);
      set({ selectedCall: call });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load call';
      if (__DEV__) console.error('[CallStore] fetchCallById error:', message);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedCall: (call) => set({ selectedCall: call }),

  setFilters: (filters) => set({ filters }),

  resetCallStore: () => set({ ...initialState }),
}));
