# Project Architecture

## Stack Overview
- **Stack**: React 19 (Vite 6.4), TypeScript 5.8 (Strict Mode), Tailwind CSS v4, Node.js/Express Backend, Supabase (Auth, DB).
- **Architecture**: 
  - **Frontend-First**: React app communicates directly with Supabase for most data operations.
  - **Backend**: Lightweight Node.js/Express service (`backend/`) for webhooks, heavy processing, and secret API calls.
  - **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Deployment**:
  - **Website**: Vercel (`https://www.voicory.com`)
  - **Frontend/Dashboard**: Vercel (`https://app.voicory.com`)
  - **Backend**: Google Cloud Run (`https://api.voicory.com`)

---

## Data Flow Architecture

### READ Operations → Frontend (Vercel) → Supabase Direct
### WRITE Operations from Webhooks → Backend (Cloud Run) → Supabase

| Operation | Path | Reason |
|-----------|------|--------|
| Read data | Frontend → Supabase | Fast direct connection |
| Webhook writes | Cloud Run → Supabase | Needs stable URL + secrets |

### Key Rules:
1. **Never route reads through backend** - adds unnecessary latency
2. **Always use backend for webhooks** - needs stable URL + secrets
3. **Use `Promise.all([...])` for parallel reads**
4. **RLS handles security** for frontend reads

---

## Data Fetching Strategy

### Hybrid Mock/Real Pattern
```typescript
export const getVoices = async (): Promise<Voice[]> => {
    try {
        const { data, error } = await supabase.from('voices').select('*');
        if (error) throw error;
        return mapDataToType(data);
    } catch (error) {
        console.error('Supabase error, using mock:', error);
        return MOCK_VOICES;
    }
};
```

---

## Routing
- Uses `react-router-dom` v7
- Protected routes via `ProtectedRoute` component
- Auth pages: `/login`, `/signup`, `/check-email`

---

## File Structure Quick Reference

```
frontend/
├── app.css              # Tailwind v4 theme + custom CSS
├── index.html           # Meta tags, fonts, SEO
├── components/
│   ├── Sidebar.tsx      # Main navigation
│   ├── Topbar.tsx       # Header with search, notifications
│   ├── VoicoryLogo.tsx  # Ahsing font logo component
│   └── ui/              # Reusable UI components
├── pages/
│   ├── Overview.tsx     # Dashboard home
│   ├── Assistants.tsx   # AI assistant management
│   ├── Settings/        # Settings sub-pages
│   └── messenger/       # WhatsApp integration
├── services/
│   ├── supabase.ts      # Supabase client
│   └── voicoryService.ts # Data fetching layer
└── contexts/
    ├── AuthContext.tsx  # Authentication state
    └── SidebarContext.tsx # Sidebar collapse state

backend/
├── index.js             # Clean entry point (134 lines)
├── package.json         # Dependencies including @upstash/redis
├── Dockerfile           # Docker image for Cloud Run
├── cloudbuild.yaml      # Cloud Build CI/CD config (auto-deploy to 3 regions)
├── .env                 # Local environment variables (DO NOT COMMIT)
├── config/
│   └── index.js         # Shared dependencies & clients
├── lib/                 # Security middleware
│   ├── auth.js          # Authentication middleware
│   ├── crypto.js        # Encryption/decryption
│   ├── security.js      # Security headers, rate limiting
│   └── validators.js    # Input validation
├── routes/              # Express route handlers
│   ├── health.js        # Health check endpoints
│   ├── crawler.js       # Web crawler (/api/crawler/*)
│   ├── knowledgeBase.js # KB embeddings (/api/knowledge-base/*)
│   ├── twilio.js        # Phone import & webhooks (/api/twilio/*)
│   ├── ai.js            # Prompt generation (/api/generate-prompt)
│   ├── testChat.js      # Dashboard agent testing (/api/test-chat)
│   ├── livekit.js       # LiveKit token generation (/api/livekit/*)
│   ├── whatsappOAuth.js # WhatsApp OAuth (/api/whatsapp/oauth/*)
│   ├── whatsappWebhook.js # WhatsApp messages (/api/webhooks/whatsapp)
│   ├── payments.js      # Paddle payments (/api/payments/*)
│   ├── coupons.js       # Coupon management (/api/coupons/*)
│   └── admin.js         # Admin endpoints (/api/admin/*)
├── services/            # Reusable business logic
│   ├── cache.js         # Redis caching (cacheGet, cacheSet)
│   ├── assistant.js     # Cached DB lookups (getCachedAssistant)
│   ├── embedding.js     # OpenAI embeddings (generateEmbedding)
│   ├── rag.js           # Knowledge base search (searchKnowledgeBase)
│   ├── template.js      # Dynamic variables (resolveTemplateVariables)
│   └── memory.js        # Customer memory (formatMemoryForPrompt)
├── utils/
│   └── shutdown.js      # Graceful shutdown handlers
└── supabase/
    └── migrations/      # Database migrations

livekit/                 # LiveKit Voice Agent (GCE VM)
├── agent/
│   ├── main.py          # Python voice agent (LiveKit SDK 1.3)
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile       # Agent container
├── config/
│   └── livekit.yaml     # LiveKit server config
├── setup.sh             # GCE VM setup script
└── README.md            # Deployment guide

admin/                   # Local-only admin panel
├── src/
│   ├── pages/
│   │   ├── CouponManager.tsx
│   │   └── UserManager.tsx
│   └── components/
│       └── PasskeyGate.tsx
└── package.json

docs/
└── SCALING_ARCHITECTURE.md  # Full scaling guide
```

---

## LiveKit Voice Architecture

### Deployment
| Component | Location | Purpose |
|-----------|----------|---------|
| LiveKit Server | GCE VM (`livekit.voicory.com`) | WebRTC SFU |
| Voice Agent | GCE VM (Docker container) | STT/LLM/TTS pipeline |
| Token API | Cloud Run (`/api/livekit/token`) | Room access tokens |

### GCE VM Details
```
Name: livekit-server
Zone: asia-south1-a
IP: 34.180.15.3
Domain: livekit.voicory.com (SSL via Caddy)
```

### Docker Containers on VM
```bash
# LiveKit Server
docker run -d --name livekit-server \
  -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -v /opt/livekit/config:/config \
  livekit/livekit-server

# Voice Agent
docker run -d --name voicory-agent \
  --env-file /opt/voicory-agent/.env \
  --network host \
  voicory-agent:latest
```

---

## Scaling Architecture

### Microservices (Ready to Deploy)
| Service | Path | Purpose | Replicas |
|---------|------|---------|----------|
| Backend | `backend/` | Dashboard, billing, auth | 1 |
| LiveKit Agent | `livekit/agent/` | Voice calls (ultra-low latency) | 3+ |

### When to Scale LiveKit
- Voice call delays > 200ms
- 100+ concurrent voice sessions
- Deploy additional agents with load balancing

### Google Cloud Run Multi-Region Setup
```
GCP Project: voicory (ID: 732127099858)
├── voicory-backend      → asia-south1 (India/Mumbai) - PRIMARY
├── voicory-backend   → us-central1 (USA/Iowa)
├── voicory-backend   → europe-west1 (Europe/Belgium)
└── livekit-server      → GCE VM (asia-south1-a) - Voice
```

### Cloud Run Service Details
| Service | Region | Min Instances | Max Instances | Memory | CPU |
|---------|--------|---------------|---------------|--------|-----|
| voicory-backend | asia-south1 | 1 | 10 | 512Mi | 1 |
| voicory-backend | us-central1 | 0 | 10 | 512Mi | 1 |
| voicory-backend | europe-west1 | 0 | 10 | 512Mi | 1 |
