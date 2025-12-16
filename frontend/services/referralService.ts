import { supabase } from './supabase';

// ============================================
// REFERRAL TYPES
// ============================================

export interface ReferralCode {
    id: string;
    userId: string;
    code: string;
    customCode: string | null;
    isActive: boolean;
    createdAt: string;
}

export interface ReferralStats {
    referralCode: string;
    customCode: string | null;
    isActive: boolean;
    pendingReferrals: number;
    completedReferrals: number;
    totalReferrals: number;
    totalRewardsEarned: number;
    pendingRewards: number;
}

export interface ReferralHistoryItem {
    id: string;
    referredEmail: string;
    rewardAmount: number;
    rewardType: string;
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    createdAt: string;
    completedAt: string | null;
}

export interface ReferralActivity {
    id: string;
    activityType: string;
    createdAt: string;
    metadata: Record<string, any>;
}

// ============================================
// REFERRAL SERVICE FUNCTIONS
// ============================================

/**
 * Get or create the current user's referral code
 */
export const getOrCreateReferralCode = async (): Promise<ReferralCode | null> => {
    try {
        const { data, error } = await supabase.rpc('get_or_create_referral_code') as { data: any[] | null; error: any };

        if (error) throw error;

        if (data && data.length > 0) {
            const row = data[0];
            return {
                id: row.id,
                userId: row.user_id,
                code: row.code,
                customCode: row.custom_code,
                isActive: row.is_active,
                createdAt: row.created_at
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting/creating referral code:', error);
        throw error;
    }
};

/**
 * Get current user's referral stats
 */
export const getReferralStats = async (): Promise<ReferralStats | null> => {
    try {
        const { data, error } = await supabase.rpc('get_my_referral_stats') as { data: any[] | null; error: any };

        if (error) throw error;

        if (data && data.length > 0) {
            const row = data[0];
            return {
                referralCode: row.referral_code,
                customCode: row.custom_code,
                isActive: row.is_active,
                pendingReferrals: Number(row.pending_referrals) || 0,
                completedReferrals: Number(row.completed_referrals) || 0,
                totalReferrals: Number(row.total_referrals) || 0,
                totalRewardsEarned: Number(row.total_rewards_earned) || 0,
                pendingRewards: Number(row.pending_rewards) || 0
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching referral stats:', error);
        throw error;
    }
};

/**
 * Get referral history (list of people referred)
 */
export const getReferralHistory = async (): Promise<ReferralHistoryItem[]> => {
    try {
        const { data, error } = await supabase.rpc('get_my_referral_history');

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            referredEmail: row.referred_email,
            rewardAmount: Number(row.reward_amount) || 0,
            rewardType: row.reward_type,
            status: row.status as ReferralHistoryItem['status'],
            createdAt: row.created_at,
            completedAt: row.completed_at
        }));
    } catch (error) {
        console.error('Error fetching referral history:', error);
        return [];
    }
};

/**
 * Update custom referral code
 */
export const updateCustomReferralCode = async (customCode: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Validate custom code format (alphanumeric, 4-20 chars)
        const cleanCode = customCode.trim().toUpperCase();
        if (!/^[A-Z0-9]{4,20}$/.test(cleanCode)) {
            throw new Error('Custom code must be 4-20 alphanumeric characters');
        }

        const { error } = await (supabase as any)
            .from('referral_codes')
            .update({ 
                custom_code: cleanCode,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (error) {
            if (error.code === '23505') {
                throw new Error('This custom code is already taken. Please choose another.');
            }
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Error updating custom referral code:', error);
        throw error;
    }
};

/**
 * Remove custom referral code (revert to default)
 */
export const removeCustomReferralCode = async (): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await (supabase as any)
            .from('referral_codes')
            .update({ 
                custom_code: null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error removing custom referral code:', error);
        throw error;
    }
};

/**
 * Get referral link activity (clicks, signups, etc.)
 */
export const getReferralActivity = async (limit: number = 50): Promise<ReferralActivity[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get the user's referral code first
        const { data: codeData, error: codeError } = await (supabase as any)
            .from('referral_codes')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (codeError || !codeData) return [];

        const { data, error } = await (supabase as any)
            .from('referral_activity')
            .select('*')
            .eq('referral_code_id', codeData.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return ((data as any[]) || []).map((row: any) => ({
            id: row.id,
            activityType: row.activity_type,
            createdAt: row.created_at,
            metadata: row.metadata || {}
        }));
    } catch (error) {
        console.error('Error fetching referral activity:', error);
        return [];
    }
};

/**
 * Generate the full referral URL
 */
export const generateReferralUrl = (code: string, customCode?: string | null): string => {
    const baseUrl = window.location.origin;
    const referralCode = customCode || code;
    return `${baseUrl}/#/signup?ref=${referralCode}`;
};

/**
 * Copy referral link to clipboard
 */
export const copyReferralLink = async (code: string, customCode?: string | null): Promise<boolean> => {
    try {
        const url = generateReferralUrl(code, customCode);
        await navigator.clipboard.writeText(url);
        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
    }
};

// ============================================
// REFERRED USER FUNCTIONS
// ============================================

/**
 * Store referral code in localStorage when user lands on signup page
 */
export const storeReferralCode = (code: string): void => {
    if (code) {
        localStorage.setItem('referral_code', code.toUpperCase());
        localStorage.setItem('referral_code_timestamp', Date.now().toString());
    }
};

/**
 * Get stored referral code from localStorage
 */
export const getStoredReferralCode = (): string | null => {
    const code = localStorage.getItem('referral_code');
    const timestamp = localStorage.getItem('referral_code_timestamp');
    
    if (!code || !timestamp) return null;
    
    // Check if code is still valid (30 days)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(timestamp) > thirtyDaysMs) {
        clearStoredReferralCode();
        return null;
    }
    
    return code;
};

/**
 * Clear stored referral code
 */
export const clearStoredReferralCode = (): void => {
    localStorage.removeItem('referral_code');
    localStorage.removeItem('referral_code_timestamp');
};

/**
 * Process referral after user signs up
 * Call this after successful signup
 */
export const processReferralSignup = async (referralCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data, error } = await (supabase as any).rpc('process_referral_signup', {
            referral_code_param: referralCode
        });

        if (error) throw error;

        if (data && data.success) {
            clearStoredReferralCode();
            return { success: true };
        }

        return { success: false, error: data?.error || 'Failed to process referral' };
    } catch (error: any) {
        console.error('Error processing referral signup:', error);
        return { success: false, error: error.message || 'Failed to process referral' };
    }
};

/**
 * Get current user's referral status (if they were referred by someone)
 */
export const getMyReferralStatus = async (): Promise<{
    wasReferred: boolean;
    status?: string;
    rewardAmount?: number;
    referrerEmail?: string;
    completedAt?: string;
} | null> => {
    try {
        const { data, error } = await supabase.rpc('get_my_referral_status') as { data: any; error: any };

        if (error) throw error;

        if (data) {
            return {
                wasReferred: data.was_referred,
                status: data.status,
                rewardAmount: data.reward_amount,
                referrerEmail: data.referrer_email,
                completedAt: data.completed_at
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching referral status:', error);
        return null;
    }
};

/**
 * Validate a referral code (check if it exists and is active)
 */
export const validateReferralCode = async (code: string): Promise<{ valid: boolean; error?: string }> => {
    try {
        const { data, error } = await (supabase as any)
            .from('referral_codes')
            .select('id, code, custom_code, is_active')
            .or(`code.eq.${code.toUpperCase()},custom_code.eq.${code.toUpperCase()}`)
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { valid: false, error: 'Invalid referral code' };
            }
            throw error;
        }

        return { valid: !!data };
    } catch (error: any) {
        console.error('Error validating referral code:', error);
        return { valid: false, error: 'Could not validate referral code' };
    }
};

// ============================================
// CREDIT TOP-UP & REFERRAL COMPLETION
// ============================================

export const MINIMUM_REFERRAL_PURCHASE = 10; // $10 minimum

export interface CreditTopupResult {
    success: boolean;
    purchaseId?: string;
    amount?: number;
    newBalance?: number;
    firstQualifyingPurchase?: boolean;
    referralCompleted?: boolean;
    referralRewardAmount?: number;
    error?: string;
}

/**
 * Process a credit top-up and automatically complete referral if eligible
 * This should be called after successful payment
 */
export const processCreditTopup = async (
    amount: number,
    paymentId?: string,
    paymentMethod: string = 'card'
): Promise<CreditTopupResult> => {
    try {
        const { data, error } = await (supabase as any).rpc('process_credit_topup', {
            amount_param: amount,
            payment_id_param: paymentId || null,
            payment_method_param: paymentMethod
        });

        if (error) throw error;

        if (data && data.success) {
            return {
                success: true,
                purchaseId: data.purchase_id,
                amount: data.amount,
                newBalance: data.new_balance,
                firstQualifyingPurchase: data.first_qualifying_purchase,
                referralCompleted: data.referral_result?.referral_completed || false,
                referralRewardAmount: data.referral_result?.referred_credited || 0
            };
        }

        return { success: false, error: data?.error || 'Failed to process top-up' };
    } catch (error: any) {
        console.error('Error processing credit top-up:', error);
        return { success: false, error: error.message || 'Failed to process top-up' };
    }
};

/**
 * Get user's purchase history
 */
export const getPurchaseHistory = async (): Promise<any[]> => {
    try {
        const { data, error } = await (supabase as any)
            .from('credit_purchases')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        return [];
    }
};

/**
 * Check if user has made qualifying purchase for referral
 */
export const hasQualifyingPurchase = async (): Promise<{ qualified: boolean; totalPurchases: number }> => {
    try {
        const { data, error } = await (supabase as any)
            .from('credit_purchases')
            .select('amount')
            .eq('status', 'completed');

        if (error) throw error;

        const totalPurchases = (data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        return {
            qualified: totalPurchases >= MINIMUM_REFERRAL_PURCHASE,
            totalPurchases
        };
    } catch (error) {
        console.error('Error checking qualifying purchase:', error);
        return { qualified: false, totalPurchases: 0 };
    }
};
