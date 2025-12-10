# CHAPTER 5: IMPLEMENTATION

## 5.1 Development Environment Setup

### 5.1.1 Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x LTS | JavaScript runtime |
| npm | 9.x | Package manager |
| Git | 2.x | Version control |
| VS Code | Latest | IDE |
| PostgreSQL | 15.x | Database (via Supabase) |

### 5.1.2 Project Structure

```
voicory/
├── frontend/                 # React application
│   ├── components/          # React components
│   │   ├── ui/              # Atom components (Button, Input, etc.)
│   │   ├── assistant-editor/ # Editor tabs
│   │   └── billing/         # Payment modals
│   ├── pages/               # Route pages
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React Context providers
│   ├── services/            # API clients
│   ├── lib/                 # Utilities
│   ├── types/               # TypeScript definitions
│   └── __tests__/           # Test files
│
├── backend/                  # Node.js server
│   ├── config/              # Configuration
│   ├── routes/              # Express routes
│   ├── services/            # Business logic
│   ├── lib/                 # Utilities (crypto, validators)
│   ├── middleware/          # Express middleware
│   └── supabase/            # Database migrations
│
├── admin/                    # Admin panel (local only)
│   └── src/
│
├── website-nextjs/           # Marketing website
│   └── src/
│
└── docs/                     # Documentation
```

### 5.1.3 Environment Configuration

**Frontend (.env.local):**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_BACKEND_URL=https://api.voicory.com
VITE_FACEBOOK_APP_ID=123456789
```

**Backend (.env):**
```env
# Server
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# Encryption
ENCRYPTION_KEY=64_char_hex_string

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 5.2 Frontend Implementation

### 5.2.1 React Application Setup

**Package.json dependencies:**
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@phosphor-icons/react": "^2.1.0",
    "@headlessui/react": "^2.0.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vite": "^6.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

### 5.2.2 Authentication Context

```typescript
// frontend/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ 
            user, session, loading, signIn, signUp, signOut 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
```

### 5.2.3 Assistant Service

```typescript
// frontend/services/assistantService.ts
import { supabase } from './supabase';
import { Assistant, AssistantCreateInput } from '@/types';

export async function getAssistants(): Promise<Assistant[]> {
    const { data, error } = await supabase
        .from('assistants')
        .select(`
            *,
            voice:voices(id, name, provider, language),
            phone_numbers(id, number, provider)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getAssistant(id: string): Promise<Assistant | null> {
    const { data, error } = await supabase
        .from('assistants')
        .select(`
            *,
            voice:voices(*),
            phone_numbers(*),
            knowledge_bases(*)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createAssistant(
    input: AssistantCreateInput
): Promise<Assistant> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('assistants')
        .insert({
            ...input,
            user_id: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateAssistant(
    id: string,
    updates: Partial<AssistantCreateInput>
): Promise<Assistant> {
    const { data, error } = await supabase
        .from('assistants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteAssistant(id: string): Promise<void> {
    const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
```

### 5.2.4 Custom Hooks

```typescript
// frontend/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

// frontend/hooks/useAsync.ts
import { useState, useCallback } from 'react';

interface AsyncState<T> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
}

export function useAsync<T>(asyncFunction: () => Promise<T>) {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        error: null,
        isLoading: false,
    });

    const execute = useCallback(async () => {
        setState({ data: null, error: null, isLoading: true });
        try {
            const data = await asyncFunction();
            setState({ data, error: null, isLoading: false });
            return data;
        } catch (error) {
            setState({ data: null, error: error as Error, isLoading: false });
            throw error;
        }
    }, [asyncFunction]);

    return { ...state, execute };
}

// frontend/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue] as const;
}
```

### 5.2.5 UI Components

```typescript
// frontend/components/ui/Button.tsx
import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { CircleNotch } from '@phosphor-icons/react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'md', loading, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';
        
        const variants = {
            default: 'bg-gradient-to-r from-primary to-primary/80 text-black hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5',
            secondary: 'bg-surface border border-white/10 text-textMain hover:bg-surfaceHover',
            ghost: 'text-textMuted hover:text-textMain hover:bg-white/5',
            destructive: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
        };
        
        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2.5 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                className={clsx(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
```

## 5.3 Backend Implementation

### 5.3.1 Express Server Setup

```javascript
// backend/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { securityStack } = require('./lib/securityStack');
const { supabase, redis } = require('./config');

// Route imports
const healthRoutes = require('./routes/health');
const assistantRoutes = require('./routes/assistants');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const twilioRoutes = require('./routes/twilio');
const whatsappWebhook = require('./routes/whatsappWebhook');
const paymentRoutes = require('./routes/payments');

const app = express();

// Security middleware
app.use(helmet());
app.use(securityStack);

// CORS configuration
app.use(cors({
    origin: [
        'https://app.voicory.com',
        'https://www.voicory.com',
        'http://localhost:5173',
    ],
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', healthRoutes);
app.use('/api/assistants', assistantRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/webhooks/whatsapp', whatsappWebhook);
app.use('/api/payments', paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### 5.3.2 Knowledge Base RAG Implementation

```javascript
// backend/services/rag.js
const { supabase } = require('../config');
const { openai } = require('../config');

async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.slice(0, 8000), // Token limit
    });
    return response.data[0].embedding;
}

async function chunkDocument(content, chunkSize = 1000, overlap = 100) {
    const chunks = [];
    let start = 0;
    
    while (start < content.length) {
        const end = Math.min(start + chunkSize, content.length);
        chunks.push({
            content: content.slice(start, end),
            index: chunks.length,
        });
        start += chunkSize - overlap;
    }
    
    return chunks;
}

async function processDocument(documentId, content, knowledgeBaseId, userId) {
    try {
        // Update status to processing
        await supabase
            .from('knowledge_base_documents')
            .update({ processing_status: 'processing' })
            .eq('id', documentId);
        
        // Chunk the document
        const chunks = await chunkDocument(content);
        
        // Generate embeddings for each chunk
        for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk.content);
            
            await supabase
                .from('knowledge_base_documents')
                .insert({
                    knowledge_base_id: knowledgeBaseId,
                    user_id: userId,
                    content: chunk.content,
                    embedding,
                    chunk_index: chunk.index,
                    character_count: chunk.content.length,
                    processing_status: 'completed',
                });
        }
        
        // Update original document status
        await supabase
            .from('knowledge_base_documents')
            .update({ processing_status: 'completed' })
            .eq('id', documentId);
            
    } catch (error) {
        await supabase
            .from('knowledge_base_documents')
            .update({ 
                processing_status: 'failed',
                processing_error: error.message,
            })
            .eq('id', documentId);
        throw error;
    }
}

async function searchKnowledgeBase(query, knowledgeBaseId, topK = 5) {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Search using pgvector
    const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: topK,
        p_knowledge_base_id: knowledgeBaseId,
    });
    
    if (error) throw error;
    
    return data.map(d => ({
        content: d.content,
        similarity: d.similarity,
    }));
}

module.exports = {
    generateEmbedding,
    processDocument,
    searchKnowledgeBase,
};
```

### 5.3.3 Customer Memory Service

```javascript
// backend/services/memory.js
const { supabase } = require('../config');
const { openai } = require('../config');

async function getCustomerContext(customerId, assistantId) {
    // Get customer profile
    const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
    
    // Get customer memory
    const { data: memory } = await supabase
        .from('customer_memories')
        .select('*')
        .eq('customer_id', customerId)
        .single();
    
    // Get recent conversations
    const { data: conversations } = await supabase
        .from('customer_conversations')
        .select('summary, sentiment, outcome, started_at')
        .eq('customer_id', customerId)
        .order('started_at', { ascending: false })
        .limit(5);
    
    // Get active insights
    const { data: insights } = await supabase
        .from('customer_insights')
        .select('insight_type, content, importance')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('importance', { ascending: false })
        .limit(10);
    
    return {
        customer,
        memory,
        conversations,
        insights,
    };
}

function formatMemoryForPrompt(context) {
    if (!context.memory) return '';
    
    let prompt = '\n--- CUSTOMER CONTEXT ---\n';
    
    if (context.customer) {
        prompt += `Customer: ${context.customer.name || 'Unknown'}\n`;
        prompt += `Phone: ${context.customer.phone_number}\n`;
    }
    
    if (context.memory) {
        prompt += `\nRelationship Summary:\n`;
        prompt += `- Total conversations: ${context.memory.total_conversations}\n`;
        prompt += `- Average sentiment: ${context.memory.average_sentiment}\n`;
        prompt += `- Engagement score: ${context.memory.engagement_score}/100\n`;
        
        if (context.memory.executive_summary) {
            prompt += `\nCustomer Profile:\n${context.memory.executive_summary}\n`;
        }
    }
    
    if (context.insights?.length > 0) {
        prompt += `\nKey Insights:\n`;
        context.insights.forEach(insight => {
            prompt += `- [${insight.insight_type}] ${insight.content}\n`;
        });
    }
    
    if (context.conversations?.length > 0) {
        prompt += `\nRecent Conversations:\n`;
        context.conversations.forEach(conv => {
            const date = new Date(conv.started_at).toLocaleDateString();
            prompt += `- ${date}: ${conv.summary} (${conv.sentiment})\n`;
        });
    }
    
    prompt += '--- END CONTEXT ---\n\n';
    
    return prompt;
}

async function saveConversation(conversationData) {
    const { data, error } = await supabase
        .from('customer_conversations')
        .insert(conversationData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function extractInsights(transcript, customerId, conversationId) {
    const prompt = `Analyze this conversation and extract customer insights.
    
Transcript:
${JSON.stringify(transcript)}

Extract the following if mentioned:
1. Preferences (likes, dislikes, preferred methods)
2. Objections (concerns, hesitations)
3. Interests (products, services, topics)
4. Pain points (problems, frustrations)
5. Personal info (names, dates, events)

Return JSON array:
[{ "type": "preference|objection|interest|pain_point|personal", "content": "...", "importance": "high|medium|low", "quote": "..." }]`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
    });
    
    const insights = JSON.parse(response.choices[0].message.content);
    
    // Save insights
    for (const insight of insights.insights || []) {
        await supabase.from('customer_insights').insert({
            customer_id: customerId,
            conversation_id: conversationId,
            insight_type: insight.type,
            content: insight.content,
            importance: insight.importance,
            source_quote: insight.quote,
        });
    }
    
    return insights;
}

module.exports = {
    getCustomerContext,
    formatMemoryForPrompt,
    saveConversation,
    extractInsights,
};
```

### 5.3.4 WhatsApp Webhook Handler

```javascript
// backend/routes/whatsappWebhook.js
const express = require('express');
const router = express.Router();
const { supabase, openai } = require('../config');
const { getCustomerContext, formatMemoryForPrompt } = require('../services/memory');
const { searchKnowledgeBase } = require('../services/rag');

// Webhook verification
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Message handler
router.post('/', async (req, res) => {
    try {
        const { entry } = req.body;
        
        for (const e of entry) {
            for (const change of e.changes) {
                if (change.field !== 'messages') continue;
                
                const { messages, contacts } = change.value;
                if (!messages?.length) continue;
                
                const message = messages[0];
                const contact = contacts[0];
                const phoneNumber = message.from;
                const wabaId = change.value.metadata.phone_number_id;
                
                // Get WhatsApp config and assistant
                const { data: config } = await supabase
                    .from('whatsapp_configs')
                    .select('*, assistant:assistants(*)')
                    .eq('phone_number_id', wabaId)
                    .single();
                
                if (!config?.assistant) continue;
                
                // Get or create customer
                let customer = await getOrCreateCustomer(
                    phoneNumber, 
                    contact.profile?.name,
                    config.user_id
                );
                
                // Get customer context if memory enabled
                let memoryContext = '';
                if (config.assistant.memory_enabled) {
                    const context = await getCustomerContext(customer.id);
                    memoryContext = formatMemoryForPrompt(context);
                }
                
                // Search knowledge base if available
                let ragContext = '';
                if (config.assistant.knowledge_base_id) {
                    const results = await searchKnowledgeBase(
                        message.text.body,
                        config.assistant.knowledge_base_id
                    );
                    if (results.length > 0) {
                        ragContext = '\n--- KNOWLEDGE BASE ---\n';
                        ragContext += results.map(r => r.content).join('\n\n');
                        ragContext += '\n--- END KNOWLEDGE ---\n\n';
                    }
                }
                
                // Build prompt with context
                const systemPrompt = `${config.assistant.system_prompt}
                
${memoryContext}
${ragContext}`;
                
                // Generate response
                const response = await openai.chat.completions.create({
                    model: config.assistant.model || 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message.text.body },
                    ],
                });
                
                const aiResponse = response.choices[0].message.content;
                
                // Send WhatsApp reply
                await sendWhatsAppMessage(wabaId, phoneNumber, aiResponse, config.access_token);
                
                // Log conversation
                await supabase.from('whatsapp_messages').insert({
                    user_id: config.user_id,
                    assistant_id: config.assistant.id,
                    customer_id: customer.id,
                    direction: 'inbound',
                    content: message.text.body,
                    wa_message_id: message.id,
                });
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('WhatsApp webhook error:', error);
        res.sendStatus(500);
    }
});

async function sendWhatsAppMessage(phoneNumberId, to, text, accessToken) {
    const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: text },
            }),
        }
    );
    
    return response.json();
}

module.exports = router;
```

## 5.4 Testing Implementation

### 5.4.1 Unit Tests

```typescript
// frontend/__tests__/hooks/useDebounce.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('updates value after delay', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        rerender({ value: 'updated' });
        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('updated');
    });

    it('resets timer on rapid changes', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        rerender({ value: 'first' });
        act(() => vi.advanceTimersByTime(300));

        rerender({ value: 'second' });
        act(() => vi.advanceTimersByTime(300));

        expect(result.current).toBe('initial');

        act(() => vi.advanceTimersByTime(200));
        expect(result.current).toBe('second');
    });
});
```

### 5.4.2 Component Tests

```typescript
// frontend/__tests__/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
    it('renders children correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('handles click events', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        
        fireEvent.click(screen.getByText('Click me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading state', () => {
        render(<Button loading>Submit</Button>);
        
        expect(screen.getByText('Submit')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('applies variant styles', () => {
        const { rerender } = render(<Button variant="default">Button</Button>);
        expect(screen.getByRole('button')).toHaveClass('bg-gradient-to-r');

        rerender(<Button variant="secondary">Button</Button>);
        expect(screen.getByRole('button')).toHaveClass('bg-surface');
    });

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
```

### 5.4.3 Integration Tests

```typescript
// frontend/__tests__/services/assistantService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAssistants, createAssistant } from '@/services/assistantService';
import { supabase } from '@/services/supabase';

vi.mock('@/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ 
                        data: { id: '123', name: 'Test' }, 
                        error: null 
                    })),
                })),
            })),
        })),
        auth: {
            getUser: vi.fn(() => Promise.resolve({ 
                data: { user: { id: 'user-123' } } 
            })),
        },
    },
}));

describe('assistantService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches assistants successfully', async () => {
        const assistants = await getAssistants();
        expect(Array.isArray(assistants)).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('assistants');
    });

    it('creates assistant with user_id', async () => {
        const input = {
            name: 'Test Assistant',
            system_prompt: 'You are helpful',
            model: 'gpt-4o',
        };

        const result = await createAssistant(input);
        expect(result.id).toBe('123');
        expect(result.name).toBe('Test');
    });
});
```

## 5.5 Deployment Configuration

### 5.5.1 Vercel Configuration (Frontend)

```json
// frontend/vercel.json
{
    "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
    ],
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                {
                    "key": "X-Frame-Options",
                    "value": "DENY"
                },
                {
                    "key": "X-Content-Type-Options",
                    "value": "nosniff"
                },
                {
                    "key": "Referrer-Policy",
                    "value": "strict-origin-when-cross-origin"
                }
            ]
        }
    ]
}
```

### 5.5.2 Railway Configuration (Backend)

```json
// backend/railway.json
{
    "build": {
        "builder": "NIXPACKS"
    },
    "deploy": {
        "healthcheckPath": "/health",
        "healthcheckTimeout": 30,
        "restartPolicyType": "ON_FAILURE",
        "restartPolicyMaxRetries": 3
    }
}
```

```toml
# backend/nixpacks.toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm ci --production"]

[phases.build]
cmds = []

[start]
cmd = "node index.js"
```

---

*[Continued in PROJECT_REPORT_PART4.md]*
