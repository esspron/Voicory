# Voicory — AI Voice Agent Platform for Businesses

> **Built and shipped solo** by [Vishwas Verma](https://linkedin.com/in/vishwasverma) — AI Product Leader  
> Live at **[voicory.com](https://voicory.com)** · Product Demo *(Coming Soon)* · [LinkedIn](https://linkedin.com/in/vishwasverma)

---

## What is Voicory?

Voicory replaces human call handlers with AI voice agents that **remember every customer**. Conversations pick up exactly where they left off — no repeat questions, no lost context, no dropped leads.

Businesses plug in Voicory and their inbound calls, WhatsApp messages, and website chats are handled by an AI agent that knows their customer history, answers from their knowledge base, books appointments, scores leads, and pushes data to their CRM — all automatically.

---

## Why This Project Demonstrates AI Product Leadership

This isn't a tutorial project or a weekend hack. It's a **production SaaS product** with real architectural decisions, real tradeoffs, and real complexity — built end-to-end by one person.

### Key product decisions I made and shipped:

| Decision | Problem I solved | Outcome |
|---|---|---|
| **Persistent memory layer** | LLMs forget context between calls. Customers repeat themselves every time | Summarize + store every call; inject relevant memory into next call's system prompt |
| **RAG over knowledge base** | AI hallucinating answers about the business's products | Embed + index docs/URLs; enforce strict retrieval mode so agent only answers from source material |
| **Prepaid credit model** | Per-seat SaaS pricing doesn't work for voice AI (cost = usage, not users) | $1 = 1 credit, per-minute deduction tied to actual LLM + TTS + telephony costs |
| **HTTP integration layer** | Businesses need their AI agent to trigger their own systems (CRMs, Zapier, etc.) | Built custom HTTP executor with per-event triggers: `call_started`, `call_ended`, `appointment_booked`, `custom_phrase` |
| **Multi-channel single agent** | Most tools are voice-only or messaging-only | Same assistant config handles Twilio voice calls, WhatsApp, and embedded web widget |
| **TCPA compliance layer** | US telephony has strict calling laws — ignoring this = legal liability | Built compliance middleware: do-not-call lists, calling hours enforcement, consent tracking |

---

## Product Scope

### Core Platform
- **AI Voice Agents** — Inbound + outbound calling via Twilio + LiveKit. ElevenLabs and PlayHT for voice synthesis. Multi-turn conversation with full context window management
- **Customer Memory** — Every call summarized by GPT-4o-mini and stored. Memory retrieved semantically on next interaction
- **Knowledge Base** — Upload PDFs, paste URLs. Crawler indexes content, embeddings stored in Supabase with pgvector. Strict RAG mode prevents hallucination
- **Assistant Editor** — Full no-code configuration: personality, voice, language, RAG settings, memory, integrations — all from a single UI

### Integrations
- **CRM** — Follow Up Boss and LionDesk: contact lookup during calls, push transcripts + outcomes after calls
- **Custom HTTP** — Fire any webhook on any call event. Template variables: `{{transcript}}`, `{{phone_number}}`, `{{duration}}`, `{{ai_response}}`
- **Google Calendar** — Appointment detection mid-call, auto-sync to calendar
- **WhatsApp** — WhatsApp Business API via embedded signup flow, same agent as voice

### Business Layer
- **Payments** — Paddle prepaid credits. Per-call cost tracked: LLM tokens + TTS characters + telephony minutes
- **P&L Analytics** — Real cost vs. credit breakdown per assistant, per call
- **Lead Scoring** — Automatic qualification scoring from call transcripts
- **Outbound Dialer** — Campaign-level outbound with AI agents
- **Embeddable Widget** — One script tag, drop on any website

### Operational
- **Rate limiting** — Per-route, per-user request throttling
- **Input validation** — Zod schemas + prompt injection protection on all AI-facing endpoints
- **Redis caching** — Credit balance caching (Upstash), 60s TTL with invalidation on deduction
- **Integration logs** — Every HTTP trigger and CRM push logged with status, latency, error

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  React Dashboard  │  Embedded Widget  │  WhatsApp / Twilio  │
└──────────┬──────────────────┬─────────────────┬────────────┘
           │                  │                 │
┌──────────▼──────────────────▼─────────────────▼────────────┐
│                    Backend API (Cloud Run)                   │
│  Express · 23 route modules · Input validation middleware    │
└──────────┬──────────────────┬─────────────────┬────────────┘
           │                  │                 │
    ┌──────▼──────┐   ┌───────▼──────┐  ┌──────▼──────┐
    │ AI Processor│   │ Integration  │  │   Services  │
    │ (central)   │   │  Executor    │  │  CRM / RAG  │
    │ All channels│   │ HTTP/CRM/Cal │  │  Memory/TTS │
    └──────┬──────┘   └──────────────┘  └─────────────┘
           │
    ┌──────▼──────────────────────────────────────────┐
    │                  Data Layer                      │
    │  Supabase (PostgreSQL + RLS)  │  Upstash Redis   │
    │  19 migrations  │  pgvector   │  Credit cache    │
    └──────────────────────────────────────────────────┘
```

**Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + pgvector + RLS) |
| Cache | Upstash Redis |
| AI | OpenAI GPT-4o / GPT-4o-mini |
| Voice Synthesis | ElevenLabs, PlayHT |
| Telephony | Twilio |
| Real-time | LiveKit |
| Messaging | WhatsApp Business API |
| Payments | Paddle |
| Deployment | Vercel (frontend) · Google Cloud Run (backend) |
| Testing | Playwright (E2E) |

---

## Repository Scale

| Metric | Count |
|---|---|
| Git commits | 193 |
| Backend route modules | 23 |
| Frontend pages | 28 |
| Backend service modules | 28 |
| Database migrations | 19 |
| E2E test specs | 4 |

---

## What I'd Do Differently (Product Retrospective)

**What worked:**
- Starting with memory as the core differentiator — it's the #1 thing users mention
- Building a unified `assistantProcessor` service early so all channels (voice, WhatsApp, widget) share one AI logic layer — avoided 3x bug surface

**What I'd change:**
- Should have designed the integration execution layer before building CRM and calendar separately — ended up refactoring to unify them
- Rate limiting should have been infrastructure-level (API Gateway), not application-level middleware — will move to Cloud Run ingress config

**What's next:**
- Real-time voice interruption handling (barge-in) via LiveKit agent framework
- LLM routing: GPT-4o for complex queries, GPT-4o-mini for simple turns — ~40% cost reduction
- Multi-tenant workspace model (agencies managing clients)

---

## Local Setup

### 1. Clone

```bash
git clone https://github.com/esspron/Voicory && cd Voicory
```

### 2. Backend

```bash
cd backend
npm install

# Copy the env template and fill in your keys
cp .env.example .env
```

Minimum required keys in `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
PADDLE_API_KEY=
```

```bash
node index.js
# API running at http://localhost:8080
```

### 3. Database

Run migrations in order against your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in Supabase SQL Editor:
# Run each file in backend/supabase/migrations/ in sequence (001 → 019)
```

> The migrations create all tables: `assistants`, `call_logs`, `customer_memories`, `knowledge_bases`, `crm_integrations`, `appointments`, `call_costs`, `integration_logs`, and more.

### 4. Frontend

```bash
cd frontend
npm install

# Create env file with your Supabase public keys
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev
# App running at http://localhost:5173
```

---

## About Me

I'm **Vishwas Verma** — an AI Product Leader who builds and ships AI products end-to-end.

Voicory is my proof of work: I identified the problem (businesses losing leads to voicemail), designed the product, made every architectural call, and shipped it to production solo.

I'm looking for roles where I can lead AI product strategy — working with engineering, customers, and data to define what gets built and why.

📩 [vishwasvermapvt@gmail.com](mailto:vishwasvermapvt@gmail.com) · [LinkedIn](https://linkedin.com/in/vishwasverma)
