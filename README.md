# Voicory — AI Voice Agents with Customer Memory

Voicory is a SaaS platform that replaces human call handlers with AI voice agents. Each agent remembers every customer interaction across calls, so conversations pick up where they left off — no repeat questions, no lost context.

Built as a production product with live customers.

---

## What it does

- **AI Voice Agents** — Inbound and outbound calling powered by VAPI, with ElevenLabs and PlayHT for voice synthesis
- **Customer Memory** — Every call is stored and summarized. The AI references past interactions automatically on the next call
- **Multi-channel** — Same agent handles Voice + WhatsApp in one dashboard
- **Knowledge Base** — Upload docs, PDFs, SOPs. The agent uses them to answer questions accurately
- **Phone Number Management** — Provision and route numbers via Twilio
- **Team + Org Management** — Multi-member orgs, roles, referral program

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + RLS) |
| Voice AI | VAPI, ElevenLabs, PlayHT |
| Telephony | Twilio |
| Messaging | WhatsApp Business API |
| Deployment | Vercel (frontend) + Railway (backend) |

## Architecture

```
├── frontend/       React + Vite dashboard
├── backend/        Node.js API server
│   └── supabase/   DB migrations
├── docs/           Product docs + marketing
└── assets/         Static assets
```

## Why I built this

Most businesses still use human agents for repetitive inbound calls — compliance checks, appointment confirmations, order status. Voicory automates that with AI that actually remembers who it's talking to.

The hardest part was the memory layer: structuring conversation summaries so the LLM can reference them accurately without hallucinating past events.

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

**Required env vars:**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VAPI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

## Built by

[Vishwas Verma](https://linkedin.com/in/vishwasverma) — founder, architect, shipped solo using AI-assisted development.
