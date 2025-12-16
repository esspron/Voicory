import { supabase } from './supabase';

// ============================================
// LLM PRICING TYPES
// ============================================

export interface LLMPricing {
    id: string;
    provider: string;
    model: string;
    displayName: string;
    description: string;
    contextWindow: string;
    speed: string;
    
    // Provider costs (USD per 1M tokens)
    providerInputCostPerMillion: number;
    providerOutputCostPerMillion: number;
    
    // Voicory costs (USD per 1M tokens - 2x markup)
    voicoryInputCostPerMillion: number;
    voicoryOutputCostPerMillion: number;
    
    isActive: boolean;
}

export interface UsageLog {
    id: string;
    userId: string;
    assistantId?: string;
    usageType: 'llm' | 'tts' | 'stt' | 'call';
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    durationSeconds: number;
    costUsd: number;
    callLogId?: string;
    conversationId?: string;
    metadata: Record<string, any>;
    createdAt: string;
}

export interface CreditTransaction {
    id: string;
    userId: string;
    transactionType: 'purchase' | 'usage' | 'refund' | 'bonus' | 'referral';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType?: string;
    referenceId?: string;
    description: string;
    metadata: Record<string, any>;
    createdAt: string;
}

export interface UsageSummary {
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
    totalMinutes: number;
    byModel: {
        model: string;
        provider: string;
        cost: number;
        tokens: number;
        count: number;
    }[];
    byDay: {
        date: string;
        cost: number;
    }[];
}

// Database row types (for typing the Supabase response)
interface LLMPricingRow {
    id: string;
    provider: string;
    model: string;
    display_name: string;
    description: string;
    context_window: string;
    speed: string;
    provider_input_cost_per_million: string;
    provider_output_cost_per_million: string;
    voicory_input_cost_per_million: string;
    voicory_output_cost_per_million: string;
    is_active: boolean;
}

interface UsageLogRow {
    id: string;
    user_id: string;
    assistant_id: string | null;
    usage_type: string;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    duration_seconds: number;
    cost_usd: string;
    call_log_id: string | null;
    conversation_id: string | null;
    metadata: Record<string, any>;
    created_at: string;
}

interface CreditTransactionRow {
    id: string;
    user_id: string;
    transaction_type: string;
    amount: string;
    balance_before: string;
    balance_after: string;
    reference_type: string | null;
    reference_id: string | null;
    description: string;
    metadata: Record<string, any>;
    created_at: string;
}

// ============================================
// LLM PRICING FUNCTIONS
// ============================================

/**
 * Get all LLM pricing data
 */
export const getLLMPricing = async (): Promise<LLMPricing[]> => {
    try {
        const { data, error } = await supabase
            .from('llm_pricing')
            .select('*')
            .eq('is_active', true)
            .order('provider', { ascending: true }) as { data: LLMPricingRow[] | null; error: any };

        if (error) throw error;

        return (data || []).map(p => ({
            id: p.id,
            provider: p.provider,
            model: p.model,
            displayName: p.display_name,
            description: p.description,
            contextWindow: p.context_window,
            speed: p.speed,
            providerInputCostPerMillion: Number(p.provider_input_cost_per_million),
            providerOutputCostPerMillion: Number(p.provider_output_cost_per_million),
            voicoryInputCostPerMillion: Number(p.voicory_input_cost_per_million),
            voicoryOutputCostPerMillion: Number(p.voicory_output_cost_per_million),
            isActive: p.is_active
        }));
    } catch (error) {
        console.error('Error fetching LLM pricing:', error);
        return [];
    }
};

/**
 * Get pricing for a specific model
 */
export const getModelPricing = async (model: string): Promise<LLMPricing | null> => {
    try {
        const { data, error } = await supabase
            .from('llm_pricing')
            .select('*')
            .eq('model', model)
            .single() as { data: LLMPricingRow | null; error: any };

        if (error) throw error;

        return data ? {
            id: data.id,
            provider: data.provider,
            model: data.model,
            displayName: data.display_name,
            description: data.description,
            contextWindow: data.context_window,
            speed: data.speed,
            providerInputCostPerMillion: Number(data.provider_input_cost_per_million),
            providerOutputCostPerMillion: Number(data.provider_output_cost_per_million),
            voicoryInputCostPerMillion: Number(data.voicory_input_cost_per_million),
            voicoryOutputCostPerMillion: Number(data.voicory_output_cost_per_million),
            isActive: data.is_active
        } : null;
    } catch (error) {
        console.error('Error fetching model pricing:', error);
        return null;
    }
};

/**
 * Calculate cost for a given number of tokens
 */
export const calculateTokenCost = (
    pricing: LLMPricing,
    inputTokens: number,
    outputTokens: number
): number => {
    const inputCost = (inputTokens * pricing.voicoryInputCostPerMillion) / 1_000_000;
    const outputCost = (outputTokens * pricing.voicoryOutputCostPerMillion) / 1_000_000;
    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
};

/**
 * Get cost per 1K tokens for display (average of input/output)
 */
export const getCostPer1KTokens = (pricing: LLMPricing): { input: number; output: number; average: number } => {
    const inputPer1K = pricing.voicoryInputCostPerMillion / 1000;
    const outputPer1K = pricing.voicoryOutputCostPerMillion / 1000;
    return {
        input: Math.round(inputPer1K * 100) / 100,
        output: Math.round(outputPer1K * 100) / 100,
        average: Math.round(((inputPer1K + outputPer1K) / 2) * 100) / 100
    };
};

// ============================================
// USAGE LOGGING FUNCTIONS
// ============================================

/**
 * Log LLM usage and deduct credits (calls the database function)
 */
export const logLLMUsage = async (params: {
    assistantId?: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    callLogId?: string;
    conversationId?: string;
}): Promise<{ success: boolean; cost?: number; balance?: number; error?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await (supabase.rpc as any)('log_llm_usage', {
            p_user_id: user.id,
            p_assistant_id: params.assistantId || null,
            p_provider: params.provider,
            p_model: params.model,
            p_input_tokens: params.inputTokens,
            p_output_tokens: params.outputTokens,
            p_call_log_id: params.callLogId || null,
            p_conversation_id: params.conversationId || null
        });

        if (error) throw error;

        return {
            success: data?.success || false,
            cost: data?.cost_usd,
            balance: data?.balance,
            error: data?.error
        };
    } catch (error: any) {
        console.error('Error logging LLM usage:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get usage logs for the current user
 */
export const getUsageLogs = async (limit: number = 50, offset: number = 0): Promise<UsageLog[]> => {
    try {
        const { data, error } = await supabase
            .from('usage_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1) as { data: UsageLogRow[] | null; error: any };

        if (error) throw error;

        return (data || []).map(u => ({
            id: u.id,
            userId: u.user_id,
            assistantId: u.assistant_id || undefined,
            usageType: u.usage_type as UsageLog['usageType'],
            provider: u.provider,
            model: u.model,
            inputTokens: u.input_tokens,
            outputTokens: u.output_tokens,
            totalTokens: u.total_tokens,
            durationSeconds: u.duration_seconds,
            costUsd: Number(u.cost_usd),
            callLogId: u.call_log_id || undefined,
            conversationId: u.conversation_id || undefined,
            metadata: u.metadata,
            createdAt: u.created_at
        }));
    } catch (error) {
        console.error('Error fetching usage logs:', error);
        return [];
    }
};

/**
 * Get credit transactions for the current user
 */
export const getCreditTransactions = async (limit: number = 50, offset: number = 0): Promise<CreditTransaction[]> => {
    try {
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1) as { data: CreditTransactionRow[] | null; error: any };

        if (error) throw error;

        return (data || []).map(t => ({
            id: t.id,
            userId: t.user_id,
            transactionType: t.transaction_type as CreditTransaction['transactionType'],
            amount: Number(t.amount),
            balanceBefore: Number(t.balance_before),
            balanceAfter: Number(t.balance_after),
            referenceType: t.reference_type || undefined,
            referenceId: t.reference_id || undefined,
            description: t.description,
            metadata: t.metadata,
            createdAt: t.created_at
        }));
    } catch (error) {
        console.error('Error fetching credit transactions:', error);
        return [];
    }
};

/**
 * Get usage summary for a date range
 */
export const getUsageSummary = async (days: number = 30): Promise<UsageSummary> => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await supabase
            .from('usage_logs')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true }) as { data: UsageLogRow[] | null; error: any };

        if (error) throw error;

        const logs = data || [];
        
        // Calculate totals
        let totalCost = 0;
        let totalTokens = 0;
        let totalCalls = 0;
        let totalMinutes = 0;
        
        const byModelMap = new Map<string, { model: string; provider: string; cost: number; tokens: number; count: number }>();
        const byDayMap = new Map<string, number>();
        
        logs.forEach(log => {
            const cost = Number(log.cost_usd);
            const tokens = log.total_tokens || 0;
            
            totalCost += cost;
            totalTokens += tokens;
            
            if (log.usage_type === 'call') {
                totalCalls++;
                totalMinutes += (log.duration_seconds || 0) / 60;
            }
            
            // By model
            const modelKey = `${log.provider}:${log.model}`;
            const existing = byModelMap.get(modelKey) || { model: log.model, provider: log.provider, cost: 0, tokens: 0, count: 0 };
            existing.cost += cost;
            existing.tokens += tokens;
            existing.count++;
            byModelMap.set(modelKey, existing);
            
            // By day
            const day = new Date(log.created_at).toISOString().split('T')[0];
            byDayMap.set(day, (byDayMap.get(day) || 0) + cost);
        });
        
        return {
            totalCost: Math.round(totalCost * 100) / 100,
            totalTokens,
            totalCalls,
            totalMinutes: Math.round(totalMinutes * 100) / 100,
            byModel: Array.from(byModelMap.values()).sort((a, b) => b.cost - a.cost),
            byDay: Array.from(byDayMap.entries())
                .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
                .sort((a, b) => a.date.localeCompare(b.date))
        };
    } catch (error) {
        console.error('Error fetching usage summary:', error);
        return {
            totalCost: 0,
            totalTokens: 0,
            totalCalls: 0,
            totalMinutes: 0,
            byModel: [],
            byDay: []
        };
    }
};

/**
 * Deduct credits manually
 */
export const deductCredits = async (amount: number, description: string): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await (supabase.rpc as any)('deduct_credits', {
            p_user_id: user.id,
            p_amount: amount,
            p_usage_log_id: null,
            p_description: description
        });

        if (error) throw error;

        return {
            success: data?.success || false,
            newBalance: data?.new_balance,
            error: data?.error
        };
    } catch (error: any) {
        console.error('Error deducting credits:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Add credits (for purchases, bonuses, etc.)
 */
export const addCredits = async (
    amount: number,
    transactionType: 'purchase' | 'bonus' | 'referral' = 'purchase',
    description: string = 'Credit added'
): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await (supabase.rpc as any)('add_credits', {
            p_user_id: user.id,
            p_amount: amount,
            p_transaction_type: transactionType,
            p_reference_id: null,
            p_description: description
        });

        if (error) throw error;

        return {
            success: data?.success || false,
            newBalance: data?.new_balance,
            error: data?.error
        };
    } catch (error: any) {
        console.error('Error adding credits:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if user has sufficient balance
 */
export const checkBalance = async (requiredAmount: number): Promise<{ sufficient: boolean; balance: number }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { sufficient: false, balance: 0 };

        const { data, error } = await supabase
            .from('user_profiles')
            .select('credits_balance')
            .eq('user_id', user.id)
            .single() as { data: { credits_balance: string } | null; error: any };

        if (error) throw error;

        const balance = Number(data?.credits_balance) || 0;
        return { sufficient: balance >= requiredAmount, balance };
    } catch (error) {
        console.error('Error checking balance:', error);
        return { sufficient: false, balance: 0 };
    }
};

interface TodayUsageLogRow {
    cost_usd: string;
    total_tokens: number;
    usage_type: string;
}

/**
 * Get today's usage
 */
export const getTodayUsage = async (): Promise<{ cost: number; tokens: number; calls: number }> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data, error } = await supabase
            .from('usage_logs')
            .select('cost_usd, total_tokens, usage_type')
            .gte('created_at', today.toISOString()) as { data: TodayUsageLogRow[] | null; error: any };

        if (error) throw error;

        let cost = 0;
        let tokens = 0;
        let calls = 0;

        (data || []).forEach(log => {
            cost += Number(log.cost_usd);
            tokens += log.total_tokens || 0;
            if (log.usage_type === 'call') calls++;
        });

        return { cost: Math.round(cost * 100) / 100, tokens, calls };
    } catch (error) {
        console.error('Error fetching today usage:', error);
        return { cost: 0, tokens: 0, calls: 0 };
    }
};
