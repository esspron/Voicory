# Backend Architecture (Modular)

## Route Mounting
```javascript
// index.js - Currently mounted modular routes
const testChatRoutes = require('./routes/testChat');
const twilioRoutes = require('./routes/twilio');
const whatsappOAuthRoutes = require('./routes/whatsappOAuth');
const exotelRoutes = require('./routes/exotel');

app.use('/api', testChatRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/whatsapp', whatsappOAuthRoutes);
app.use('/api/exotel', exotelRoutes);

// WhatsApp webhooks are inline in index.js (not using whatsappWebhook.js route file)
// GET /api/webhooks/whatsapp - Meta webhook verification
// POST /api/webhooks/whatsapp - Incoming messages with AI processing

// Exotel routes:
// POST /api/exotel/import-numbers    - Import phone numbers from Exotel
// POST /api/exotel/verify-import     - Verify Exotel credentials (requires auth)
// POST /api/webhooks/exotel/:userId/:callSid - Exotel webhook for call events
// WebSocket: wss://voicory-backend-783942490798.asia-south1.run.app/ws/exotel/:userId/:callSid
```

---

## Exotel Phone Numbers
The `phone_numbers` table has a `provider` column (default: `twilio`) that now also supports `exotel`.
Exotel numbers are imported via the Exotel API and stored with `provider = 'exotel'`.

---

## Service Layer Usage
```javascript
// Example: routes/testChat.js
const { getCachedAssistant } = require('../services/assistant');
const { searchKnowledgeBase } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
```

---

## Creating New Routes
```javascript
// routes/myFeature.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');

router.post('/endpoint', async (req, res) => {
    // Implementation
});

module.exports = router;
```

---

## Creating New Services
```javascript
// services/myService.js
const { supabase, openai } = require('../config');

async function myFunction(params) {
    // Implementation
}

module.exports = { myFunction };
```

---

## Environment Variables (Cloud Run)
```env
NODE_ENV=production
SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
OPENAI_API_KEY=<your-openai-key>
ELEVENLABS_API_KEY=<your-elevenlabs-key>
GOOGLE_TTS_API_KEY=<your-google-tts-key>
DEEPGRAM_API_KEY=<your-deepgram-key>
FACEBOOK_APP_ID=<your-facebook-app-id>
FACEBOOK_APP_SECRET=<your-facebook-app-secret>
```

---

## WhatsApp Environment Variables
```bash
# Backend (.env)
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Frontend (.env)
VITE_FACEBOOK_APP_ID=your_app_id
VITE_FACEBOOK_CONFIG_ID=your_embedded_signup_config_id
```
