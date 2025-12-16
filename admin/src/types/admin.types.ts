// Admin Dashboard Types

// ============ User Management ============
export interface AdminUser {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    organization_name?: string;
    plan_type: 'PAYG' | 'Starter' | 'Pro' | 'Enterprise';
    credits_balance: number;
    total_spent: number;
    total_calls: number;
    total_messages: number;
    assistants_count: number;
    phone_numbers_count: number;
    status: 'active' | 'suspended' | 'banned';
    country?: string;
    currency?: string;
}

export interface UserActivity {
    id: string;
    user_id: string;
    activity_type: 'login' | 'call' | 'message' | 'payment' | 'assistant_created' | 'settings_changed';
    description: string;
    metadata?: Record<string, any>;
    created_at: string;
}

// ============ Revenue & Transactions ============
export interface Transaction {
    id: string;
    user_id: string;
    user_email: string;
    transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'referral';
    amount: number;
    balance_before: number;
    balance_after: number;
    description: string;
    reference_type?: string;
    reference_id?: string;
    created_at: string;
}

export interface PaymentTransaction {
    id: string;
    user_id: string;
    user_email: string;
    provider: 'stripe' | 'razorpay';
    provider_transaction_id: string;
    amount: number;
    currency: string;
    credits: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    created_at: string;
}

export interface RevenueMetrics {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    totalRevenue: number;
    averageTransactionValue: number;
}

export interface DailyRevenue {
    date: string;
    amount: number;
    transactions: number;
}

// ============ Usage Analytics ============
export interface UsageLog {
    id: string;
    user_id: string;
    user_email?: string;
    assistant_id?: string;
    assistant_name?: string;
    usage_type: 'llm' | 'tts' | 'stt' | 'call';
    provider: string;
    model: string;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    duration_seconds?: number;
    cost_usd: number;
    created_at: string;
}

export interface UsageMetrics {
    totalCalls: number;
    totalCallMinutes: number;
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    llmCost: number;
    ttsCost: number;
    sttCost: number;
    callCost: number;
}

export interface UsageByDay {
    date: string;
    calls: number;
    messages: number;
    tokens: number;
    cost: number;
}

// ============ Assistants ============
export interface AdminAssistant {
    id: string;
    user_id: string;
    user_email: string;
    name: string;
    model: string;
    llm_provider: string;
    llm_model: string;
    status: 'active' | 'inactive' | 'draft';
    total_calls: number;
    total_messages: number;
    total_cost: number;
    created_at: string;
    updated_at: string;
}

// ============ Phone Numbers ============
export interface AdminPhoneNumber {
    id: string;
    user_id: string;
    user_email: string;
    number: string;
    provider: 'Callyy' | 'CallyySIP' | 'Twilio' | 'Vonage' | 'Telnyx' | 'BYOSIP';
    assistant_id?: string;
    assistant_name?: string;
    label?: string;
    inbound_enabled: boolean;
    outbound_enabled: boolean;
    is_active: boolean;
    total_calls: number;
    created_at: string;
}

// ============ Voices ============
export interface AdminVoice {
    id: string;
    name: string;
    description?: string;
    gender: 'Male' | 'Female' | 'Neutral';
    elevenlabs_voice_id: string;
    elevenlabs_model_id?: string;
    accent?: string;
    primary_language?: string;
    supported_languages?: string[];
    tags?: string[];
    cost_per_min: number;
    is_active: boolean;
    is_featured: boolean;
    is_premium: boolean;
    display_order: number;
    preview_url?: string;
    usage_count: number;
    created_at: string;
}

// ============ LLM Pricing ============
export interface LLMPricing {
    id: string;
    provider: string;
    model: string;
    display_name: string;
    description?: string;
    context_window: string;
    speed: string;
    provider_input_cost_per_million: number;
    provider_output_cost_per_million: number;
    voicory_input_cost_per_million: number;
    voicory_output_cost_per_million: number;
    is_active: boolean;
    margin_percent?: number;
}

// ============ Coupons ============
export interface AdminCoupon {
    id: string;
    code: string;
    coupon_type: 'discount' | 'signup_bonus' | 'referral' | 'promo';
    credit_amount: number;
    discount_percent: number;
    discount_amount: number;
    max_discount?: number;
    min_purchase?: number;
    max_uses?: number;
    current_uses: number;
    valid_until: string;
    new_user_only: boolean;
    auto_apply_on_signup: boolean;
    is_active: boolean;
    description?: string;
    created_at: string;
}

// ============ Referrals ============
export interface ReferralCode {
    id: string;
    user_id: string;
    user_email: string;
    code: string;
    custom_code?: string;
    is_active: boolean;
    total_referrals: number;
    total_rewards: number;
    created_at: string;
}

export interface ReferralReward {
    id: string;
    referrer_id: string;
    referrer_email: string;
    referred_id: string;
    referred_email: string;
    reward_amount: number;
    reward_type: string;
    status: 'pending' | 'completed' | 'cancelled';
    qualifying_purchase_amount?: number;
    completed_at?: string;
    created_at: string;
}

// ============ WhatsApp ============
export interface AdminWhatsAppConfig {
    id: string;
    user_id: string;
    user_email: string;
    waba_id: string;
    phone_number_id: string;
    display_phone_number: string;
    display_name: string;
    status: 'pending' | 'connected' | 'disconnected' | 'error';
    quality_rating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    messaging_limit?: number;
    chatbot_enabled: boolean;
    calling_enabled: boolean;
    total_messages: number;
    total_calls: number;
    created_at: string;
}

// ============ System Logs ============
export interface SystemLog {
    id: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    service: 'api' | 'webhook' | 'call' | 'whatsapp' | 'payment' | 'auth';
    message: string;
    metadata?: Record<string, any>;
    user_id?: string;
    user_email?: string;
    created_at: string;
}

export interface AuditLog {
    id: string;
    admin_id: string;
    admin_email: string;
    action: string;
    target_type: 'user' | 'coupon' | 'voice' | 'pricing' | 'system';
    target_id?: string;
    changes?: Record<string, any>;
    ip_address?: string;
    created_at: string;
}

// ============ Dashboard Stats ============
export interface DashboardStats {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    activeUsersToday: number;
    totalRevenue: number;
    revenueToday: number;
    revenueThisMonth: number;
    totalCreditsBalance: number;
    totalCallMinutes: number;
    callMinutesToday: number;
    totalMessages: number;
    messagesToday: number;
    totalAssistants: number;
    activeAssistants: number;
    totalPhoneNumbers: number;
    avgRevenuePerUser: number;
    // Growth rates (calculated from comparisons)
    userGrowthRate?: number;      // % change vs previous period
    revenueGrowthRate?: number;   // % change vs previous period
}

export interface GrowthMetric {
    value: number;
    previousValue: number;
    percentChange: number;
    trend: 'up' | 'down' | 'neutral';
}

// ============ Charts Data ============
export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}

export interface TimeSeriesDataPoint {
    date: string;
    value: number;
}

// ============ Filters ============
export interface DateRangeFilter {
    startDate: string;
    endDate: string;
    preset?: 'today' | '7days' | '30days' | '90days' | 'thisMonth' | 'lastMonth' | 'custom';
}

export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FilterParams extends PaginationParams {
    search?: string;
    status?: string;
    type?: string;
    dateRange?: DateRangeFilter;
}
