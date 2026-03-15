# Voicory — AI Voice Agents with Customer Memory

Voicory replaces human call handlers with AI voice agents that remember every customer interaction. Conversations pick up where they left off across calls — no repeat questions, no lost context.

Built as a production SaaS product. Inbound + outbound calling, WhatsApp, embedded widget, and a full CRM — all in one platform.

---

## What it does

- **AI Voice Agents** — Inbound and outbound calling via VAPI + LiveKit, with ElevenLabs and PlayHT for voice synthesis
- **Outbound Dialer** — Automated outbound campaigns with AI agents
- **Customer Memory** — Every call summarized and stored. The AI references past interactions on the next call automatically
- **Knowledge Base** — Upload docs and URLs. The agent crawls and indexes them to answer questions accurately
- **Lead Scoring** — Automatic lead qualification from call transcripts
- **Built-in CRM** — Contact management, conversation history, appointments
- **WhatsApp Integration** — Same AI agent handles Voice + WhatsApp in one dashboard
- **Embeddable Widget** — Drop a voice widget onto any website
- **Payments** — Stripe + Razorpay billing built in
- **TCPA Compliance** — US calling compliance layer

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + RLS) |
| Cache | Upstash Redis |
| Voice AI | VAPI, LiveKit, ElevenLabs, PlayHT |
| Telephony | Twilio |
| Messaging | WhatsApp Business API |
| Payments | Stripe, Razorpay |
| Deployment | Vercel (frontend) + Railway (backend) |

## Architecture

```
├── frontend/         React dashboard (TypeScript + Vite)
├── backend/          Node.js API
│   ├── routes/       REST endpoints (voice, CRM, payments, WhatsApp, etc.)
│   ├── services/     Business logic
│   └── supabase/     DB migrations
├── widget/           Embeddable voice widget
├── website-nextjs/   Marketing site
└── docs/             Product docs
```

## Why I built this

Most businesses still use human agents for repetitive inbound calls — follow-ups, appointment confirmations, order status. Voicory automates that with AI that actually remembers who it's talking to.

The hardest part was the memory layer: structuring conversation summaries so the LLM retrieves the right context without hallucinating past events. The second hard part was reliability — voice AI fails in unexpected ways, so the fallback logic and error handling took as long to build as the happy path.

## Running locally

```bash
# Frontend
cd frontend && npm install
cp .env.example .env.local
npm run dev

# Backend
cd backend && npm install
node index.js
```

**Key env vars (backend):**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
STRIPE_SECRET_KEY=
UPSTASH_REDIS_REST_URL=
```

## Built by

[Vishwas Verma](https://linkedin.com/in/vishwasverma) — founder and architect, shipped solo using AI-assisted development.
