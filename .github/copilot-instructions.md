# AI Coding Agent Instructions

## 1. Project Overview & Architecture
- **Stack**: React 19 (Vite), TypeScript, Tailwind CSS (CDN/Script-based), Node.js/Express Backend, Supabase (Auth, DB).
- **Architecture**: 
  - **Frontend-First**: The React app communicates directly with Supabase for most data operations (Auth, CRUD).
  - **Backend**: A lightweight Node.js/Express service (`backend/`) primarily for specific server-side tasks or proxying, but the frontend is the main driver.
  - **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Key Directories**:
  - `frontend/`: Main React application.
  - `backend/`: Node.js server and Supabase migrations.
  - `frontend/services/`: Contains API logic. **Note**: `callyyService.ts` currently handles Supabase data fetching and mock data fallbacks.

## 2. Critical Developer Workflows
- **Frontend Development**:
  - Run: `npm run dev` (in `frontend/`).
  - Build: `npm run build`.
- **Backend Development**:
  - Run: `node index.js` (in `backend/`).
- **Database Management**:
  - Migrations are stored in `backend/supabase/migrations/`.
  - Apply migrations via Supabase Dashboard SQL Editor (copy-paste content).
- **Environment Setup**:
  - Frontend requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 3. Codebase Conventions & Patterns
- **Data Fetching Strategy (Hybrid Mock/Real)**:
  - **Pattern**: `frontend/services/callyyService.ts` implements a "Supabase First, Mock Fallback" strategy.
  - **Rule**: When implementing data fetchers, always try to fetch from Supabase first. If it fails (or returns empty/error), return the corresponding `MOCK_*` constant.
  - **Example**:
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

- **Styling (Non-Standard Tailwind)**:
  - **Configuration**: Tailwind is configured via a `<script>` tag in `frontend/index.html`, NOT `tailwind.config.js`.
  - **Custom Colors**: Defined in `index.html` (e.g., `primary: '#2EC7B7'`, `surface: '#1B1E23'`).
  - **Rule**: Do not look for `tailwind.config.js` to modify themes. Edit `frontend/index.html` instead.

- **Routing**:
  - Uses `react-router-dom` v7.

- **Icons**:
  - Use `lucide-react` for all icons.

## 4. Integration Points
- **Supabase**:
  - Client initialized in `frontend/services/supabase.ts`.
  - Tables: `voices`, `assistants`, `phone_numbers`, `api_keys`, `call_logs`, `customers`.
  - **RLS**: Always assume RLS is active; queries are scoped to the authenticated user (`user_id`).

- **Callyy Integration**:
  - While named `callyyService.ts`, this file currently acts as the primary data layer for the dashboard entities.

## 5. Data Flow Architecture (READ vs WRITE)

### Performance-Optimized Pattern:
- **READ Operations** → Frontend (Vercel) → Supabase Direct
- **WRITE Operations from Webhooks** → Backend (Railway) → Supabase

### Why This Split:
| Operation | Path | Latency | Reason |
|-----------|------|---------|--------|
| Read data | Frontend → Supabase | ~50-100ms | Direct connection, no middleman |
| Webhook writes | Railway → Supabase | N/A | Needs stable URL, secrets, processing |

### Frontend (Vercel) Handles:
- All SELECT queries (fast direct reads)
- User-initiated CRUD operations
- Real-time subscriptions
- Auth state management

### Backend (Railway) Handles:
- **Webhooks** from VAPI/Twilio (call completions, events)
- **Heavy processing** (transcript analysis, AI calls)
- **Secret API calls** (ElevenLabs, payment providers)
- **Background jobs** and scheduled tasks
- Operations requiring **service role key**

### Webhook Data Flow Example:
```
VAPI Call Ends
     │
     ▼
Railway Backend receives webhook
     │ - Parse transcript
     │ - AI analysis (sentiment, insights)
     │ - Generate summary
     ▼
Backend saves to Supabase
     │ - customer_conversations
     │ - customer_insights  
     │ - customer_memories (auto-updated via trigger)
     ▼
Frontend reads from Supabase (fast)
     │ - User opens customer details
     │ - Displays memory, conversations, insights
```

### Code Pattern for Reads (Frontend):
```typescript
// ✅ GOOD - Direct Supabase read (fast)
const memory = await supabase
    .from('customer_memories')
    .select('*')
    .eq('customer_id', customerId);
```

### Code Pattern for Webhook Writes (Backend):
```javascript
// ✅ GOOD - Backend processes and writes
app.post('/webhooks/call-complete', async (req, res) => {
    const { customerId, transcript } = req.body;
    
    // Process with AI/secrets
    const analysis = await analyzeWithAI(transcript);
    
    // Write to Supabase (service role)
    await supabase.from('customer_conversations').insert({...});
    
    res.json({ success: true });
});
```

### Key Rules:
1. **Never route reads through backend** - adds unnecessary latency
2. **Always use backend for webhooks** - needs stable URL + secrets
3. **Use parallel requests** for multiple reads: `Promise.all([...])`
4. **RLS handles security** for frontend reads - no backend needed

## 6. Common Pitfalls to Avoid
- **Tailwind Config**: Do not try to add plugins or theme extensions in a `tailwind.config.js` file; it won't work. Use the script tag in `index.html`.
- **Service Naming**: Don't be confused by `callyyService.ts` handling generic database entities (Customers, Call Logs). This is the current convention.
- **Import Maps**: Note the `<script type="importmap">` in `index.html`. Ensure new dependencies are compatible or properly handled by Vite.
- **Routing Reads Through Backend**: Don't proxy read operations through Railway - it doubles latency. Frontend → Supabase is fastest.
- **Webhook URLs**: Backend (Railway) must handle webhooks since Vercel functions are stateless and URLs change.
