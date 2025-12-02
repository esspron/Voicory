/**
 * Widget API Routes
 * Handles widget session creation, messaging, and voice calls
 * 
 * These endpoints are called by the embedded widget from customer websites
 * Security: API key validation + domain allowlist
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

// Use shared config
const { supabase } = require('../config');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting map (in-memory for now, use Redis in production)
const rateLimits = new Map();

// ===========================================
// MIDDLEWARE
// ===========================================

/**
 * Validate API key and get user context
 */
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'MISSING_API_KEY',
    });
  }
  
  try {
    // Look up API key (simplified query without join)
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .single();
    
    if (keyError || !keyData) {
      console.error('API key lookup failed:', keyError, 'Key prefix:', apiKey.substring(0, 10));
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }
    
    // Attach user context to request
    req.apiKeyData = keyData;
    req.userId = keyData.user_id;
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Validate domain allowlist (CORS-like security)
 */
const validateDomain = async (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
  
  // Allow localhost for development
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return next();
  }
  
  // Get assistant's allowed domains
  const { assistantId } = req.body;
  if (!assistantId) {
    return next(); // Will be caught by other validation
  }
  
  try {
    const { data: assistant } = await supabase
      .from('assistants')
      .select('allowed_domains')
      .eq('id', assistantId)
      .eq('user_id', req.userId)
      .single();
    
    if (assistant?.allowed_domains?.length > 0) {
      const originHost = new URL(origin).hostname;
      const isAllowed = assistant.allowed_domains.some(domain => {
        // Support wildcard subdomains (*.example.com)
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return originHost === baseDomain || originHost.endsWith('.' + baseDomain);
        }
        return originHost === domain;
      });
      
      if (!isAllowed) {
        return res.status(403).json({
          error: 'Domain not allowed',
          code: 'DOMAIN_NOT_ALLOWED',
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Domain validation error:', error);
    next(); // Fail open for now
  }
};

/**
 * Simple rate limiting
 */
const rateLimit = (maxRequests = 60, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.userId || req.ip;
    const now = Date.now();
    
    if (!rateLimits.has(key)) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    const limit = rateLimits.get(key);
    
    if (now > limit.resetAt) {
      limit.count = 1;
      limit.resetAt = now + windowMs;
      return next();
    }
    
    if (limit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((limit.resetAt - now) / 1000),
      });
    }
    
    limit.count++;
    next();
  };
};

// ===========================================
// ROUTES
// ===========================================

/**
 * Create a widget session
 * POST /api/widget/session
 */
router.post('/session', validateApiKey, validateDomain, rateLimit(30, 60000), async (req, res) => {
  try {
    const { assistantId, mode, variables, customer } = req.body;
    
    if (!assistantId) {
      return res.status(400).json({
        error: 'assistantId is required',
        code: 'MISSING_ASSISTANT_ID',
      });
    }
    
    // Verify assistant exists and belongs to user
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .eq('user_id', req.userId)
      .single();
    
    if (assistantError || !assistant) {
      return res.status(404).json({
        error: 'Assistant not found',
        code: 'ASSISTANT_NOT_FOUND',
      });
    }
    
    // Check if assistant is active
    if (assistant.status !== 'active') {
      return res.status(400).json({
        error: 'Assistant is not active',
        code: 'ASSISTANT_INACTIVE',
      });
    }
    
    // Create session ID
    const sessionId = uuidv4();
    
    // Store session in database
    const { error: sessionError } = await supabase
      .from('widget_sessions')
      .insert({
        id: sessionId,
        assistant_id: assistantId,
        user_id: req.userId,
        mode: mode || 'chat',
        variables: variables || {},
        customer_data: customer || {},
        status: 'active',
        started_at: new Date().toISOString(),
      });
    
    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw sessionError;
    }
    
    // Response object
    const response = {
      sessionId,
      assistantId,
      mode: mode || 'chat',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
    
    // For voice mode, create Daily.co room (if configured)
    if (mode === 'voice' && process.env.DAILY_API_KEY) {
      try {
        const roomResponse = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
          },
          body: JSON.stringify({
            name: `voicory-${sessionId.slice(0, 8)}`,
            privacy: 'private',
            properties: {
              exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
              enable_chat: false,
              enable_screenshare: false,
              start_video_off: true,
              start_audio_off: false,
            },
          }),
        });
        
        if (roomResponse.ok) {
          const room = await roomResponse.json();
          response.roomUrl = room.url;
          
          // Create meeting token
          const tokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
            },
            body: JSON.stringify({
              properties: {
                room_name: room.name,
                exp: Math.floor(Date.now() / 1000) + 3600,
                is_owner: false,
              },
            }),
          });
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            response.token = tokenData.token;
          }
        }
      } catch (error) {
        console.error('Error creating Daily.co room:', error);
        // Continue without voice - will fall back to chat
      }
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create session',
      code: 'SESSION_CREATE_FAILED',
    });
  }
});

/**
 * Send a chat message
 * POST /api/widget/message
 */
router.post('/message', validateApiKey, validateDomain, rateLimit(120, 60000), async (req, res) => {
  try {
    const { assistantId, sessionId, message, variables, customer } = req.body;
    
    if (!assistantId || !message) {
      return res.status(400).json({
        error: 'assistantId and message are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    }
    
    // Get assistant
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .eq('user_id', req.userId)
      .single();
    
    if (assistantError || !assistant) {
      return res.status(404).json({
        error: 'Assistant not found',
        code: 'ASSISTANT_NOT_FOUND',
      });
    }
    
    // Get conversation history from session
    let conversationHistory = [];
    if (sessionId) {
      const { data: session } = await supabase
        .from('widget_sessions')
        .select('messages')
        .eq('id', sessionId)
        .single();
      
      if (session?.messages) {
        conversationHistory = session.messages;
      }
    }
    
    // Build system prompt with variables
    let systemPrompt = assistant.messaging_system_prompt || assistant.system_prompt || 'You are a helpful assistant.';
    
    // Replace variables in prompt
    const allVariables = { ...variables, ...customer };
    for (const [key, value] of Object.entries(allVariables)) {
      systemPrompt = systemPrompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];
    
    // Get knowledge base context if enabled
    if (assistant.rag_enabled && assistant.knowledge_base_ids?.length > 0) {
      try {
        const ragContext = await getRAGContext(
          message,
          assistant.knowledge_base_ids,
          req.userId,
          assistant.rag_similarity_threshold || 0.7,
          assistant.rag_max_results || 5
        );
        
        if (ragContext) {
          // Insert RAG context before user message
          messages.splice(-1, 0, {
            role: 'system',
            content: `Relevant context from knowledge base:\n${ragContext}`,
          });
        }
      } catch (error) {
        console.error('RAG error:', error);
        // Continue without RAG context
      }
    }
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: assistant.llm_model || 'gpt-4o-mini',
      messages,
      temperature: assistant.temperature || 0.7,
      max_tokens: assistant.max_tokens || 1024,
    });
    
    const responseContent = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    
    // Store message in session
    if (sessionId) {
      const newMessages = [
        ...conversationHistory,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: responseContent, timestamp: new Date().toISOString() },
      ];
      
      await supabase
        .from('widget_sessions')
        .update({
          messages: newMessages,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
    
    // Track usage for billing
    const tokensUsed = completion.usage?.total_tokens || 0;
    await trackWidgetUsage(req.userId, assistantId, sessionId, tokensUsed);
    
    res.json({
      messageId: uuidv4(),
      response: responseContent,
      tokensUsed,
    });
    
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      error: 'Failed to process message',
      code: 'MESSAGE_PROCESS_FAILED',
    });
  }
});

/**
 * End a widget session
 * POST /api/widget/session/end
 */
router.post('/session/end', validateApiKey, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required',
        code: 'MISSING_SESSION_ID',
      });
    }
    
    // Update session status
    const { error } = await supabase
      .from('widget_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', req.userId);
    
    if (error) {
      throw error;
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      error: 'Failed to end session',
      code: 'SESSION_END_FAILED',
    });
  }
});

/**
 * Get widget configuration (for preview/testing)
 * GET /api/widget/config/:assistantId
 */
router.get('/config/:assistantId', validateApiKey, async (req, res) => {
  try {
    const { assistantId } = req.params;
    
    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('id, name, first_message, language, voice_id')
      .eq('id', assistantId)
      .eq('user_id', req.userId)
      .single();
    
    if (error || !assistant) {
      return res.status(404).json({
        error: 'Assistant not found',
        code: 'ASSISTANT_NOT_FOUND',
      });
    }
    
    // Get voice info if set
    let voiceName = null;
    if (assistant.voice_id) {
      const { data: voice } = await supabase
        .from('voices')
        .select('name')
        .eq('id', assistant.voice_id)
        .single();
      voiceName = voice?.name;
    }
    
    res.json({
      assistantId: assistant.id,
      assistantName: assistant.name,
      greeting: assistant.first_message || 'Hi! How can I help you today?',
      language: assistant.language || 'en',
      voiceName,
    });
    
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      error: 'Failed to fetch configuration',
      code: 'CONFIG_FETCH_FAILED',
    });
  }
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get RAG context from knowledge base
 */
async function getRAGContext(query, knowledgeBaseIds, userId, threshold = 0.7, maxResults = 5) {
  try {
    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Search knowledge base chunks
    const { data: chunks, error } = await supabase.rpc('search_knowledge_base', {
      query_embedding: queryEmbedding,
      knowledge_base_ids: knowledgeBaseIds,
      match_threshold: threshold,
      match_count: maxResults,
      p_user_id: userId,
    });
    
    if (error) throw error;
    
    if (!chunks || chunks.length === 0) {
      return null;
    }
    
    // Format context
    return chunks
      .map(chunk => chunk.content)
      .join('\n\n---\n\n');
      
  } catch (error) {
    console.error('RAG context error:', error);
    return null;
  }
}

/**
 * Track widget usage for billing
 */
async function trackWidgetUsage(userId, assistantId, sessionId, tokensUsed) {
  try {
    await supabase.from('widget_usage').insert({
      user_id: userId,
      assistant_id: assistantId,
      session_id: sessionId,
      tokens_used: tokensUsed,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
    // Don't fail the request for usage tracking errors
  }
}

module.exports = router;
