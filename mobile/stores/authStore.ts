import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  org_id: string | null;
  role: string | null;
  created_at: string;
}

export interface OrgInfo {
  id: string;
  name: string;
  plan: string | null;
  credits: number;
}

interface AuthStore {
  profile: UserProfile | null;
  orgInfo: OrgInfo | null;
  creditsBalance: number;
  isLoadingProfile: boolean;

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

  fetchProfile: async (userId: string) => {
    set({ isLoadingProfile: true });

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[AuthStore] Failed to fetch user profile:', profileError.message);
        set({ isLoadingProfile: false });
        return;
      }

      const profile = profileData as UserProfile;
      set({ profile });

      // Fetch org info if user belongs to an org
      if (profile.org_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, plan, credits')
          .eq('id', profile.org_id)
          .single();

        if (orgError) {
          console.warn('[AuthStore] Failed to fetch org info:', orgError.message);
        } else if (orgData) {
          const orgInfo = orgData as OrgInfo;
          set({ orgInfo, creditsBalance: orgInfo.credits ?? 0 });
        }
      }
    } catch (err) {
      console.error('[AuthStore] Unexpected error fetching profile:', err);
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  setProfile: (profile) => set({ profile }),

  setCreditsBalance: (credits) => {
    set((state) => ({
      creditsBalance: credits,
      orgInfo: state.orgInfo ? { ...state.orgInfo, credits } : null,
    }));
  },

  clearAuthStore: () =>
    set({ profile: null, orgInfo: null, creditsBalance: 0, isLoadingProfile: false }),
}));
