import { supabase } from './supabase';

// ============================================
// ADD-ONS SERVICE
// Manages Reserved Concurrency and Data Retention add-ons
// Uses prepaid credits for monthly billing
// ============================================

// ============================================
// TYPES
// ============================================

export type AddonType = 'reserved_concurrency' | 'extended_retention';

export interface UserAddon {
    id: string;
    userId: string;
    addonType: AddonType;
    quantity: number;
    pricePerUnit: number;
    isActive: boolean;
    activatedAt: string;
    deactivatedAt: string | null;
    nextBillingDate: string;
    lastBilledAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AddonBillingHistory {
    id: string;
    userId: string;
    addonId: string;
    addonType: AddonType;
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
    status: 'pending' | 'completed' | 'failed' | 'insufficient_balance';
    billingPeriodStart: string;
    billingPeriodEnd: string;
    creditTransactionId: string | null;
    errorMessage: string | null;
    createdAt: string;
}

export interface ActivateAddonResult {
    success: boolean;
    addonId?: string;
    amountCharged?: number;
    newBalance?: number;
    nextBillingDate?: string;
    error?: string;
    required?: number;
    available?: number;
}

export interface DeactivateAddonResult {
    success: boolean;
    addonId?: string;
    error?: string;
}

export interface UpdateQuantityResult {
    success: boolean;
    oldQuantity?: number;
    newQuantity?: number;
    amountCharged?: number;
    newBalance?: number;
    error?: string;
    required?: number;
    available?: number;
}

// ============================================
// ADD-ON PRICING CONFIGURATION
// ============================================

export const ADDON_PRICING = {
    reserved_concurrency: {
        pricePerUnit: 10, // $10/mo per line
        displayName: 'Reserved Concurrency (Call Lines)',
        description: 'Guarantee dedicated call lines for your business',
        tooltip: 'Reserve dedicated phone lines that are always available for your calls. Prevents call queuing during peak times.',
        minQuantity: 1,
        maxQuantity: 100,
    },
    extended_retention: {
        pricePerUnit: 1000, // $1000/mo flat
        displayName: '60-day Call and Chat Data Retention',
        description: 'Extend data retention from 30 to 60 days',
        tooltip: 'Keep your call recordings, transcripts, and chat logs for 60 days instead of the default 30 days. Required for compliance in some industries.',
        minQuantity: 1,
        maxQuantity: 1, // Boolean - enabled or not
    },
} as const;

// ============================================
// DATABASE HELPERS
// ============================================

interface UserAddonRow {
    id: string;
    user_id: string;
    addon_type: string;
    quantity: number;
    price_per_unit: string;
    is_active: boolean;
    activated_at: string;
    deactivated_at: string | null;
    next_billing_date: string;
    last_billed_at: string | null;
    created_at: string;
    updated_at: string;
}

interface AddonBillingHistoryRow {
    id: string;
    user_id: string;
    addon_id: string;
    addon_type: string;
    quantity: number;
    price_per_unit: string;
    total_amount: string;
    status: string;
    billing_period_start: string;
    billing_period_end: string;
    credit_transaction_id: string | null;
    error_message: string | null;
    created_at: string;
}

const mapAddonRow = (row: UserAddonRow): UserAddon => ({
    id: row.id,
    userId: row.user_id,
    addonType: row.addon_type as AddonType,
    quantity: row.quantity,
    pricePerUnit: parseFloat(row.price_per_unit),
    isActive: row.is_active,
    activatedAt: row.activated_at,
    deactivatedAt: row.deactivated_at,
    nextBillingDate: row.next_billing_date,
    lastBilledAt: row.last_billed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapBillingHistoryRow = (row: AddonBillingHistoryRow): AddonBillingHistory => ({
    id: row.id,
    userId: row.user_id,
    addonId: row.addon_id,
    addonType: row.addon_type as AddonType,
    quantity: row.quantity,
    pricePerUnit: parseFloat(row.price_per_unit),
    totalAmount: parseFloat(row.total_amount),
    status: row.status as AddonBillingHistory['status'],
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    creditTransactionId: row.credit_transaction_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
});

// ============================================
// ADD-ON CRUD OPERATIONS
// ============================================

/**
 * Get all add-ons for current user
 */
export const getUserAddons = async (): Promise<UserAddon[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_addons')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching addons:', error);
            return [];
        }

        return (data as UserAddonRow[] || []).map(mapAddonRow);
    } catch (error) {
        console.error('Error fetching addons:', error);
        return [];
    }
};

/**
 * Get active add-ons only
 */
export const getActiveAddons = async (): Promise<UserAddon[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_addons')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching active addons:', error);
            return [];
        }

        return (data as UserAddonRow[] || []).map(mapAddonRow);
    } catch (error) {
        console.error('Error fetching active addons:', error);
        return [];
    }
};

/**
 * Check if a specific add-on is active
 */
export const isAddonActive = async (addonType: AddonType): Promise<{ isActive: boolean; addon?: UserAddon }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { isActive: false };

        const { data, error } = await supabase
            .from('user_addons')
            .select('*')
            .eq('user_id', user.id)
            .eq('addon_type', addonType)
            .eq('is_active', true)
            .single();

        if (error || !data) return { isActive: false };

        return { 
            isActive: true, 
            addon: mapAddonRow(data as UserAddonRow) 
        };
    } catch (error) {
        return { isActive: false };
    }
};

/**
 * Activate an add-on (charges credits immediately)
 */
export const activateAddon = async (
    addonType: AddonType,
    quantity: number = 1
): Promise<ActivateAddonResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const pricing = ADDON_PRICING[addonType];
        if (!pricing) {
            return { success: false, error: 'Invalid add-on type' };
        }

        // Validate quantity
        if (quantity < pricing.minQuantity || quantity > pricing.maxQuantity) {
            return { 
                success: false, 
                error: `Quantity must be between ${pricing.minQuantity} and ${pricing.maxQuantity}` 
            };
        }

        // Call the database function (user_id and price are handled server-side for security)
        const { data, error } = await (supabase.rpc as any)('activate_addon', {
            p_addon_type: addonType,
            p_quantity: quantity,
        });

        if (error) {
            console.error('Error activating addon:', error);
            return { success: false, error: error.message };
        }

        const result = data as {
            success: boolean;
            addon_id?: string;
            amount_charged?: number;
            new_balance?: number;
            next_billing_date?: string;
            error?: string;
            required?: number;
            available?: number;
        };

        return {
            success: result.success,
            addonId: result.addon_id,
            amountCharged: result.amount_charged,
            newBalance: result.new_balance,
            nextBillingDate: result.next_billing_date,
            error: result.error,
            required: result.required,
            available: result.available,
        };
    } catch (error: any) {
        console.error('Error activating addon:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Deactivate an add-on
 */
export const deactivateAddon = async (addonType: AddonType): Promise<DeactivateAddonResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // User ID is handled server-side via auth.uid() for security
        const { data, error } = await (supabase.rpc as any)('deactivate_addon', {
            p_addon_type: addonType,
        });

        if (error) {
            console.error('Error deactivating addon:', error);
            return { success: false, error: error.message };
        }

        const result = data as { success: boolean; addon_id?: string; error?: string };

        return {
            success: result.success,
            addonId: result.addon_id,
            error: result.error,
        };
    } catch (error: any) {
        console.error('Error deactivating addon:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update Reserved Concurrency quantity (only for reserved_concurrency type)
 */
export const updateConcurrencyQuantity = async (
    newQuantity: number
): Promise<UpdateQuantityResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        if (newQuantity < 1 || newQuantity > 100) {
            return { success: false, error: 'Quantity must be between 1 and 100' };
        }

        // User ID is handled server-side via auth.uid() for security
        const { data, error } = await (supabase.rpc as any)('update_addon_quantity', {
            p_addon_type: 'reserved_concurrency',
            p_new_quantity: newQuantity,
        });

        if (error) {
            console.error('Error updating quantity:', error);
            return { success: false, error: error.message };
        }

        const result = data as {
            success: boolean;
            old_quantity?: number;
            new_quantity?: number;
            amount_charged?: number;
            new_balance?: number;
            error?: string;
            required?: number;
            available?: number;
        };

        return {
            success: result.success,
            oldQuantity: result.old_quantity,
            newQuantity: result.new_quantity,
            amountCharged: result.amount_charged,
            newBalance: result.new_balance,
            error: result.error,
            required: result.required,
            available: result.available,
        };
    } catch (error: any) {
        console.error('Error updating quantity:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// BILLING HISTORY
// ============================================

/**
 * Get add-on billing history
 */
export const getAddonBillingHistory = async (limit: number = 20): Promise<AddonBillingHistory[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('addon_billing_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching billing history:', error);
            return [];
        }

        return (data as AddonBillingHistoryRow[] || []).map(mapBillingHistoryRow);
    } catch (error) {
        console.error('Error fetching billing history:', error);
        return [];
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total monthly add-on cost
 */
export const calculateMonthlyAddonCost = (addons: UserAddon[]): number => {
    return addons
        .filter(a => a.isActive)
        .reduce((total, addon) => total + (addon.quantity * addon.pricePerUnit), 0);
};

/**
 * Get add-on display info
 */
export const getAddonDisplayInfo = (addonType: AddonType) => {
    return ADDON_PRICING[addonType];
};

/**
 * Format addon type for display
 */
export const formatAddonType = (addonType: AddonType): string => {
    return ADDON_PRICING[addonType]?.displayName || addonType;
};
