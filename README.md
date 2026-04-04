# Voicory — AI Voice Agents for Business

Voicory enables businesses to deploy AI voice agents that handle inbound and outbound calls, WhatsApp messages, and web chat — with persistent customer memory across every interaction.

Live at **[voicory.com](https://voicory.com)**

---

## Features

- **AI Voice Agents** — Inbound and outbound calling via Twilio + LiveKit, with ElevenLabs and PlayHT voice synthesis
- **Customer Memory** — Every call summarized and stored. The AI references past interactions automatically on future calls
- **Knowledge Base** — Upload documents and URLs. The agent indexes them for accurate, grounded answers
- **WhatsApp Integration** — Same AI agent handles voice and WhatsApp from a unified dashboard
- **CRM Integrations** — Syncs with Follow Up Boss, LionDesk, and custom HTTP webhooks on call events
- **Appointment Booking** — AI detects booking intent mid-call and syncs to Google Calendar
- **Lead Scoring** — Automatic qualification scores generated from call transcripts
- **Embeddable Widget** — Drop a voice/chat widget onto any website with one script tag
- **Prepaid Credits** — Billing via Paddle; $1 = 1 credit with per-minute cost tracking
- **TCPA Compliance** — Built-in US calling compliance layer

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + RLS) |
| Cache | Upstash Redis |
| Voice AI | LiveKit, ElevenLabs, PlayHT |
| Telephony | Twilio |
| Messaging | WhatsApp Business API |
| Payments | Paddle |
| Deployment | Vercel (frontend) + Google Cloud Run (backend) |

---

## Repository Structure

```
├── frontend/          React dashboard (TypeScript + Vite)
│   ├── pages/         Route-level page components
│   ├── components/    Reusable UI components
│   └── services/      API client layer
├── backend/           Node.js REST API
│   ├── routes/        Endpoint handlers (voice, CRM, payments, webhooks, etc.)
│   ├── services/      Business logic (AI processor, memory, RAG, CRM, appointments)
│   └── supabase/      Database migrations
├── livekit/           LiveKit agent server (Dockerfile + config)
├── widget/            Embeddable voice/chat widget
├── website-nextjs/    Marketing site (Next.js)
└── admin/             Internal admin panel (local use only)
```

---

## Local Development

### Prerequisites

- Node.js 18+
- Supabase project
- Twilio account
- OpenAI API key

### Setup

```bash
# Clone
git clone https://github.com/esspron/Voicory
cd Voicory

# Frontend
cd frontend
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev

# Backend
cd backend
npm install
cp .env.example .env          # fill in all service keys
node index.js
```

### Required environment variables (backend)

```
SUPABASE_URL=
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

---

## Deployment

- **Frontend** — Auto-deploys to Vercel on push to `main`
- **Backend** — Google Cloud Run (`asia-south1`), deploy via:
  ```bash
  cd backend
  gcloud run deploy voicory-backend --source . --region asia-south1
  ```

---

## License

Private — all rights reserved. Not open source.
