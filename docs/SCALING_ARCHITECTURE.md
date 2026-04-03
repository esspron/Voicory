# 🚀 Voicory Scaling Architecture

## Quick Reference: Railway + Supabase Multi-Region

### Current Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY PROJECT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│   │   BACKEND    │    │   CHATBOT    │    │   CALLBOT    │             │
│   │   (Main)     │    │   SERVICE    │    │   SERVICE    │             │
│   │   1 replica  │    │   2 replicas │    │  3+ replicas │             │
│   │              │    │              │    │              │             │
│   │ - Dashboard  │    │ - WhatsApp   │    │ - Twilio     │             │
│   │ - Auth       │    │ - Web Chat   │    │ - Voice      │             │
│   │ - Billing    │    │ - AI Queue   │    │ - Streaming  │             │
│   │ - Admin      │    │              │    │ - Ultra-low  │             │
│   │              │    │              │    │   latency    │             │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘             │
│          │                   │                   │                      │
│          └───────────────────┴───────────────────┘                      │
│                              │                                           │
│                    ┌─────────┴─────────┐                                │
│                    │   REDIS (Upstash) │                                │
│                    │   - Session cache │                                │
│                    │   - Config cache  │                                │
│                    │   - Job queues    │                                │
│                    └─────────┬─────────┘                                │
│                              │                                           │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ SUPABASE        │  │ SUPABASE        │  │ SUPABASE        │
│ US-EAST-1       │  │ AP-SOUTH-1      │  │ EU-CENTRAL-1    │
│ (Primary)       │  │ (Read Replica)  │  │ (Read Replica)  │
│                 │  │                 │  │                 │
│ - All writes    │  │ - India users   │  │ - EU users      │
│ - Billing data  │  │ - Fast reads    │  │ - Fast reads    │
│ - Auth          │  │ - Voice lookups │  │ - Voice lookups │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 🛠️ Railway Setup Guide

### Step 1: Create Services from Existing Code

In Railway Dashboard:
1. **New Service** → "Empty Service" → Link to GitHub repo
2. Set **Root Directory**: `backend/services/callbot`
3. Add environment variables
4. Repeat for `chatbot` service

### Step 2: Configure Replicas

**For CallBot (Voice - High Priority):**
```bash
# In Railway Dashboard → CallBot Service → Settings → Deploy
Replicas: 3-10 (auto-scale based on load)
Health Check: /health
Health Check Timeout: 10 seconds  # Fast failure detection
```

**For ChatBot (WhatsApp - Medium Priority):**
```bash
Replicas: 2-5
Health Check: /health
Health Check Timeout: 30 seconds
```

### Step 3: Environment Variables

**Shared Variables (create in Railway Project Settings):**
```env
# Supabase
SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Upstash - RECOMMENDED: HTTP mode)
# Get from: console.upstash.com -> Your Database -> REST API
UPSTASH_REDIS_REST_URL=https://definite-sole-15581.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# OpenAI
OPENAI_API_KEY=sk-xxx
```

**CallBot-Specific:**
```env
PORT=3002
CALLBOT_HOST=callbot-production.up.railway.app
```

**ChatBot-Specific:**
```env
PORT=3003
```

---

## 🌍 Supabase Multi-Region Setup

### Option 1: Supabase Read Replicas (Recommended)

1. **Upgrade to Supabase Pro/Team** ($25-$599/month)
2. Go to **Settings → Infrastructure**
3. Enable **Read Replicas**
4. Select regions: `ap-south-1` (Mumbai), `eu-central-1` (Frankfurt)

### Option 2: Using Read Replica Connection String

```typescript
// frontend/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Primary connection (for writes)
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Read replica connection (for fast reads)
export const supabaseRead = createClient(
    import.meta.env.VITE_SUPABASE_READ_URL, // e.g., ap-south-1 replica
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
        db: { schema: 'public' }
    }
);

// Use supabaseRead for dashboard queries
export async function getAssistants() {
    const { data, error } = await supabaseRead
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });
    return { data, error };
}

// Use supabase (primary) for writes
export async function createAssistant(assistant) {
    const { data, error } = await supabase
        .from('assistants')
        .insert(assistant)
        .select()
        .single();
    return { data, error };
}
```

---

## ⚡ CallBot Latency Optimization

### Target: < 200ms Total Response Time

| Stage | Target | Optimization |
|-------|--------|--------------|
| Webhook to Code | < 10ms | Railway edge deployment |
| Config Lookup | < 5ms | Redis cache (preloaded) |
| Customer Lookup | < 10ms | Redis cache |
| AI Processing | ~100-150ms | Groq (fastest LLM) |
| TTS Generation | ~50-100ms | ElevenLabs streaming |
| **Total** | **< 200ms** | |

### Use Groq for Voice (Fastest LLM)

```javascript
// backend/services/callbot/ai.js
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateResponse(systemPrompt, userMessage, history = []) {
    const start = Date.now();
    
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage }
    ];
    
    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-70b-versatile', // Or 'mixtral-8x7b-32768' for even faster
        messages,
        temperature: 0.7,
        max_tokens: 150, // Keep short for voice
        stream: false
    });
    
    console.log(`[CALLBOT] Groq response in ${Date.now() - start}ms`);
    
    return completion.choices[0]?.message?.content;
}
```

**Groq Pricing (as of 2024):**
- Llama 3.1 70B: $0.59/1M input, $0.79/1M output
- ~10x cheaper than GPT-4o AND ~5x faster

---

## 📊 Scaling Costs at Different User Levels

### 10K Users
| Service | Cost/month |
|---------|------------|
| Railway (3 services, 5 replicas total) | $40 |
| Supabase Pro | $25 |
| Upstash Redis | $10 |
| OpenAI/Groq | ~$100 |
| **Total** | **~$175** |

### 100K Users
| Service | Cost/month |
|---------|------------|
| Railway (3 services, 15 replicas) | $200 |
| Supabase Team + Read Replica | $700 |
| Upstash Redis Pro | $50 |
| Groq (primary) + OpenAI (fallback) | ~$500 |
| **Total** | **~$1,450** |

### 1M Users
| Service | Cost/month |
|---------|------------|
| Railway (50+ replicas) or AWS EKS | $2,000 |
| Supabase Enterprise (multi-region) | $3,000 |
| Redis Cluster (Upstash Enterprise) | $200 |
| Groq Enterprise | $2,000 |
| Monitoring (Datadog) | $300 |
| **Total** | **~$7,500** |

---

## 🔧 Database Optimizations

### Add These Indexes Now
```sql
-- Run in Supabase SQL Editor

-- Fast phone number lookups for CallBot
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_numbers_number 
ON phone_numbers(number) WHERE is_active = true;

-- Fast assistant lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_status 
ON assistants(id) WHERE status = 'active';

-- Fast WhatsApp config lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_configs_waba 
ON whatsapp_configs(waba_id) WHERE status = 'connected';

-- Message history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_config_time 
ON whatsapp_messages(config_id, message_timestamp DESC);

-- Customer lookups by phone
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone 
ON customers(user_id, phone_number);
```

### Enable Connection Pooling
In Supabase Dashboard → Settings → Database:
- Enable **Connection Pooling** (Transaction mode)
- Use pooler connection string for high-volume services

---

## 🚀 Deployment Commands

### Deploy CallBot to Railway
```bash
cd backend/services/callbot
railway link  # Link to your Railway project
railway up    # Deploy
```

### Deploy ChatBot to Railway
```bash
cd backend/services/chatbot
railway link
railway up
```

### Update Webhook URLs

**Twilio Console:**
- Voice URL: `https://callbot-production.up.railway.app/voice/incoming`
- Status Callback: `https://callbot-production.up.railway.app/voice/status`

**Meta Developer Console:**
- WhatsApp Webhook: `https://chatbot-production.up.railway.app/webhooks/whatsapp`

---

## 📈 Monitoring

### Key Metrics to Watch

**CallBot (Voice):**
- Response time P95 < 100ms
- WebSocket connection success rate > 99%
- Redis cache hit rate > 95%

**ChatBot (WhatsApp):**
- Webhook acknowledgment time < 50ms
- AI queue depth < 100
- Message delivery rate > 99%

### Add to Railway
```javascript
// Add Prometheus metrics to each service
const prometheus = require('prom-client');

const httpDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.send(await prometheus.register.metrics());
});
```

---

## ✅ Checklist: Getting to 1M Users

### Phase 1: Foundation (Now)
- [ ] Add Redis (Upstash) to Railway project
- [ ] Deploy CallBot service with 3 replicas
- [ ] Deploy ChatBot service with 2 replicas
- [ ] Add database indexes
- [ ] Update webhook URLs

### Phase 2: Scale (10K-100K users)
- [ ] Upgrade Supabase to Team plan
- [ ] Enable Read Replicas (Mumbai)
- [ ] Switch CallBot to Groq LLM
- [ ] Add connection pooling
- [ ] Increase CallBot replicas to 10

### Phase 3: Enterprise (100K-1M users)
- [ ] Multi-region Railway deployment
- [ ] Supabase Enterprise with custom config
- [ ] Dedicated Redis cluster
- [ ] Add Datadog/NewRelic monitoring
- [ ] SLA with support contracts
