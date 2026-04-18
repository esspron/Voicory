# API Contracts — Backend ↔ Frontend

## Rule: Backend is a Contract

Every API endpoint is a contract between backend and frontend. Changing an endpoint without updating both sides = production bug.

### When you change an API:
1. Update this file in the same commit
2. Update the frontend service that calls it in the same PR
3. Never remove a field that the frontend uses — add new fields, deprecate old ones

---

## Authentication

Every protected API call uses:
```typescript
// Frontend: always use authFetch from lib/api.ts
import { authFetch } from '../lib/api';
const data = await authFetch('/api/assistants');

// Backend: verifySupabaseAuth middleware
router.get('/assistants', verifySupabaseAuth, async (req, res) => {
  const userId = req.user.id; // always use this, never trust client-sent userId
});
```

---

## Standard Response Shapes

### Success
```json
{ "data": <payload>, "message": "optional success message" }
```

### Error
```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

### Paginated List
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

---

## Core Endpoints Reference

> Keep this updated. Every new endpoint must be added here.

### Assistants
```
GET    /api/assistants              → list user's assistants
POST   /api/assistants              → create assistant
GET    /api/assistants/:id          → get single assistant
PUT    /api/assistants/:id          → update assistant
DELETE /api/assistants/:id          → delete assistant
POST   /api/assistants/:id/duplicate → duplicate assistant
POST   /api/assistants/preview-voice → ElevenLabs TTS preview
```

### Calls
```
GET    /api/calls                   → list calls (paginated)
GET    /api/calls/:callId           → get single call with transcript
```

### Phone Numbers
```
GET    /api/phone-numbers           → list user's numbers
POST   /api/phone-numbers           → buy/import number
DELETE /api/phone-numbers/:id       → release number
PUT    /api/phone-numbers/:id/assign → assign to assistant
PUT    /api/phone-numbers/:id       → update config
```

### Analytics
```
GET    /api/analytics/dashboard     → stats (days=7|30|90)
GET    /api/analytics/monthly-report → CSV export
```

### Team
```
GET    /api/team/members            → list org members
POST   /api/team/invite             → invite member
DELETE /api/team/members/:id        → remove member
PUT    /api/team/members/:id/role   → change role
POST   /api/team/invites/:id/resend → resend invite
DELETE /api/team/invites/:id        → cancel invite
POST   /api/team/invites/accept     → accept invite
```

### Settings
```
GET    /api/settings/org            → get org settings
PUT    /api/settings/org            → update org settings
POST   /api/settings/org/logo       → upload org logo
```

### Billing (Paddle)
```
GET    /api/paddle/config           → Paddle client token + product IDs
POST   /api/paddle/webhook          → Paddle webhook handler
```

### Webhooks (Twilio / LiveKit / WhatsApp)
```
POST   /api/twilio/voice            → incoming call handler
POST   /api/twilio/gather           → gather/AI response
POST   /api/twilio/status           → call status callback
POST   /api/livekit/webhook         → LiveKit room events
POST   /api/whatsapp/webhook        → WhatsApp messages
POST   /api/whatsapp/oauth/callback → WhatsApp OAuth
```

### Health
```
GET    /health                      → { status: "ok", supabase: bool, redis: bool }
```

---

## Error Codes (Machine-Readable)

```
AUTH_REQUIRED         → 401, user not logged in
AUTH_FORBIDDEN        → 403, user doesn't own the resource
NOT_FOUND             → 404
VALIDATION_ERROR      → 400, invalid input
RATE_LIMITED          → 429, too many requests
INTEGRATION_ERROR     → 502, third-party service failed
INTERNAL_ERROR        → 500, unexpected server error
```

---

## Versioning Policy

- No API versioning currently (v1 implicit)
- When a breaking change is needed: add new field alongside old, deprecate old after frontend is updated
- Never remove a field in the same deploy as adding the new one — give frontend one deploy cycle
