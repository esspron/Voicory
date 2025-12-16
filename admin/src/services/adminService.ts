/**
 * Admin Service - Production-grade data fetching for admin dashboard
 * 
 * Security considerations:
 * - All queries are read-only from frontend (mutations via backend API)
 * - Service key should be used for admin operations (via backend)
 * - RLS is bypassed for admin reads via service role in backend
 */

import { supabase, BACKEND_URL } from './supabase';
import type {
    AdminUser,
    Transaction,
    PaymentTransaction,
    UsageLog,
    AdminAssistant,
    AdminVoice,
    LLMPricing,
    AdminCoupon,
    ReferralCode,
    ReferralReward,
    AdminWhatsAppConfig,
    AdminPhoneNumber,
    DashboardStats,
} from '../types/admin.types';

// ============ Dashboard Stats ============

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Parallel fetch all stats
    const [
        { count: totalUsers },
        { count: newUsersToday },
        { count: newUsersWeek },
        { data: profiles },
        { data: transactions },
        { data: usageLogs },
        { count: totalAssistants },
        { count: activeAssistants },
        { count: totalPhoneNumbers },
    ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('user_profiles').select('credits_balance'),
        supabase.from('credit_transactions').select('amount, transaction_type, created_at').eq('transaction_type', 'purchase'),
        supabase.from('usage_logs').select('usage_type, duration_seconds, cost_usd, created_at'),
        supabase.from('assistants').select('*', { count: 'exact', head: true }),
        supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('phone_numbers').select('*', { count: 'exact', head: true }),
    ]);

    // Calculate revenue
    const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const revenueToday = transactions?.filter(t => t.created_at >= todayStart).reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const revenueThisMonth = transactions?.filter(t => t.created_at >= monthStart).reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Calculate usage
    const callLogs = usageLogs?.filter(u => u.usage_type === 'call') || [];
    const totalCallMinutes = callLogs.reduce((sum, u) => sum + Math.ceil((u.duration_seconds || 0) / 60), 0);
    const callMinutesToday = callLogs.filter(u => u.created_at >= todayStart).reduce((sum, u) => sum + Math.ceil((u.duration_seconds || 0) / 60), 0);

    // Calculate messages from WhatsApp
    const { count: totalMessages } = await supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true });
    const { count: messagesToday } = await supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);

    // Credits balance
    const totalCreditsBalance = profiles?.reduce((sum, p) => sum + Number(p.credits_balance || 0), 0) || 0;

    return {
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersWeek || 0,
        activeUsersToday: 0, // Would need login tracking
        totalRevenue,
        revenueToday,
        revenueThisMonth,
        totalCreditsBalance,
        totalCallMinutes,
        callMinutesToday,
        totalMessages: totalMessages || 0,
        messagesToday: messagesToday || 0,
        totalAssistants: totalAssistants || 0,
        activeAssistants: activeAssistants || 0,
        totalPhoneNumbers: totalPhoneNumbers || 0,
        avgRevenuePerUser: totalUsers ? totalRevenue / totalUsers : 0,
    };
};

// ============ Users ============

interface FetchUsersParams {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const fetchUsers = async ({
    page,
    limit,
    search,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc',
}: FetchUsersParams): Promise<{ users: AdminUser[]; total: number }> => {
    let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });

    if (search) {
        query = query.or(`organization_email.ilike.%${search}%,organization_name.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
        query = query.eq('plan_type', status);
    }

    query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    // Get additional stats for each user
    const userIds = data?.map(u => u.user_id) || [];
    
    const [assistantsData, phoneData, transactionsData] = await Promise.all([
        supabase.from('assistants').select('user_id').in('user_id', userIds),
        supabase.from('phone_numbers').select('user_id').in('user_id', userIds),
        supabase.from('credit_transactions').select('user_id, amount, transaction_type').in('user_id', userIds),
    ]);

    // Count per user
    const assistantCounts = new Map<string, number>();
    assistantsData.data?.forEach(a => {
        assistantCounts.set(a.user_id, (assistantCounts.get(a.user_id) || 0) + 1);
    });

    const phoneCounts = new Map<string, number>();
    phoneData.data?.forEach(p => {
        phoneCounts.set(p.user_id, (phoneCounts.get(p.user_id) || 0) + 1);
    });

    const spentByUser = new Map<string, number>();
    transactionsData.data?.forEach(t => {
        if (t.transaction_type === 'purchase') {
            spentByUser.set(t.user_id, (spentByUser.get(t.user_id) || 0) + Number(t.amount));
        }
    });

    const users: AdminUser[] = (data || []).map(u => ({
        id: u.user_id,
        email: u.organization_email || '',
        created_at: u.created_at,
        last_sign_in_at: null,
        organization_name: u.organization_name,
        plan_type: u.plan_type || 'PAYG',
        credits_balance: Number(u.credits_balance) || 0,
        total_spent: spentByUser.get(u.user_id) || 0,
        total_calls: 0,
        total_messages: 0,
        assistants_count: assistantCounts.get(u.user_id) || 0,
        phone_numbers_count: phoneCounts.get(u.user_id) || 0,
        status: 'active',
        country: u.country,
        currency: u.currency,
    }));

    return { users, total: count || 0 };
};

export const fetchUserDetail = async (userId: string) => {
    const [
        { data: profile },
        { data: transactions },
        { data: assistants },
        { data: usageLogs },
    ] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('credit_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('assistants').select('id, name, status, created_at').eq('user_id', userId),
        supabase.from('usage_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);

    return { profile, transactions, assistants, usageLogs };
};

// ============ Transactions ============

export const fetchTransactions = async ({
    page,
    limit,
    type,
    dateFrom,
    dateTo,
}: {
    page: number;
    limit: number;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<{ transactions: Transaction[]; total: number }> => {
    let query = supabase
        .from('credit_transactions')
        .select(`
            *,
            user_profiles!credit_transactions_user_id_fkey(organization_email)
        `, { count: 'exact' });

    if (type && type !== 'all') {
        query = query.eq('transaction_type', type);
    }

    if (dateFrom) {
        query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
        query = query.lte('created_at', dateTo);
    }

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    const transactions: Transaction[] = (data || []).map(t => ({
        id: t.id,
        user_id: t.user_id,
        user_email: t.user_profiles?.organization_email || 'Unknown',
        transaction_type: t.transaction_type,
        amount: Number(t.amount),
        balance_before: Number(t.balance_before),
        balance_after: Number(t.balance_after),
        description: t.description || '',
        reference_type: t.reference_type,
        reference_id: t.reference_id,
        created_at: t.created_at,
    }));

    return { transactions, total: count || 0 };
};

// ============ Usage Logs ============

export const fetchUsageLogs = async ({
    page,
    limit,
    usageType,
    dateFrom,
    dateTo,
}: {
    page: number;
    limit: number;
    usageType?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<{ logs: UsageLog[]; total: number }> => {
    let query = supabase
        .from('usage_logs')
        .select(`
            *,
            user_profiles!usage_logs_user_id_fkey(organization_email),
            assistants!usage_logs_assistant_id_fkey(name)
        `, { count: 'exact' });

    if (usageType && usageType !== 'all') {
        query = query.eq('usage_type', usageType);
    }

    if (dateFrom) {
        query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
        query = query.lte('created_at', dateTo);
    }

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    const logs: UsageLog[] = (data || []).map(u => ({
        id: u.id,
        user_id: u.user_id,
        user_email: u.user_profiles?.organization_email,
        assistant_id: u.assistant_id,
        assistant_name: u.assistants?.name,
        usage_type: u.usage_type,
        provider: u.provider,
        model: u.model,
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        total_tokens: u.total_tokens,
        duration_seconds: u.duration_seconds,
        cost_usd: Number(u.cost_usd),
        created_at: u.created_at,
    }));

    return { logs, total: count || 0 };
};

export const fetchUsageStats = async () => {
    const { data } = await supabase
        .from('usage_logs')
        .select('usage_type, cost_usd, input_tokens, output_tokens, duration_seconds');

    const stats = {
        llm: { count: 0, cost: 0, tokens: 0 },
        tts: { count: 0, cost: 0, duration: 0 },
        stt: { count: 0, cost: 0, duration: 0 },
        call: { count: 0, cost: 0, minutes: 0 },
    };

    data?.forEach(u => {
        const type = u.usage_type as keyof typeof stats;
        if (stats[type]) {
            stats[type].count += 1;
            stats[type].cost += Number(u.cost_usd) || 0;
            if (type === 'llm') {
                stats.llm.tokens += (u.input_tokens || 0) + (u.output_tokens || 0);
            } else if (type === 'call') {
                stats.call.minutes += Math.ceil((u.duration_seconds || 0) / 60);
            } else {
                (stats[type] as any).duration += u.duration_seconds || 0;
            }
        }
    });

    return stats;
};

// ============ Assistants ============

export const fetchAssistants = async ({
    page,
    limit,
    search,
    status,
}: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
}): Promise<{ assistants: AdminAssistant[]; total: number }> => {
    let query = supabase
        .from('assistants')
        .select(`
            *,
            user_profiles!assistants_user_id_fkey(organization_email)
        `, { count: 'exact' });

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    // Get usage stats per assistant
    const assistantIds = data?.map(a => a.id) || [];
    const { data: usageData } = await supabase
        .from('usage_logs')
        .select('assistant_id, cost_usd')
        .in('assistant_id', assistantIds);

    const usageByAssistant = new Map<string, { calls: number; cost: number }>();
    usageData?.forEach(u => {
        const stats = usageByAssistant.get(u.assistant_id) || { calls: 0, cost: 0 };
        stats.calls += 1;
        stats.cost += Number(u.cost_usd) || 0;
        usageByAssistant.set(u.assistant_id, stats);
    });

    const assistants: AdminAssistant[] = (data || []).map(a => ({
        id: a.id,
        user_id: a.user_id,
        user_email: a.user_profiles?.organization_email || 'Unknown',
        name: a.name,
        model: a.model,
        llm_provider: a.llm_provider || 'openai',
        llm_model: a.llm_model || 'gpt-4o',
        status: a.status || 'active',
        total_calls: usageByAssistant.get(a.id)?.calls || 0,
        total_messages: 0,
        total_cost: usageByAssistant.get(a.id)?.cost || 0,
        created_at: a.created_at,
        updated_at: a.updated_at,
    }));

    return { assistants, total: count || 0 };
};

// ============ Voices ============

export const fetchVoices = async (): Promise<AdminVoice[]> => {
    const { data, error } = await supabase
        .from('voices')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) throw error;

    // Get usage count per voice
    const { data: assistantsData } = await supabase
        .from('assistants')
        .select('voice_id');

    const usageCount = new Map<string, number>();
    assistantsData?.forEach(a => {
        if (a.voice_id) {
            usageCount.set(a.voice_id, (usageCount.get(a.voice_id) || 0) + 1);
        }
    });

    return (data || []).map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        gender: v.gender,
        elevenlabs_voice_id: v.elevenlabs_voice_id,
        elevenlabs_model_id: v.elevenlabs_model_id,
        accent: v.accent,
        primary_language: v.primary_language,
        supported_languages: v.supported_languages,
        tags: v.tags,
        cost_per_min: Number(v.cost_per_min),
        is_active: v.is_active,
        is_featured: v.is_featured,
        is_premium: v.is_premium,
        display_order: v.display_order,
        preview_url: v.preview_url,
        usage_count: usageCount.get(v.id) || 0,
        created_at: v.created_at,
    }));
};

export const updateVoice = async (id: string, updates: Partial<AdminVoice>) => {
    const { error } = await supabase
        .from('voices')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) throw error;
};

// ============ LLM Pricing ============

export const fetchLLMPricing = async (): Promise<LLMPricing[]> => {
    const { data, error } = await supabase
        .from('llm_pricing')
        .select('*')
        .order('provider', { ascending: true });

    if (error) throw error;

    return (data || []).map(p => ({
        id: p.id,
        provider: p.provider,
        model: p.model,
        display_name: p.display_name,
        description: p.description,
        context_window: p.context_window,
        speed: p.speed,
        provider_input_cost_per_million: Number(p.provider_input_cost_per_million),
        provider_output_cost_per_million: Number(p.provider_output_cost_per_million),
        voicory_input_cost_per_million: Number(p.voicory_input_cost_per_million),
        voicory_output_cost_per_million: Number(p.voicory_output_cost_per_million),
        is_active: p.is_active,
    }));
};

export const updateLLMPricing = async (id: string, updates: Partial<LLMPricing>) => {
    const { error } = await supabase
        .from('llm_pricing')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) throw error;
};

// ============ Coupons ============

export const fetchCoupons = async (): Promise<AdminCoupon[]> => {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(c => ({
        id: c.id,
        code: c.code,
        coupon_type: c.coupon_type || 'discount',
        credit_amount: Number(c.credit_amount) || 0,
        discount_percent: Number(c.discount_percent) || 0,
        discount_amount: Number(c.discount_amount) || 0,
        max_discount: c.max_discount ? Number(c.max_discount) : undefined,
        min_purchase: c.min_purchase ? Number(c.min_purchase) : undefined,
        max_uses: c.max_uses,
        current_uses: c.current_uses || 0,
        valid_until: c.valid_until,
        new_user_only: c.new_user_only || false,
        auto_apply_on_signup: c.auto_apply_on_signup || false,
        is_active: c.is_active,
        description: c.description,
        created_at: c.created_at,
    }));
};

// ============ Referrals ============

export const fetchReferralCodes = async ({
    page,
    limit,
}: {
    page: number;
    limit: number;
}): Promise<{ codes: ReferralCode[]; total: number }> => {
    const { data, count, error } = await supabase
        .from('referral_codes')
        .select(`
            *,
            user_profiles!referral_codes_user_id_fkey(organization_email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    // Get reward stats
    const { data: rewardsData } = await supabase
        .from('referral_rewards')
        .select('referrer_id, reward_amount, status');

    const rewardsByUser = new Map<string, { count: number; total: number }>();
    rewardsData?.forEach(r => {
        const stats = rewardsByUser.get(r.referrer_id) || { count: 0, total: 0 };
        stats.count += 1;
        if (r.status === 'completed') {
            stats.total += Number(r.reward_amount) || 0;
        }
        rewardsByUser.set(r.referrer_id, stats);
    });

    const codes: ReferralCode[] = (data || []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        user_email: c.user_profiles?.organization_email || 'Unknown',
        code: c.code,
        custom_code: c.custom_code,
        is_active: c.is_active,
        total_referrals: rewardsByUser.get(c.user_id)?.count || 0,
        total_rewards: rewardsByUser.get(c.user_id)?.total || 0,
        created_at: c.created_at,
    }));

    return { codes, total: count || 0 };
};

export const fetchReferralRewards = async ({
    page,
    limit,
}: {
    page: number;
    limit: number;
}): Promise<{ rewards: ReferralReward[]; total: number }> => {
    const { data, count, error } = await supabase
        .from('referral_rewards')
        .select(`
            *,
            referrer:user_profiles!referral_rewards_referrer_id_fkey(organization_email),
            referred:user_profiles!referral_rewards_referred_id_fkey(organization_email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const rewards: ReferralReward[] = (data || []).map(r => ({
        id: r.id,
        referrer_id: r.referrer_id,
        referrer_email: r.referrer?.organization_email || 'Unknown',
        referred_id: r.referred_id,
        referred_email: r.referred?.organization_email || 'Unknown',
        reward_amount: Number(r.reward_amount) || 0,
        reward_type: r.reward_type || 'credits',
        status: r.status || 'pending',
        qualifying_purchase_amount: r.qualifying_purchase_amount ? Number(r.qualifying_purchase_amount) : undefined,
        completed_at: r.completed_at,
        created_at: r.created_at,
    }));

    return { rewards, total: count || 0 };
};

// ============ WhatsApp ============

export const fetchWhatsAppConfigs = async ({
    page,
    limit,
}: {
    page: number;
    limit: number;
}): Promise<{ configs: AdminWhatsAppConfig[]; total: number }> => {
    const { data, count, error } = await supabase
        .from('whatsapp_configs')
        .select(`
            *,
            user_profiles!whatsapp_configs_user_id_fkey(organization_email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    // Get message and call counts
    const configIds = data?.map(c => c.id) || [];
    
    const [messagesData, callsData] = await Promise.all([
        supabase.from('whatsapp_messages').select('config_id').in('config_id', configIds),
        supabase.from('whatsapp_calls').select('config_id').in('config_id', configIds),
    ]);

    const messageCounts = new Map<string, number>();
    messagesData.data?.forEach(m => {
        messageCounts.set(m.config_id, (messageCounts.get(m.config_id) || 0) + 1);
    });

    const callCounts = new Map<string, number>();
    callsData.data?.forEach(c => {
        callCounts.set(c.config_id, (callCounts.get(c.config_id) || 0) + 1);
    });

    const configs: AdminWhatsAppConfig[] = (data || []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        user_email: c.user_profiles?.organization_email || 'Unknown',
        waba_id: c.waba_id,
        phone_number_id: c.phone_number_id,
        display_phone_number: c.display_phone_number,
        display_name: c.display_name,
        status: c.status,
        quality_rating: c.quality_rating,
        messaging_limit: c.messaging_limit,
        chatbot_enabled: c.chatbot_enabled || false,
        calling_enabled: c.calling_enabled || false,
        total_messages: messageCounts.get(c.id) || 0,
        total_calls: callCounts.get(c.id) || 0,
        created_at: c.created_at,
    }));

    return { configs, total: count || 0 };
};

// ============ Phone Numbers ============

export const fetchPhoneNumbers = async ({
    page,
    limit,
}: {
    page: number;
    limit: number;
}): Promise<{ phoneNumbers: AdminPhoneNumber[]; total: number }> => {
    const { data, count, error } = await supabase
        .from('phone_numbers')
        .select(`
            *,
            user_profiles!phone_numbers_user_id_fkey(organization_email),
            assistants!phone_numbers_assistant_id_fkey(name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const phoneNumbers: AdminPhoneNumber[] = (data || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        user_email: p.user_profiles?.organization_email || 'Unknown',
        number: p.number,
        provider: p.provider,
        assistant_id: p.assistant_id,
        assistant_name: p.assistants?.name,
        label: p.label,
        inbound_enabled: p.inbound_enabled ?? true,
        outbound_enabled: p.outbound_enabled ?? false,
        is_active: p.is_active ?? true,
        total_calls: 0,
        created_at: p.created_at,
    }));

    return { phoneNumbers, total: count || 0 };
};

// ============ Revenue Analytics ============

export const fetchRevenueByDay = async (days: number = 30) => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
        .from('credit_transactions')
        .select('amount, created_at')
        .eq('transaction_type', 'purchase')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

    // Group by day
    const byDay = new Map<string, number>();
    data?.forEach(t => {
        const date = new Date(t.created_at).toISOString().split('T')[0];
        byDay.set(date, (byDay.get(date) || 0) + Number(t.amount));
    });

    // Fill in missing days
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        result.push({
            date,
            amount: byDay.get(date) || 0,
        });
    }

    return result;
};

// ============ Admin Actions (via Backend) ============

export const adminAdjustCredits = async (
    userId: string,
    amount: number,
    reason: string,
    adminPasskey: string
): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${BACKEND_URL}/api/admin/adjust-credits`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Passkey': adminPasskey,
        },
        body: JSON.stringify({ userId, amount, reason }),
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust credits');
    }

    return data;
};
