// ============================================
// WHATSAPP WEBHOOK ROUTES - Incoming Messages
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, axios, openai } = require('../config');
const { getCachedWhatsAppConfig, getCachedAssistant } = require('../services/assistant');
const { isMessageProcessed, markMessageProcessed } = require('../services/cache');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
const { formatMemoryForPrompt } = require('../services/memory');

// ============================================
// WHATSAPP WEBHOOK ENDPOINTS
// ============================================

// Webhook Verification (GET) - Meta will call this to verify your webhook
router.get('/api/webhooks/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification request:', { mode, token, challenge });

    if (mode === 'subscribe') {
        // Look up the verify token in our database
        const { data: config, error } = await supabase
            .from('whatsapp_configs')
            .select('id, webhook_verify_token')
            .eq('webhook_verify_token', token)
            .single();

        if (config) {
            console.log('Webhook verified for config:', config.id);
            res.status(200).send(challenge);
        } else {
            console.log('Invalid verify token');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

// Webhook Events (POST) - Meta sends message/call events here
router.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
        const body = req.body;
        console.log('Webhook received:', JSON.stringify(body, null, 2));

        // Always respond 200 quickly to acknowledge receipt
        res.sendStatus(200);

        // Process the webhook asynchronously
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                const wabaId = entry.id;
                
                // 🚀 CACHED: Find the config for this WABA (fast Redis lookup)
                const config = await getCachedWhatsAppConfig(wabaId);

                if (!config) {
                    console.log('No config found for WABA:', wabaId);
                    continue;
                }

                for (const change of entry.changes || []) {
                    const field = change.field;
                    const value = change.value;

                    if (field === 'messages') {
                        // Handle incoming messages
                        await handleIncomingMessages(config, value);
                    } else if (field === 'message_status') {
                        // Handle message status updates
                        await handleMessageStatus(config, value);
                    } else if (field === 'calls') {
                        // Handle call events
                        await handleCallEvents(config, value);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Already sent 200, so just log the error
    }
});

// Handle incoming WhatsApp messages
async function handleIncomingMessages(config, value) {
    const messages = value.messages || [];
    const contacts = value.contacts || [];
    const metadata = value.metadata || {};

    for (const message of messages) {
        const contact = contacts.find(c => c.wa_id === message.from) || {};
        
        // Skip duplicate/old messages (older than 5 minutes)
        const messageTimestamp = parseInt(message.timestamp) * 1000;
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (messageTimestamp < fiveMinutesAgo) {
            console.log('Skipping old message (older than 5 min):', message.id, new Date(messageTimestamp).toISOString());
            continue;
        }

        // 🚀 FAST: Check Redis for duplicate (instead of DB query)
        if (await isMessageProcessed(message.id)) {
            console.log('Skipping duplicate message (Redis):', message.id);
            continue;
        }
        
        // Mark as processed immediately
        await markMessageProcessed(message.id);

        // Find or create customer for this phone number (for linking messages)
        const phoneNumber = '+' + message.from;
        const contactName = contact.profile?.name || 'WhatsApp User';
        let customerId = null;
        
        // Try to find existing customer
        let { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', config.user_id)
            .eq('phone_number', phoneNumber)
            .single();
        
        if (!customer) {
            // Create new customer
            const { data: newCustomer } = await supabase
                .from('customers')
                .insert({
                    user_id: config.user_id,
                    name: contactName,
                    phone_number: phoneNumber,
                    email: '',
                    variables: {},
                    has_memory: true
                })
                .select('id')
                .single();
            
            if (newCustomer) {
                customer = newCustomer;
                console.log('Created new customer for WhatsApp:', customer.id, contactName);
            }
        }
        
        if (customer) {
            customerId = customer.id;
        }

        // Upsert contact
        await supabase
            .from('whatsapp_contacts')
            .upsert({
                config_id: config.id,
                wa_id: message.from,
                phone_number: '+' + message.from,
                profile_name: contact.profile?.name,
                last_message_at: new Date().toISOString(),
                conversation_window_open: true,
                window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'config_id,wa_id' });

        // Store message
        const content = {};
        if (message.type === 'text') {
            content.body = message.text?.body;
        } else if (message.type === 'image') {
            content.mediaId = message.image?.id;
            content.caption = message.image?.caption;
        } else if (message.type === 'audio') {
            content.mediaId = message.audio?.id;
        } else if (message.type === 'video') {
            content.mediaId = message.video?.id;
            content.caption = message.video?.caption;
        } else if (message.type === 'document') {
            content.mediaId = message.document?.id;
            content.filename = message.document?.filename;
        } else if (message.type === 'location') {
            content.latitude = message.location?.latitude;
            content.longitude = message.location?.longitude;
            content.name = message.location?.name;
            content.address = message.location?.address;
        }

        const { data: insertedMessage } = await supabase
            .from('whatsapp_messages')
            .insert({
                wa_message_id: message.id,
                config_id: config.id,
                from_number: '+' + message.from,
                to_number: metadata.display_phone_number,
                direction: 'inbound',
                message_type: message.type,
                content: content,
                status: 'received',
                context_message_id: message.context?.id,
                message_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                customer_id: customerId
            })
            .select('id')
            .single();

        console.log('Stored incoming message:', message.id, 'Customer:', customerId);

        // Generate and store embedding for text messages (async, don't block)
        if (message.type === 'text' && content.body && customerId && insertedMessage?.id) {
            storeMessageEmbedding(insertedMessage.id, customerId, config.user_id, content.body, 'user')
                .catch(err => console.error('Failed to store embedding:', err.message));
        }

        // If chatbot is enabled, process with AI and send response
        if (config.chatbot_enabled && config.assistant_id && message.type === 'text') {
            await processWithAI(config, message, contact);
        }
    }
}

// ============================================
// AI CHATBOT PROCESSING
// ============================================

// Show typing indicator to the user
async function showTypingIndicator(config, messageId) {
    try {
        let accessToken = config.access_token?.trim().replace(/[\r\n]/g, '');
        if (accessToken?.includes('=')) {
            accessToken = accessToken.split('=').pop();
        }
        
        if (!accessToken) {
            console.error('No access token for typing indicator');
            return;
        }

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
                typing_indicator: {
                    type: 'text'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Typing indicator shown for message:', messageId);
        return response.data;
    } catch (error) {
        console.error('Failed to show typing indicator:', error.response?.data || error.message);
        // Don't throw - typing indicator is not critical
    }
}

// Process incoming message with AI and send response
async function processWithAI(config, message, contact) {
    try {
        console.log('Processing message with AI for assistant:', config.assistant_id);
        
        // Show typing indicator immediately so user knows we're processing
        await showTypingIndicator(config, message.id);

        // 🚀 CACHED: Fetch assistant configuration from Redis
        const assistant = await getCachedAssistant(config.assistant_id);

        if (!assistant) {
            console.error('Failed to fetch assistant:', config.assistant_id);
            return;
        }

        // Check if assistant is published (active) - don't process with draft assistants
        if (assistant.status !== 'active') {
            console.log('Assistant is not published (status:', assistant.status, ') - skipping AI processing');
            return;
        }

        // Log assistant settings including language and style
        // IMPORTANT: Default autoDetect to false so language enforcement works by default
        const langSettings = assistant.language_settings || { default: 'en', autoDetect: false };
        const styleSettings = assistant.style_settings || { mode: 'friendly' };
        console.log('Using assistant:', assistant.name, 
            'Model:', assistant.llm_model, 
            'Language:', langSettings.default, 
            'AutoDetect:', langSettings.autoDetect,
            'Style:', styleSettings.mode,
            'Memory:', assistant.memory_enabled);

        // 2. Get or create customer for this contact (for memory tracking AND dynamic variables)
        let customerId = null;
        let customerMemory = null;
        let customerData = null; // For dynamic variables
        
        const phoneNumber = '+' + message.from;
        const contactName = contact?.profile?.name || 'WhatsApp User';
        
        // Check if we need customer data (memory or dynamic variables enabled)
        const dynamicVariables = assistant.dynamic_variables || { enableSystemVariables: true, variables: [] };
        const needsCustomerData = assistant.memory_enabled || 
            dynamicVariables.enableSystemVariables || 
            (dynamicVariables.variables && dynamicVariables.variables.length > 0);
        
        if (needsCustomerData) {
            // Try to find existing customer
            let { data: customer } = await supabase
                .from('customers')
                .select('*')
                .eq('user_id', config.user_id)
                .eq('phone_number', phoneNumber)
                .single();
            
            if (!customer) {
                // Create new customer
                const { data: newCustomer, error: createError } = await supabase
                    .from('customers')
                    .insert({
                        user_id: config.user_id,
                        name: contactName,
                        phone_number: phoneNumber,
                        email: '',
                        variables: {},
                        has_memory: assistant.memory_enabled || false
                    })
                    .select('*')
                    .single();
                
                if (newCustomer) {
                    customer = newCustomer;
                    console.log('Created new customer:', customer.id);
                }
            }
            
            if (customer) {
                customerId = customer.id;
                customerData = customer; // Store full customer data for variables
                
                // Fetch customer memory context using the database function (only if memory enabled)
                if (assistant.memory_enabled) {
                    const { data: memoryContext, error: memoryError } = await supabase
                        .rpc('get_customer_context', { 
                            p_customer_id: customerId,
                            p_max_conversations: assistant.memory_config?.max_context_conversations || 5
                        });
                    
                    if (memoryContext && !memoryError) {
                        customerMemory = memoryContext;
                        console.log('Loaded customer memory for:', customerMemory?.customer?.name || customerId);
                    }
                }
            }
        }

        // 3. Get current message text first
        const currentMsgText = message.text?.body;
        
        // 4. Get recent history (last 6 messages) + semantically relevant messages
        // This hybrid approach ensures recent context + relevant past info
        const { data: recentHistory } = await supabase
            .from('whatsapp_messages')
            .select('id, direction, content, message_type, message_timestamp')
            .eq('config_id', config.id)
            .or(`from_number.eq.+${message.from},to_number.eq.+${message.from}`)
            .order('message_timestamp', { ascending: false })
            .limit(6); // Only last 6 messages for recent context
        
        // Reverse to get chronological order
        const history = recentHistory ? recentHistory.reverse() : [];
        
        // 5. If customer has embeddings, search for relevant past messages
        let relevantPastMessages = [];
        if (customerId && currentMsgText) {
            // Check if user is asking about something from the past
            const isRecallQuery = /recall|remember|order|previous|earlier|last time|before/i.test(currentMsgText);
            
            if (isRecallQuery) {
                console.log('Recall query detected, searching embeddings...');
                relevantPastMessages = await searchRelevantMessages(customerId, currentMsgText, 8);
                console.log(`Found ${relevantPastMessages.length} relevant past messages via embeddings`);
            }
        }

        // 6. Build messages array for OpenAI
        const messages = [];

        // System prompt - Use messaging_system_prompt for WhatsApp, fall back to system_prompt
        // This ensures WhatsApp uses the messaging-optimized prompt
        let systemPrompt = assistant.messaging_system_prompt || assistant.system_prompt || 
            'You are a helpful, friendly AI assistant. Be conversational and helpful.';
        
        // Prepend the assistant's identity if a name is set
        if (assistant.name) {
            systemPrompt = `Your name is ${assistant.name}. When asked about your name, always say you are ${assistant.name}.\n\n${systemPrompt}`;
        }
        
        // Inject Language Settings (use existing langSettings/styleSettings from above)
        const languageSettings = langSettings;
        
        // Build language instruction
        let languageInstruction = '';
        let languagePrefix = ''; // For prepending strict rule at the beginning
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
        const defaultLang = languageSettings.default || 'en';
        const langName = langNames[defaultLang] || defaultLang;
        
        if (languageSettings.autoDetect) {
            // Auto-detect ON: Respond in customer's language
            languageInstruction = `\n\nLANGUAGE: Detect the customer's language and respond in the same language they use. If they write in Hindi, respond in Hindi. If they write in Hinglish (Hindi in English letters), respond in Hinglish. Match their language preference.`;
        } else {
            // Auto-detect OFF: Always use the configured default language - VERY STRONG instruction
            // Add at BEGINNING to take highest priority
            languagePrefix = `[MANDATORY LANGUAGE: ${langName.toUpperCase()}] - All your responses in this conversation MUST be in ${langName}. This overrides any previous conversation patterns.\n\n`;
            languageInstruction = `\n\n⚠️ CRITICAL LANGUAGE RULE ⚠️: You MUST respond ONLY in ${langName}. This is a strict requirement that overrides everything else. 
- Even if the customer writes in Hindi, Hinglish, or any other language, YOUR response MUST be in ${langName}.
- Even if your previous responses in this conversation were in another language, you MUST now respond in ${langName}.
- Do NOT translate the customer's message - just respond in ${langName}.
- This rule is NON-NEGOTIABLE.`;
        }
        
        // Prepend language prefix if set (for strict language enforcement)
        if (languagePrefix) {
            systemPrompt = languagePrefix + systemPrompt;
        }
        
        // Build style instruction
        let styleInstruction = '';
        const styleMode = styleSettings.mode || 'friendly';
        switch (styleMode) {
            case 'professional':
                styleInstruction = `\n\nCOMMUNICATION STYLE: Be professional and formal. Use polished language, proper grammar, and structured responses. Avoid slang, contractions, or casual expressions.`;
                break;
            case 'friendly':
                styleInstruction = `\n\nCOMMUNICATION STYLE: Be warm, friendly, and conversational. Use a relaxed tone, feel free to use casual language, and be personable.`;
                break;
            case 'concise':
                styleInstruction = `\n\nCOMMUNICATION STYLE: Be brief and direct. Give short, to-the-point answers. Avoid unnecessary words or explanations unless specifically asked.`;
                break;
            case 'adaptive':
                const adaptiveConfig = styleSettings.adaptiveConfig || {};
                styleInstruction = `\n\nCOMMUNICATION STYLE: Adapt your style to match the customer's communication pattern.`;
                if (adaptiveConfig.mirrorFormality) {
                    styleInstruction += ` If they're formal, be formal. If they're casual, be casual.`;
                }
                if (adaptiveConfig.mirrorLength) {
                    styleInstruction += ` Match their message length - brief replies to brief messages, detailed responses to detailed questions.`;
                }
                if (adaptiveConfig.mirrorVocabulary) {
                    styleInstruction += ` Use similar vocabulary complexity as they do.`;
                }
                break;
        }
        
        // Add language and style to system prompt
        if (languageInstruction) {
            systemPrompt += languageInstruction;
        }
        if (styleInstruction) {
            systemPrompt += styleInstruction;
        }
        
        // Inject customer memory if available
        if (customerMemory && assistant.memory_enabled) {
            const memoryConfig = assistant.memory_config || {};
            const memoryContext = formatMemoryForPrompt(customerMemory, memoryConfig);
            if (memoryContext) {
                systemPrompt = `${systemPrompt}\n\n${memoryContext}`;
                console.log('Injected memory context for customer');
            }
        }
        
        // Add relevant past messages as context (from embeddings search)
        if (relevantPastMessages.length > 0) {
            systemPrompt += '\n\n--- RELEVANT PAST CONTEXT ---\n';
            systemPrompt += 'Here are relevant messages from past conversations:\n';
            relevantPastMessages.forEach((msg, i) => {
                const speaker = msg.role === 'user' ? 'Customer' : 'You';
                systemPrompt += `${speaker}: ${msg.content}\n`;
            });
            systemPrompt += '--- END PAST CONTEXT ---';
        }
        
        // 🔍 RAG: Search knowledge base for relevant context
        if (assistant.rag_enabled && assistant.knowledge_base_ids && assistant.knowledge_base_ids.length > 0) {
            console.log('RAG enabled - searching knowledge base for:', currentMsgText?.slice(0, 50));
            const ragThreshold = assistant.rag_similarity_threshold || 0.5;
            const ragMaxResults = assistant.rag_max_results || 5;
            
            const ragDocuments = await searchKnowledgeBase(
                currentMsgText,
                assistant.knowledge_base_ids,
                ragThreshold,
                ragMaxResults
            );
            
            if (ragDocuments.length > 0) {
                const ragContext = formatRAGContext(ragDocuments);
                systemPrompt += ragContext;
                console.log(`Injected RAG context from ${ragDocuments.length} documents`);
            } else {
                console.log('No relevant RAG documents found');
            }
        }
        
        // Resolve dynamic variables in system prompt
        const templateContext = {
            enableSystemVariables: dynamicVariables.enableSystemVariables,
            timezone: assistant.timezone || 'Asia/Kolkata',
            assistantName: assistant.name,
            customer: customerData ? {
                name: customerData.name,
                phone: customerData.phone_number,
                email: customerData.email,
                variables: customerData.variables || {}
            } : null,
            customVariables: dynamicVariables.variables || []
        };
        
        const resolvedSystemPrompt = resolveTemplateVariables(systemPrompt, templateContext);
        
        // Log if any variables were resolved
        if (systemPrompt !== resolvedSystemPrompt) {
            console.log('Resolved dynamic variables in system prompt');
        }
        
        messages.push({
            role: 'system',
            content: resolvedSystemPrompt
        });

        // Add recent conversation history (last 6 messages only)
        if (history && history.length > 0) {
            for (const msg of history) {
                if (msg.message_type === 'text' && msg.content?.body) {
                    messages.push({
                        role: msg.direction === 'inbound' ? 'user' : 'assistant',
                        content: msg.content.body
                    });
                }
            }
        }

        // Add current message (if not already in history)
        if (currentMsgText) {
            // Check if last message in history is the same
            const lastHistoryMsg = history?.[history.length - 1];
            if (!lastHistoryMsg || lastHistoryMsg.content?.body !== currentMsgText) {
                messages.push({
                    role: 'user',
                    content: currentMsgText
                });
            }
        }

        console.log('Sending to OpenAI with', messages.length, 'messages (optimized with embeddings)');

        // 4. Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: assistant.llm_model || 'gpt-4o',
            messages: messages,
            temperature: parseFloat(assistant.temperature) || 0.7,
            max_tokens: assistant.max_tokens || 1024
        });

        const aiResponse = completion.choices[0]?.message?.content;

        if (!aiResponse) {
            console.error('No response from OpenAI');
            return;
        }

        console.log('AI Response:', aiResponse.substring(0, 100) + '...');

        // 5. Log LLM usage and deduct credits
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        const modelUsed = assistant.llm_model || 'gpt-4o';
        const provider = assistant.llm_provider || 'openai';

        if (inputTokens > 0 || outputTokens > 0) {
            try {
                const { data: usageResult, error: usageError } = await supabase.rpc('log_llm_usage', {
                    p_user_id: config.user_id,
                    p_assistant_id: assistant.id,
                    p_provider: provider,
                    p_model: modelUsed,
                    p_input_tokens: inputTokens,
                    p_output_tokens: outputTokens,
                    p_call_log_id: null,
                    p_conversation_id: null
                });

                if (usageError) {
                    console.error('Failed to log LLM usage:', usageError);
                } else {
                    console.log('LLM usage logged:', {
                        model: modelUsed,
                        inputTokens,
                        outputTokens,
                        cost: usageResult?.cost_inr,
                        newBalance: usageResult?.balance
                    });
                }
            } catch (logError) {
                console.error('Error logging LLM usage:', logError);
            }
        }

        // 6. Send reply via WhatsApp API (pass customerId to link message)
        await sendWhatsAppReply(config, message.from, aiResponse, customerId);
        
        // 7. If memory is enabled, store conversation record and analyze for insights
        if (assistant.memory_enabled && customerId) {
            try {
                // Build transcript from current exchange
                const transcript = [];
                
                // Add history messages
                if (history && history.length > 0) {
                    for (const msg of history) {
                        if (msg.message_type === 'text' && msg.content?.body) {
                            transcript.push({
                                role: msg.direction === 'inbound' ? 'user' : 'assistant',
                                content: msg.content.body,
                                timestamp: msg.message_timestamp
                            });
                        }
                    }
                }
                
                // Add current exchange
                if (currentMsgText) {
                    transcript.push({
                        role: 'user',
                        content: currentMsgText,
                        timestamp: new Date().toISOString()
                    });
                }
                transcript.push({
                    role: 'assistant',
                    content: aiResponse,
                    timestamp: new Date().toISOString()
                });
                
                // Update customer interaction stats immediately
                const userMessages = transcript.filter(m => m.role === 'user');
                const userMessageCount = userMessages.length;
                
                await supabase
                    .from('customers')
                    .update({
                        last_interaction: new Date().toISOString(),
                        has_memory: true,
                        interaction_count: userMessageCount
                    })
                    .eq('id', customerId);
                
                // Analyze conversation every 3 user messages
                const shouldAnalyze = userMessageCount >= 3 && userMessageCount % 3 === 0;
                console.log(`User messages: ${userMessageCount}, Should analyze: ${shouldAnalyze}`);
                
                if (shouldAnalyze && assistant.memory_config?.extractInsights) {
                    console.log('Analyzing conversation for insights...');
                    const analysis = await analyzeConversationWithAI(transcript.slice(-10), assistant.name);
                    
                    if (analysis) {
                        // Update customer with extracted info (email, name, etc.)
                        if (analysis.extractedInfo) {
                            const updateData = {};
                            if (analysis.extractedInfo.email) {
                                updateData.email = analysis.extractedInfo.email;
                                console.log('Extracted email:', analysis.extractedInfo.email);
                            }
                            if (analysis.extractedInfo.name) {
                                updateData.name = analysis.extractedInfo.name;
                                console.log('Extracted name:', analysis.extractedInfo.name);
                            }
                            if (analysis.extractedInfo.address || analysis.extractedInfo.company) {
                                // Store in variables
                                const { data: currentCustomer } = await supabase
                                    .from('customers')
                                    .select('variables')
                                    .eq('id', customerId)
                                    .single();
                                
                                updateData.variables = {
                                    ...(currentCustomer?.variables || {}),
                                    ...(analysis.extractedInfo.address && { address: analysis.extractedInfo.address }),
                                    ...(analysis.extractedInfo.company && { company: analysis.extractedInfo.company })
                                };
                            }
                            
                            if (Object.keys(updateData).length > 0) {
                                await supabase
                                    .from('customers')
                                    .update(updateData)
                                    .eq('id', customerId);
                                console.log('Updated customer with extracted info:', Object.keys(updateData));
                            }
                        }
                        
                        // Store/update conversation record with analysis (channel = whatsapp)
                        // Check if there's an existing conversation from today for this customer
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        const { data: existingConv } = await supabase
                            .from('customer_conversations')
                            .select('id')
                            .eq('customer_id', customerId)
                            .eq('channel', 'whatsapp')
                            .gte('started_at', today.toISOString())
                            .order('started_at', { ascending: false })
                            .limit(1)
                            .single();
                        
                        if (existingConv) {
                            // Update existing conversation
                            const { error: convError } = await supabase
                                .from('customer_conversations')
                                .update({
                                    transcript: transcript,
                                    summary: analysis.summary,
                                    key_points: analysis.keyPoints || [],
                                    sentiment: analysis.sentiment,
                                    sentiment_score: analysis.sentimentScore,
                                    topics_discussed: analysis.topicsDiscussed || [],
                                    action_items: analysis.actionItems || [],
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', existingConv.id);
                            
                            if (convError) {
                                console.error('Error updating conversation:', convError);
                            } else {
                                console.log('Updated existing conversation for customer:', customerId);
                            }
                        } else {
                            // Create new conversation
                            const { error: convError } = await supabase
                                .from('customer_conversations')
                                .insert({
                                    customer_id: customerId,
                                    assistant_id: assistant.id,
                                    user_id: config.user_id,
                                    channel: 'whatsapp',
                                    call_direction: 'inbound',
                                    started_at: new Date(history?.[0]?.message_timestamp || Date.now()).toISOString(),
                                    transcript: transcript,
                                    summary: analysis.summary,
                                    key_points: analysis.keyPoints || [],
                                    sentiment: analysis.sentiment,
                                    sentiment_score: analysis.sentimentScore,
                                    topics_discussed: analysis.topicsDiscussed || [],
                                    action_items: analysis.actionItems || []
                                });
                            
                            if (convError) {
                                console.error('Error storing conversation:', convError);
                            } else {
                                console.log('Created new conversation for customer:', customerId);
                            }
                        }
                        
                        // Store extracted insights
                        if (analysis.insights && analysis.insights.length > 0) {
                            const insightsToInsert = analysis.insights.map(insight => ({
                                customer_id: customerId,
                                user_id: config.user_id,
                                insight_type: insight.type || 'custom',
                                content: insight.content,
                                importance: insight.importance || 'medium',
                                confidence: 0.8
                            }));
                            
                            const { error: insightError } = await supabase
                                .from('customer_insights')
                                .insert(insightsToInsert);
                            
                            if (insightError) {
                                console.error('Error storing insights:', insightError);
                            } else {
                                console.log('Stored', insightsToInsert.length, 'insights for customer');
                            }
                        }
                    }
                }
            } catch (memoryError) {
                console.error('Error updating customer memory:', memoryError);
                // Don't throw - memory update failure shouldn't break the main flow
            }
        }

    } catch (error) {
        console.error('AI processing error:', error);
    }
}

// Send WhatsApp reply message
async function sendWhatsAppReply(config, toNumber, text, customerId = null) {
    try {
        // Clean the access token (remove any newlines, whitespace, and strip prefix if exists)
        let accessToken = config.access_token?.trim().replace(/[\r\n]/g, '');
        
        // Strip common prefixes that might be accidentally stored
        if (accessToken?.includes('=')) {
            accessToken = accessToken.split('=').pop();
        }
        
        if (!accessToken) {
            console.error('No access token found for config:', config.id);
            return;
        }

        console.log('Sending WhatsApp reply to:', toNumber, 'Token length:', accessToken.length);

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toNumber,
                type: 'text',
                text: {
                    body: text,
                    preview_url: false
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const waMessageId = response.data?.messages?.[0]?.id;
        console.log('WhatsApp reply sent:', waMessageId);

        // Store outbound message in database
        const { data: insertedOutbound } = await supabase
            .from('whatsapp_messages')
            .insert({
                wa_message_id: waMessageId,
                config_id: config.id,
                from_number: config.display_phone_number,
                to_number: '+' + toNumber,
                direction: 'outbound',
                message_type: 'text',
                content: { body: text },
                status: 'sent',
                is_from_bot: true,
                assistant_id: config.assistant_id,
                message_timestamp: new Date().toISOString(),
                customer_id: customerId
            })
            .select('id')
            .single();

        // Generate and store embedding for outbound message (async, don't block)
        if (text && customerId && insertedOutbound?.id) {
            storeMessageEmbedding(insertedOutbound.id, customerId, config.user_id, text, 'assistant')
                .catch(err => console.error('Failed to store outbound embedding:', err.message));
        }

        return waMessageId;
    } catch (error) {
        console.error('Failed to send WhatsApp reply:', error.response?.data || error.message);
        throw error;
    }
}

// Handle message status updates (sent, delivered, read)
async function handleMessageStatus(config, value) {
    const statuses = value.statuses || [];

    for (const status of statuses) {
        const updateData = {
            status: status.status
        };

        if (status.status === 'delivered') {
            updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        } else if (status.status === 'read') {
            updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        }

        await supabase
            .from('whatsapp_messages')
            .update(updateData)
            .eq('wa_message_id', status.id);

        console.log('Updated message status:', status.id, status.status);
    }
}

// Handle WhatsApp call events
async function handleCallEvents(config, value) {
    const calls = value.calls || [];

    for (const call of calls) {
        // Upsert call record
        await supabase
            .from('whatsapp_calls')
            .upsert({
                wa_call_id: call.id,
                config_id: config.id,
                from_number: '+' + call.from,
                to_number: '+' + call.to,
                direction: call.direction || 'inbound',
                status: call.status,
                started_at: call.timestamp ? new Date(parseInt(call.timestamp) * 1000).toISOString() : null,
                duration_seconds: call.duration
            }, { onConflict: 'config_id,wa_call_id' });

        console.log('Processed call event:', call.id, call.status);
    }
}

router.get('/test-db', async (req, res) => {
  try {
    // Just check if we can connect. Querying a table that might be empty is fine.
    // We'll query 'voices' table, limit 1.
    const { data, error } = await supabase.from('voices').select('*').limit(1);
    
    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }
    
    res.json({ message: 'Database connection successful', data });
  } catch (error) {
    console.error('Catch error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});


module.exports = router;
