# Integration Points

## Supabase
- Client: `frontend/services/supabase.ts`
- Tables: `voices`, `assistants`, `phone_numbers`, `api_keys`, `call_logs`, `customers`, `customer_memories`, `customer_conversations`, `voice_agent_config`, `voice_sessions`
- **RLS**: Always active; queries scoped to authenticated user

---

## Backend (Google Cloud Run)
- URL: `https://api.voicory.com`
- Region: `asia-south1` (primary), `us-central1`, `europe-west1`
- Service: `voicory-backend`
- Handles: Webhooks, heavy processing, secret API calls, LiveKit token generation
- **Redis Caching**: Enabled via Upstash for performance
- **Auto-scaling**: Min 1, Max 20 instances
- **Auto-deploy**: Triggers on push to `main` via Cloud Build

---

## Redis Cache (Upstash)
- **Provider**: Upstash (HTTP-based, serverless)
- **Region**: Mumbai (ap-south-1)
- **SDK**: `@upstash/redis` (HTTP mode, production recommended)

### Cached Data
| Key Pattern | TTL | Data |
|-------------|-----|------|
| `assistant:{id}` | 300s | Assistant config |
| `phone:{number}` | 600s | Phone number config |
| `waba:{wabaId}` | 300s | WhatsApp config |
| `msg:{messageId}` | 3600s | Message deduplication |

### Cache Usage in Backend
```javascript
// Get cached or fetch from DB
async function getCachedAssistant(id) {
    const cached = await redis.get(`assistant:${id}`);
    if (cached) return cached; // Already parsed by @upstash/redis
    
    const { data } = await supabase.from('assistants').select('*').eq('id', id).single();
    if (data) await redis.set(`assistant:${id}`, data, { ex: 300 });
    return data;
}
```

### Health Check
```bash
curl https://api.voicory.com/health
# Returns: {"status":"healthy","redis":{"status":"connected","mode":"HTTP (@upstash/redis)"}}
```

---

## LiveKit Voice Agent (Real-Time Voice Calls)

### Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LiveKit Voice Architecture                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Browser (Dashboard)          LiveKit Server (GCE VM)                  │
│   ──────────────────          ────────────────────────                  │
│   LiveKitVoiceCall.tsx  ─────►  livekit.voicory.com                     │
│   @livekit/components-react     (WebRTC SFU)                            │
│                                      │                                  │
│                                      ▼                                  │
│                              Python Voice Agent                         │
│                              (LiveKit Agents SDK 1.3)                   │
│                                      │                                  │
│                         ┌────────────┼────────────┐                     │
│                         ▼            ▼            ▼                     │
│                    OpenAI STT   OpenAI LLM   ElevenLabs TTS             │
│                    (Whisper)    (GPT-4o)     (Turbo v2.5)               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Components
| Component | Location | Purpose |
|-----------|----------|---------|
| LiveKit Server | `livekit.voicory.com` (GCE VM) | WebRTC SFU, room management |
| Voice Agent | `livekit/agent/main.py` | Python agent with STT/LLM/TTS |
| Frontend UI | `components/LiveKitVoiceCall.tsx` | Voice call modal with waveform |
| Token API | `backend/routes/livekit.js` | Generate room access tokens |

### Voice Config (Database-Driven)
Voice settings are stored in `voice_agent_config` table and loaded dynamically:

| Setting | Default | Source |
|---------|---------|--------|
| **STT** | OpenAI Whisper (`whisper-1`) | `voice_agent_config.stt_provider` |
| **LLM** | OpenAI GPT-4o | `voice_agent_config.llm_model` |
| **TTS** | ElevenLabs (from voice library) | `voices.elevenlabs_voice_id` |

### Key Files
| File | Purpose |
|------|---------|
| `livekit/agent/main.py` | Python voice agent (LiveKit SDK 1.3) |
| `frontend/components/LiveKitVoiceCall.tsx` | React voice call UI |
| `backend/routes/livekit.js` | Token generation endpoint |
| `frontend/components/assistant-editor/VoiceAgentTab.tsx` | Voice config UI |

### LiveKit Credentials
```bash
LIVEKIT_URL=wss://livekit.voicory.com
LIVEKIT_API_KEY=APIVoicorye503a529
LIVEKIT_API_SECRET=<stored in backend/.env>
```

### Agent Flow
1. User clicks "Test Voice" in assistant editor
2. Frontend calls `POST /api/livekit/token` with assistantId
3. Backend generates token with room name: `voice_{assistantId}_{userId}_{timestamp}`
4. Frontend connects to LiveKit room via `@livekit/components-react`
5. Python agent receives room event, loads config from Supabase
6. Agent creates STT/LLM/TTS pipeline based on `voice_agent_config`
7. Real-time voice conversation with <200ms latency

---

## Voice Config Database Table
```sql
-- voice_agent_config table (key fields)
assistant_id UUID (FK to assistants)
stt_provider TEXT DEFAULT 'whisper'  -- OpenAI Whisper
stt_model TEXT DEFAULT 'whisper-1'
llm_provider TEXT DEFAULT 'openai'
llm_model TEXT DEFAULT 'gpt-4o'
tts_provider TEXT DEFAULT 'elevenlabs'
tts_voice_id TEXT  -- Linked from voices table
```

### Two LLM Configurations
The app has TWO separate LLM settings:
1. **Agent Tab LLM** (`AssistantEditor.tsx`) - For chat/WhatsApp interactions
2. **Voice Config LLM** (`VoiceAgentTab.tsx`) - For real-time voice calls

Both are OpenAI only. Don't add other providers.

---

## WhatsApp Business Integration

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                  WhatsApp Integration                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Connection Methods:                                        │
│  ─────────────────────                                      │
│  1. Facebook OAuth (Recommended)                            │
│     - Uses Facebook Embedded Signup                         │
│     - Auto-configures WABA & phone number                   │
│     - Requires VITE_FACEBOOK_APP_ID & CONFIG_ID             │
│                                                             │
│  2. Manual Setup                                            │
│     - User enters WABA ID, Phone Number ID, Access Token    │
│     - Best for users with existing WhatsApp Business API    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Message Flow (Incoming):                                   │
│  ─────────────────────────                                  │
│  Meta Webhook → Backend → AI Processing → WhatsApp Reply    │
│                                                             │
│  1. Meta sends POST to /api/webhooks/whatsapp               │
│  2. Backend looks up whatsapp_configs by waba_id            │
│  3. If chatbot_enabled && assistant_id:                     │
│     - Fetch assistant config (cached)                       │
│     - Get conversation history from whatsapp_messages       │
│     - Process with OpenAI (uses assistant's instruction)    │
│     - Send reply via Graph API                              │
│  4. Store messages in whatsapp_messages table               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables
| Table | Purpose |
|-------|---------|
| `whatsapp_configs` | WABA credentials, linked assistant, settings |
| `whatsapp_messages` | Inbound/outbound message history |
| `whatsapp_contacts` | Contact profiles, conversation windows |
| `whatsapp_calls` | WhatsApp call events (future) |
| `whatsapp_templates` | Message templates (future) |

### Key Files
| File | Purpose |
|------|---------|
| `backend/routes/whatsappOAuth.js` | OAuth callback (authenticated) |
| `backend/index.js` | Webhook handlers (inline) |
| `frontend/pages/messenger/WhatsAppMessenger.tsx` | Connection UI |
| `frontend/services/whatsappService.ts` | CRUD operations |

### Enabling Chatbot for a Config
```typescript
// Frontend: Link assistant to WhatsApp config
await updateWhatsAppConfig(configId, {
    chatbotEnabled: true,
    assistantId: 'assistant-uuid'
});
```

### Testing WhatsApp Integration
1. Connect WhatsApp via OAuth or Manual setup
2. Enable chatbot and link an active assistant
3. Configure Meta webhook URL: `https://api.voicory.com/api/webhooks/whatsapp`
4. Send a message to the connected WhatsApp number
5. Check backend logs for processing
