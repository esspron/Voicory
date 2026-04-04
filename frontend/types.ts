
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

export type TTSProvider = 'elevenlabs' | 'openai' | 'deepgram' | 'cartesia' | 'azure' | 'google';
export type LatencyTier = 'ultra-low' | 'low' | 'medium' | 'high';
export type QualityTier = 'standard' | 'premium' | 'ultra';
export type PricingTier = 'spark' | 'boost' | 'fusion';

export interface Voice {
    id: string;
    name: string;
    description?: string;
    gender: 'Male' | 'Female' | 'Neutral';
    
    // TTS Provider info (NEW - supports multiple providers)
    ttsProvider: TTSProvider;
    providerVoiceId?: string;    // Voice ID for the specific provider
    providerModel?: string;      // Model for the specific provider
    
    // Legacy ElevenLabs fields (kept for backward compatibility)
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
    
    // Performance tiers
    pricingTier?: PricingTier;
    latencyTier?: LatencyTier;
    qualityTier?: QualityTier;
    supportsStreaming?: boolean;
    
    // Audio preview URL
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
    title?: string;  // Short title/role (e.g., Sales Support, Customer Support)
    model: string;
    voiceId?: string;
    transcriber: string;
    createdAt: string;
    updatedAt?: string;
    status: 'active' | 'inactive' | 'draft';
    
    // Unified instruction (like Vapi, Retell, LiveKit)
    instruction?: string;
    
    // Voice Settings
    elevenlabsModelId?: string;  // 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5'
    language?: string;           // ISO language code (en, hi, ta, etc.) - DEPRECATED, use languageSettings
    
    // Language & Style Settings (NEW)
    languageSettings?: LanguageSettings;
    styleSettings?: StyleSettings;
    
    // Dynamic Variables (ElevenLabs-style personalization)
    dynamicVariables?: DynamicVariablesConfig;
    
    // LLM Settings
    llmProvider?: string;        // 'openai' | 'anthropic' | 'groq' | 'together'
    llmModel?: string;           // e.g. 'gpt-4o', 'claude-3.5-sonnet', etc.
    temperature?: number;        // 0.0 to 1.0
    maxTokens?: number;
    
    // Behavior Settings
    interruptible?: boolean;
    useDefaultPersonality?: boolean;
    timezone?: string;
    
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
    title?: string;  // Short title/role (e.g., Sales Support, Customer Support)
    // Unified instruction (like Vapi, Retell, LiveKit)
    instruction?: string;
    // Voice & Settings
    voiceId?: string;
    elevenlabsModelId?: string;
    language?: string;  // DEPRECATED, use languageSettings
    languageSettings?: LanguageSettings;
    styleSettings?: StyleSettings;
    dynamicVariables?: DynamicVariablesConfig;
    llmProvider?: string;
    llmModel?: string;
    temperature?: number;
    maxTokens?: number;
    interruptible?: boolean;
    useDefaultPersonality?: boolean;
    timezone?: string;
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
    provider: 'Voicory' | 'VoicorySIP' | 'Twilio' | 'Vonage' | 'Telnyx' | 'BYOSIP';
    assistantId?: string;
    label?: string;
    
    // Common fields
    inboundEnabled?: boolean;
    outboundEnabled?: boolean;
    isActive?: boolean;
    
    // Free Voicory Number fields
    areaCode?: string;
    
    // Free Voicory SIP fields
    sipIdentifier?: string;
    sipLabel?: string;
    sipUsername?: string;
    sipPassword?: string;
    
    // Twilio Import fields
    twilioPhoneNumber?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioPhoneSid?: string;  // Twilio Phone Number SID (PNxxxx)
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
    // CRM sync fields
    source?: string;
    crm_provider?: string;
    last_synced_at?: string;
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

// ============================================
// DYNAMIC VARIABLES (ElevenLabs-style personalization)
// ============================================

export type DynamicVariableType = 'string' | 'number' | 'boolean';

export interface DynamicVariable {
    name: string;                    // Variable name (without {{ }})
    type: DynamicVariableType;       // Variable type
    description?: string;            // Optional description
    placeholder?: string;            // Default/placeholder value for testing
    isSecret?: boolean;              // If true, not sent to LLM (for auth tokens, etc.)
}

// Static variable with actual value (for business info like hours, address, policies)
export interface StaticVariable {
    name: string;                    // Variable name (without {{ }})
    label: string;                   // Display label
    value: string;                   // The actual value
    category?: 'business' | 'policy' | 'contact' | 'custom';
}

// Common static variable templates
export const STATIC_VARIABLE_TEMPLATES: Omit<StaticVariable, 'value'>[] = [
    { name: 'business_hours', label: 'Business Hours', category: 'business' },
    { name: 'business_address', label: 'Business Address', category: 'contact' },
    { name: 'business_phone', label: 'Business Phone', category: 'contact' },
    { name: 'business_email', label: 'Business Email', category: 'contact' },
    { name: 'cancellation_policy', label: 'Cancellation Policy', category: 'policy' },
    { name: 'refund_policy', label: 'Refund Policy', category: 'policy' },
    { name: 'payment_methods', label: 'Payment Methods', category: 'business' },
    { name: 'service_area', label: 'Service Area', category: 'business' },
];

export interface DynamicVariablesConfig {
    variables: DynamicVariable[];    // Defined variables
    enableSystemVariables: boolean;  // Enable built-in system variables
    staticVariables: StaticVariable[]; // Static variables with values
}

// System variables that are automatically available
export const SYSTEM_VARIABLES: DynamicVariable[] = [
    { name: 'customer_name', type: 'string', description: "Customer's name from their profile" },
    { name: 'customer_phone', type: 'string', description: "Customer's phone number" },
    { name: 'customer_email', type: 'string', description: "Customer's email address" },
    { name: 'current_time', type: 'string', description: 'Current time in assistant timezone' },
    { name: 'current_date', type: 'string', description: 'Current date in assistant timezone' },
    { name: 'assistant_name', type: 'string', description: "The assistant's name" },
];

// Default configuration
export const DEFAULT_DYNAMIC_VARIABLES_CONFIG: DynamicVariablesConfig = {
    variables: [],
    enableSystemVariables: true,
    staticVariables: [],
};

// ============================================
// LANGUAGE & STYLE SETTINGS
// ============================================

export interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
    region?: string;
}

export interface LanguageSettings {
    default: string;              // ISO language code
    autoDetect: boolean;          // Auto-detect and remember per customer
    supported: string[];          // Additional supported languages
}

export type StyleMode = 'professional' | 'friendly' | 'concise' | 'adaptive';

export interface AdaptiveStyleConfig {
    mirrorFormality: boolean;     // Match formal ↔ casual tone
    mirrorLength: boolean;        // Match brief ↔ detailed responses
    mirrorVocabulary: boolean;    // Match simple ↔ complex vocabulary
}

export interface StyleSettings {
    mode: StyleMode;
    adaptiveConfig: AdaptiveStyleConfig;
}

// Default values
export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
    default: 'en',
    autoDetect: true,
    supported: [],
};

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveStyleConfig = {
    mirrorFormality: true,
    mirrorLength: true,
    mirrorVocabulary: true,
};

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
    mode: 'friendly',
    adaptiveConfig: DEFAULT_ADAPTIVE_CONFIG,
};

// All 28 supported languages (Multilingual v2)
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'US' },
    { code: 'en-GB', name: 'English (UK)', nativeName: 'English', flag: '🇬🇧', region: 'UK' },
    { code: 'en-AU', name: 'English (Australia)', nativeName: 'English', flag: '🇦🇺', region: 'Australia' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'India' },
    { code: 'hi-Latn', name: 'Hinglish', nativeName: 'Hinglish', flag: '🇮🇳', region: 'India' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'India' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'India' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', region: 'India' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', region: 'India' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', region: 'India' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'India' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', region: 'India' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'India' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Spain' },
    { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español', flag: '🇲🇽', region: 'Mexico' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'France' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'Germany' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'Italy' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'Portugal' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português', flag: '🇧🇷', region: 'Brazil' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'Netherlands' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'Poland' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'Russia' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'Japan' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'Korea' },
    { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文', flag: '🇨🇳', region: 'China' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Saudi Arabia' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'Turkey' },
];

// Style options with metadata
export const STYLE_OPTIONS: { mode: StyleMode; label: string; description: string; icon: string; color: string }[] = [
    { 
        mode: 'professional', 
        label: 'Professional', 
        description: 'Formal, polished, structured responses',
        icon: '💼',
        color: 'blue'
    },
    { 
        mode: 'friendly', 
        label: 'Friendly', 
        description: 'Warm, conversational, relaxed tone',
        icon: '😊',
        color: 'green'
    },
    { 
        mode: 'concise', 
        label: 'Concise', 
        description: 'Brief, direct, no unnecessary words',
        icon: '⚡',
        color: 'yellow'
    },
    { 
        mode: 'adaptive', 
        label: 'Adaptive', 
        description: 'AI mirrors customer\'s communication style',
        icon: '🪞',
        color: 'purple'
    },
];

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
    // Currency settings
    country: string;        // ISO country code (IN, US, GB, etc.)
    currency: string;       // Currency code (INR, USD, GBP, etc.)
    currencySymbol: string; // Symbol (₹, $, £, etc.)
    createdAt: string;
    updatedAt: string;
}

// ============================================
// WHATSAPP BUSINESS API TYPES
// ============================================

export interface WhatsAppConfig {
    id: string;
    userId: string;
    
    // WhatsApp Business Account Info
    wabaId: string;                    // WhatsApp Business Account ID
    phoneNumberId: string;             // Business Phone Number ID
    displayPhoneNumber: string;        // Formatted phone number for display
    displayName: string;               // Business display name
    
    // Facebook/Meta App Credentials
    accessToken: string;               // Encrypted access token
    appId?: string;                    // Facebook App ID
    
    // Webhook Configuration
    webhookVerifyToken: string;        // Token for webhook verification
    webhookUrl?: string;               // The configured webhook URL
    
    // Status
    status: 'pending' | 'connected' | 'disconnected' | 'error';
    qualityRating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    messagingLimit?: number;
    
    // Features Enabled
    callingEnabled: boolean;           // WhatsApp Calling enabled
    chatbotEnabled: boolean;           // Chatbot/Auto-reply enabled
    
    // Calling Settings
    callSettings?: WhatsAppCallSettings;
    
    // Chatbot Configuration
    assistantId?: string;              // Connected AI assistant for auto-replies
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
    lastSyncedAt?: string;
}

export interface WhatsAppCallSettings {
    inboundCallsEnabled: boolean;      // Accept incoming calls
    outboundCallsEnabled: boolean;     // Can make outbound calls
    businessHours?: BusinessHours;     // When calls are accepted
    callbackRequestEnabled: boolean;   // Allow users to request callback
    callPermissionTemplate?: string;   // Template for call permission request
}

export interface BusinessHours {
    timezone: string;
    schedule: {
        day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        enabled: boolean;
        startTime: string;  // HH:MM format
        endTime: string;    // HH:MM format
    }[];
}

export interface WhatsAppMessage {
    id: string;
    waMessageId: string;               // WhatsApp message ID
    configId: string;                  // Reference to WhatsAppConfig
    
    // Participants
    fromNumber: string;
    toNumber: string;
    direction: 'inbound' | 'outbound';
    
    // Message Content
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'template' | 'reaction';
    content: WhatsAppMessageContent;
    
    // Status
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
    errorCode?: string;
    errorMessage?: string;
    
    // Context (for replies)
    contextMessageId?: string;
    
    // AI Processing
    isFromBot: boolean;
    assistantId?: string;
    
    // Timestamps
    timestamp: string;
    deliveredAt?: string;
    readAt?: string;
    createdAt: string;
}

export interface WhatsAppMessageContent {
    // Text messages
    body?: string;
    previewUrl?: boolean;
    
    // Media messages
    mediaId?: string;
    mediaUrl?: string;
    mimeType?: string;
    caption?: string;
    filename?: string;
    
    // Location messages
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
    
    // Interactive messages
    interactive?: {
        type: 'list' | 'button' | 'product' | 'product_list' | 'flow' | 'cta_url';
        header?: any;
        body?: any;
        footer?: any;
        action?: any;
    };
    
    // Template messages
    template?: {
        name: string;
        language: { code: string };
        components?: any[];
    };
    
    // Reaction
    emoji?: string;
    reactToMessageId?: string;
}

export interface WhatsAppCall {
    id: string;
    waCallId: string;                  // WhatsApp call ID
    configId: string;                  // Reference to WhatsAppConfig
    
    // Participants
    fromNumber: string;
    toNumber: string;
    direction: 'inbound' | 'outbound';
    
    // Call Status
    status: 'ringing' | 'in_progress' | 'completed' | 'missed' | 'rejected' | 'busy' | 'failed';
    
    // Duration
    startedAt?: string;
    connectedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    
    // AI Integration
    handledByBot: boolean;
    assistantId?: string;
    transcript?: TranscriptMessage[];
    
    // Callback Request
    callbackRequested?: boolean;
    callbackScheduledAt?: string;
    
    // Timestamps
    createdAt: string;
    updatedAt?: string;
}

export interface WhatsAppContact {
    id: string;
    configId: string;
    
    // Contact Info
    waId: string;                      // WhatsApp ID (phone number)
    profileName?: string;              // WhatsApp profile name
    phoneNumber: string;
    
    // Customer Link
    customerId?: string;               // Link to Customer table
    
    // Conversation State
    isOptedIn: boolean;
    lastMessageAt?: string;
    conversationWindowOpen: boolean;   // 24-hour window status
    windowExpiresAt?: string;
    
    // Calling Permission
    callingPermissionGranted: boolean;
    callingPermissionRequestedAt?: string;
    
    // Stats
    totalMessages: number;
    totalCalls: number;
    
    // Timestamps
    createdAt: string;
    updatedAt?: string;
}

export interface WhatsAppTemplate {
    id: string;
    configId: string;
    
    // Template Info
    name: string;
    language: string;
    category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
    
    // Template Structure
    components: WhatsAppTemplateComponent[];
    
    // Meta Info
    qualityScore?: string;
    
    // Timestamps
    createdAt: string;
    updatedAt?: string;
}

export interface WhatsAppTemplateComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    example?: any;
    buttons?: {
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE' | 'FLOW';
        text: string;
        url?: string;
        phoneNumber?: string;
    }[];
}

// Input types for API calls
export interface SendWhatsAppMessageInput {
    configId: string;
    to: string;
    type: WhatsAppMessage['type'];
    content: Partial<WhatsAppMessageContent>;
    contextMessageId?: string;         // For reply messages
}

export interface InitiateWhatsAppCallInput {
    configId: string;
    to: string;
    assistantId?: string;              // Optional: Use AI assistant for the call
}

export interface WhatsAppWebhookPayload {
    object: string;
    entry: {
        id: string;
        changes: {
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: { name: string };
                    wa_id: string;
                }>;
                messages?: Array<any>;
                statuses?: Array<any>;
                calls?: Array<any>;
            };
            field: string;
        }[];
    }[];
}

// ============================================
// OUTBOUND DIALER TYPES
// ============================================

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignType = 'fsbo' | 'expired' | 'circle_prospecting' | 'followup' | 'general' | 'outbound_sales' | 'lead_qualification' | 'appointment_setting' | 'follow_up' | 'survey';
export type LeadStatus = 'pending' | 'queued' | 'calling' | 'completed' | 'failed' | 'dnc' | 'callback' | 'skipped';
export type LeadOutcome = 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'disconnected' | 'wrong_number' | 'callback_requested';
export type LeadDisposition = 'hot' | 'warm' | 'cold' | 'not_interested' | 'callback' | 'dnc' | 'appointment_set';

export interface OutboundCampaign {
    id: string;
    userId: string;
    assistantId?: string;
    phoneNumberId?: string;
    
    // Campaign basics
    name: string;
    description?: string;
    campaignType: CampaignType;
    status: CampaignStatus;
    
    // Scheduling
    startDate?: string;
    endDate?: string;
    callDays: number[];  // 0=Sunday, 6=Saturday
    callStartTime: string;  // HH:MM
    callEndTime: string;    // HH:MM
    timezone: string;
    
    // Pacing controls
    maxCallsPerHour: number;
    maxCallsPerDay: number;
    maxConcurrentCalls: number;
    
    // Retry settings
    maxAttempts: number;
    maxAttemptsPerLead?: number;
    retryDelayHours: number;
    retryDelayMinutes?: number;
    ringTimeoutSeconds: number;
    
    // Stats
    totalLeads: number;
    leadsPending: number;
    leadsCompleted: number;
    callsMade: number;
    callsAnswered: number;
    callsVoicemail: number;
    callsNoAnswer: number;
    callsFailed: number;
    appointmentsBooked: number;
    totalTalkTimeSeconds: number;
    
    // Timestamps
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
    
    // Joined data
    assistant?: { id: string; name: string };
    phoneNumber?: { id: string; number: string; label?: string };
}

export interface CampaignLead {
    id: string;
    campaignId: string;
    userId: string;
    
    // Contact info
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    
    // Real estate fields
    propertyAddress?: string;
    propertyCity?: string;
    propertyState?: string;
    propertyZip?: string;
    leadSource?: string;
    daysOnMarket?: number;
    listingPrice?: number;
    originalListDate?: string;
    expirationDate?: string;
    
    // Call status
    status: LeadStatus;
    callAttempts: number;
    lastCallAt?: string;
    nextCallAt?: string;
    
    // Outcome
    outcome?: LeadOutcome;
    disposition?: LeadDisposition;
    leadScore?: number;
    notes?: string;
    appointmentDate?: string;
    callbackDate?: string;
    
    // Custom fields
    customFields: Record<string, string>;
    importBatchId?: string;
    priority: number;
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
}

export interface CampaignCallLog {
    id: string;
    campaignId: string;
    leadId: string;
    userId: string;
    
    // Call info
    twilioCallSid?: string;
    fromNumber: string;
    toNumber: string;
    status: string;
    answeredBy?: string;
    
    // Timing
    initiatedAt: string;
    ringingAt?: string;
    answeredAt?: string;
    endedAt?: string;
    durationSeconds: number;
    
    // Outcome
    outcome?: LeadOutcome;
    disposition?: LeadDisposition;
    
    // Recording
    recordingUrl?: string;
    transcript?: string;
    transcriptSummary?: string;
    
    // AI analysis
    sentiment?: string;
    leadScore?: number;
    keyInsights?: string[];
    
    // Cost
    costUsd: number;
}

export interface UserDialerSettings {
    id?: string;
    userId?: string;
    concurrentCallSlots: number;
    defaultTimezone: string;
    defaultCallStartHour: number;
    defaultCallEndHour: number;
    defaultMaxAttempts: number;
    defaultRetryDelayHours: number;
    respectDnc: boolean;
    requireConsent: boolean;
    defaultCallerId?: string;
}

export interface CampaignInput {
    name: string;
    description?: string;
    campaignType?: CampaignType;
    assistantId?: string;
    phoneNumberId?: string;
    startDate?: string;
    endDate?: string;
    callDays?: number[];
    callStartTime?: string;
    callEndTime?: string;
    timezone?: string;
    maxCallsPerHour?: number;
    maxCallsPerDay?: number;
    maxConcurrentCalls?: number;
    maxAttempts?: number;
    maxAttemptsPerLead?: number;
    retryDelayHours?: number;
    retryDelayMinutes?: number;
    ringTimeoutSeconds?: number;
}

export interface LeadInput {
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    propertyAddress?: string;
    propertyCity?: string;
    propertyState?: string;
    propertyZip?: string;
    leadSource?: string;
    daysOnMarket?: number;
    listingPrice?: number;
    notes?: string;
    customFields?: Record<string, string>;
    priority?: number;
}

export interface LeadImportResult {
    total: number;
    imported: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
    batchId: string;
}

export interface CampaignStats {
    totalLeads: number;
    leadsPending: number;
    leadsCompleted: number;
    callsMade: number;
    callsAnswered: number;
    callsVoicemail: number;
    callsNoAnswer: number;
    callsFailed: number;
    appointmentsBooked: number;
    totalTalkTimeSeconds: number;
    answerRate: string;
    appointmentRate: string;
    dispositionBreakdown: Record<string, number>;
    averageLeadScore: string;
}

export interface DialerStatus {
    isRunning: boolean;
    callsMade?: number;
    startedAt?: string;
    queueLength?: number;
    activeCalls?: number;
    isInitialized?: boolean;
}

export interface DNCEntry {
    id: string;
    phoneNumber: string;
    reason?: string;
    source: string;
    addedAt: string;
}

// ============================================
// LEAD SCORING TYPES
// ============================================

export type LeadTimeline = 'immediate' | '1-3months' | '3-6months' | '6months+' | 'unknown';
export type LeadMotivation = 'high' | 'medium' | 'low' | 'unknown';
export type LeadInterestLevel = 'yes' | 'maybe' | 'no' | 'unknown';
export type LeadGrade = 'hot' | 'warm' | 'cold' | 'unscored';
export type RecommendedAction = 
    | 'call_immediately' 
    | 'schedule_followup' 
    | 'send_information' 
    | 'add_to_nurture' 
    | 'mark_not_interested'
    | 'book_appointment';
export type ScoreSource = 'ai' | 'manual' | 'rules';

export interface LeadScoreBreakdown {
    timeline: number;
    motivation: number;
    priceAlignment: number;
    preApproved: number;
    mustSell: number;
    appointmentBooked: number;
}

export interface AIQualificationAnalysis {
    timeline: LeadTimeline;
    motivation: LeadMotivation;
    priceAlignment: boolean;
    preApproved: boolean;
    mustSell: boolean;
    appointmentBooked: boolean;
    interestLevel: LeadInterestLevel;
    objections: string[];
    lifeEvents: string[];
    keyInsights: string;
    recommendedAction: RecommendedAction;
    recommendedActionReason: string;
    confidence: number;
}

export interface LeadScore {
    id: string;
    leadId: string;
    callId?: string;
    userId: string;
    
    // Overall score
    overallScore: number;
    
    // Timeline
    timeline: LeadTimeline;
    timelineScore: number;
    
    // Motivation
    motivation: LeadMotivation;
    motivationScore: number;
    
    // Boolean factors
    priceAlignment: boolean;
    priceAlignmentScore: number;
    
    preApproved: boolean;
    preApprovedScore: number;
    
    mustSell: boolean;
    mustSellScore: number;
    
    appointmentBooked: boolean;
    appointmentBookedScore: number;
    
    // AI insights
    objections: string[];
    keyInsights: string;
    lifeEvents: string[];
    interestLevel: LeadInterestLevel;
    
    // Recommended action
    recommendedAction: RecommendedAction;
    recommendedActionReason: string;
    
    // Full AI analysis
    aiAnalysis: AIQualificationAnalysis;
    aiConfidence: number;
    
    // Metadata
    scoreSource: ScoreSource;
    transcriptHash?: string;
    scoringVersion: string;
    processingTimeMs?: number;
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
}

export interface LeadScoringRules {
    id?: string;
    userId?: string;
    name: string;
    description?: string;
    
    // Scoring weights
    timelineWeights: Record<LeadTimeline, number>;
    motivationWeights: Record<LeadMotivation, number>;
    priceAlignmentWeight: number;
    preApprovedWeight: number;
    mustSellWeight: number;
    appointmentBookedWeight: number;
    
    // Thresholds
    hotLeadThreshold: number;
    warmLeadThreshold: number;
    
    isActive: boolean;
    isDefault?: boolean;
    
    createdAt?: string;
    updatedAt?: string;
}

export interface CampaignScoreSummary {
    totalLeads: number;
    scoredLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    averageScore: number | null;
    scoreDistribution: {
        '0-20': number;
        '21-40': number;
        '41-60': number;
        '61-80': number;
        '81-100': number;
    };
}

export interface ScoreLeadResult {
    success: boolean;
    skipped?: boolean;
    scoreId?: string;
    score?: number;
    grade?: LeadGrade;
    breakdown?: LeadScoreBreakdown;
    analysis?: AIQualificationAnalysis;
    processingTimeMs?: number;
    message?: string;
    existingScoreId?: string;
}

export interface BatchScoreResult {
    total: number;
    scored: number;
    skipped: number;
    errors: Array<{ leadId: string; error: string }>;
}

export interface ScoringWeightsInfo {
    weights: {
        timeline: Record<LeadTimeline, number>;
        motivation: Record<LeadMotivation, number>;
        priceAlignment: number;
        preApproved: number;
        mustSell: number;
        appointmentBooked: number;
    };
    thresholds: {
        hot: number;
        warm: number;
    };
    maxPossibleScore: number;
    categories: Record<string, {
        description: string;
        maxScore: number;
        options?: Array<{ value: string; score: number; label: string }>;
    }>;
}
