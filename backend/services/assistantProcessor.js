// ============================================
// ASSISTANT PROCESSOR - Centralized AI Logic
// ============================================
// This is the SINGLE source of truth for all assistant interactions.
// All channels (WhatsApp, Test Chat, SMS, Voice, Web Widget) use this.
// ============================================

const { openai } = require('../config');
const { getCachedAssistant } = require('./assistant');
const { searchKnowledgeBase, formatRAGContext } = require('./rag');
const { resolveTemplateVariables } = require('./template');
const { formatMemoryForPrompt } = require('./memory');

// ============================================
// CONFIGURATION DEFAULTS
// ============================================
const DEFAULTS = {
    RAG_SIMILARITY_THRESHOLD: 0.2,
    RAG_MAX_RESULTS: 10,
    RAG_INSTRUCTIONS: 'STRICT MODE: Only answer using the knowledge base content. If the information is not in the knowledge base, say "I don\'t have information about that in my knowledge base."',
    TEMPERATURE: 0.7,
    MAX_TOKENS: 1024,
    LLM_MODEL: 'gpt-4o',
    TIMEZONE: 'Asia/Kolkata',
    STYLE_MODE: 'friendly',
};

// Language name mapping
const LANGUAGE_NAMES = {
    'en': 'English', 'en-GB': 'British English', 'en-AU': 'Australian English',
    'hi': 'Hindi', 'hi-Latn': 'Hinglish (Hindi written in English letters)',
    'ta': 'Tamil', 'te': 'Telugu', 'mr': 'Marathi', 'bn': 'Bengali',
    'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi',
    'es': 'Spanish', 'es-MX': 'Mexican Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'pt-BR': 'Brazilian Portuguese',
    'nl': 'Dutch', 'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese',
    'ko': 'Korean', 'zh': 'Chinese (Mandarin)', 'ar': 'Arabic', 'tr': 'Turkish'
};

// ============================================
// MAIN PROCESSOR CLASS
// ============================================

/**
 * Process a message through an assistant
 * @param {Object} options - Processing options
 * @param {string} options.message - The user's message
 * @param {string} [options.assistantId] - ID of saved assistant (fetches from DB)
 * @param {Object} [options.assistantConfig] - Live assistant config (overrides DB)
 * @param {Array} [options.conversationHistory] - Previous messages [{role, content}]
 * @param {string} [options.channel] - Channel type: 'calls', 'messaging', 'sms', 'web'
 * @param {Object} [options.customer] - Customer data for personalization
 * @param {Object} [options.memory] - Customer memory data
 * @param {string} [options.userId] - User ID for billing
 * @returns {Promise<Object>} - { response, usage, error }
 */
async function processMessage(options) {
    const {
        message,
        assistantId,
        assistantConfig,
        conversationHistory = [],
        channel = 'calls',
        customer = null,
        memory = null,
        userId = null,
    } = options;

    // Validate input
    if (!message) {
        return { error: 'Message is required', response: null, usage: null };
    }

    if (!assistantId && !assistantConfig) {
        return { error: 'Either assistantId or assistantConfig is required', response: null, usage: null };
    }

    if (!openai) {
        return { error: 'AI service not available', response: null, usage: null };
    }

    try {
        // ===== STEP 1: Get Assistant Configuration =====
        const assistant = await resolveAssistantConfig(assistantId, assistantConfig, channel);
        if (!assistant) {
            return { error: 'Failed to resolve assistant configuration', response: null, usage: null };
        }

        console.log(`[AssistantProcessor] Processing message for "${assistant.name}" via ${channel}`);
        console.log(`[AssistantProcessor] RAG: ${assistant.rag_enabled ? 'ON' : 'OFF'}, KBs: ${assistant.knowledge_base_ids?.length || 0}`);

        // ===== STEP 2: Build System Prompt =====
        let systemPrompt = buildBaseSystemPrompt(assistant);

        // ===== STEP 3: Add Language Settings =====
        systemPrompt = addLanguageInstructions(systemPrompt, assistant.language_settings);

        // ===== STEP 4: Add Style Settings =====
        systemPrompt = addStyleInstructions(systemPrompt, assistant.style_settings);

        // ===== STEP 5: Add Customer Memory =====
        if (memory) {
            const memoryContext = formatMemoryForPrompt(memory);
            if (memoryContext) {
                systemPrompt += memoryContext;
            }
        }

        // ===== STEP 6: Add RAG Context (Knowledge Base) =====
        systemPrompt = await addRAGContext(systemPrompt, message, assistant);

        // ===== STEP 7: Resolve Dynamic Variables =====
        systemPrompt = resolveDynamicVariables(systemPrompt, assistant, customer);

        // ===== STEP 8: Build Messages Array =====
        // NOTE: We no longer use first_message - unified instruction includes all greeting behavior
        const messages = buildMessagesArray(systemPrompt, null, conversationHistory, message);

        // ===== STEP 9: Call LLM =====
        const model = assistant.llm_model || DEFAULTS.LLM_MODEL;
        const temperature = parseFloat(assistant.temperature) || DEFAULTS.TEMPERATURE;
        const maxTokens = parseInt(assistant.max_tokens) || DEFAULTS.MAX_TOKENS;

        console.log(`[AssistantProcessor] Calling ${model} with ${messages.length} messages`);

        const completion = await openai.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
        });

        const response = completion.choices[0]?.message?.content;

        if (!response) {
            return { error: 'No response from AI', response: null, usage: null };
        }

        // ===== STEP 10: Return Response with Usage =====
        const usage = {
            inputTokens: completion.usage?.prompt_tokens || 0,
            outputTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0,
            model,
        };

        console.log(`[AssistantProcessor] Response generated (${usage.totalTokens} tokens)`);

        return { response, usage, error: null };

    } catch (error) {
        console.error('[AssistantProcessor] Error:', error.message);
        return { error: error.message, response: null, usage: null };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resolve assistant configuration from ID or config object
 * Priority: assistantConfig > assistantId (for live preview)
 */
async function resolveAssistantConfig(assistantId, assistantConfig, channel) {
    if (assistantConfig) {
        // Use live config (converts frontend format to DB format)
        // Now using unified 'instruction' field instead of separate prompts
        return {
            name: assistantConfig.name,
            instruction: assistantConfig.instruction || assistantConfig.systemPrompt,
            language_settings: assistantConfig.languageSettings || { default: 'en', autoDetect: false },
            style_settings: assistantConfig.styleSettings || { mode: 'friendly' },
            llm_model: assistantConfig.llmModel || DEFAULTS.LLM_MODEL,
            temperature: assistantConfig.temperature ?? DEFAULTS.TEMPERATURE,
            max_tokens: assistantConfig.maxTokens ?? DEFAULTS.MAX_TOKENS,
            dynamic_variables: assistantConfig.dynamicVariables || { enableSystemVariables: true, variables: [] },
            timezone: assistantConfig.timezone || DEFAULTS.TIMEZONE,
            // RAG settings
            rag_enabled: assistantConfig.ragEnabled ?? false,
            rag_similarity_threshold: assistantConfig.ragSimilarityThreshold ?? DEFAULTS.RAG_SIMILARITY_THRESHOLD,
            rag_max_results: assistantConfig.ragMaxResults ?? DEFAULTS.RAG_MAX_RESULTS,
            rag_instructions: assistantConfig.ragInstructions || DEFAULTS.RAG_INSTRUCTIONS,
            knowledge_base_ids: assistantConfig.knowledgeBaseIds || [],
            // Memory settings
            memory_enabled: assistantConfig.memoryEnabled ?? false,
            memory_config: assistantConfig.memoryConfig || null,
        };
    }

    if (assistantId) {
        // Fetch from database (cached)
        const assistant = await getCachedAssistant(assistantId);
        if (!assistant) return null;

        // Database now uses unified 'instruction' field
        // No need for channel-specific prompts anymore
        return assistant;
    }

    return null;
}

/**
 * Build the base system prompt with assistant identity
 * Now uses unified 'instruction' field instead of separate system_prompt/first_message
 */
function buildBaseSystemPrompt(assistant) {
    // Use unified 'instruction' field (fall back to legacy system_prompt for migration)
    let systemPrompt = assistant.instruction || assistant.system_prompt || 
        'You are a helpful, friendly AI assistant. Be conversational and helpful.';
    
    // Prepend assistant identity
    if (assistant.name) {
        systemPrompt = `Your name is ${assistant.name}. When asked about your name, always say you are ${assistant.name}.\n\n${systemPrompt}`;
    }

    return systemPrompt;
}

/**
 * Add language instructions to system prompt
 */
function addLanguageInstructions(systemPrompt, langSettings) {
    if (!langSettings) return systemPrompt;

    const defaultLang = langSettings.default || 'en';
    const langName = LANGUAGE_NAMES[defaultLang] || defaultLang;

    if (langSettings.autoDetect) {
        systemPrompt += `\n\nLANGUAGE: Detect the customer's language and respond in the same language they use. If they write in Hindi, respond in Hindi. If they write in Hinglish (Hindi in English letters), respond in Hinglish. Match their language preference.`;
    } else {
        // Strict language enforcement
        const languagePrefix = `[MANDATORY LANGUAGE: ${langName.toUpperCase()}] - All your responses in this conversation MUST be in ${langName}. This overrides any previous conversation patterns.\n\n`;
        systemPrompt = languagePrefix + systemPrompt;
        systemPrompt += `\n\n⚠️ CRITICAL LANGUAGE RULE ⚠️: You MUST respond ONLY in ${langName}. This is a strict requirement that overrides everything else.
- Even if the customer writes in Hindi, Hinglish, or any other language, YOUR response MUST be in ${langName}.
- Even if your previous responses in this conversation were in another language, you MUST now respond in ${langName}.
- Do NOT translate the customer's message - just respond in ${langName}.
- This rule is NON-NEGOTIABLE.`;
    }

    return systemPrompt;
}

/**
 * Add style instructions to system prompt
 */
function addStyleInstructions(systemPrompt, styleSettings) {
    if (!styleSettings) return systemPrompt;

    const styleMode = styleSettings.mode || DEFAULTS.STYLE_MODE;

    switch (styleMode) {
        case 'professional':
            systemPrompt += `\n\nCOMMUNICATION STYLE: Be professional and formal. Use polished language, proper grammar, and structured responses. Avoid slang, contractions, or casual expressions.`;
            break;
        case 'friendly':
            systemPrompt += `\n\nCOMMUNICATION STYLE: Be warm, friendly, and conversational. Use a relaxed tone, feel free to use casual language, and be personable.`;
            break;
        case 'concise':
            systemPrompt += `\n\nCOMMUNICATION STYLE: Be brief and direct. Give short, to-the-point answers. Avoid unnecessary words or explanations unless specifically asked.`;
            break;
        case 'adaptive':
            const adaptiveConfig = styleSettings.adaptiveConfig || {};
            let adaptiveInstruction = `\n\nCOMMUNICATION STYLE: Adapt your style to match the customer's communication pattern.`;
            if (adaptiveConfig.mirrorFormality) {
                adaptiveInstruction += ` If they're formal, be formal. If they're casual, be casual.`;
            }
            if (adaptiveConfig.mirrorLength) {
                adaptiveInstruction += ` Match their message length - brief replies to brief messages, detailed responses to detailed questions.`;
            }
            if (adaptiveConfig.mirrorVocabulary) {
                adaptiveInstruction += ` Use similar vocabulary complexity as they do.`;
            }
            systemPrompt += adaptiveInstruction;
            break;
    }

    return systemPrompt;
}

/**
 * Add RAG context from knowledge base
 * This is the STRICT anti-hallucination logic
 */
async function addRAGContext(systemPrompt, message, assistant) {
    if (!assistant.rag_enabled || !assistant.knowledge_base_ids?.length) {
        console.log('[AssistantProcessor] RAG disabled or no KBs linked');
        return systemPrompt;
    }

    const ragThreshold = parseFloat(assistant.rag_similarity_threshold) || DEFAULTS.RAG_SIMILARITY_THRESHOLD;
    const ragMaxResults = parseInt(assistant.rag_max_results) || DEFAULTS.RAG_MAX_RESULTS;
    const ragInstructions = assistant.rag_instructions || DEFAULTS.RAG_INSTRUCTIONS;

    console.log(`[AssistantProcessor] RAG search: threshold=${ragThreshold}, maxResults=${ragMaxResults}`);

    const ragDocuments = await searchKnowledgeBase(
        message,
        assistant.knowledge_base_ids,
        ragThreshold,
        ragMaxResults
    );

    // Always add RAG context (even if empty - this adds strict "no info" instructions)
    const ragContext = formatRAGContext(ragDocuments, ragInstructions);
    systemPrompt += ragContext;

    if (ragDocuments?.length > 0) {
        console.log(`[AssistantProcessor] Injected RAG context from ${ragDocuments.length} documents`);
    } else {
        console.log('[AssistantProcessor] No relevant documents found, added strict no-info instructions');
    }

    return systemPrompt;
}

/**
 * Resolve dynamic variables in system prompt
 */
function resolveDynamicVariables(systemPrompt, assistant, customer) {
    const dynamicVariables = assistant.dynamic_variables || { enableSystemVariables: true, variables: [] };
    
    const templateContext = {
        enableSystemVariables: dynamicVariables.enableSystemVariables,
        timezone: assistant.timezone || DEFAULTS.TIMEZONE,
        assistantName: assistant.name,
        customer: customer ? {
            name: customer.name,
            phone: customer.phone_number || customer.phone,
            email: customer.email,
            variables: customer.variables || {}
        } : null,
        customVariables: dynamicVariables.variables || []
    };

    return resolveTemplateVariables(systemPrompt, templateContext);
}

/**
 * Build the messages array for the LLM
 */
function buildMessagesArray(systemPrompt, firstMessage, conversationHistory, currentMessage) {
    const messages = [{ role: 'system', content: systemPrompt }];

    // Add first message as assistant's opening if this is the start of conversation
    if (conversationHistory.length === 0 && firstMessage) {
        messages.push({ role: 'assistant', content: firstMessage });
    }

    // Add conversation history
    for (const msg of conversationHistory) {
        messages.push({
            role: msg.role,
            content: msg.content
        });
    }

    // Add the current user message
    messages.push({ role: 'user', content: currentMessage });

    return messages;
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    processMessage,
    resolveAssistantConfig,
    DEFAULTS,
};
