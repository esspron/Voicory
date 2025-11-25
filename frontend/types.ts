
export interface Metric {
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: any;
}

// ============================================
// VOICE TYPES
// ============================================

export interface Voice {
    id: string;
    name: string;
    description?: string;
    gender: 'Male' | 'Female' | 'Neutral';
    
    // ElevenLabs reference (for actual TTS during calls)
    elevenlabsVoiceId: string;
    elevenlabsModelId: string;
    
    // Categorization
    accent: string;
    primaryLanguage: string;
    supportedLanguages: string[];
    tags: string[];
    
    // Voice settings defaults
    defaultStability: number;
    defaultSimilarity: number;
    defaultStyle: number;
    
    // Pricing (INR per minute)
    costPerMin: number;
    
    // Status
    isActive: boolean;
    isFeatured: boolean;
    isPremium: boolean;
    displayOrder: number;
    
    // Audio preview URL from ElevenLabs
    previewUrl?: string;
    
    // Timestamps
    createdAt?: string;
    updatedAt?: string;
    
    // Joined data (optional)
    samples?: VoiceSample[];
}

export interface VoiceSample {
    id: string;
    voiceId: string;
    language: string;
    sampleText?: string;
    audioUrl: string;
    durationSeconds?: number;
    createdAt?: string;
}

// Voice with samples loaded
export interface VoiceWithSamples extends Voice {
    samples: VoiceSample[];
}

export interface Assistant {
    id: string;
    name: string;
    model: string;
    voiceId?: string;
    transcriber: string;
    createdAt: string;
    updatedAt?: string;
    status: 'active' | 'inactive' | 'draft';
    
    // Agent Configuration
    systemPrompt?: string;
    firstMessage?: string;
    
    // Voice Settings
    elevenlabsModelId?: string;  // 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5'
    language?: string;           // ISO language code (en, hi, ta, etc.)
    
    // LLM Settings
    llmProvider?: string;        // 'openai' | 'anthropic' | 'groq' | 'together'
    llmModel?: string;           // e.g. 'gpt-4o', 'claude-3.5-sonnet', etc.
    temperature?: number;        // 0.0 to 1.0
    maxTokens?: number;
    
    // Behavior Settings
    interruptible?: boolean;
    useDefaultPersonality?: boolean;
    
    // RAG Settings
    ragEnabled?: boolean;
    ragSimilarityThreshold?: number;
    ragMaxResults?: number;
    ragInstructions?: string;
    knowledgeBaseIds?: string[];
    
    // Memory Settings (Customer Memory System)
    memoryEnabled?: boolean;
    memoryConfig?: MemoryConfig;
}

// Input type for creating/updating assistants
export interface AssistantInput {
    name: string;
    systemPrompt?: string;
    firstMessage?: string;
    voiceId?: string;
    elevenlabsModelId?: string;
    language?: string;
    llmProvider?: string;
    llmModel?: string;
    temperature?: number;
    maxTokens?: number;
    interruptible?: boolean;
    useDefaultPersonality?: boolean;
    ragEnabled?: boolean;
    ragSimilarityThreshold?: number;
    ragMaxResults?: number;
    ragInstructions?: string;
    knowledgeBaseIds?: string[];
    memoryEnabled?: boolean;
    memoryConfig?: MemoryConfig;
    status?: 'active' | 'inactive' | 'draft';
}

export interface AssistantTool {
    id: string;
    assistantId: string;
    toolType: 'function' | 'webhook' | 'transfer' | 'dtmf' | 'end_call';
    name: string;
    description?: string;
    config: Record<string, any>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PhoneNumber {
    id: string;
    number: string;
    provider: 'Callyy' | 'CallyySIP' | 'Twilio' | 'Vonage' | 'Telnyx' | 'BYOSIP';
    assistantId?: string;
    label?: string;
    
    // Common fields
    inboundEnabled?: boolean;
    outboundEnabled?: boolean;
    isActive?: boolean;
    
    // Free Callyy Number fields
    areaCode?: string;
    
    // Free Callyy SIP fields
    sipIdentifier?: string;
    sipLabel?: string;
    sipUsername?: string;
    sipPassword?: string;
    
    // Twilio Import fields
    twilioPhoneNumber?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    smsEnabled?: boolean;
    
    // Vonage Import fields
    vonagePhoneNumber?: string;
    vonageApiKey?: string;
    vonageApiSecret?: string;
    
    // Telnyx Import fields
    telnyxPhoneNumber?: string;
    telnyxApiKey?: string;
    
    // BYO SIP Trunk fields
    sipTrunkPhoneNumber?: string;
    sipTrunkCredentialId?: string;
    allowNonE164?: boolean;
}

export interface SipTrunkCredential {
    id: string;
    name: string;
    sipTrunkUri: string;
    username?: string;
    password?: string;
    createdAt: string;
}

export interface ApiKey {
    id: string;
    label: string;
    key: string; // partial display
    type: 'public' | 'private';
    createdAt: string;
}

export interface CallLog {
    id: string;
    assistantName: string;
    phoneNumber: string;
    duration: string;
    cost: number;
    status: 'completed' | 'failed' | 'ongoing';
    date: string;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    variables: Record<string, string>; // Context variables for the bot
    createdAt: string;
    // Memory fields
    hasMemory?: boolean;
    lastInteraction?: string;
    interactionCount?: number;
}

// ============================================
// CUSTOMER MEMORY TYPES
// ============================================

export interface CustomerConversation {
    id: string;
    customerId: string;
    assistantId?: string;
    callLogId?: string;
    
    // Call metadata
    callDirection: 'inbound' | 'outbound';
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    
    // Transcript
    transcript: TranscriptMessage[];
    
    // AI Analysis
    summary?: string;
    keyPoints?: string[];
    sentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
    sentimentScore?: number;
    topicsDiscussed?: string[];
    
    // Action Items
    actionItems: ActionItem[];
    followUpRequired?: boolean;
    followUpDate?: string;
    followUpReason?: string;
    
    // Outcome
    outcome?: 'successful' | 'callback_requested' | 'not_interested' | 'wrong_number' | 'voicemail' | 'no_answer' | 'other';
    outcomeNotes?: string;
    
    createdAt: string;
    updatedAt?: string;
}

export interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface ActionItem {
    task: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
}

export interface CustomerMemory {
    id: string;
    customerId: string;
    
    // Relationship Overview
    totalConversations: number;
    totalCallDurationMinutes: number;
    firstContactDate?: string;
    lastContactDate?: string;
    averageSentiment?: number;
    
    // AI-Generated Profile
    personalityTraits?: string[];
    communicationPreferences?: {
        preferredTime?: string;
        preferredLanguage?: string;
        communicationStyle?: string;
    };
    interests?: string[];
    painPoints?: string[];
    
    // Important Information
    importantDates?: ImportantDate[];
    familyInfo?: Record<string, any>;
    professionalInfo?: {
        company?: string;
        role?: string;
        industry?: string;
    };
    
    // Preferences & History
    productInterests?: string[];
    pastPurchases?: PastPurchase[];
    objectionsRaised?: string[];
    
    // Engagement Metrics
    engagementScore: number;
    lifetimeValue?: number;
    churnRisk?: 'low' | 'medium' | 'high';
    
    // Summary
    executiveSummary?: string;
    conversationContext?: string;
    
    createdAt: string;
    updatedAt?: string;
}

export interface ImportantDate {
    date: string;
    description: string;
    type: 'birthday' | 'anniversary' | 'renewal' | 'custom';
}

export interface PastPurchase {
    product: string;
    date: string;
    amount: number;
}

export interface CustomerInsight {
    id: string;
    customerId: string;
    conversationId?: string;
    
    insightType: 'preference' | 'objection' | 'interest' | 'personal_info' | 'pain_point' | 'opportunity' | 'commitment' | 'feedback' | 'custom';
    category?: string;
    content: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    
    sourceQuote?: string;
    confidence?: number;
    
    isActive: boolean;
    verifiedByUser: boolean;
    
    extractedAt: string;
    createdAt: string;
}

export interface MemoryConfig {
    rememberConversations: boolean;
    extractInsights: boolean;
    trackSentiment: boolean;
    maxContextConversations: number;
    includeSummary: boolean;
    includeInsights: boolean;
    includeActionItems: boolean;
    autoGenerateSummary: boolean;
}

// Customer context returned by get_customer_context function
export interface CustomerContext {
    customer: {
        id: string;
        name: string;
        email: string;
        phone: string;
        variables: Record<string, string>;
    };
    memory?: {
        totalConversations: number;
        firstContact?: string;
        lastContact?: string;
        averageSentiment?: number;
        personalityTraits?: string[];
        interests?: string[];
        painPoints?: string[];
        engagementScore?: number;
        executiveSummary?: string;
        conversationContext?: string;
    };
    recentConversations: Array<{
        startedAt: string;
        summary?: string;
        keyPoints?: string[];
        sentiment?: string;
        outcome?: string;
        actionItems?: ActionItem[];
    }>;
    keyInsights: Array<{
        insightType: string;
        category?: string;
        content: string;
        importance: string;
    }>;
}

export interface UserProfile {
    id: string;
    userId: string;
    organizationName: string;
    organizationEmail: string;
    walletId: string;
    channel: string;
    callConcurrencyLimit: number;
    hipaaEnabled: boolean;
    creditsBalance: number;
    planType: 'PAYG' | 'Starter' | 'Pro' | 'Enterprise';
    createdAt: string;
    updatedAt: string;
}
