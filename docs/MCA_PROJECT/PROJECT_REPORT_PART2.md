# CHAPTER 4: SYSTEM DESIGN

## 4.1 System Architecture

### 4.1.1 High-Level Architecture

Voicory follows a **microservices-based architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Web App    │  │  Mobile Web  │  │ Admin Panel  │                  │
│  │   (React)    │  │   (React)    │  │   (React)    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼─────────────────┼─────────────────┼───────────────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │ HTTPS
┌───────────────────────────┼─────────────────────────────────────────────┐
│                     API GATEWAY LAYER                                    │
├───────────────────────────┼─────────────────────────────────────────────┤
│                    ┌──────┴───────┐                                     │
│                    │   Vercel     │                                     │
│                    │   Edge       │                                     │
│                    └──────┬───────┘                                     │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────┐
│                     SERVICE LAYER                                        │
├───────────────────────────┼─────────────────────────────────────────────┤
│   ┌──────────────┐  ┌─────┴────────┐  ┌──────────────┐                 │
│   │   Backend    │  │   ChatBot    │  │   CallBot    │                 │
│   │   Service    │  │   Service    │  │   Service    │                 │
│   │              │  │              │  │              │                 │
│   │ - Dashboard  │  │ - WhatsApp   │  │ - Voice      │                 │
│   │ - Auth       │  │ - Web Chat   │  │ - Twilio     │                 │
│   │ - Billing    │  │ - Webhooks   │  │ - VAPI       │                 │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│          │                 │                 │                          │
│          └─────────────────┼─────────────────┘                          │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────────────┐
│                      DATA LAYER                                          │
├────────────────────────────┼────────────────────────────────────────────┤
│   ┌──────────────┐  ┌──────┴───────┐  ┌──────────────┐                 │
│   │    Redis     │  │  PostgreSQL  │  │   Supabase   │                 │
│   │   (Upstash)  │  │  (Supabase)  │  │   Storage    │                 │
│   │              │  │              │  │              │                 │
│   │ - Cache      │  │ - Tables     │  │ - Files      │                 │
│   │ - Sessions   │  │ - RLS        │  │ - Audio      │                 │
│   │ - Queues     │  │ - Functions  │  │ - Documents  │                 │
│   └──────────────┘  └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.1.2 Component Descriptions

**1. Web Application (Frontend)**
- Technology: React 19, TypeScript, Tailwind CSS v4
- Deployment: Vercel (https://app.voicory.com)
- Purpose: User dashboard for managing AI assistants

**2. Admin Panel**
- Technology: React 19, TypeScript
- Deployment: Local only (security)
- Purpose: Platform administration, analytics

**3. Backend Service**
- Technology: Node.js, Express.js
- Deployment: Railway (https://api.voicory.com)
- Purpose: API endpoints, authentication, billing

**4. ChatBot Service**
- Technology: Node.js
- Deployment: Railway (2 replicas)
- Purpose: WhatsApp message handling, web chat

**5. CallBot Service**
- Technology: Node.js
- Deployment: Railway (3+ replicas)
- Purpose: Ultra-low latency voice call handling

**6. PostgreSQL Database**
- Technology: PostgreSQL 15 via Supabase
- Features: RLS, pgvector, real-time subscriptions
- Purpose: Primary data store

**7. Redis Cache**
- Technology: Redis via Upstash (HTTP mode)
- Purpose: Session cache, config cache, job queues

### 4.1.3 Communication Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| REST API | Dashboard operations | Express.js routes |
| WebSocket | Real-time updates | Supabase Realtime |
| Webhooks | External events | Twilio, WhatsApp callbacks |
| Pub/Sub | Async processing | Redis queues |

## 4.2 Database Design

### 4.2.1 Entity-Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │ assistants  │       │   voices    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │───┐   │ id (PK)     │   ┌───│ id (PK)     │
│ email       │   │   │ user_id(FK) │───┤   │ user_id(FK) │
│ password    │   │   │ voice_id(FK)│───┘   │ name        │
│ created_at  │   │   │ name        │       │ provider    │
└─────────────┘   │   │ prompt      │       │ language    │
                  │   │ model       │       └─────────────┘
                  │   │ status      │
                  │   └─────────────┘
                  │          │
                  │   ┌──────┴──────┐
                  │   │             │
            ┌─────┴───▼───┐  ┌─────▼───────┐
            │phone_numbers│  │knowledge_   │
            ├─────────────┤  │bases        │
            │ id (PK)     │  ├─────────────┤
            │ user_id(FK) │  │ id (PK)     │
            │ assistant_id│  │ user_id(FK) │
            │ number      │  │ assistant_id│
            │ provider    │  │ name        │
            └─────────────┘  └─────────────┘
                                   │
                            ┌──────┴──────┐
                            │ kb_documents│
                            ├─────────────┤
                            │ id (PK)     │
                            │ kb_id (FK)  │
                            │ content     │
                            │ embedding   │
                            └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  customers  │       │ customer_   │       │ customer_   │
├─────────────┤       │conversations│       │ memories    │
│ id (PK)     │───┐   ├─────────────┤       ├─────────────┤
│ user_id(FK) │   │   │ id (PK)     │   ┌───│customer_id  │
│ phone       │   ├───│ customer_id │───┤   │ total_calls │
│ email       │   │   │ transcript  │   │   │ sentiment   │
│ name        │   │   │ summary     │   │   │ insights    │
└─────────────┘   │   │ sentiment   │   │   └─────────────┘
                  │   └─────────────┘   │
                  │          │          │
                  │   ┌──────┴──────┐   │
                  │   │ customer_   │   │
                  │   │ insights    │───┘
                  │   ├─────────────┤
                  │   │ id (PK)     │
                  └───│ customer_id │
                      │ type        │
                      │ content     │
                      └─────────────┘
```

### 4.2.2 Table Definitions

**Table: users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT,
    full_name TEXT,
    avatar_url TEXT,
    credits DECIMAL(10,2) DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: assistants**
```sql
CREATE TABLE assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    system_prompt TEXT,
    first_message TEXT,
    model TEXT DEFAULT 'gpt-4o',
    provider TEXT DEFAULT 'openai',
    voice_id UUID REFERENCES voices(id),
    transcriber TEXT DEFAULT 'deepgram',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    memory_enabled BOOLEAN DEFAULT false,
    memory_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assistants"
    ON assistants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assistants"
    ON assistants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assistants"
    ON assistants FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assistants"
    ON assistants FOR DELETE
    USING (auth.uid() = user_id);
```

**Table: voices**
```sql
CREATE TABLE voices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('elevenlabs', 'playht', 'azure', 'deepgram')),
    provider_voice_id TEXT NOT NULL,
    language TEXT NOT NULL,
    language_code TEXT,
    accent TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'neutral')),
    age TEXT CHECK (age IN ('young', 'middle', 'old')),
    style TEXT,
    use_case TEXT,
    preview_url TEXT,
    is_premium BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    cost_per_char DECIMAL(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: customer_conversations**
```sql
CREATE TABLE customer_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    assistant_id UUID NOT NULL REFERENCES assistants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    call_direction TEXT CHECK (call_direction IN ('inbound', 'outbound')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    transcript JSONB,
    summary TEXT,
    key_points TEXT[],
    topics_discussed TEXT[],
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    sentiment_score DECIMAL(3,2),
    action_items JSONB,
    outcome TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: customer_memories**
```sql
CREATE TABLE customer_memories (
    customer_id UUID PRIMARY KEY REFERENCES customers(id),
    user_id UUID NOT NULL REFERENCES users(id),
    total_conversations INTEGER DEFAULT 0,
    total_call_duration_minutes INTEGER DEFAULT 0,
    first_contact_date TIMESTAMPTZ,
    last_contact_date TIMESTAMPTZ,
    average_sentiment DECIMAL(3,2),
    engagement_score INTEGER DEFAULT 0,
    personality_traits TEXT[],
    interests TEXT[],
    pain_points TEXT[],
    communication_preferences JSONB,
    important_dates JSONB,
    product_interests TEXT[],
    objections_raised TEXT[],
    executive_summary TEXT,
    churn_risk TEXT CHECK (churn_risk IN ('low', 'medium', 'high')),
    lifetime_value DECIMAL(10,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: knowledge_base_documents**
```sql
CREATE TABLE knowledge_base_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('file', 'url', 'text')),
    name TEXT NOT NULL,
    content TEXT,
    embedding vector(1536),
    chunk_index INTEGER,
    character_count INTEGER,
    processing_status TEXT DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX ON knowledge_base_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 4.2.3 Database Functions

**Function: match_documents (RAG Search)**
```sql
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    p_knowledge_base_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kd.id,
        kd.content,
        1 - (kd.embedding <=> query_embedding) AS similarity,
        kd.metadata
    FROM knowledge_base_documents kd
    WHERE 
        (p_knowledge_base_id IS NULL OR kd.knowledge_base_id = p_knowledge_base_id)
        AND 1 - (kd.embedding <=> query_embedding) > match_threshold
    ORDER BY kd.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

**Function: get_customer_context**
```sql
CREATE OR REPLACE FUNCTION get_customer_context(
    p_customer_id uuid,
    p_max_conversations int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_context jsonb;
BEGIN
    SELECT jsonb_build_object(
        'customer', (
            SELECT jsonb_build_object(
                'name', c.name,
                'phone', c.phone_number,
                'email', c.email
            )
            FROM customers c
            WHERE c.id = p_customer_id
        ),
        'memory', (
            SELECT jsonb_build_object(
                'total_conversations', cm.total_conversations,
                'average_sentiment', cm.average_sentiment,
                'interests', cm.interests,
                'pain_points', cm.pain_points,
                'objections', cm.objections_raised,
                'summary', cm.executive_summary
            )
            FROM customer_memories cm
            WHERE cm.customer_id = p_customer_id
        ),
        'recent_conversations', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', cc.started_at,
                    'summary', cc.summary,
                    'sentiment', cc.sentiment,
                    'outcome', cc.outcome
                )
            )
            FROM (
                SELECT * FROM customer_conversations
                WHERE customer_id = p_customer_id
                ORDER BY started_at DESC
                LIMIT p_max_conversations
            ) cc
        )
    ) INTO v_context;
    
    RETURN v_context;
END;
$$;
```

### 4.2.4 Database Triggers

**Trigger: Update customer_memories after conversation**
```sql
CREATE OR REPLACE FUNCTION update_customer_memory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update or insert customer memory
    INSERT INTO customer_memories (customer_id, user_id, total_conversations, last_contact_date)
    VALUES (NEW.customer_id, NEW.user_id, 1, NEW.started_at)
    ON CONFLICT (customer_id) DO UPDATE SET
        total_conversations = customer_memories.total_conversations + 1,
        last_contact_date = NEW.started_at,
        total_call_duration_minutes = customer_memories.total_call_duration_minutes + 
            COALESCE(NEW.duration_seconds / 60, 0),
        average_sentiment = (
            SELECT AVG(sentiment_score)
            FROM customer_conversations
            WHERE customer_id = NEW.customer_id
        ),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_conversation_insert
    AFTER INSERT ON customer_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_memory();
```

## 4.3 API Design

### 4.3.1 RESTful API Endpoints

**Authentication Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Register new user |
| POST | /auth/login | User login |
| POST | /auth/logout | User logout |
| POST | /auth/reset-password | Password reset |

**Assistant Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/assistants | List user's assistants |
| POST | /api/assistants | Create new assistant |
| GET | /api/assistants/:id | Get assistant details |
| PUT | /api/assistants/:id | Update assistant |
| DELETE | /api/assistants/:id | Delete assistant |

**Voice Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/voices | List available voices |
| GET | /api/voices/:id | Get voice details |
| GET | /api/voices/:id/preview | Get voice preview audio |

**Knowledge Base Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/knowledge-bases | List knowledge bases |
| POST | /api/knowledge-bases | Create knowledge base |
| POST | /api/knowledge-bases/:id/documents | Add document |
| POST | /api/knowledge-bases/:id/crawl | Crawl URL |
| DELETE | /api/knowledge-bases/:id | Delete knowledge base |

**Webhook Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/webhooks/twilio/voice | Twilio voice webhook |
| POST | /api/webhooks/whatsapp | WhatsApp message webhook |
| POST | /api/webhooks/vapi | VAPI event webhook |

### 4.3.2 API Request/Response Examples

**Create Assistant Request:**
```json
POST /api/assistants
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
    "name": "Sales Assistant",
    "system_prompt": "You are a friendly sales representative for ABC Company...",
    "first_message": "Hello! Thank you for calling ABC Company. How can I help you today?",
    "model": "gpt-4o",
    "provider": "openai",
    "voice_id": "550e8400-e29b-41d4-a716-446655440000",
    "memory_enabled": true,
    "memory_config": {
        "rememberConversations": true,
        "extractInsights": true,
        "trackSentiment": true,
        "maxContextConversations": 5
    }
}
```

**Create Assistant Response:**
```json
{
    "success": true,
    "data": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Sales Assistant",
        "status": "active",
        "created_at": "2024-12-01T10:30:00Z"
    }
}
```

**RAG Search Request:**
```json
POST /api/knowledge-bases/:id/search
Content-Type: application/json

{
    "query": "What are your pricing plans?",
    "top_k": 5,
    "threshold": 0.7
}
```

**RAG Search Response:**
```json
{
    "success": true,
    "data": {
        "results": [
            {
                "content": "Our pricing plans start at ₹1.50 per minute...",
                "similarity": 0.89,
                "metadata": {
                    "source": "pricing.md",
                    "chunk": 3
                }
            }
        ],
        "query_time_ms": 45
    }
}
```

## 4.4 User Interface Design

### 4.4.1 Design System

**Color Palette (OKLCH P3 Gamut):**
```css
--color-primary: oklch(0.72 0.15 180);      /* Teal/Cyan */
--color-background: oklch(0.13 0.01 250);   /* Dark blue-gray */
--color-surface: oklch(0.16 0.01 250);      /* Elevated surface */
--color-textMain: oklch(0.93 0.01 250);     /* Primary text */
--color-textMuted: oklch(0.65 0.02 250);    /* Secondary text */
--color-success: oklch(0.70 0.15 145);      /* Green */
--color-error: oklch(0.65 0.20 25);         /* Red */
--color-warning: oklch(0.75 0.15 85);       /* Orange */
```

**Typography:**
- Primary Font: Inter (Google Fonts)
- Logo Font: Ahsing (Custom)
- Monospace: JetBrains Mono

**Spacing Scale:**
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

### 4.4.2 Component Library

**Atom Components (13):**
1. Button - 8 variants, 5 sizes, loading state
2. Input - 3 variants, icons support
3. Textarea - Auto-resize, character count
4. Badge - Status indicators
5. Skeleton - Loading placeholders
6. Toggle - Boolean switches
7. Avatar - User images with fallback
8. Label - Form labels with required indicator
9. Tooltip - Help text on hover
10. Card - Content containers
11. Select - Dropdown menus
12. FadeIn - Animation wrapper
13. AmbientBackground - GPU-aware backgrounds

### 4.4.3 Page Layouts

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                         Topbar                               │
│  [Logo]              [Search]              [User Avatar]    │
├────────────┬────────────────────────────────────────────────┤
│            │                                                 │
│  Sidebar   │                  Main Content                   │
│            │                                                 │
│  - Overview│    ┌─────────────────────────────────────┐     │
│  - Assist. │    │         Page Header                  │     │
│  - Voices  │    │         + Actions                    │     │
│  - Phone   │    └─────────────────────────────────────┘     │
│  - KB      │                                                 │
│  - Logs    │    ┌─────────────────────────────────────┐     │
│  - Settings│    │                                      │     │
│            │    │         Content Area                 │     │
│            │    │                                      │     │
│            │    │                                      │     │
│            │    └─────────────────────────────────────┘     │
│            │                                                 │
└────────────┴────────────────────────────────────────────────┘
```

**Assistant Editor Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [← Back]      Assistant Name           [Save] [Delete]     │
├─────────────────────────────────────────────────────────────┤
│  [Model] [Voice] [Transcriber] [Functions] [Advanced]       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │                     │  │                      │          │
│  │   Configuration     │  │    Live Preview      │          │
│  │      Form           │  │                      │          │
│  │                     │  │   [Test Assistant]   │          │
│  │                     │  │                      │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 4.5 Security Design

### 4.5.1 Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │Frontend │     │Supabase │     │Database │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │  1. Login     │               │               │
     │──────────────>│               │               │
     │               │  2. Auth      │               │
     │               │──────────────>│               │
     │               │               │  3. Verify    │
     │               │               │──────────────>│
     │               │               │  4. User      │
     │               │               │<──────────────│
     │               │  5. JWT       │               │
     │               │<──────────────│               │
     │  6. Session   │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │  7. API Call  │               │               │
     │──────────────>│  8. Request   │               │
     │               │  + JWT        │               │
     │               │──────────────>│  9. Query    │
     │               │               │  + RLS       │
     │               │               │──────────────>│
     │               │               │  10. Data    │
     │               │               │<──────────────│
     │               │  11. Response │               │
     │               │<──────────────│               │
     │  12. Data     │               │               │
     │<──────────────│               │               │
```

### 4.5.2 Security Layers

| Layer | Protection | Implementation |
|-------|------------|----------------|
| Network | DDoS | Cloudflare |
| Transport | TLS 1.3 | Vercel/Railway |
| Application | Rate Limiting | express-rate-limit |
| Application | Input Validation | Zod schemas |
| Application | CORS | Whitelist origins |
| Authentication | JWT | Supabase Auth |
| Authorization | RLS | PostgreSQL policies |
| Data | Encryption | AES-256-GCM |
| Audit | Logging | Structured logs |

### 4.5.3 Encryption Implementation

```javascript
// backend/lib/crypto.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(plaintext) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData) {
    const [ivHex, authTagHex, ciphertext] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

module.exports = { encrypt, decrypt };
```

---

*[Continued in PROJECT_REPORT_PART3.md]*
