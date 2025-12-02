import { z } from 'zod';

// ============================================
// VOICE SCHEMAS
// ============================================

export const VoiceSampleSchema = z.object({
    id: z.string(),
    voiceId: z.string(),
    language: z.string(),
    sampleText: z.string().optional(),
    audioUrl: z.string(),
    durationSeconds: z.number().optional(),
    createdAt: z.string().optional(),
});

export const VoiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Neutral']),

    // Voice provider reference
    elevenlabsVoiceId: z.string(),
    elevenlabsModelId: z.string(),

    // Categorization
    accent: z.string(),
    primaryLanguage: z.string(),
    supportedLanguages: z.array(z.string()),
    tags: z.array(z.string()),

    // Voice settings defaults
    defaultStability: z.number(),
    defaultSimilarity: z.number(),
    defaultStyle: z.number(),

    // Pricing
    costPerMin: z.number(),

    // Status
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isPremium: z.boolean(),
    displayOrder: z.number(),

    // Audio preview URL
    previewUrl: z.string().optional(),

    // Timestamps
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),

    // Joined data
    samples: z.array(VoiceSampleSchema).optional(),
});

// ============================================
// ASSISTANT SCHEMAS
// ============================================

export const LanguageSettingsSchema = z.object({
    default: z.string(),
    autoDetect: z.boolean(),
    supported: z.array(z.string()),
});

export const AdaptiveStyleConfigSchema = z.object({
    mirrorFormality: z.boolean(),
    mirrorLength: z.boolean(),
    mirrorVocabulary: z.boolean(),
});

export const StyleSettingsSchema = z.object({
    mode: z.enum(['professional', 'friendly', 'concise', 'adaptive']),
    adaptiveConfig: AdaptiveStyleConfigSchema,
});

export const DynamicVariableSchema = z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean']),
    description: z.string().optional(),
    placeholder: z.string().optional(),
    isSecret: z.boolean().optional(),
});

export const StaticVariableSchema = z.object({
    name: z.string(),
    label: z.string(),
    value: z.string(),
    category: z.enum(['business', 'policy', 'contact', 'custom']).optional(),
});

export const DynamicVariablesConfigSchema = z.object({
    variables: z.array(DynamicVariableSchema),
    enableSystemVariables: z.boolean(),
    staticVariables: z.array(StaticVariableSchema),
});

export const MemoryConfigSchema = z.object({
    rememberConversations: z.boolean(),
    extractInsights: z.boolean(),
    trackSentiment: z.boolean(),
    maxContextConversations: z.number(),
    includeSummary: z.boolean(),
    includeInsights: z.boolean(),
    includeActionItems: z.boolean(),
    autoGenerateSummary: z.boolean(),
});

export const AssistantSchema = z.object({
    id: z.string(),
    name: z.string(),
    model: z.string(),
    voiceId: z.string().optional(),
    transcriber: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    status: z.enum(['active', 'inactive', 'draft']),

    // Inbound Call Configuration
    systemPrompt: z.string().optional(),
    firstMessage: z.string().optional(),

    // Outbound Call Configuration
    outboundSystemPrompt: z.string().optional(),
    outboundFirstMessage: z.string().optional(),

    // Messaging Configuration
    messagingSystemPrompt: z.string().optional(),
    messagingFirstMessage: z.string().optional(),

    // Voice Settings
    elevenlabsModelId: z.string().optional(),
    language: z.string().optional(),

    // Language & Style Settings
    languageSettings: LanguageSettingsSchema.optional(),
    styleSettings: StyleSettingsSchema.optional(),

    // Dynamic Variables
    dynamicVariables: DynamicVariablesConfigSchema.optional(),

    // LLM Settings
    llmProvider: z.string().optional(),
    llmModel: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),

    // Behavior Settings
    interruptible: z.boolean().optional(),
    useDefaultPersonality: z.boolean().optional(),
    timezone: z.string().optional(),

    // RAG Settings
    ragEnabled: z.boolean().optional(),
    ragSimilarityThreshold: z.number().optional(),
    ragMaxResults: z.number().optional(),
    ragInstructions: z.string().optional(),
    knowledgeBaseIds: z.array(z.string()).optional(),

    // Memory Settings
    memoryEnabled: z.boolean().optional(),
    memoryConfig: MemoryConfigSchema.optional(),
});

// ============================================
// CALL LOG SCHEMAS
// ============================================

export const CallLogSchema = z.object({
    id: z.string(),
    assistantName: z.string(),
    phoneNumber: z.string(),
    duration: z.string(),
    cost: z.number(),
    status: z.enum(['completed', 'failed', 'ongoing']),
    date: z.string(),
});
