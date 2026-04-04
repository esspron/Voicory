
import { Voice, VoiceSample, VoiceWithSamples, Assistant, AssistantInput, AssistantTool, PhoneNumber, ApiKey, CallLog, Customer, SipTrunkCredential, UserProfile, CustomerConversation, CustomerMemory, CustomerInsight, CustomerContext, MemoryConfig, ActionItem, TranscriptMessage } from '../types';

import { authFetch } from '../lib/api';
import { supabase } from './supabase';

// ============================================
// TWILIO PHONE NUMBER IMPORT
// ============================================

export interface TwilioImportResponse {
    success: boolean;
    phoneNumber?: PhoneNumber;
    webhookConfigured: boolean;
    webhookUrl?: string;
    capabilities?: {
        voice: boolean;
        sms: boolean;
        mms: boolean;
    };
    error?: string;
}

/**
 * Import a Twilio phone number with ownership verification
 * - Verifies user owns the number via Twilio API
 * - Stores credentials encrypted for outbound calls
 * - User manually configures webhook URL in Twilio Console
 */
export const importTwilioNumberDirect = async (params: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    label?: string;
    smsEnabled?: boolean;
}): Promise<TwilioImportResponse> => {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                success: false,
                webhookConfigured: false,
                error: 'User not authenticated'
            };
        }

        // Use import-direct endpoint (works on deployed backend)
        // The backend will verify ownership and store credentials
        const response = await authFetch('/api/twilio/import-direct', {
            method: 'POST',
            body: JSON.stringify({
                accountSid: params.accountSid,
                authToken: params.authToken,
                phoneNumber: params.phoneNumber,
                label: params.label || 'Twilio Number',
                smsEnabled: false
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return {
                success: false,
                webhookConfigured: false,
                error: data.error || 'Failed to import Twilio number'
            };
        }

        // Map snake_case from backend to camelCase for frontend
        const phoneNumber: PhoneNumber = {
            id: data.phoneNumber.id,
            number: data.phoneNumber.number,
            provider: data.phoneNumber.provider,
            assistantId: data.phoneNumber.assistant_id || undefined,
            label: data.phoneNumber.label || undefined,
            inboundEnabled: data.phoneNumber.inbound_enabled ?? true,
            outboundEnabled: data.phoneNumber.outbound_enabled ?? true,
            isActive: data.phoneNumber.is_active ?? true,
            twilioPhoneNumber: data.phoneNumber.twilio_phone_number || undefined,
            twilioAccountSid: data.phoneNumber.twilio_account_sid || undefined,
            twilioPhoneSid: data.phoneNumber.twilio_phone_sid || undefined,
            smsEnabled: data.phoneNumber.sms_enabled ?? false
        };

        return {
            success: true,
            phoneNumber,
            webhookConfigured: false, // User configures manually
            capabilities: data.capabilities
        };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Network error while importing Twilio number';
        console.error('Error importing Twilio number:', error);
        return {
            success: false,
            webhookConfigured: false,
            error: errorMsg
        };
    }
};

/**
 * Manual webhook import - saves phone number to DB without calling Twilio API
 * User will manually configure the webhook URL in Twilio Console
 */
export const importPhoneNumberManual = async (params: {
    phoneNumber: string;
    provider: string;
    label?: string;
}): Promise<TwilioImportResponse> => {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                success: false,
                webhookConfigured: false,
                error: 'User not authenticated'
            };
        }

        // Normalize phone number
        let normalizedNumber = params.phoneNumber.replace(/[^\d+]/g, '');
        if (!normalizedNumber.startsWith('+')) {
            normalizedNumber = '+' + normalizedNumber;
        }

        // Validate E.164 format (+ followed by 7-15 digits)
        if (!/^\+[1-9]\d{6,14}$/.test(normalizedNumber)) {
            return {
                success: false,
                webhookConfigured: false,
                error: 'Invalid phone number format. Use E.164 format (e.g., +14155552671)'
            };
        }

        // Insert directly to database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: normalizedNumber,
                provider: params.provider || 'Twilio',
                label: params.label || 'Phone Number',
                twilio_phone_number: normalizedNumber,
                sms_enabled: false,
                inbound_enabled: true,
                outbound_enabled: true,
                is_active: true,
                user_id: user.id
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error saving phone number:', dbError);
            return {
                success: false,
                webhookConfigured: false,
                error: dbError.message || 'Failed to save phone number'
            };
        }

        // Map to PhoneNumber type
        const phoneNumber: PhoneNumber = {
            id: phoneNumberData.id,
            number: phoneNumberData.number,
            provider: phoneNumberData.provider as PhoneNumber['provider'],
            assistantId: phoneNumberData.assistant_id || undefined,
            label: phoneNumberData.label || undefined,
            inboundEnabled: phoneNumberData.inbound_enabled,
            outboundEnabled: phoneNumberData.outbound_enabled,
            isActive: phoneNumberData.is_active,
            twilioPhoneNumber: phoneNumberData.twilio_phone_number || undefined,
            smsEnabled: phoneNumberData.sms_enabled
        };

        return {
            success: true,
            phoneNumber,
            webhookConfigured: false, // User needs to configure manually
        };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to import phone number';
        console.error('Error importing phone number manually:', error);
        return {
            success: false,
            webhookConfigured: false,
            error: errorMsg
        };
    }
};

// ============================================
// VOICE LIBRARY FUNCTIONS
// ============================================

/**
 * Map database voice record to Voice type
 */
const mapVoiceFromDB = (v: any): Voice => ({
    id: v.id,
    name: v.name,
    description: v.description || undefined,
    gender: v.gender as Voice['gender'],
    
    // TTS Provider fields (NEW)
    ttsProvider: v.tts_provider || 'elevenlabs',
    providerVoiceId: v.provider_voice_id || undefined,
    providerModel: v.provider_model || undefined,
    
    // Legacy ElevenLabs fields
    elevenlabsVoiceId: v.elevenlabs_voice_id,
    elevenlabsModelId: v.elevenlabs_model_id || 'eleven_multilingual_v2',
    
    accent: v.accent,
    primaryLanguage: v.primary_language,
    supportedLanguages: v.supported_languages || [],
    tags: v.tags || [],
    defaultStability: Number(v.default_stability) || 0.5,
    defaultSimilarity: Number(v.default_similarity) || 0.75,
    defaultStyle: Number(v.default_style) || 0,
    costPerMin: Number(v.cost_per_min),
    isActive: v.is_active,
    isFeatured: v.is_featured,
    isPremium: v.is_premium || false,
    displayOrder: v.display_order || 0,
    
    // Performance tiers
    pricingTier: v.pricing_tier || 'fusion',
    latencyTier: v.latency_tier || 'low',
    qualityTier: v.quality_tier || 'premium',
    supportsStreaming: v.supports_streaming ?? true,
    
    previewUrl: v.preview_url || undefined,
    createdAt: v.created_at,
    updatedAt: v.updated_at
});

/**
 * Map database voice sample record to VoiceSample type
 */
const mapVoiceSampleFromDB = (s: any): VoiceSample => ({
    id: s.id,
    voiceId: s.voice_id,
    language: s.language,
    sampleText: s.sample_text || undefined,
    audioUrl: s.audio_url,
    durationSeconds: s.duration_seconds || undefined,
    createdAt: s.created_at
});

/**
 * Get all active voices from the library
 */
export const getVoices = async (): Promise<Voice[]> => {
    try {
        // Prefer backend API which returns DB voices + custom voices + fallback list
        const response = await authFetch('/api/voices');
        if (response.ok) {
            const data = await response.json();
            return (data.voices || []) as Voice[];
        }
        // Fallback: direct Supabase RPC
        const { data, error } = await supabase.rpc('get_all_voices');
        if (error) throw error;
        return (data || []).map(mapVoiceFromDB);
    } catch (error) {
        console.error('Error fetching voices:', error);
        throw error;
    }
};

/**
 * Generate a TTS preview for a voice
 * Returns a base64 data URI playable in an <audio> element
 */
export const previewVoice = async (
    voiceId: string,
    provider: 'elevenlabs' | 'openai' = 'elevenlabs',
    text?: string
): Promise<string> => {
    const response = await authFetch('/api/voices/preview', {
        method: 'POST',
        body: JSON.stringify({ voice_id: voiceId, provider, text }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Preview generation failed');
    }
    const data = await response.json();
    return data.audio_url as string;
};

/**
 * Assign a voice to an assistant
 */
export const assignVoiceToAssistant = async (
    voiceId: string,
    assistantId: string
): Promise<void> => {
    const response = await authFetch(`/api/voices/${voiceId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assistant_id: assistantId }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign voice');
    }
};

/**
 * Upload a custom voice for ElevenLabs cloning
 * Returns the newly created custom voice record
 */
export const uploadCustomVoice = async (
    file: File,
    name: string,
    description?: string,
    gender?: string
): Promise<{ id: string; name: string; elevenlabsVoiceId: string }> => {
    const token = await import('../lib/api').then(m => m.getAuthToken());
    const form = new FormData();
    form.append('file', file);
    form.append('name', name);
    if (description) form.append('description', description);
    if (gender) form.append('gender', gender);

    const { API } = await import('../lib/constants');
    const response = await fetch(`${API.BACKEND_URL}/api/voices/custom`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Custom voice upload failed');
    }
    const data = await response.json();
    return data.voice || { id: '', name, elevenlabsVoiceId: data.voice_id || '' };
};

/**
 * Get featured voices only
 */
export const getFeaturedVoices = async (): Promise<Voice[]> => {
    try {
        const { data, error } = await supabase
            .from('voices')
            .select('*')
            .eq('is_active', true)
            .eq('is_featured', true)
            .order('display_order', { ascending: true })
            .limit(6);

        if (error) throw error;

        return (data || []).map(mapVoiceFromDB);
    } catch (error) {
        console.error('Error fetching featured voices:', error);
        throw error;
    }
};

/**
 * Get a single voice by ID
 */
export const getVoice = async (id: string): Promise<Voice | null> => {
    try {
        const { data, error } = await supabase
            .from('voices')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return data ? mapVoiceFromDB(data) : null;
    } catch (error) {
        console.error('Error fetching voice:', error);
        return null;
    }
};

/**
 * Get voice samples for a specific voice
 */
export const getVoiceSamples = async (voiceId: string): Promise<VoiceSample[]> => {
    try {
        const { data, error } = await supabase
            .from('voice_samples')
            .select('*')
            .eq('voice_id', voiceId)
            .order('language', { ascending: true });

        if (error) throw error;

        return (data || []).map(mapVoiceSampleFromDB);
    } catch (error) {
        console.error('Error fetching voice samples:', error);
        return [];
    }
};

/**
 * Get a voice with all its language samples
 */
export const getVoiceWithSamples = async (voiceId: string): Promise<VoiceWithSamples | null> => {
    try {
        const { data, error } = await supabase
            .from('voices')
            .select(`
                *,
                voice_samples (*)
            `)
            .eq('id', voiceId)
            .single();

        if (error) throw error;

        if (!data) return null;

        const voice = mapVoiceFromDB(data);
        const samples = (data.voice_samples || []).map(mapVoiceSampleFromDB);

        return { ...voice, samples };
    } catch (error) {
        console.error('Error fetching voice with samples:', error);
        return null;
    }
};

/**
 * Get all voices with their samples (for library page)
 */
export const getVoicesWithSamples = async (): Promise<VoiceWithSamples[]> => {
    try {
        const { data, error } = await supabase
            .from('voices')
            .select(`
                *,
                voice_samples (*)
            `)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;

        return (data || []).map(v => {
            const voice = mapVoiceFromDB(v);
            const samples = (v.voice_samples || []).map(mapVoiceSampleFromDB);
            return { ...voice, samples };
        });
    } catch (error) {
        console.error('Error fetching voices with samples:', error);
        throw error;
    }
};

/**
 * Get unique languages from all voice samples (for filters)
 */
export const getAvailableLanguages = async (): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('voice_samples')
            .select('language')
            .order('language', { ascending: true });

        if (error) throw error;

        // Get unique languages
        const languages = [...new Set((data || []).map(s => s.language))];
        return languages;
    } catch (error) {
        console.error('Error fetching available languages:', error);
        return ['Hindi', 'English', 'Tamil']; // Fallback
    }
};

// ============================================
// SUPABASE PRODUCTION FUNCTIONS
// ============================================

/**
 * Map database assistant record to Assistant type
 */
const mapAssistantFromDB = (a: any): Assistant => ({
    id: a.id,
    name: a.name,
    title: a.title || undefined,
    model: a.model || a.llm_model || 'gpt-4o',
    voiceId: a.voice_id || undefined,
    transcriber: a.transcriber || 'deepgram',
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    status: a.status as Assistant['status'],
    // Unified instruction (like Vapi, Retell, LiveKit)
    instruction: a.instruction || undefined,
    elevenlabsModelId: a.elevenlabs_model_id || 'eleven_multilingual_v2',
    language: a.language || 'en',
    // Language & Style Settings (NEW)
    languageSettings: a.language_settings || {
        default: a.language || 'en',
        autoDetect: true,
        supported: []
    },
    styleSettings: a.style_settings || {
        mode: 'friendly',
        adaptiveConfig: {
            mirrorFormality: true,
            mirrorLength: true,
            mirrorVocabulary: true
        }
    },
    // Dynamic Variables (ElevenLabs-style personalization)
    dynamicVariables: a.dynamic_variables || {
        variables: [],
        enableSystemVariables: true
    },
    llmProvider: a.llm_provider || 'openai',
    llmModel: a.llm_model || 'gpt-4o',
    temperature: a.temperature !== undefined ? Number(a.temperature) : 0.7,
    maxTokens: a.max_tokens || 1024,
    interruptible: a.interruptible ?? true,
    useDefaultPersonality: a.use_default_personality ?? true,
    timezone: a.timezone || 'Asia/Kolkata',
    ragEnabled: a.rag_enabled ?? false,
    ragSimilarityThreshold: a.rag_similarity_threshold !== undefined ? Number(a.rag_similarity_threshold) : 0.7,
    ragMaxResults: a.rag_max_results || 5,
    ragInstructions: a.rag_instructions || undefined,
    knowledgeBaseIds: a.knowledge_base_ids || [],
    // Memory Settings
    memoryEnabled: a.memory_enabled ?? false,
    memoryConfig: a.memory_config || {
        rememberConversations: true,
        extractInsights: true,
        trackSentiment: true,
        maxContextConversations: 5,
        includeSummary: true,
        includeInsights: true,
        includeActionItems: true,
        autoGenerateSummary: true
    }
});

/**
 * Get a single assistant by ID from Supabase
 */
export const getAssistant = async (id: string): Promise<Assistant | undefined> => {
    try {
        const { data, error } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return data ? mapAssistantFromDB(data) : undefined;
    } catch (error) {
        console.error('Error fetching assistant from Supabase:', error);
        throw error;
    }
};

/**
 * Get all assistants from Supabase
 */
export const getAssistants = async (): Promise<Assistant[]> => {
    try {
        const { data, error } = await supabase
            .from('assistants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(mapAssistantFromDB);
    } catch (error) {
        console.error('Error fetching assistants from Supabase:', error);
        throw error;
    }
};

/**
 * Create a new assistant
 */
export const createAssistant = async (input: AssistantInput): Promise<Assistant | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const insertData: any = {
            name: input.name,
            title: input.title || null,
            model: input.llmModel || 'gpt-4o',
            transcriber: 'deepgram',
            status: input.status || 'draft',
            user_id: user.id
        };

        // Optional fields
        if (input.instruction) insertData.instruction = input.instruction;
        if (input.voiceId) insertData.voice_id = input.voiceId;
        if (input.elevenlabsModelId) insertData.elevenlabs_model_id = input.elevenlabsModelId;
        if (input.language) insertData.language = input.language;
        // Language & Style Settings (NEW)
        if (input.languageSettings) insertData.language_settings = input.languageSettings;
        if (input.styleSettings) insertData.style_settings = input.styleSettings;
        // Dynamic Variables (ElevenLabs-style personalization)
        if (input.dynamicVariables) insertData.dynamic_variables = input.dynamicVariables;
        if (input.llmProvider) insertData.llm_provider = input.llmProvider;
        if (input.llmModel) insertData.llm_model = input.llmModel;
        if (input.temperature !== undefined) insertData.temperature = input.temperature;
        if (input.maxTokens !== undefined) insertData.max_tokens = input.maxTokens;
        if (input.interruptible !== undefined) insertData.interruptible = input.interruptible;
        if (input.useDefaultPersonality !== undefined) insertData.use_default_personality = input.useDefaultPersonality;
        if (input.timezone) insertData.timezone = input.timezone;
        if (input.ragEnabled !== undefined) insertData.rag_enabled = input.ragEnabled;
        if (input.ragSimilarityThreshold !== undefined) insertData.rag_similarity_threshold = input.ragSimilarityThreshold;
        if (input.ragMaxResults !== undefined) insertData.rag_max_results = input.ragMaxResults;
        if (input.ragInstructions) insertData.rag_instructions = input.ragInstructions;
        if (input.knowledgeBaseIds) insertData.knowledge_base_ids = input.knowledgeBaseIds;
        // Memory settings
        if (input.memoryEnabled !== undefined) insertData.memory_enabled = input.memoryEnabled;
        if (input.memoryConfig) insertData.memory_config = input.memoryConfig;

        const { data, error } = await supabase
            .from('assistants')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;

        return mapAssistantFromDB(data);
    } catch (error) {
        console.error('Error creating assistant:', error);
        throw error;
    }
};

/**
 * Update an existing assistant
 */
export const updateAssistant = async (id: string, input: Partial<AssistantInput>): Promise<Assistant | null> => {
    try {
        const updateData: any = {};

        // Map fields to database column names
        if (input.name !== undefined) updateData.name = input.name;
        if (input.title !== undefined) updateData.title = input.title || null;
        if (input.instruction !== undefined) updateData.instruction = input.instruction;
        if (input.voiceId !== undefined) updateData.voice_id = input.voiceId || null;
        if (input.elevenlabsModelId !== undefined) updateData.elevenlabs_model_id = input.elevenlabsModelId;
        if (input.language !== undefined) updateData.language = input.language;
        // Language & Style Settings (NEW)
        if (input.languageSettings !== undefined) updateData.language_settings = input.languageSettings;
        if (input.styleSettings !== undefined) updateData.style_settings = input.styleSettings;
        // Dynamic Variables (ElevenLabs-style personalization)
        if (input.dynamicVariables !== undefined) updateData.dynamic_variables = input.dynamicVariables;
        if (input.llmProvider !== undefined) updateData.llm_provider = input.llmProvider;
        if (input.llmModel !== undefined) {
            updateData.llm_model = input.llmModel;
            updateData.model = input.llmModel; // Also update legacy model field
        }
        if (input.temperature !== undefined) updateData.temperature = input.temperature;
        if (input.maxTokens !== undefined) updateData.max_tokens = input.maxTokens;
        if (input.interruptible !== undefined) updateData.interruptible = input.interruptible;
        if (input.useDefaultPersonality !== undefined) updateData.use_default_personality = input.useDefaultPersonality;
        if (input.timezone !== undefined) updateData.timezone = input.timezone;
        if (input.ragEnabled !== undefined) updateData.rag_enabled = input.ragEnabled;
        if (input.ragSimilarityThreshold !== undefined) updateData.rag_similarity_threshold = input.ragSimilarityThreshold;
        if (input.ragMaxResults !== undefined) updateData.rag_max_results = input.ragMaxResults;
        if (input.ragInstructions !== undefined) updateData.rag_instructions = input.ragInstructions;
        if (input.knowledgeBaseIds !== undefined) updateData.knowledge_base_ids = input.knowledgeBaseIds;
        // Memory settings
        if (input.memoryEnabled !== undefined) updateData.memory_enabled = input.memoryEnabled;
        if (input.memoryConfig !== undefined) updateData.memory_config = input.memoryConfig;
        if (input.status !== undefined) updateData.status = input.status;

        const { data, error } = await supabase
            .from('assistants')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return mapAssistantFromDB(data);
    } catch (error) {
        console.error('Error updating assistant:', error);
        throw error;
    }
};

/**
 * Delete an assistant
 */
export const deleteAssistant = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('assistants')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting assistant:', error);
        throw error;
    }
};

/**
 * Duplicate an assistant
 */
export const duplicateAssistant = async (id: string): Promise<Assistant | null> => {
    try {
        // Get the existing assistant
        const existing = await getAssistant(id);
        if (!existing) throw new Error('Assistant not found');

        // Create a copy with a new name
        // Use unified instruction field instead of legacy systemPrompt/firstMessage
        const newAssistant = await createAssistant({
            name: `${existing.name} (Copy)`,
            instruction: existing.instruction,
            voiceId: existing.voiceId,
            elevenlabsModelId: existing.elevenlabsModelId,
            language: existing.language,
            llmProvider: existing.llmProvider,
            llmModel: existing.llmModel,
            temperature: existing.temperature,
            maxTokens: existing.maxTokens,
            interruptible: existing.interruptible,
            useDefaultPersonality: existing.useDefaultPersonality,
            ragEnabled: existing.ragEnabled,
            ragSimilarityThreshold: existing.ragSimilarityThreshold,
            ragMaxResults: existing.ragMaxResults,
            ragInstructions: existing.ragInstructions,
            knowledgeBaseIds: existing.knowledgeBaseIds,
            status: 'draft'
        });

        return newAssistant;
    } catch (error) {
        console.error('Error duplicating assistant:', error);
        throw error;
    }
};

/**
 * Get call logs for a specific assistant
 */
export const getAssistantCallLogs = async (assistantId: string): Promise<CallLog[]> => {
    try {
        const { data, error } = await supabase
            .from('callyy_call_logs')
            .select('*')
            .eq('assistant_id', assistantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            assistantName: c.assistant_name,
            phoneNumber: c.phone_number,
            duration: c.duration,
            cost: Number(c.cost),
            status: c.status as CallLog['status'],
            date: new Date(c.created_at).toLocaleString()
        }));
    } catch (error) {
        console.error('Error fetching assistant call logs:', error);
        return [];
    }
};

/**
 * Get all customers from Supabase
 */
export const getCustomers = async (search?: string): Promise<Customer[]> => {
    try {
        // Use backend API so search (ILIKE) happens server-side
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await authFetch(`/api/customers${params}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to fetch customers');
        }
        const { customers } = await response.json();
        return (customers || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phoneNumber: c.phone_number,
            variables: (c.variables as Record<string, string>) || {},
            createdAt: c.created_at,
            hasMemory: c.has_memory,
            lastInteraction: c.last_interaction,
            interactionCount: c.interaction_count,
            source: c.source,
            crm_provider: c.crm_provider,
            last_synced_at: c.last_synced_at,
            last_called_at: c.last_called_at,
        }));
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
};

/**
 * Export all customers as CSV (triggers download)
 */
export const exportCustomersCSV = async (): Promise<void> => {
    const apiBase = (import.meta as any).env.VITE_API_URL || '';
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch(`${apiBase}/api/customers/export`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error('Failed to export customers');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Import customers from a CSV File object via multipart upload
 * Returns { imported: N, skipped: N, errors: string[] }
 */
export const importCustomersCSV = async (file: File): Promise<{ imported: number; skipped: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await authFetch('/api/customers/import', { method: 'POST', body: formData });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to import customers');
    }
    return response.json();
};

/**
 * Bulk delete customers by IDs
 */
export const bulkDeleteCustomers = async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await authFetch('/api/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete customers');
    }
    return response.json();
};

/**
 * Sync customers from connected CRM integrations
 */
export const syncCustomersFromCRM = async (): Promise<{ synced: number; failed: number; providers: { provider: string; synced: number; failed: number }[] }> => {
    const response = await authFetch('/api/customers/sync-from-crm', { method: 'POST' });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to sync from CRM');
    }
    return response.json();
};

/**
 * Get CRM sync status (last sync per provider)
 */
export const getCRMSyncStatus = async (): Promise<{ syncStatus: { provider: string; synced_count: number; failed_count: number; status: string; error: string | null; created_at: string }[] }> => {
    const response = await authFetch('/api/customers/sync-status');
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get sync status');
    }
    return response.json();
};

/**
 * Get all phone numbers from Supabase
 */
export const getPhoneNumbers = async (): Promise<PhoneNumber[]> => {
    try {
        const { data, error } = await supabase
            .from('phone_numbers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(p => ({
            id: p.id,
            number: p.number,
            provider: p.provider as PhoneNumber['provider'],
            assistantId: p.assistant_id || undefined,
            label: p.label || undefined,
            inboundEnabled: p.inbound_enabled,
            outboundEnabled: p.outbound_enabled,
            isActive: p.is_active,
            areaCode: p.area_code || undefined,
            sipIdentifier: p.sip_identifier || undefined,
            sipLabel: p.sip_label || undefined,
            sipUsername: p.sip_username || undefined,
            sipPassword: p.sip_password || undefined,
            twilioPhoneNumber: p.twilio_phone_number || undefined,
            twilioAccountSid: p.twilio_account_sid || undefined,
            twilioAuthToken: p.twilio_auth_token || undefined,
            twilioPhoneSid: p.twilio_phone_sid || undefined,
            smsEnabled: p.sms_enabled,
            vonagePhoneNumber: p.vonage_phone_number || undefined,
            vonageApiKey: p.vonage_api_key || undefined,
            vonageApiSecret: p.vonage_api_secret || undefined,
            telnyxPhoneNumber: p.telnyx_phone_number || undefined,
            telnyxApiKey: p.telnyx_api_key || undefined,
            sipTrunkPhoneNumber: p.sip_trunk_phone_number || undefined,
            sipTrunkCredentialId: p.sip_trunk_credential_id || undefined,
            allowNonE164: p.allow_non_e164
        }));
    } catch (error) {
        console.error('Error fetching phone numbers from Supabase:', error);
        throw error;
    }
};

/**
 * Get all API keys from Supabase
 */
export const getApiKeys = async (): Promise<ApiKey[]> => {
    try {
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(k => ({
            id: k.id,
            label: k.label,
            key: k.key,
            type: k.type as ApiKey['type'],
            createdAt: k.created_at
        }));
    } catch (error) {
        console.error('Error fetching API keys from Supabase:', error);
        throw error;
    }
};

/**
 * Generate a secure random API key
 */
const generateSecureKey = (type: 'public' | 'private'): string => {
    const prefix = type === 'public' ? 'pk_' : 'sk_';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    let key = prefix;
    for (let i = 0; i < array.length; i++) {
        key += chars[array[i] % chars.length];
    }
    return key;
};

/**
 * Create a new API key
 */
export const createApiKey = async (params: {
    label: string;
    type: 'public' | 'private';
}): Promise<ApiKey> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const key = generateSecureKey(params.type);

        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                label: params.label,
                key: key,
                type: params.type,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            label: data.label,
            key: data.key,
            type: data.type as ApiKey['type'],
            createdAt: data.created_at,
        };
    } catch (error) {
        console.error('Error creating API key:', error);
        throw error;
    }
};

/**
 * Delete an API key
 */
export const deleteApiKey = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting API key:', error);
        throw error;
    }
};

/**
 * Get all call logs from Supabase
 */
export const getCallLogs = async (): Promise<CallLog[]> => {
    try {
        const { data, error } = await supabase
            .from('callyy_call_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            assistantName: c.assistant_name || c.assistantName || 'Unknown',
            phoneNumber: c.phone_number || c.phoneNumber || '',
            duration: c.duration || '0:00',
            cost: Number(c.cost) || 0,
            status: (c.status as CallLog['status']) || 'completed',
            date: new Date(c.created_at).toLocaleString(),
            transcript: c.transcript || null,
            recordingUrl: c.recording_url || null,
            callSid: c.call_sid || null,
            direction: c.direction || null,
            assistantId: c.assistant_id || null,
            startedAt: c.started_at || c.created_at || null,
            endedAt: c.ended_at || null,
        }));
    } catch (error) {
        console.error('Error fetching call logs from Supabase:', error);
        throw error;
    }
};

/**
 * Export call logs as CSV — downloads via the browser
 * Falls back to client-side CSV generation from Supabase data if backend unavailable
 */
export const exportCallLogsCSV = async (filters?: { from?: string; to?: string; assistantId?: string }) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const params = new URLSearchParams();
        if (filters?.from) params.set('from', filters.from);
        if (filters?.to) params.set('to', filters.to);
        if (filters?.assistantId) params.set('assistantId', filters.assistantId);

        const apiBase = import.meta.env.VITE_API_URL || '';
        const url = `${apiBase}/api/calls/export${params.toString() ? '?' + params.toString() : ''}`;

        const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) throw new Error('Export endpoint failed');

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `call-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(objectUrl);
    } catch (err) {
        // Fallback: generate CSV client-side from already-fetched call logs
        console.warn('Backend export failed, falling back to client-side CSV:', err);
        throw err; // Let the caller handle the fallback
    }
};

// ============================================
// CREATE/UPDATE/DELETE OPERATIONS
// ============================================

// Note: Voice create/update/delete operations are admin-only
// They require service_role key and will be added to admin interface later

/**
 * Create a new customer
 */
export const createCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('customers')
            .insert({
                name: customer.name,
                email: customer.email,
                phone_number: customer.phoneNumber,
                variables: customer.variables,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            phoneNumber: data.phone_number,
            variables: data.variables as Record<string, string>,
            createdAt: data.created_at
        };
    } catch (error) {
        console.error('Error creating customer:', error);
        return null;
    }
};

/**
 * Update a customer
 */
export const updateCustomer = async (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<boolean> => {
    try {
        const updateData: any = {};
        if (updates.name) updateData.name = updates.name;
        if (updates.email) updateData.email = updates.email;
        if (updates.phoneNumber) updateData.phone_number = updates.phoneNumber;
        if (updates.variables) updateData.variables = updates.variables;

        const { error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating customer:', error);
        return false;
    }
};

/**
 * Delete a customer
 */
export const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting customer:', error);
        return false;
    }
};

/**
 * Create multiple customers in bulk
 */
export const createBulkCustomers = async (customers: Omit<Customer, 'id' | 'createdAt'>[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const insertData = customers.map(customer => ({
            name: customer.name,
            email: customer.email,
            phone_number: customer.phoneNumber,
            variables: customer.variables || {},
            user_id: user.id
        }));

        const { data, error } = await supabase
            .from('customers')
            .insert(insertData)
            .select();

        if (error) {
            return {
                success: 0,
                failed: customers.length,
                errors: [error.message]
            };
        }

        return {
            success: data?.length || 0,
            failed: customers.length - (data?.length || 0),
            errors: []
        };
    } catch (error: any) {
        console.error('Error creating bulk customers:', error);
        return {
            success: 0,
            failed: customers.length,
            errors: [error.message || 'Unknown error occurred']
        };
    }
};

// ============================================
// PHONE NUMBER OPERATIONS
// ============================================

/**
 * Create a new phone number
 */
export const createPhoneNumber = async (phoneNumber: Omit<PhoneNumber, 'id'>): Promise<PhoneNumber | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const insertData: any = {
            number: phoneNumber.number,
            provider: phoneNumber.provider,
            assistant_id: phoneNumber.assistantId || null,
            label: phoneNumber.label || null,
            inbound_enabled: phoneNumber.inboundEnabled ?? true,
            outbound_enabled: phoneNumber.outboundEnabled ?? false,
            is_active: phoneNumber.isActive ?? true,
            user_id: user.id
        };

        // Add provider-specific fields
        if (phoneNumber.areaCode) insertData.area_code = phoneNumber.areaCode;
        if (phoneNumber.sipIdentifier) insertData.sip_identifier = phoneNumber.sipIdentifier;
        if (phoneNumber.sipLabel) insertData.sip_label = phoneNumber.sipLabel;
        if (phoneNumber.sipUsername) insertData.sip_username = phoneNumber.sipUsername;
        if (phoneNumber.sipPassword) insertData.sip_password = phoneNumber.sipPassword;
        if (phoneNumber.twilioPhoneNumber) insertData.twilio_phone_number = phoneNumber.twilioPhoneNumber;
        if (phoneNumber.twilioAccountSid) insertData.twilio_account_sid = phoneNumber.twilioAccountSid;
        if (phoneNumber.twilioAuthToken) insertData.twilio_auth_token = phoneNumber.twilioAuthToken;
        if (phoneNumber.smsEnabled !== undefined) insertData.sms_enabled = phoneNumber.smsEnabled;
        if (phoneNumber.vonagePhoneNumber) insertData.vonage_phone_number = phoneNumber.vonagePhoneNumber;
        if (phoneNumber.vonageApiKey) insertData.vonage_api_key = phoneNumber.vonageApiKey;
        if (phoneNumber.vonageApiSecret) insertData.vonage_api_secret = phoneNumber.vonageApiSecret;
        if (phoneNumber.telnyxPhoneNumber) insertData.telnyx_phone_number = phoneNumber.telnyxPhoneNumber;
        if (phoneNumber.telnyxApiKey) insertData.telnyx_api_key = phoneNumber.telnyxApiKey;
        if (phoneNumber.sipTrunkPhoneNumber) insertData.sip_trunk_phone_number = phoneNumber.sipTrunkPhoneNumber;
        if (phoneNumber.sipTrunkCredentialId) insertData.sip_trunk_credential_id = phoneNumber.sipTrunkCredentialId;
        if (phoneNumber.allowNonE164 !== undefined) insertData.allow_non_e164 = phoneNumber.allowNonE164;

        const { data, error } = await supabase
            .from('phone_numbers')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            number: data.number,
            provider: data.provider,
            assistantId: data.assistant_id || undefined,
            label: data.label || undefined,
            inboundEnabled: data.inbound_enabled,
            outboundEnabled: data.outbound_enabled,
            isActive: data.is_active,
            areaCode: data.area_code || undefined,
            sipIdentifier: data.sip_identifier || undefined,
            sipLabel: data.sip_label || undefined,
            sipUsername: data.sip_username || undefined,
            sipPassword: data.sip_password || undefined,
            twilioPhoneNumber: data.twilio_phone_number || undefined,
            twilioAccountSid: data.twilio_account_sid || undefined,
            twilioAuthToken: data.twilio_auth_token || undefined,
            smsEnabled: data.sms_enabled,
            vonagePhoneNumber: data.vonage_phone_number || undefined,
            vonageApiKey: data.vonage_api_key || undefined,
            vonageApiSecret: data.vonage_api_secret || undefined,
            telnyxPhoneNumber: data.telnyx_phone_number || undefined,
            telnyxApiKey: data.telnyx_api_key || undefined,
            sipTrunkPhoneNumber: data.sip_trunk_phone_number || undefined,
            sipTrunkCredentialId: data.sip_trunk_credential_id || undefined,
            allowNonE164: data.allow_non_e164
        };
    } catch (error) {
        console.error('Error creating phone number:', error);
        return null;
    }
};

/**
 * Update a phone number
 */
export const updatePhoneNumber = async (id: string, updates: Partial<Omit<PhoneNumber, 'id'>>): Promise<boolean> => {
    try {
        const updateData: any = {};
        
        if (updates.number) updateData.number = updates.number;
        if (updates.provider) updateData.provider = updates.provider;
        if (updates.assistantId !== undefined) updateData.assistant_id = updates.assistantId;
        if (updates.label !== undefined) updateData.label = updates.label;
        if (updates.inboundEnabled !== undefined) updateData.inbound_enabled = updates.inboundEnabled;
        if (updates.outboundEnabled !== undefined) updateData.outbound_enabled = updates.outboundEnabled;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        
        // Provider-specific fields
        if (updates.areaCode !== undefined) updateData.area_code = updates.areaCode;
        if (updates.sipIdentifier !== undefined) updateData.sip_identifier = updates.sipIdentifier;
        if (updates.sipLabel !== undefined) updateData.sip_label = updates.sipLabel;
        if (updates.sipUsername !== undefined) updateData.sip_username = updates.sipUsername;
        if (updates.sipPassword !== undefined) updateData.sip_password = updates.sipPassword;
        if (updates.twilioPhoneNumber !== undefined) updateData.twilio_phone_number = updates.twilioPhoneNumber;
        if (updates.twilioAccountSid !== undefined) updateData.twilio_account_sid = updates.twilioAccountSid;
        if (updates.twilioAuthToken !== undefined) updateData.twilio_auth_token = updates.twilioAuthToken;
        if (updates.smsEnabled !== undefined) updateData.sms_enabled = updates.smsEnabled;
        if (updates.vonagePhoneNumber !== undefined) updateData.vonage_phone_number = updates.vonagePhoneNumber;
        if (updates.vonageApiKey !== undefined) updateData.vonage_api_key = updates.vonageApiKey;
        if (updates.vonageApiSecret !== undefined) updateData.vonage_api_secret = updates.vonageApiSecret;
        if (updates.telnyxPhoneNumber !== undefined) updateData.telnyx_phone_number = updates.telnyxPhoneNumber;
        if (updates.telnyxApiKey !== undefined) updateData.telnyx_api_key = updates.telnyxApiKey;
        if (updates.sipTrunkPhoneNumber !== undefined) updateData.sip_trunk_phone_number = updates.sipTrunkPhoneNumber;
        if (updates.sipTrunkCredentialId !== undefined) updateData.sip_trunk_credential_id = updates.sipTrunkCredentialId;
        if (updates.allowNonE164 !== undefined) updateData.allow_non_e164 = updates.allowNonE164;

        const { error } = await supabase
            .from('phone_numbers')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating phone number:', error);
        return false;
    }
};

/**
 * Delete a phone number
 */
export const deletePhoneNumber = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('phone_numbers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting phone number:', error);
        return false;
    }
};

// ============================================
// SIP TRUNK CREDENTIAL OPERATIONS
// ============================================

/**
 * Get all SIP trunk credentials
 */
export const getSipTrunkCredentials = async (): Promise<SipTrunkCredential[]> => {
    try {
        const { data, error } = await supabase
            .from('sip_trunk_credentials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(s => ({
            id: s.id,
            name: s.name,
            sipTrunkUri: s.sip_trunk_uri,
            username: s.username || undefined,
            password: s.password || undefined,
            createdAt: s.created_at
        }));
    } catch (error) {
        console.error('Error fetching SIP trunk credentials from Supabase:', error);
        throw error;
    }
};

/**
 * Create a new SIP trunk credential
 */
export const createSipTrunkCredential = async (credential: Omit<SipTrunkCredential, 'id' | 'createdAt'>): Promise<SipTrunkCredential | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('sip_trunk_credentials')
            .insert({
                name: credential.name,
                sip_trunk_uri: credential.sipTrunkUri,
                username: credential.username || null,
                password: credential.password || null,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            sipTrunkUri: data.sip_trunk_uri,
            username: data.username || undefined,
            password: data.password || undefined,
            createdAt: data.created_at
        };
    } catch (error) {
        console.error('Error creating SIP trunk credential:', error);
        return null;
    }
};

/**
 * Delete a SIP trunk credential
 */
export const deleteSipTrunkCredential = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('sip_trunk_credentials')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting SIP trunk credential:', error);
        return false;
    }
};

// ============================================
// USER PROFILE OPERATIONS
// ============================================

/**
 * Get current user's profile
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            // If profile doesn't exist, create one
            if (error.code === 'PGRST116') {
                const newProfile = await createUserProfile({
                    organizationName: user.email + "'s Org",
                    organizationEmail: user.email || ''
                });
                return newProfile;
            }
            throw error;
        }

        return {
            id: data.id,
            userId: data.user_id,
            organizationName: data.organization_name || '',
            organizationEmail: data.organization_email || '',
            walletId: data.wallet_id,
            channel: data.channel || 'daily',
            callConcurrencyLimit: data.call_concurrency_limit || 10,
            hipaaEnabled: data.hipaa_enabled || false,
            creditsBalance: Number(data.credits_balance) || 0,
            planType: data.plan_type || 'PAYG',
            // Currency settings - default to USD
            country: data.country || 'US',
            currency: data.currency || 'USD',
            currencySymbol: data.currency_symbol || '$',
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

/**
 * Create user profile (for new users)
 */
export const createUserProfile = async (profile: Partial<Omit<UserProfile, 'id' | 'userId' | 'walletId' | 'createdAt' | 'updatedAt'>>): Promise<UserProfile | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('user_profiles')
            .insert({
                user_id: user.id,
                organization_name: profile.organizationName || user.email + "'s Org",
                organization_email: profile.organizationEmail || user.email,
                channel: profile.channel || 'daily',
                call_concurrency_limit: profile.callConcurrencyLimit || 10,
                hipaa_enabled: profile.hipaaEnabled || false,
                credits_balance: profile.creditsBalance || 0,
                plan_type: profile.planType || 'PAYG',
                country: profile.country || 'US',
                currency: profile.currency || 'USD',
                currency_symbol: profile.currencySymbol || '$'
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            userId: data.user_id,
            organizationName: data.organization_name || '',
            organizationEmail: data.organization_email || '',
            walletId: data.wallet_id,
            channel: data.channel || 'daily',
            callConcurrencyLimit: data.call_concurrency_limit || 10,
            hipaaEnabled: data.hipaa_enabled || false,
            creditsBalance: Number(data.credits_balance) || 0,
            planType: data.plan_type || 'PAYG',
            country: data.country || 'US',
            currency: data.currency || 'USD',
            currencySymbol: data.currency_symbol || '$',
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    } catch (error) {
        console.error('Error creating user profile:', error);
        return null;
    }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'walletId' | 'createdAt' | 'updatedAt'>>): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const updateData: any = {};
        if (updates.organizationName !== undefined) updateData.organization_name = updates.organizationName;
        if (updates.organizationEmail !== undefined) updateData.organization_email = updates.organizationEmail;
        if (updates.channel !== undefined) updateData.channel = updates.channel;
        if (updates.callConcurrencyLimit !== undefined) updateData.call_concurrency_limit = updates.callConcurrencyLimit;
        if (updates.hipaaEnabled !== undefined) updateData.hipaa_enabled = updates.hipaaEnabled;
        if (updates.creditsBalance !== undefined) updateData.credits_balance = updates.creditsBalance;
        if (updates.planType !== undefined) updateData.plan_type = updates.planType;
        // Currency settings
        if (updates.country !== undefined) updateData.country = updates.country;
        if (updates.currency !== undefined) updateData.currency = updates.currency;
        if (updates.currencySymbol !== undefined) updateData.currency_symbol = updates.currencySymbol;

        const { error } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', user.id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating user profile:', error);
        return false;
    }
};

// ============================================
// CUSTOMER MEMORY SYSTEM
// ============================================

/**
 * Map database conversation to CustomerConversation type
 */
const mapConversationFromDB = (c: any): CustomerConversation => ({
    id: c.id,
    customerId: c.customer_id,
    assistantId: c.assistant_id || undefined,
    callLogId: c.call_log_id || undefined,
    callDirection: c.call_direction,
    startedAt: c.started_at,
    endedAt: c.ended_at || undefined,
    durationSeconds: c.duration_seconds || undefined,
    transcript: c.transcript || [],
    summary: c.summary || undefined,
    keyPoints: c.key_points || undefined,
    sentiment: c.sentiment || undefined,
    sentimentScore: c.sentiment_score ? Number(c.sentiment_score) : undefined,
    topicsDiscussed: c.topics_discussed || undefined,
    actionItems: c.action_items || [],
    followUpRequired: c.follow_up_required || false,
    followUpDate: c.follow_up_date || undefined,
    followUpReason: c.follow_up_reason || undefined,
    outcome: c.outcome || undefined,
    outcomeNotes: c.outcome_notes || undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at || undefined
});

/**
 * Map database memory to CustomerMemory type
 */
const mapMemoryFromDB = (m: any): CustomerMemory => ({
    id: m.id,
    customerId: m.customer_id,
    totalConversations: m.total_conversations || 0,
    totalCallDurationMinutes: m.total_call_duration_minutes || 0,
    firstContactDate: m.first_contact_date || undefined,
    lastContactDate: m.last_contact_date || undefined,
    averageSentiment: m.average_sentiment ? Number(m.average_sentiment) : undefined,
    personalityTraits: m.personality_traits || undefined,
    communicationPreferences: m.communication_preferences || undefined,
    interests: m.interests || undefined,
    painPoints: m.pain_points || undefined,
    importantDates: m.important_dates || undefined,
    familyInfo: m.family_info || undefined,
    professionalInfo: m.professional_info || undefined,
    productInterests: m.product_interests || undefined,
    pastPurchases: m.past_purchases || undefined,
    objectionsRaised: m.objections_raised || undefined,
    engagementScore: m.engagement_score || 50,
    lifetimeValue: m.lifetime_value ? Number(m.lifetime_value) : undefined,
    churnRisk: m.churn_risk || undefined,
    executiveSummary: m.executive_summary || undefined,
    conversationContext: m.conversation_context || undefined,
    createdAt: m.created_at,
    updatedAt: m.updated_at || undefined
});

/**
 * Map database insight to CustomerInsight type
 */
const mapInsightFromDB = (i: any): CustomerInsight => ({
    id: i.id,
    customerId: i.customer_id,
    conversationId: i.conversation_id || undefined,
    insightType: i.insight_type,
    category: i.category || undefined,
    content: i.content,
    importance: i.importance || 'medium',
    sourceQuote: i.source_quote || undefined,
    confidence: i.confidence ? Number(i.confidence) : undefined,
    isActive: i.is_active ?? true,
    verifiedByUser: i.verified_by_user || false,
    extractedAt: i.extracted_at,
    createdAt: i.created_at
});

/**
 * Get customer memory profile
 */
export const getCustomerMemory = async (customerId: string): Promise<CustomerMemory | null> => {
    try {
        const { data, error } = await supabase
            .from('customer_memories')
            .select('*')
            .eq('customer_id', customerId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return mapMemoryFromDB(data);
    } catch (error) {
        console.error('Error fetching customer memory:', error);
        return null;
    }
};

/**
 * Get customer conversations
 */
export const getCustomerConversations = async (customerId: string, limit: number = 10): Promise<CustomerConversation[]> => {
    try {
        const { data, error } = await supabase
            .from('customer_conversations')
            .select('*')
            .eq('customer_id', customerId)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map(mapConversationFromDB);
    } catch (error) {
        console.error('Error fetching customer conversations:', error);
        return [];
    }
};

/**
 * WhatsApp message type
 */
export interface WhatsAppMessage {
    id: string;
    direction: 'inbound' | 'outbound';
    messageType: string;
    content: { body?: string; caption?: string };
    status: string;
    createdAt: string;
    isFromBot: boolean;
}

/**
 * Get WhatsApp messages for a customer
 */
export const getCustomerWhatsAppMessages = async (customerId: string, limit: number = 50): Promise<WhatsAppMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('id, direction, message_type, content, status, created_at, is_from_bot')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((msg: any) => ({
            id: msg.id,
            direction: msg.direction,
            messageType: msg.message_type,
            content: msg.content || {},
            status: msg.status,
            createdAt: msg.created_at,
            isFromBot: msg.is_from_bot || false
        }));
    } catch (error) {
        console.error('Error fetching WhatsApp messages:', error);
        return [];
    }
};

/**
 * Get customer insights
 */
export const getCustomerInsights = async (customerId: string, activeOnly: boolean = true): Promise<CustomerInsight[]> => {
    try {
        let query = supabase
            .from('customer_insights')
            .select('*')
            .eq('customer_id', customerId)
            .order('extracted_at', { ascending: false });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(mapInsightFromDB);
    } catch (error) {
        console.error('Error fetching customer insights:', error);
        return [];
    }
};

/**
 * Get full customer context for AI assistant
 */
export const getCustomerContext = async (customerId: string, maxConversations: number = 5): Promise<CustomerContext | null> => {
    try {
        const { data, error } = await supabase.rpc('get_customer_context', {
            p_customer_id: customerId,
            p_max_conversations: maxConversations
        });

        if (error) throw error;

        return data as CustomerContext;
    } catch (error) {
        console.error('Error fetching customer context:', error);
        return null;
    }
};

/**
 * Create a new conversation record
 */
export const createConversation = async (conversation: {
    customerId: string;
    assistantId?: string;
    callDirection: 'inbound' | 'outbound';
    transcript?: TranscriptMessage[];
}): Promise<CustomerConversation | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('customer_conversations')
            .insert({
                customer_id: conversation.customerId,
                assistant_id: conversation.assistantId || null,
                call_direction: conversation.callDirection,
                transcript: conversation.transcript || [],
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return mapConversationFromDB(data);
    } catch (error) {
        console.error('Error creating conversation:', error);
        return null;
    }
};

/**
 * Update conversation with analysis (called after call ends)
 */
export const updateConversationAnalysis = async (conversationId: string, analysis: {
    transcript?: TranscriptMessage[];
    endedAt?: string;
    durationSeconds?: number;
    summary?: string;
    keyPoints?: string[];
    sentiment?: CustomerConversation['sentiment'];
    sentimentScore?: number;
    topicsDiscussed?: string[];
    actionItems?: ActionItem[];
    followUpRequired?: boolean;
    followUpDate?: string;
    followUpReason?: string;
    outcome?: CustomerConversation['outcome'];
    outcomeNotes?: string;
}): Promise<boolean> => {
    try {
        const updateData: any = {};
        
        if (analysis.transcript) updateData.transcript = analysis.transcript;
        if (analysis.endedAt) updateData.ended_at = analysis.endedAt;
        if (analysis.durationSeconds !== undefined) updateData.duration_seconds = analysis.durationSeconds;
        if (analysis.summary) updateData.summary = analysis.summary;
        if (analysis.keyPoints) updateData.key_points = analysis.keyPoints;
        if (analysis.sentiment) updateData.sentiment = analysis.sentiment;
        if (analysis.sentimentScore !== undefined) updateData.sentiment_score = analysis.sentimentScore;
        if (analysis.topicsDiscussed) updateData.topics_discussed = analysis.topicsDiscussed;
        if (analysis.actionItems) updateData.action_items = analysis.actionItems;
        if (analysis.followUpRequired !== undefined) updateData.follow_up_required = analysis.followUpRequired;
        if (analysis.followUpDate) updateData.follow_up_date = analysis.followUpDate;
        if (analysis.followUpReason) updateData.follow_up_reason = analysis.followUpReason;
        if (analysis.outcome) updateData.outcome = analysis.outcome;
        if (analysis.outcomeNotes) updateData.outcome_notes = analysis.outcomeNotes;

        const { error } = await supabase
            .from('customer_conversations')
            .update(updateData)
            .eq('id', conversationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating conversation analysis:', error);
        return false;
    }
};

/**
 * Add an insight for a customer
 */
export const addCustomerInsight = async (insight: {
    customerId: string;
    conversationId?: string;
    insightType: CustomerInsight['insightType'];
    category?: string;
    content: string;
    importance?: CustomerInsight['importance'];
    sourceQuote?: string;
    confidence?: number;
}): Promise<CustomerInsight | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('customer_insights')
            .insert({
                customer_id: insight.customerId,
                conversation_id: insight.conversationId || null,
                insight_type: insight.insightType,
                category: insight.category || null,
                content: insight.content,
                importance: insight.importance || 'medium',
                source_quote: insight.sourceQuote || null,
                confidence: insight.confidence || null,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return mapInsightFromDB(data);
    } catch (error) {
        console.error('Error adding customer insight:', error);
        return null;
    }
};

/**
 * Update customer memory profile
 */
export const updateCustomerMemory = async (customerId: string, updates: Partial<{
    personalityTraits: string[];
    communicationPreferences: CustomerMemory['communicationPreferences'];
    interests: string[];
    painPoints: string[];
    importantDates: CustomerMemory['importantDates'];
    familyInfo: Record<string, any>;
    professionalInfo: CustomerMemory['professionalInfo'];
    productInterests: string[];
    objectionsRaised: string[];
    executiveSummary: string;
    conversationContext: string;
    engagementScore: number;
    churnRisk: CustomerMemory['churnRisk'];
}>): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const updateData: any = {};
        
        if (updates.personalityTraits) updateData.personality_traits = updates.personalityTraits;
        if (updates.communicationPreferences) updateData.communication_preferences = updates.communicationPreferences;
        if (updates.interests) updateData.interests = updates.interests;
        if (updates.painPoints) updateData.pain_points = updates.painPoints;
        if (updates.importantDates) updateData.important_dates = updates.importantDates;
        if (updates.familyInfo) updateData.family_info = updates.familyInfo;
        if (updates.professionalInfo) updateData.professional_info = updates.professionalInfo;
        if (updates.productInterests) updateData.product_interests = updates.productInterests;
        if (updates.objectionsRaised) updateData.objections_raised = updates.objectionsRaised;
        if (updates.executiveSummary) updateData.executive_summary = updates.executiveSummary;
        if (updates.conversationContext) updateData.conversation_context = updates.conversationContext;
        if (updates.engagementScore !== undefined) updateData.engagement_score = updates.engagementScore;
        if (updates.churnRisk) updateData.churn_risk = updates.churnRisk;

        // Upsert - create if doesn't exist
        const { error } = await supabase
            .from('customer_memories')
            .upsert({
                customer_id: customerId,
                user_id: user.id,
                ...updateData
            }, {
                onConflict: 'customer_id'
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating customer memory:', error);
        return false;
    }
};

/**
 * Toggle insight active status
 */
export const toggleInsightActive = async (insightId: string, isActive: boolean): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('customer_insights')
            .update({ is_active: isActive })
            .eq('id', insightId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error toggling insight:', error);
        return false;
    }
};

/**
 * Verify an insight (mark as confirmed by user)
 */
export const verifyInsight = async (insightId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('customer_insights')
            .update({ verified_by_user: true })
            .eq('id', insightId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error verifying insight:', error);
        return false;
    }
};

/**
 * Get customers with memory (for Memory dashboard)
 */
export const getCustomersWithMemory = async (): Promise<(Customer & { memory?: CustomerMemory })[]> => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                customer_memories (*)
            `)
            .eq('has_memory', true)
            .order('last_interaction', { ascending: false });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phoneNumber: c.phone_number,
            variables: (c.variables as Record<string, string>) || {},
            createdAt: c.created_at,
            hasMemory: c.has_memory,
            lastInteraction: c.last_interaction,
            interactionCount: c.interaction_count,
            memory: c.customer_memories ? mapMemoryFromDB(c.customer_memories) : undefined
        }));
    } catch (error) {
        console.error('Error fetching customers with memory:', error);
        return [];
    }
};

/**
 * Generate formatted memory context string for AI system prompt
 */
export const formatMemoryForPrompt = (context: CustomerContext): string => {
    if (!context) return '';
    
    let memoryText = `\n--- CUSTOMER MEMORY ---\n`;
    memoryText += `Customer: ${context.customer.name}\n`;
    
    if (context.memory) {
        memoryText += `\nRelationship:\n`;
        memoryText += `- Total conversations: ${context.memory.totalConversations}\n`;
        if (context.memory.lastContact) {
            memoryText += `- Last contact: ${new Date(context.memory.lastContact).toLocaleDateString()}\n`;
        }
        if (context.memory.averageSentiment !== undefined) {
            const sentimentLabel = context.memory.averageSentiment > 0.3 ? 'Positive' : 
                                   context.memory.averageSentiment < -0.3 ? 'Negative' : 'Neutral';
            memoryText += `- Overall sentiment: ${sentimentLabel}\n`;
        }
        if (context.memory.engagementScore) {
            memoryText += `- Engagement score: ${context.memory.engagementScore}/100\n`;
        }
        
        if (context.memory.personalityTraits?.length) {
            memoryText += `\nPersonality: ${context.memory.personalityTraits.join(', ')}\n`;
        }
        
        if (context.memory.interests?.length) {
            memoryText += `\nInterests: ${context.memory.interests.join(', ')}\n`;
        }
        
        if (context.memory.painPoints?.length) {
            memoryText += `\nPain points: ${context.memory.painPoints.join(', ')}\n`;
        }
        
        if (context.memory.executiveSummary) {
            memoryText += `\nSummary: ${context.memory.executiveSummary}\n`;
        }
        
        if (context.memory.conversationContext) {
            memoryText += `\nContext for this call: ${context.memory.conversationContext}\n`;
        }
    }
    
    // Recent conversations
    if (context.recentConversations?.length) {
        memoryText += `\n--- RECENT CONVERSATIONS ---\n`;
        context.recentConversations.slice(0, 3).forEach((conv, idx) => {
            memoryText += `\n[${idx + 1}] ${new Date(conv.startedAt).toLocaleDateString()}`;
            if (conv.outcome) memoryText += ` (${conv.outcome})`;
            memoryText += `\n`;
            if (conv.summary) memoryText += `Summary: ${conv.summary}\n`;
            if (conv.keyPoints?.length) {
                memoryText += `Key points:\n`;
                conv.keyPoints.forEach(point => memoryText += `  - ${point}\n`);
            }
        });
    }
    
    // Key insights
    if (context.keyInsights?.length) {
        memoryText += `\n--- KEY INSIGHTS ---\n`;
        const criticalInsights = context.keyInsights.filter(i => i.importance === 'critical' || i.importance === 'high');
        criticalInsights.slice(0, 5).forEach(insight => {
            memoryText += `[${insight.insightType.toUpperCase()}] ${insight.content}\n`;
        });
    }
    
    memoryText += `\n--- END MEMORY ---\n`;
    
    return memoryText;
};
