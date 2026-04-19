import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  user_id: string;
  organization_name: string | null;
  organization_email: string | null;
  credits_balance: number;
  plan_type: string | null;
  country: string | null;
  currency: string | null;
  currency_symbol: string | null;
  voice_minutes_used: number;
  voice_minutes_limit: number;
  created_at: string;
  updated_at: string;
}

export interface OrgInfo {
  organization_name: string | null;
  plan_type: string | null;
  credits_balance: number;
}

interface AuthStore {
  profile: UserProfile | null;
  orgInfo: OrgInfo | null;
  creditsBalance: number;
  isLoadingProfile: boolean;
  profileError: string | null;

  // Actions
  fetchProfile: (userId: string) => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
  setCreditsBalance: (credits: number) => void;
  clearAuthStore: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, _get) => ({
  profile: null,
  orgInfo: null,
  creditsBalance: 0,
  isLoadingProfile: false,
  profileError: null,

  fetchProfile: async (userId: string) => {
    set({ isLoadingProfile: true, profileError: null });

    try {
      // Fetch user profile using user_id column
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        if (__DEV__) console.error('[AuthStore] Failed to fetch user profile:', profileError.message);
        set({ isLoadingProfile: false, profileError: profileError.message });
        return;
      }

      if (profileData) {
        const profile = profileData as UserProfile;
        set({ 
          profile,
          creditsBalance: profile.credits_balance || 0,
          orgInfo: {
            organization_name: profile.organization_name,
            plan_type: profile.plan_type,
            credits_balance: profile.credits_balance || 0,
          }
        });
      } else {
        set({ profile: null, orgInfo: null, creditsBalance: 0 });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching profile';
      if (__DEV__) console.error('[AuthStore] Unexpected error fetching profile:', err);
      set({ profileError: message });
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  setProfile: (profile) => set({ profile }),

  setCreditsBalance: (credits) => {
    set((state) => ({
      creditsBalance: credits,
      orgInfo: state.orgInfo ? { ...state.orgInfo, credits_balance: credits } : null,
    }));
  },

  clearAuthStore: () =>
    set({ profile: null, orgInfo: null, creditsBalance: 0, isLoadingProfile: false, profileError: null }),
}));
