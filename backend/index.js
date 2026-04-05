const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const OpenAI = require('openai');
const crypto = require('crypto');

// ============================================
// PROCESS-LEVEL CRASH PROTECTION
// ============================================
process.on('uncaughtException', (err) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'uncaughtException',
    message: err.message,
    stack: err.stack
  }));
});
process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'unhandledRejection',
    message: String(reason)
  }));
});

// Only load .env file in development (Railway injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Initialize OpenAI client (will be null if API key not set)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI client initialized');
} else {
    console.warn('⚠️ OPENAI_API_KEY not set - AI features will be disabled');
}

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration for production
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000',
        'https://voicory.vercel.app',
        'https://voicory.com',
        'https://www.voicory.com',
        'https://app.voicory.com',
        /\.vercel\.app$/,
        /\.railway\.app$/,
        /\.run\.app$/
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Twilio webhook form-encoded payloads

// ============================================
// REQUEST ID + SLOW REQUEST LOGGING MIDDLEWARE
// ============================================
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  req._startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req._startTime;
    if (duration > 2000) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'slow_request',
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration
      }));
    }
  });
  next();
});

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for backend operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// EMBEDDING FUNCTIONS (Token Optimization)
// ============================================

// Generate embedding for text using OpenAI
async function generateEmbedding(text) {
    if (!openai || !text) return null;
    
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000) // Max 8K chars
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        return null;
    }
}

// Store message embedding
async function storeMessageEmbedding(messageId, customerId, userId, content, role) {
    if (!content || content.length < 5) return; // Skip very short messages
    
    const embedding = await generateEmbedding(content);
    if (!embedding) return;
    
    try {
        await supabase
            .from('message_embeddings')
            .insert({
                message_id: messageId,
                customer_id: customerId,
                user_id: userId,
                content: content,
                role: role,
                embedding: embedding
            });
        console.log('Stored embedding for message');
    } catch (error) {
        console.error('Error storing embedding:', error.message);
    }
}

// Search for relevant messages using semantic similarity
async function searchRelevantMessages(customerId, query, limit = 8) {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return [];
    
    try {
        const { data, error } = await supabase.rpc('search_customer_messages', {
            p_customer_id: customerId,
            p_query_embedding: queryEmbedding,
            p_limit: limit
        });
        
        if (error) {
            console.error('Error searching messages:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error in semantic search:', error.message);
        return [];
    }
}

// ============================================
// DYNAMIC VARIABLES TEMPLATE RESOLUTION
// ============================================

/**
 * Resolve {{variable}} placeholders in text using customer data and assistant context
 * Similar to ElevenLabs dynamic variables system
 * 
 * @param {string} text - Text containing {{variable}} placeholders
 * @param {Object} context - Context object with variable values
 * @returns {string} - Text with variables resolved
 */
function resolveTemplateVariables(text, context = {}) {
    if (!text || typeof text !== 'string') return text;
    
    // Build the variables map
    const variables = {};
    
    // System variables (auto-available)
    if (context.enableSystemVariables !== false) {
        const now = new Date();
        const timezone = context.timezone || 'Asia/Kolkata';
        
        try {
            const formatter = new Intl.DateTimeFormat('en-US', { 
                timeZone: timezone, 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            const dateFormatter = new Intl.DateTimeFormat('en-US', { 
                timeZone: timezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            variables.current_time = formatter.format(now);
            variables.current_date = dateFormatter.format(now);
        } catch (e) {
            variables.current_time = now.toLocaleTimeString();
            variables.current_date = now.toLocaleDateString();
        }
        
        // Assistant info
        if (context.assistantName) {
            variables.assistant_name = context.assistantName;
        }
    }
    
    // Customer variables (from customer profile)
    if (context.customer) {
        const c = context.customer;
        variables.customer_name = c.name || '';
        variables.customer_phone = c.phone || c.phone_number || '';
        variables.customer_email = c.email || '';
        
        // Customer custom variables
        if (c.variables && typeof c.variables === 'object') {
            Object.entries(c.variables).forEach(([key, value]) => {
                variables[key] = value;
            });
        }
    }
    
    // Custom variables from assistant definition (with placeholders)
    if (context.customVariables && Array.isArray(context.customVariables)) {
        context.customVariables.forEach(varDef => {
            // Only use placeholder if value not already set
            if (varDef.name && varDef.placeholder && !variables[varDef.name]) {
                variables[varDef.name] = varDef.placeholder;
            }
        });
    }
    
    // Override with any explicitly passed values
    if (context.variables && typeof context.variables === 'object') {
        Object.entries(context.variables).forEach(([key, value]) => {
            variables[key] = value;
        });
    }
    
    // Replace {{variable}} patterns
    const resolved = text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, varName) => {
        const value = variables[varName.toLowerCase()];
        if (value !== undefined && value !== null && value !== '') {
            return String(value);
        }
        // If variable not found, leave placeholder for debugging
        return `[${varName}]`;
    });
    
    return resolved;
}

// ============================================
// CUSTOMER MEMORY HELPER FUNCTIONS
// ============================================

// Format customer memory context for injection into system prompt
function formatMemoryForPrompt(memoryContext, memoryConfig = {}) {
    if (!memoryContext) return '';
    
    const lines = [];
    lines.push('--- CUSTOMER MEMORY ---');
    
    // Customer basic info
    if (memoryContext.customer) {
        const c = memoryContext.customer;
        lines.push(`Customer: ${c.name || 'Unknown'}`);
        if (c.phone) lines.push(`Phone: ${c.phone}`);
    }
    
    // Memory/relationship overview
    if (memoryContext.memory && memoryConfig.includeSummary !== false) {
        const m = memoryContext.memory;
        lines.push('');
        lines.push('Relationship:');
        if (m.totalConversations) lines.push(`- Total conversations: ${m.totalConversations}`);
        if (m.lastContact) lines.push(`- Last contact: ${new Date(m.lastContact).toLocaleDateString()}`);
        if (m.averageSentiment !== undefined && m.averageSentiment !== null) {
            const sentiment = m.averageSentiment > 0.3 ? 'Positive' : m.averageSentiment < -0.3 ? 'Negative' : 'Neutral';
            lines.push(`- Overall sentiment: ${sentiment}`);
        }
        if (m.engagementScore) lines.push(`- Engagement score: ${m.engagementScore}/100`);
        
        // Personality and preferences
        if (m.personalityTraits && m.personalityTraits.length > 0) {
            lines.push('');
            lines.push(`Personality: ${m.personalityTraits.join(', ')}`);
        }
        
        if (m.interests && m.interests.length > 0) {
            lines.push('');
            lines.push(`Interests: ${m.interests.join(', ')}`);
        }
        
        if (m.painPoints && m.painPoints.length > 0) {
            lines.push('');
            lines.push(`Pain points: ${m.painPoints.join(', ')}`);
        }
        
        // Executive summary
        if (m.executiveSummary) {
            lines.push('');
            lines.push(`Summary: ${m.executiveSummary}`);
        }
    }
    
    // Recent conversations
    if (memoryContext.recentConversations && memoryContext.recentConversations.length > 0 && memoryConfig.rememberConversations !== false) {
        lines.push('');
        lines.push('--- RECENT CONVERSATIONS ---');
        memoryContext.recentConversations.slice(0, 3).forEach((conv, i) => {
            const date = new Date(conv.startedAt).toLocaleDateString();
            const outcome = conv.outcome ? ` (${conv.outcome})` : '';
            lines.push(`[${i + 1}] ${date}${outcome}`);
            if (conv.summary) lines.push(`Summary: ${conv.summary}`);
            if (conv.keyPoints && conv.keyPoints.length > 0) {
                lines.push('Key points:');
                conv.keyPoints.forEach(point => lines.push(`  - ${point}`));
            }
            lines.push('');
        });
    }
    
    // Key insights
    if (memoryContext.keyInsights && memoryContext.keyInsights.length > 0 && memoryConfig.includeInsights !== false) {
        lines.push('--- KEY INSIGHTS ---');
        memoryContext.keyInsights.slice(0, 10).forEach(insight => {
            const type = insight.insightType?.toUpperCase() || 'INFO';
            lines.push(`[${type}] ${insight.content}`);
        });
    }
    
    lines.push('--- END MEMORY ---');
    
    return lines.join('\n');
}

// Analyze conversation and extract insights using AI
async function analyzeConversationWithAI(transcript, assistantName) {
    try {
        const messages = transcript.map(m => `${m.role === 'user' ? 'Customer' : assistantName}: ${m.content}`).join('\n');
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Use cheaper model for analysis
            messages: [
                {
                    role: 'system',
                    content: `You are an expert at analyzing customer conversations. Extract insights and customer information from the following conversation.

Return a JSON object with:
{
    "summary": "Brief 1-2 sentence summary of the conversation",
    "keyPoints": ["key point 1", "key point 2"],
    "sentiment": "positive" | "neutral" | "negative",
    "sentimentScore": -1.0 to 1.0,
    "topicsDiscussed": ["topic1", "topic2"],
    "insights": [
        {"type": "preference" | "objection" | "interest" | "pain_point" | "opportunity" | "personal_info", "content": "insight text", "importance": "low" | "medium" | "high"}
    ],
    "actionItems": [{"task": "follow up on X", "priority": "high" | "medium" | "low"}],
    "extractedInfo": {
        "email": "customer's email if mentioned, otherwise null",
        "name": "customer's full name if mentioned differently from profile, otherwise null",
        "address": "address if mentioned, otherwise null",
        "company": "company name if mentioned, otherwise null"
    }
}`
                },
                {
                    role: 'user',
                    content: `Analyze this conversation:\n\n${messages}`
                }
            ],
            temperature: 0.3,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });
        
        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
        return result;
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        return null;
    }
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'Voicory Backend',
        timestamp: new Date().toISOString()
    });
});

// Health check for Railway/Cloud Run — enhanced with dependency checks
app.get('/health', async (req, res) => {
  const checks = {};
  let status = 'healthy';

  // Check Supabase
  try {
    const { error } = await supabase.from('assistants').select('id').limit(1);
    checks.supabase = error ? 'error' : 'ok';
    if (error) status = 'degraded';
  } catch (e) {
    checks.supabase = 'error';
    status = 'degraded';
  }

  // Check Redis
  try {
    const { getRedis } = require('./services/cache');
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'not configured';
    }
  } catch (e) {
    checks.redis = 'error';
    status = 'degraded';
  }

  res.json({
    status,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks
  });
});


// ============================================
// RATE LIMITING
// ============================================
const rateLimit = require('express-rate-limit');

// General API rate limiter: 100 req per 15 min
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strict limiter for expensive endpoints: 10 req per min
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for this endpoint.' }
});

app.use('/api/', apiLimiter);
app.use('/api/test-chat', strictLimiter);
// Note: /api/twilio is NOT rate-limited with strictLimiter — Twilio webhooks need unrestricted access

// ============================================
// MODULAR ROUTES - Use centralized AssistantProcessor
// ============================================
const testChatRoutes = require('./routes/testChat');
const twilioRoutes = require('./routes/twilio');
const whatsappOAuthRoutes = require('./routes/whatsappOAuth');
const paddleRoutes = require('./routes/paddle');
const crmRoutes = require('./routes/crm');
const outboundDialerRoutes = require('./routes/outboundDialer');
const tcpaRoutes = require('./routes/tcpa');
const leadScoringRoutes = require('./routes/leadScoring');
const appointmentsRoutes = require('./routes/appointments');
const livekitRoutes = require('./routes/livekit');
const paymentsRoutes = require('./routes/payments');
const crawlerRoutes = require('./routes/crawler');
const couponsRoutes = require('./routes/coupons');
const integrationsRoutes = require('./routes/integrations');
const customersRoutes = require('./routes/customers');

app.use('/api', testChatRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/whatsapp', whatsappOAuthRoutes);
app.use('/api/paddle', paddleRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/outbound-dialer', outboundDialerRoutes);
app.use('/api/tcpa', tcpaRoutes);
app.use('/api/lead-scoring', leadScoringRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/livekit', livekitRoutes);
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/widget', require('./routes/widget'));
app.use('/api/payments', paymentsRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/script-templates', require('./routes/scriptTemplates'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/assistants', require('./routes/assistants'));
app.use('/api/voices', require('./routes/voices'));
app.use('/api/team', require('./routes/team'));

// ============================================
// WHATSAPP WEBHOOK ENDPOINTS
// ============================================

// Webhook Verification (GET) - Meta will call this to verify your webhook
app.get('/api/webhooks/whatsapp', async (req, res) => {
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
app.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
        const body = req.body;
        console.log('Webhook received:', JSON.stringify(body, null, 2));

        // Always respond 200 quickly to acknowledge receipt
        res.sendStatus(200);

        // Process the webhook asynchronously
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                const wabaId = entry.id;
                
                // Find the config for this WABA
                const { data: config } = await supabase
                    .from('whatsapp_configs')
                    .select('*')
                    .eq('waba_id', wabaId)
                    .single();

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

        // Check if message already exists (duplicate detection)
        const { data: existingMsg } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('wa_message_id', message.id)
            .maybeSingle();
        
        if (existingMsg) {
            console.log('Skipping duplicate message:', message.id);
            continue;
        }

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

        // 1. Fetch assistant configuration
        const { data: assistant, error: assistantError } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', config.assistant_id)
            .single();

        if (assistantError || !assistant) {
            console.error('Failed to fetch assistant:', assistantError);
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

        // System prompt - inject assistant name and memory
        let systemPrompt = assistant.system_prompt || 
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
        
        // Add instruction to use conversation context
        systemPrompt += `\n\nIMPORTANT: You have access to the conversation history with this customer. When the customer asks about previous orders, details they mentioned, or anything from earlier, use the context provided. Never say you can't recall.`;
        
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
                        costUSD: usageResult?.cost_usd,
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

app.get('/test-db', async (req, res) => {
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

// ============================================
// ADMIN METRICS ENDPOINT
// ============================================
app.get('/api/admin/metrics', async (req, res) => {
  const passkey = req.headers['x-admin-passkey'];
  if (!process.env.ADMIN_PASSKEY || passkey !== process.env.ADMIN_PASSKEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  try {
    const [callsResult, costsResult, assistantsResult] = await Promise.allSettled([
      supabase.from('call_logs').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
      supabase.from('call_costs').select('credits_deducted').gte('created_at', todayIso),
      supabase.from('assistants').select('id', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    const callsToday = callsResult.status === 'fulfilled' ? (callsResult.value.count || 0) : null;
    const creditsToday = costsResult.status === 'fulfilled'
      ? (costsResult.value.data || []).reduce((sum, r) => sum + (r.credits_deducted || 0), 0)
      : null;
    const activeAssistants = assistantsResult.status === 'fulfilled' ? (assistantsResult.value.count || 0) : null;

    res.json({
      timestamp: new Date().toISOString(),
      calls_today: callsToday,
      credits_deducted_today: creditsToday,
      active_assistants: activeAssistants
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'unhandled_error',
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    status,
    message: err.message,
    stack: err.stack
  }));
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
