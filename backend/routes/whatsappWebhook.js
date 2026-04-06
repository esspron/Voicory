// ============================================
// WHATSAPP WEBHOOK ROUTES - Incoming Messages
// Uses the centralized AssistantProcessor for AI logic
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, axios, openai } = require('../config');
const { getCachedWhatsAppConfig, getCachedAssistant } = require('../services/assistant');
const { isMessageProcessed, markMessageProcessed, cacheDelete } = require('../services/cache');
const { processMessage } = require('../services/assistantProcessor');
const { getCustomerMemory } = require('../services/memory');
const { pushCallToAllCRMs } = require('../services/crm');
const billing = require('../services/billing');

// ============================================
// WHATSAPP WEBHOOK ENDPOINTS
// ============================================

// Webhook Verification (GET) - Meta will call this to verify your webhook
router.get('/', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification request:', { mode, challenge }); // token omitted from logs

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
router.post('/', async (req, res) => {
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
// REFACTORED: Uses centralized AssistantProcessor for all AI logic
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

        // Get current message text
        const currentMsgText = message.text?.body;
        if (!currentMsgText) {
            console.log('No text content in message, skipping AI processing');
            return;
        }

        // === WHATSAPP-SPECIFIC: Get or create customer for memory tracking ===
        let customerId = null;
        let customerData = null;
        
        const phoneNumber = '+' + message.from;
        const contactName = contact?.profile?.name || 'WhatsApp User';
        
        // Check if we need customer data (memory or dynamic variables enabled)
        const dynamicVariables = assistant.dynamic_variables || { enableSystemVariables: true, variables: [] };
        const needsCustomerData = assistant.memory_enabled || 
            dynamicVariables.enableSystemVariables || 
            (dynamicVariables.variables && dynamicVariables.variables.length > 0);
        
        if (needsCustomerData) {
            let { data: customer } = await supabase
                .from('customers')
                .select('*')
                .eq('user_id', config.user_id)
                .eq('phone_number', phoneNumber)
                .single();
            
            if (!customer) {
                const { data: newCustomer } = await supabase
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
                customerData = customer;
            }
        }

        // === WHATSAPP-SPECIFIC: Get conversation history ===
        const { data: recentHistory } = await supabase
            .from('whatsapp_messages')
            .select('id, direction, content, message_type, message_timestamp')
            .eq('config_id', config.id)
            .or(`from_number.eq.+${message.from},to_number.eq.+${message.from}`)
            .order('message_timestamp', { ascending: false })
            .limit(6);
        
        // Convert to format expected by AssistantProcessor
        const history = recentHistory ? recentHistory.reverse() : [];
        const conversationHistory = history
            .filter(msg => msg.message_type === 'text' && msg.content?.body)
            .map(msg => ({
                role: msg.direction === 'inbound' ? 'user' : 'assistant',
                content: msg.content.body
            }));

        // === FETCH CUSTOMER MEMORY (if enabled) ===
        let memoryContext = null;
        if (assistant.memory_enabled && customerId) {
            memoryContext = await getCustomerMemory(customerId, config.user_id, assistant.memory_config);
        }

        // === USE CENTRALIZED PROCESSOR FOR AI LOGIC ===
        // Convert database assistant format to assistantConfig format
        // Now using unified 'instruction' field
        const assistantConfig = {
            name: assistant.name,
            instruction: assistant.instruction,
            llmModel: assistant.llm_model,
            llmProvider: assistant.llm_provider,
            temperature: assistant.temperature,
            maxTokens: assistant.max_tokens,
            languageSettings: assistant.language_settings,
            styleSettings: assistant.style_settings,
            ragEnabled: assistant.rag_enabled,
            knowledgeBaseIds: assistant.knowledge_base_ids,
            ragSimilarityThreshold: assistant.rag_similarity_threshold,
            ragMaxResults: assistant.rag_max_results,
            ragInstructions: assistant.rag_instructions,
            memoryEnabled: assistant.memory_enabled,
            memoryConfig: assistant.memory_config,
            dynamicVariables: assistant.dynamic_variables,
            timezone: assistant.timezone
        };

        // === PRE-FLIGHT BALANCE CHECK (WhatsApp) ===
        const { hasCredits: waHasCredits } = await billing.checkBalance(config.user_id);
        if (!waHasCredits) {
            console.warn(`[billing] WhatsApp: zero balance for user=${config.user_id}, sending low-credit reply`);
            await sendWhatsAppReply(config, message.from,
                'Your AI assistant has run out of credits. Please top up at app.voicory.com',
                customerId);
            return;
        }

        // Process message using centralized processor
        const result = await processMessage({
            message: currentMsgText,
            assistantConfig,
            conversationHistory,
            customer: customerData,
            memory: memoryContext,
            userId: config.user_id,
            channel: 'whatsapp'
        });

        if (!result || !result.response) {
            console.error('No response from AssistantProcessor');
            return;
        }

        const aiResponse = result.response;
        console.log('AI Response (via AssistantProcessor):', aiResponse.substring(0, 100) + '...');
        if (result.ragUsed) {
            console.log(`RAG used: ${result.documentsFound || 0} documents`);
        }

        // === LOG LLM USAGE (central billing service) ===
        if (result.usage?.inputTokens > 0 || result.usage?.outputTokens > 0) {
            billing.deductMessageCost(config.user_id, {
                model:        assistantConfig.llmModel || result.usage.model || 'gpt-4o-mini',
                inputTokens:  result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                assistantId:  assistant.id,
                channel:      'whatsapp',
                callLogId:    null,
                conversationId: null,
            }).then(() => cacheDelete(`credits:${config.user_id}`))
              .catch(e => console.error('[billing] WhatsApp deductMessageCost error:', e.message));
        }

        // === WHATSAPP-SPECIFIC: Send reply ===
        await sendWhatsAppReply(config, message.from, aiResponse, customerId);

        // === CRM SYNC: Push WhatsApp conversation to CRM integrations (non-blocking) ===
        setImmediate(async () => {
            try {
                const callDataForCRM = {
                    phoneNumber: '+' + message.from,
                    direction: 'inbound',
                    duration: 0,
                    outcome: 'whatsapp',
                    summary: `WhatsApp: ${currentMsgText?.substring(0, 100)}`,
                    transcript: `User: ${currentMsgText}\nAssistant: ${aiResponse}`,
                    startedAt: new Date().toISOString(),
                    endedAt: new Date().toISOString(),
                    callSid: message.id,
                    assistantName: assistant.name || 'AI Assistant',
                };
                await pushCallToAllCRMs(config.user_id, callDataForCRM);
            } catch (crmErr) {
                console.error('[CRM] WhatsApp push failed:', crmErr.message);
            }
        });
        
        // === WHATSAPP-SPECIFIC: Memory analysis ===
        if (assistant.memory_enabled && customerId) {
            try {
                // Build transcript from current exchange
                const transcript = [];
                
                for (const msg of history) {
                    if (msg.message_type === 'text' && msg.content?.body) {
                        transcript.push({
                            role: msg.direction === 'inbound' ? 'user' : 'assistant',
                            content: msg.content.body,
                            timestamp: msg.message_timestamp
                        });
                    }
                }
                
                // Add current exchange
                transcript.push({
                    role: 'user',
                    content: currentMsgText,
                    timestamp: new Date().toISOString()
                });
                transcript.push({
                    role: 'assistant',
                    content: aiResponse,
                    timestamp: new Date().toISOString()
                });
                
                // Update customer interaction stats
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
                
                if (shouldAnalyze && assistant.memory_config?.extractInsights) {
                    console.log('Analyzing conversation for insights...');
                    const analysis = await analyzeConversationWithAI(transcript.slice(-10), assistant.name);
                    
                    if (analysis) {
                        // Update customer with extracted info
                        if (analysis.extractedInfo) {
                            const updateData = {};
                            if (analysis.extractedInfo.email) {
                                updateData.email = analysis.extractedInfo.email;
                            }
                            if (analysis.extractedInfo.name) {
                                updateData.name = analysis.extractedInfo.name;
                            }
                            if (analysis.extractedInfo.address || analysis.extractedInfo.company) {
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
                        
                        // Store/update conversation record
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
                            await supabase
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
                            console.log('Updated existing conversation for customer:', customerId);
                        } else {
                            await supabase
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
                            console.log('Created new conversation for customer:', customerId);
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
                            
                            await supabase
                                .from('customer_insights')
                                .insert(insightsToInsert);
                            console.log('Stored', insightsToInsert.length, 'insights for customer');
                        }
                    }
                }
            } catch (memoryError) {
                console.error('Error updating customer memory:', memoryError);
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
