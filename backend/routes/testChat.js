// ============================================
// TEST CHAT ROUTES - Dashboard Agent Testing
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, openai } = require('../config');
const { getCachedAssistant } = require('../services/assistant');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
const { formatMemoryForPrompt } = require('../services/memory');

// ============================================
// TEST CHAT ENDPOINT - For testing agents in the dashboard
// Uses the SAME logic as WhatsApp processWithAI
// ============================================
router.post('/test-chat', async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not available' });
        }

        const { 
            message, 
            conversationHistory = [], 
            assistantId,  // If saved, use this to fetch from DB
            assistantConfig,  // Fallback for unsaved assistants
            userId,  // Required for billing - passed from frontend
            channel = 'calls'  // 'calls' or 'messaging' - determines which system prompt to use
        } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!assistantId && !assistantConfig) {
            return res.status(400).json({ error: 'Either assistantId or assistantConfig is required' });
        }

        const isMessaging = channel === 'messaging';
        let assistant;
        let billingUserId = userId; // User ID for billing purposes

        // If assistantId provided, fetch from database (same as WhatsApp)
        if (assistantId) {
            // 🚀 CACHED: Use Redis cache for assistant lookup
            assistant = await getCachedAssistant(assistantId);

            if (!assistant) {
                console.error('Failed to fetch assistant:', assistantId);
                return res.status(404).json({ error: 'Assistant not found' });
            }
            // Use assistant's user_id for billing if not provided
            if (!billingUserId) {
                billingUserId = assistant.user_id;
            }
            
            // For saved assistants, use the appropriate system prompt based on channel
            if (isMessaging) {
                // Use messaging_system_prompt if available, otherwise fall back to system_prompt
                assistant.system_prompt = assistant.messaging_system_prompt || assistant.system_prompt;
                assistant.first_message = assistant.messaging_first_message || assistant.first_message;
            }
            
            console.log('Test chat - Using saved assistant:', assistant.name, 'Channel:', channel, 'Billing user:', billingUserId);
        } else {
            // Use passed config for unsaved assistants (convert to DB format)
            // The frontend already sends the correct systemPrompt based on channel
            assistant = {
                name: assistantConfig.name,
                system_prompt: assistantConfig.systemPrompt,
                first_message: assistantConfig.firstMessage,
                language_settings: assistantConfig.languageSettings,
                style_settings: assistantConfig.styleSettings,
                llm_model: assistantConfig.llmModel,
                temperature: assistantConfig.temperature,
                max_tokens: assistantConfig.maxTokens,
                dynamic_variables: assistantConfig.dynamicVariables,
                timezone: assistantConfig.timezone || 'Asia/Kolkata',
                // RAG settings from config
                rag_enabled: assistantConfig.ragEnabled,
                rag_similarity_threshold: assistantConfig.ragSimilarityThreshold,
                rag_max_results: assistantConfig.ragMaxResults,
                rag_instructions: assistantConfig.ragInstructions,
                knowledge_base_ids: assistantConfig.knowledgeBaseIds,
            };
            console.log('Test chat - Using unsaved config:', assistant.name, 'RAG enabled:', assistant.rag_enabled, 'KBs:', assistant.knowledge_base_ids?.length || 0, 'Billing user:', billingUserId);
        }

        // Require userId for billing
        if (!billingUserId) {
            return res.status(400).json({ error: 'userId is required for billing' });
        }

        // ===== SAME LOGIC AS processWithAI =====
        
        // Language and Style Settings
        const langSettings = assistant.language_settings || { default: 'en', autoDetect: false };
        const styleSettings = assistant.style_settings || { mode: 'friendly' };
        
        console.log('Test chat - Language:', langSettings.default, 'AutoDetect:', langSettings.autoDetect, 'Style:', styleSettings.mode);

        // Build system prompt
        let systemPrompt = assistant.system_prompt || 
            'You are a helpful, friendly AI assistant. Be conversational and helpful.';
        
        // Prepend the assistant's identity if a name is set
        if (assistant.name) {
            systemPrompt = `Your name is ${assistant.name}. When asked about your name, always say you are ${assistant.name}.\n\n${systemPrompt}`;
        }

        // Language settings - SAME as WhatsApp
        const langNames = {
            'en': 'English', 'en-GB': 'British English', 'en-AU': 'Australian English',
            'hi': 'Hindi', 'hi-Latn': 'Hinglish (Hindi written in English letters)',
            'ta': 'Tamil', 'te': 'Telugu', 'mr': 'Marathi', 'bn': 'Bengali',
            'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi',
            'es': 'Spanish', 'es-MX': 'Mexican Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'pt-BR': 'Brazilian Portuguese',
            'nl': 'Dutch', 'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese',
            'ko': 'Korean', 'zh': 'Chinese (Mandarin)', 'ar': 'Arabic', 'tr': 'Turkish'
        };
        const defaultLang = langSettings.default || 'en';
        const langName = langNames[defaultLang] || defaultLang;

        if (langSettings.autoDetect) {
            systemPrompt += `\n\nLANGUAGE: Detect the customer's language and respond in the same language they use. If they write in Hindi, respond in Hindi. If they write in Hinglish (Hindi in English letters), respond in Hinglish. Match their language preference.`;
        } else {
            // Strict language enforcement - SAME as WhatsApp
            const languagePrefix = `[MANDATORY LANGUAGE: ${langName.toUpperCase()}] - All your responses in this conversation MUST be in ${langName}. This overrides any previous conversation patterns.\n\n`;
            systemPrompt = languagePrefix + systemPrompt;
            systemPrompt += `\n\n⚠️ CRITICAL LANGUAGE RULE ⚠️: You MUST respond ONLY in ${langName}. This is a strict requirement that overrides everything else. 
- Even if the customer writes in Hindi, Hinglish, or any other language, YOUR response MUST be in ${langName}.
- Even if your previous responses in this conversation were in another language, you MUST now respond in ${langName}.
- Do NOT translate the customer's message - just respond in ${langName}.
- This rule is NON-NEGOTIABLE.`;
        }

        // Style settings - SAME as WhatsApp
        const styleMode = styleSettings.mode || 'friendly';
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

        // Resolve dynamic variables if available
        const dynamicVariables = assistant.dynamic_variables || { enableSystemVariables: true, variables: [] };
        const templateContext = {
            enableSystemVariables: dynamicVariables.enableSystemVariables,
            timezone: assistant.timezone || 'Asia/Kolkata',
            assistantName: assistant.name,
            customer: null, // No customer in test mode
            customVariables: dynamicVariables.variables || []
        };
        
        // 🔍 RAG: Search knowledge base for relevant context (test-chat)
        console.log('Test chat - RAG check:', {
            rag_enabled: assistant.rag_enabled,
            knowledge_base_ids: assistant.knowledge_base_ids,
            hasKBIds: assistant.knowledge_base_ids?.length > 0
        });
        
        if (assistant.rag_enabled && assistant.knowledge_base_ids && assistant.knowledge_base_ids.length > 0) {
            console.log('Test chat - RAG enabled, searching knowledge base for:', message?.slice(0, 50));
            const ragThreshold = parseFloat(assistant.rag_similarity_threshold) || 0.2;
            const ragMaxResults = parseInt(assistant.rag_max_results) || 10;
            const ragInstructions = assistant.rag_instructions || '';
            
            console.log('Test chat - RAG params:', { ragThreshold, ragMaxResults, kbIds: assistant.knowledge_base_ids });
            
            const ragDocuments = await searchKnowledgeBase(
                message,
                assistant.knowledge_base_ids,
                ragThreshold,
                ragMaxResults
            );
            
            console.log('Test chat - RAG search results:', ragDocuments?.length || 0, 'documents');
            
            // Always add RAG context (even if empty - this adds strict "no info" instructions)
            const ragContext = formatRAGContext(ragDocuments, ragInstructions);
            systemPrompt += ragContext;
            
            if (ragDocuments && ragDocuments.length > 0) {
                console.log(`Test chat - Injected RAG context from ${ragDocuments.length} documents`);
            } else {
                console.log('Test chat - No relevant documents found, added strict no-info instructions');
            }
        } else {
            console.log('Test chat - RAG not enabled or no KBs linked');
        }
        
        // Use the same resolveTemplateVariables function
        const resolvedSystemPrompt = resolveTemplateVariables(systemPrompt, templateContext);

        // Build messages array
        const messages = [{ role: 'system', content: resolvedSystemPrompt }];

        // Add first message as assistant's opening if this is the start of conversation
        if (conversationHistory.length === 0 && assistant.first_message) {
            messages.push({ role: 'assistant', content: assistant.first_message });
        }

        // Add conversation history
        for (const msg of conversationHistory) {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        }

        // Add the current user message
        messages.push({ role: 'user', content: message });

        const model = assistant.llm_model || 'gpt-4o';
        console.log('Test chat - Model:', model, 'Messages:', messages.length);

        // Call OpenAI - SAME as WhatsApp
        const completion = await openai.chat.completions.create({
            model: model,
            messages: messages,
            temperature: parseFloat(assistant.temperature) || 0.7,
            max_tokens: assistant.max_tokens || 1024,
        });

        const response = completion.choices[0]?.message?.content;
        
        if (!response) {
            return res.status(500).json({ error: 'No response from AI' });
        }

        // ===== BILLING: Log LLM usage and deduct credits (SAME as WhatsApp) =====
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        const modelUsed = assistant.llm_model || 'gpt-4o';
        const provider = assistant.llm_provider || 'openai';

        let usageCost = null;
        let newBalance = null;

        if (inputTokens > 0 || outputTokens > 0) {
            try {
                const { data: usageResult, error: usageError } = await supabase.rpc('log_llm_usage', {
                    p_user_id: billingUserId,
                    p_assistant_id: assistantId || null,
                    p_provider: provider,
                    p_model: modelUsed,
                    p_input_tokens: inputTokens,
                    p_output_tokens: outputTokens,
                    p_call_log_id: null,
                    p_conversation_id: null
                });

                if (usageError) {
                    console.error('Failed to log test chat LLM usage:', usageError);
                } else {
                    usageCost = usageResult?.cost_inr;
                    newBalance = usageResult?.balance;
                    console.log('Test chat LLM usage logged:', {
                        model: modelUsed,
                        inputTokens,
                        outputTokens,
                        cost: usageCost,
                        newBalance: newBalance
                    });
                }
            } catch (logError) {
                console.error('Error logging test chat LLM usage:', logError);
            }
        }

        res.json({ 
            response,
            model: model,
            assistantName: assistant.name,
            usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                cost: usageCost,
                balance: newBalance
            }
        });

    } catch (error) {
        console.error('Test chat error:', error);
        res.status(500).json({ error: error.message || 'Failed to process message' });
    }
});

// WhatsApp OAuth Callback

module.exports = router;
