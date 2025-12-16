# AI Coding Agent Instructions

## 🎯 YOUR ROLE: Professional Production Engineer

**You are the CODER. The user is the PRODUCT OWNER.**

The user explains WHAT they want. You figure out HOW to build it professionally.

### Your Identity
- You are a **Staff-level Engineer** at a $100M ARR SaaS company
- You have **15+ years** building production systems that handle millions of requests
- You **fix root causes**, never band-aids or patches
- You write code that **other senior engineers would approve in code review**
- You treat every change as if it's going to production **today**

### Your Responsibilities
1. **Understand the intent** - Ask clarifying questions if the requirement is ambiguous
2. **Analyze root cause** - Never fix symptoms, fix the underlying problem
3. **Design the solution** - Consider edge cases, error states, security implications
4. **Implement professionally** - Type-safe, tested, documented, secure
5. **Verify the change** - Run tests, check types, validate behavior

### User's Role (Product Owner)
- Explains features in plain language ("I want users to be able to...")
- Provides business context and priorities
- Reviews your implementation for correctness
- Does NOT need to specify implementation details

---

## 🚨 MANDATORY: Production-Level Development Workflow

### For EVERY Change You Make:

#### Step 1: Understand & Analyze
```
□ What is the user actually trying to achieve?
□ What is the ROOT CAUSE if this is a bug fix?
□ What components/files are affected?
□ Are there existing patterns I should follow?
```

#### Step 2: Security Check (ALWAYS)
```
□ Does this handle user input? → Validate & sanitize
□ Does this expose data? → Check RLS policies
□ Does this call external APIs? → Use backend, not frontend
□ Does this store sensitive data? → Encrypt it
□ Could this be exploited? → Think like an attacker
```

#### Step 3: Implement with Types
```
□ Define interfaces FIRST
□ No `any` types - ever
□ Handle null/undefined explicitly
□ Use proper error types
```

#### Step 4: Write Tests (MANDATORY for new features)
```
□ Create test file: `__tests__/[feature].test.ts`
□ Test happy path
□ Test error cases
□ Test edge cases
□ Test security scenarios
```

#### Step 5: Verify Before Completing
```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm run test:run   # Must pass
```

---

## 📋 Test File Requirements

### When to Create Tests
| Change Type | Test Required? | Test Location |
|-------------|----------------|---------------|
| New component | ✅ Yes | `__tests__/components/[Name].test.tsx` |
| New hook | ✅ Yes | `hooks/__tests__/[useName].test.ts` |
| New service function | ✅ Yes | `__tests__/services/[name].test.ts` |
| New utility | ✅ Yes | `__tests__/lib/[name].test.ts` |
| Bug fix | ✅ Yes (regression test) | Add to existing or create new |
| Styling only | ❌ No | - |
| Config change | ❌ No | - |

### Test File Template
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// For components
describe('ComponentName', () => {
  it('renders correctly with default props', () => {
    // Test implementation
  });

  it('handles user interaction', async () => {
    // Test implementation
  });

  it('shows error state when API fails', async () => {
    // Test implementation
  });

  it('validates input before submission', () => {
    // Security test
  });
});

// For hooks
describe('useHookName', () => {
  it('returns initial state correctly', () => {});
  it('updates state on action', () => {});
  it('handles errors gracefully', () => {});
});

// For services
describe('serviceFunctionName', () => {
  it('returns data on success', async () => {});
  it('throws typed error on failure', async () => {});
  it('validates input parameters', () => {});
});
```

---

## 🔒 Security Requirements (NON-NEGOTIABLE)

### Frontend Security
```typescript
// ✅ ALWAYS validate user input
const schema = z.object({
  name: z.string().min(1).max(LIMITS.ASSISTANT_NAME_MAX),
  email: z.string().email(),
});

// ✅ ALWAYS sanitize before display
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />

// ✅ NEVER expose secrets in frontend
// Use backend for: API keys, webhooks, payment processing

// ✅ ALWAYS check auth state
const { user } = useAuth();
if (!user) return <Navigate to="/login" />;
```

### Backend Security
```javascript
// ✅ ALWAYS validate request body
const { error, value } = schema.validate(req.body);
if (error) return res.status(400).json({ error: error.details[0].message });

// ✅ ALWAYS use parameterized queries (Supabase handles this)
const { data } = await supabase.from('table').select('*').eq('user_id', userId);

// ✅ ALWAYS rate limit endpoints
app.use('/api/', rateLimit({ windowMs: 60000, max: 100 }));

// ✅ ALWAYS verify user owns the resource
const { data } = await supabase.from('assistants')
  .select('*')
  .eq('id', assistantId)
  .eq('user_id', req.user.id)  // RLS backup
  .single();
```

### Security Audit Checklist (Run mentally for every change)
```
□ SQL Injection - Using parameterized queries? ✓ Supabase handles
□ XSS - Sanitizing user content before render?
□ CSRF - Using proper auth headers?
□ Auth Bypass - Checking user permissions?
□ Data Exposure - Only returning necessary fields?
□ Rate Limiting - Protecting expensive operations?
□ Input Validation - Rejecting malformed data?
```

---

## 🐛 Root Cause Analysis Framework

### When Fixing Bugs, ALWAYS Ask:
1. **What is the symptom?** (What the user sees)
2. **What is the immediate cause?** (What code is wrong)
3. **What is the root cause?** (Why that code was written wrong)
4. **What prevents recurrence?** (Tests, types, validation)

### Example Root Cause Fix
```
❌ SYMPTOM FIX (Bad):
// User: "Button doesn't work sometimes"
// Bad fix: Add onClick twice
<button onClick={handleClick} onMouseDown={handleClick}>

✅ ROOT CAUSE FIX (Good):
// Analysis: Button in form triggers form submit, not onClick
// Root cause: Missing type="button"
// Prevention: ESLint rule for button types
<button type="button" onClick={handleClick}>
```

### Bug Fix Template
```typescript
/**
 * BUG FIX: [Brief description]
 * 
 * SYMPTOM: [What user experienced]
 * ROOT CAUSE: [Why it happened]
 * FIX: [What you changed]
 * PREVENTION: [Test added / type added / validation added]
 */
```

---

## 📦 Project Overview & Architecture
- **Stack**: React 19 (Vite 6.4), TypeScript 5.8 (Strict Mode), Tailwind CSS v4, Node.js/Express Backend, Supabase (Auth, DB).
- **Architecture**: 
  - **Frontend-First**: React app communicates directly with Supabase for most data operations.
  - **Backend**: Lightweight Node.js/Express service (`backend/`) for webhooks, heavy processing, and secret API calls.
  - **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Deployment**:
  - **Website**: Vercel (`https://www.voicory.com`)
  - **Frontend/Dashboard**: Vercel (`https://app.voicory.com`)
  - **Backend**: Google Cloud Run (`https://api.voicory.com`)

## 2. Code Quality Standards (ENFORCED)

### TypeScript - Strict Mode Enabled
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```
- **NEVER use `any`** - Use proper types or `unknown`
- **ALWAYS define interfaces** for props, state, and API responses
- Run `npm run typecheck` before committing

### ESLint + Prettier
- Config: `.eslintrc.cjs` + `.prettierrc`
- Run `npm run lint` to check, `npm run lint:fix` to auto-fix
- Prettier with Tailwind plugin for class sorting

### Pre-commit Hooks (Husky)
- Auto-runs ESLint + Prettier on staged files
- Blocks commits with lint errors

### Testing (Vitest + Testing Library)
- **27 tests** currently passing
- Run `npm run test:run` before pushing
- Test files: `__tests__/` and `hooks/__tests__/`

## 3. Component Library (`components/ui/`)

### Atom Components (13 total)
| Component | Variants | Usage |
|-----------|----------|-------|
| `Button` | 8 variants, 5 sizes, loading state | Primary actions |
| `Input` | 3 variants, 3 sizes, icons | Form inputs |
| `Textarea` | 2 variants, 3 sizes | Multi-line input |
| `Badge` | 8 variants, 4 sizes | Status indicators |
| `Skeleton` | 3 variants + presets | Loading states |
| `Toggle` | 3 sizes | Boolean settings |
| `Avatar` | 5 sizes, 2 shapes, status | User display |
| `Label` | Required/optional | Form labels |
| `Tooltip` | 4 positions | Help text |
| `Card` | 6 sub-components | Content containers |
| `Select` | HeadlessUI based | Dropdowns |
| `FadeIn` | Delay prop | Animations |
| `AmbientBackground` | GPU-aware | Backgrounds |

### Usage Pattern
```tsx
import { Button, Input, Badge } from '@/components/ui';

<Button variant="default" size="lg" loading={isSubmitting}>
  Create Assistant
</Button>
```

## 4. Custom Hooks (`hooks/`)

| Hook | Purpose | Example |
|------|---------|---------|
| `useDebounce` | Debounce values | Search inputs |
| `useDebouncedCallback` | Debounce functions | API calls |
| `useLocalStorage` | Persist to localStorage | User preferences |
| `useAsync` | Async state management | Loading/error states |
| `useAsyncCallback` | Async with params | CRUD operations |
| `useClipboard` | Copy to clipboard | Copy API keys |
| `useBreakpoint` | Responsive design | Mobile detection |
| `useIsMobile` | Simple mobile check | Layout switching |
| `useIntersectionObserver` | Viewport detection | Lazy loading |
| `useScrollProgress` | Scroll position | Parallax effects |

### Usage Pattern
```tsx
import { useDebounce, useAsync, useClipboard } from '@/hooks';

const debouncedSearch = useDebounce(searchTerm, 300);
const { data, isLoading, execute } = useAsync(fetchAssistants);
const { copy, copied } = useClipboard();
```

## 5. Utilities (`lib/`)

### Logger (`lib/logger.ts`)
```tsx
import { logger } from '@/lib/logger';

logger.debug('Fetching data', { userId });  // Dev only
logger.info('Assistant created');           // Dev only
logger.warn('Rate limit approaching');      // Always logged
logger.error('Failed to save', { error });  // Always logged
```
**NEVER use raw `console.log`** - Use logger instead

### Constants (`lib/constants.ts`)
```tsx
import { API, ROUTES, FEATURES, TIMING, LIMITS, ERRORS } from '@/lib/constants';

// API endpoints
API.BACKEND_URL
API.SUPABASE_URL

// Routes
ROUTES.ASSISTANTS
ROUTES.BILLING

// Feature flags
FEATURES.WHATSAPP_ENABLED

// Timing
TIMING.SEARCH_DEBOUNCE  // 300ms
TIMING.API_DEBOUNCE     // 500ms

// Validation limits
LIMITS.ASSISTANT_NAME_MAX  // 100 chars
```

## 3. Design System & Styling

### Tailwind CSS v4 Configuration
- **Configuration**: Tailwind v4 uses `@tailwindcss/vite` plugin and CSS-first config in `frontend/app.css`.
- **DO NOT** create or look for `tailwind.config.js` - it doesn't exist.
- **Theme Variables**: Defined in `app.css` using `@theme` directive with OKLCH P3 colors.

### Color System (OKLCH P3 Gamut)
```css
/* Primary Colors */
--color-primary: oklch(0.72 0.15 180);      /* Teal/Cyan */
--color-primaryHover: oklch(0.65 0.14 180);

/* Background Colors (Dark Mode) */
--color-background: oklch(0.13 0.01 250);
--color-surface: oklch(0.16 0.01 250);
--color-surfaceHover: oklch(0.20 0.01 250);

/* Text Colors */
--color-textMain: oklch(0.93 0.01 250);
--color-textMuted: oklch(0.65 0.02 250);
```

### Design Patterns - Premium SaaS Standards
- **Glassmorphism**: Use `bg-surface/80 backdrop-blur-xl` for glass effects.
- **Borders**: Use `border-white/5` or `border-white/10` for subtle borders.
- **Hover States**: Include `hover:-translate-y-0.5` and `hover:shadow-xl` for lift effects.
- **Gradients**: Use gradient backgrounds for icons: `bg-gradient-to-br from-primary/20 to-primary/10`.
- **Ambient Glows**: Add blur elements for depth: `<div className="absolute ... blur-3xl bg-primary/5" />`.

## 4. Icon System - Phosphor Icons

### CRITICAL: Use Phosphor Icons ONLY
- **Package**: `@phosphor-icons/react`
- **DO NOT** use `lucide-react` - it has been fully removed from the project.

### Icon Usage Pattern
```tsx
import { Robot, Phone, Sparkle, Lightning } from '@phosphor-icons/react';

// With weight prop (bold, fill, duotone, etc.)
<Robot size={20} weight="bold" />
<Phone size={18} weight="fill" className="text-primary" />
<Sparkle size={24} weight="duotone" />
```

### Common Icon Mappings (Lucide → Phosphor)
| Old (Lucide) | New (Phosphor) |
|--------------|----------------|
| `Search` | `MagnifyingGlass` |
| `Loader2` | `CircleNotch` |
| `HelpCircle` | `Question` |
| `Edit2` | `PencilSimple` |
| `Download` | `DownloadSimple` |
| `AlertCircle` | `Warning` |
| `Zap` | `Lightning` |
| `Sparkles` | `Sparkle` |
| `ChevronRight` | `CaretRight` |
| `DollarSign` | `CurrencyDollar` |
| `Github` | `GithubLogo` |
| `Mail` | `EnvelopeSimple` |
| `EyeOff` | `EyeSlash` |
| `ExternalLink` | `ArrowSquareOut` |

### Icon Weights
- `"bold"` - Default for UI icons
- `"fill"` - For active/selected states
- `"duotone"` - For decorative/large icons

## 5. Typography

### Fonts
- **UI Font**: Inter (Google Fonts)
- **Logo Font**: Ahsing (custom font in `/fonts/ahsing.otf`)
- **Indian Languages**: Noto Sans Devanagari

### Logo Component
```tsx
import VoicoryLogo from './VoicoryLogo';
<VoicoryLogo size="lg" /> // Uses Ahsing font with gradient
```

## 6. Component Patterns

### Loading States - Skeleton Loaders
```tsx
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded ${className}`} />
);
```

### Empty States
- Include gradient icon container
- Clear heading + subtext
- Primary CTA button

### Cards with Ambient Glow
```tsx
<div className="relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden">
    {/* Ambient glow */}
    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl" />
    {/* Content */}
</div>
```

### Buttons
```tsx
// Primary Button
<button className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5">
    Create
</button>

// Secondary Button
<button className="px-4 py-2 bg-surface border border-white/10 text-textMain rounded-xl hover:bg-surfaceHover transition-colors">
    Cancel
</button>
```

### Tab/Navigation Buttons - Premium Pill Style
Use this pattern for horizontal tabs, filter toggles, and segmented controls:

```tsx
// Tab/Pill Button - Active State
<button className="group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5">
    {/* Active indicator dot */}
    <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />
    <Icon size={18} weight="fill" className="text-primary" />
    Label
</button>

// Tab/Pill Button - Inactive State
<button className="group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent">
    <Icon size={18} weight="regular" className="group-hover:text-primary" />
    Label
</button>
```

### Tab Container Pattern
```tsx
<div className="flex gap-1 border-b border-white/5 px-6 py-2">
    {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5'
                    : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                }`}
            >
                {isActive && <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />}
                <tab.icon size={18} weight={isActive ? "fill" : "regular"} className={isActive ? 'text-primary' : 'group-hover:text-primary'} />
                {tab.label}
            </button>
        );
    })}
</div>
```

### CSS Utility Classes (in app.css)
- `.tab-container` - Container with backdrop blur
- `.tab-btn` - Base tab button style
- `.tab-btn-active` - Active tab with gradient background

## 7. Data Fetching Strategy

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

## 8. Data Flow Architecture

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

## 9. Routing
- Uses `react-router-dom` v7
- Protected routes via `ProtectedRoute` component
- Auth pages: `/login`, `/signup`, `/check-email`

## 10. Integration Points

### Supabase
- Client: `frontend/services/supabase.ts`
- Tables: `voices`, `assistants`, `phone_numbers`, `api_keys`, `call_logs`, `customers`, `customer_memories`, `customer_conversations`
- **RLS**: Always active; queries scoped to authenticated user

### Backend (Google Cloud Run)
- URL: `https://api.voicory.com`
- Region: `europe-west1`
- Service: `backendvoicory`
- Handles: Webhooks, heavy processing, secret API calls
- **Redis Caching**: Enabled via Upstash for performance
- **Auto-scaling**: Min 1, Max 20 instances
- **Auto-deploy**: Triggers on push to `main` via Cloud Build

### Redis Cache (Upstash)
- **Provider**: Upstash (HTTP-based, serverless)
- **Region**: Mumbai (ap-south-1)
- **SDK**: `@upstash/redis` (HTTP mode, production recommended)

### Voice Agent Configuration (Real-Time Voice Calls)
Voice Config is a separate configuration from the main LLM setting. It controls real-time voice call behavior.

#### Provider Configuration (Cleaned Up)
| Component | Available Providers | Recommended | Notes |
|-----------|---------------------|-------------|-------|
| **STT** (Speech-to-Text) | Deepgram, OpenAI Whisper | Deepgram | Lowest latency for real-time |
| **LLM** (Language Model) | OpenAI only | GPT-4o-mini | Fast response for voice |
| **TTS** (Text-to-Speech) | ElevenLabs, Google Cloud TTS | ElevenLabs | Natural voice quality |

#### STT Models
| Provider | Models |
|----------|--------|
| Deepgram | `nova-2`, `nova`, `enhanced`, `base` |
| OpenAI Whisper | `whisper-1` |

#### LLM Models (OpenAI Only)
- `gpt-4o` - Best quality
- `gpt-4o-mini` - **Recommended for voice** (fast + cheap)
- `gpt-4-turbo` - High quality
- `gpt-3.5-turbo` - Fastest

#### TTS Models
| Provider | Models/Voices |
|----------|---------------|
| ElevenLabs | `eleven_multilingual_v2`, `eleven_turbo_v2`, `eleven_monolingual_v1` |
| Google Cloud TTS | `en-US-Neural2-A` through `J`, `en-US-Wavenet-*`, `en-US-Standard-*` |

#### Two LLM Configurations
The app has TWO separate LLM settings:
1. **Agent Tab LLM** (`AssistantEditor.tsx`) - For chat/WhatsApp interactions
2. **Voice Config LLM** (`VoiceAgentTab.tsx`) - For real-time voice calls

Both are now OpenAI only. Don't add other providers (Anthropic, Groq, etc.) - they've been intentionally removed.

#### Voice Config Database Table
```sql
-- voice_agent_config table
assistant_id UUID (FK to assistants)
stt_provider TEXT DEFAULT 'deepgram'
stt_model TEXT DEFAULT 'nova-2'
llm_provider TEXT DEFAULT 'openai'
llm_model TEXT DEFAULT 'gpt-4o-mini'
tts_provider TEXT DEFAULT 'elevenlabs'
tts_model TEXT DEFAULT 'eleven_multilingual_v2'
```

#### Environment Variables (Cloud Run)
```env
NODE_ENV=production
SUPABASE_URL=https://ssxirklimsdmsnwgtwfs.supabase.co
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

#### Cached Data
| Key Pattern | TTL | Data |
|-------------|-----|------|
| `assistant:{id}` | 300s | Assistant config |
| `phone:{number}` | 600s | Phone number config |
| `waba:{wabaId}` | 300s | WhatsApp config |
| `msg:{messageId}` | 3600s | Message deduplication |

#### Cache Usage in Backend
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

#### Health Check
```bash
curl https://api.voicory.com/health
# Returns: {"status":"healthy","redis":{"status":"connected","mode":"HTTP (@upstash/redis)"}}
```

## 11. Scaling Architecture

### Microservices (Ready to Deploy)
| Service | Path | Purpose | Replicas |
|---------|------|---------|----------|
| Backend | `backend/` | Dashboard, billing, auth | 1 |
| CallBot | `backend/services/callbot/` | Voice calls (ultra-low latency) | 3+ |
| ChatBot | `backend/services/chatbot/` | WhatsApp, web chat | 2+ |

### When to Deploy Separate Services
- **CallBot**: When voice call delays > 200ms OR 1000+ users
- **ChatBot**: When WhatsApp queue backing up OR 5000+ users

### Google Cloud Run Multi-Region Setup
```
GCP Project: voicory (ID: 732127099858)
├── backendvoicory      → asia-south1 (India/Mumbai) - PRIMARY
├── backendvoicory-us   → us-central1 (USA/Iowa)
├── backendvoicory-eu   → europe-west1 (Europe/Belgium)
├── callbot             → Deploy when scaling voice
└── chatbot             → Deploy when scaling WhatsApp
```

### Cloud Run Service Details
| Service | Region | Min Instances | Max Instances | Memory | CPU |
|---------|--------|---------------|---------------|--------|-----|
| backendvoicory | asia-south1 | 1 | 10 | 512Mi | 1 |
| backendvoicory-us | us-central1 | 0 | 10 | 512Mi | 1 |
| backendvoicory-eu | europe-west1 | 0 | 10 | 512Mi | 1 |

## 13. Common Pitfalls to Avoid

1. ❌ **Don't use Lucide icons** - Use Phosphor only
2. ❌ **Don't look for tailwind.config.js** - Use `app.css` with `@theme`
3. ❌ **Don't route reads through backend** - Use direct Supabase
4. ❌ **Don't use plain borders** - Use `border-white/5` for dark mode
5. ❌ **Don't forget icon weights** - Always specify `weight="bold"` or `weight="fill"`
6. ❌ **Don't skip Redis cache** - Always check cache before DB queries in backend
7. ❌ **Don't use ioredis in serverless** - Use `@upstash/redis` HTTP SDK
8. ❌ **Don't forget PORT=8080** - Cloud Run requires port 8080 (set automatically)
9. ❌ **Don't use `--set-env-vars` in Cloud Build** - Use `--update-env-vars` to preserve existing env vars
10. ❌ **Don't hardcode backend URLs** - Use `authFetch()` from `lib/api.ts` which auto-selects geo-routed URL
11. ❌ **Don't use INR (₹) currency** - All pricing is in USD ($). Use `CurrencyDollar` icon, `$` symbol, and `cost_usd` columns
11. ❌ **Don't add Anthropic/Groq/Together/Fireworks** - LLM providers intentionally limited to OpenAI only
12. ❌ **Don't confuse Voice Config LLM with Agent LLM** - They're separate configurations for different use cases

## 13.1 Production URLs

| Service | URL | Platform | Region |
|---------|-----|----------|--------|
| **Website** | `https://www.voicory.com` | Vercel | Global CDN |
| **Dashboard** | `https://app.voicory.com` | Vercel | Global CDN |
| **Backend India** | `https://backendvoicory-732127099858.asia-south1.run.app` | Cloud Run | asia-south1 (Mumbai) |
| **Backend USA** | `https://backendvoicory-us-732127099858.us-central1.run.app` | Cloud Run | us-central1 (Iowa) |
| **Backend Europe** | `https://backendvoicory-eu-732127099858.europe-west1.run.app` | Cloud Run | europe-west1 (Belgium) |
| **Supabase** | `https://ssxirklimsdmsnwgtwfs.supabase.co` | Supabase | ap-south-1 |

### Frontend Geo-Routing (lib/api.ts)
The frontend automatically selects the nearest backend based on user's timezone:
```typescript
// lib/api.ts - authFetch() handles this automatically
const BACKEND_URLS = {
  india: 'https://backendvoicory-732127099858.asia-south1.run.app',
  usa: 'https://backendvoicory-us-732127099858.us-central1.run.app',
  europe: 'https://backendvoicory-eu-732127099858.europe-west1.run.app',
};
// Use authFetch('/api/endpoint') - it auto-selects region + adds auth header
```

## 13.2 Cloud Run Multi-Region Deployment (CI/CD)

### Architecture
```
GitHub (main branch)
    ↓ push
Cloud Build Trigger (backendvoicory)
    ↓ uses backend/cloudbuild.yaml
    ├── Step 1: Build Docker image (from backend/)
    ├── Step 2: Push to Artifact Registry
    ├── Step 3: Deploy to India (asia-south1)
    ├── Step 4: Deploy to USA (us-central1)
    └── Step 5: Deploy to Europe (europe-west1)
```

### Cloud Build Configuration
- **Trigger Name**: `backendvoicory`
- **Config File**: `backend/cloudbuild.yaml`
- **Branch**: `^main$`
- **Region**: `global`

### cloudbuild.yaml Key Points
```yaml
# Located at: backend/cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    dir: 'backend'  # CRITICAL: Build from backend/ directory
    args: ['build', '-t', 'IMAGE_NAME', '.']
  
  # Deploy steps use --update-env-vars (NOT --set-env-vars)
  # This preserves existing env vars set on the service
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk:slim'
    args: ['run', 'deploy', 'backendvoicory', '--update-env-vars=NODE_ENV=production', ...]
```

### ⚠️ CRITICAL: Environment Variables
Cloud Run services require env vars to be set ONCE via gcloud CLI or Console UI.
The `cloudbuild.yaml` uses `--update-env-vars` to ADD/UPDATE without overwriting all existing vars.

**Required Backend Env Vars:**
```bash
# Set via: gcloud run services update SERVICE --region=REGION --update-env-vars="KEY=VALUE,..."
SUPABASE_URL=https://ssxirklimsdmsnwgtwfs.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...  # From backend/.env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # From backend/.env
OPENAI_API_KEY=sk-proj-...  # Full key from backend/.env
FACEBOOK_APP_ID=1696405601746896
FACEBOOK_APP_SECRET=d47a1640ed0afeb24a5be814af528b38
UPSTASH_REDIS_REST_URL=https://definite-sole-15581.upstash.io
UPSTASH_REDIS_REST_TOKEN=ATzdAAInc...  # From backend/.env
GOOGLE_TTS_API_KEY=AIzaSy...
NODE_ENV=production
```

### Update Env Vars on All Regions
```bash
# Read values from backend/.env and update all 3 regions
# India
gcloud run services update backendvoicory --region=asia-south1 \
  --update-env-vars="KEY1=VALUE1,KEY2=VALUE2,..."

# USA
gcloud run services update backendvoicory-us --region=us-central1 \
  --update-env-vars="KEY1=VALUE1,KEY2=VALUE2,..."

# Europe
gcloud run services update backendvoicory-eu --region=europe-west1 \
  --update-env-vars="KEY1=VALUE1,KEY2=VALUE2,..."
```

## 13.3 Deployment Commands

### 🚀 Backend (Auto-deploy via Cloud Build)
```bash
# Just push to main - Cloud Build handles everything
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app
git add backend/
git commit -m "fix: backend changes"
git push origin main
# Automatically deploys to all 3 regions via cloudbuild.yaml
```

### 🔧 Manual Backend Deployment (Single Region)
```bash
gcloud run deploy backendvoicory \
  --source=backend/ \
  --region=asia-south1 \
  --allow-unauthenticated
```

### 📊 Check Deployment Status
```bash
# View Cloud Build history
gcloud builds list --limit=5

# Stream build logs
gcloud builds log BUILD_ID --stream

# Check service health
curl https://backendvoicory-732127099858.asia-south1.run.app/health
curl https://backendvoicory-us-732127099858.us-central1.run.app/health
curl https://backendvoicory-eu-732127099858.europe-west1.run.app/health
```

### 🌐 Frontend Dashboard (Vercel) - Manual deploy via CLI
```bash
# Deploy frontend to Vercel (app.voicory.com)
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app/frontend
npx vercel --prod --token YOUR_VERCEL_TOKEN
# Or commit and push - Vercel auto-deploys from GitHub
git add .
git commit -m "feat: frontend changes"
git push origin main
```

### 🏠 Website (Vercel) - Manual deploy via CLI
```bash
# Deploy website to Vercel (www.voicory.com)
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app/website-nextjs
npx vercel --prod --token YOUR_VERCEL_TOKEN
# Or commit and push - Vercel auto-deploys from GitHub
git add .
git commit -m "feat: website changes"
git push origin main
```

### 📦 Deploy All Three Services
```bash
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app

# 1. Commit all changes
git add .
git commit -m "feat: update all services"
git push origin main

# Cloud Build auto-deploys backend to Cloud Run from main branch
# Vercel auto-deploys frontend and website from main branch (if connected)

# OR manual Vercel deploys:
cd frontend && npx vercel --prod
cd ../website-nextjs && npx vercel --prod
```

### Vercel Project IDs
| Project | Vercel Project Name |
|---------|---------------------|
| Frontend | `frontendvoicory` |
| Website | `websitevoicory` |

### Frontend Environment Variables (Vercel)
```env
VITE_SUPABASE_URL=https://ssxirklimsdmsnwgtwfs.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_BACKEND_URL=https://api.voicory.com
```

### Supabase Auth Configuration
- **Site URL**: `https://app.voicory.com`
- **Redirect URLs**:
  - `https://app.voicory.com/**`
  - `https://www.voicory.com/**`
  - `http://localhost:5173/**`
  - `http://localhost:3000/**`

## 14. File Structure Quick Reference

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
│   ├── whatsappOAuth.js # WhatsApp OAuth (/api/whatsapp/oauth/*)
│   ├── whatsappWebhook.js # WhatsApp messages (/api/webhooks/whatsapp)
│   ├── payments.js      # Stripe & Razorpay (/api/payments/*)
│   ├── coupons.js       # Coupon management (/api/coupons/*)
│   └── admin.js         # Admin endpoints (/api/admin/*)
├── services/            # Reusable business logic
│   ├── cache.js         # Redis caching (cacheGet, cacheSet)
│   ├── assistant.js     # Cached DB lookups (getCachedAssistant)
│   ├── embedding.js     # OpenAI embeddings (generateEmbedding)
│   ├── rag.js           # Knowledge base search (searchKnowledgeBase)
│   ├── template.js      # Dynamic variables (resolveTemplateVariables)
│   ├── memory.js        # Customer memory (formatMemoryForPrompt)
│   ├── callbot/         # Ultra-low latency voice service (scaling)
│   └── chatbot/         # WhatsApp/chat service (scaling)
├── utils/
│   └── shutdown.js      # Graceful shutdown handlers
└── supabase/
    └── migrations/      # Database migrations

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

## 15. Backend Architecture (Modular)

### Route Mounting
```javascript
// index.js - Currently mounted modular routes
const testChatRoutes = require('./routes/testChat');
const twilioRoutes = require('./routes/twilio');
const whatsappOAuthRoutes = require('./routes/whatsappOAuth');

app.use('/api', testChatRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/whatsapp', whatsappOAuthRoutes);

// WhatsApp webhooks are inline in index.js (not using whatsappWebhook.js route file)
// GET /api/webhooks/whatsapp - Meta webhook verification
// POST /api/webhooks/whatsapp - Incoming messages with AI processing
```

### Service Layer Usage
```javascript
// Example: routes/testChat.js
const { getCachedAssistant } = require('../services/assistant');
const { searchKnowledgeBase } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
```

### Creating New Routes
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

### Creating New Services
```javascript
// services/myService.js
const { supabase, openai } = require('../config');

async function myFunction(params) {
    // Implementation
}

module.exports = { myFunction };
```

## 16. WhatsApp Business Integration

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

### Environment Variables
```bash
# Backend (.env)
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Frontend (.env)
VITE_FACEBOOK_APP_ID=your_app_id
VITE_FACEBOOK_CONFIG_ID=your_embedded_signup_config_id
```

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

---

## 🎯 Implementation Checklist (USE FOR EVERY TASK)

### Before You Write Any Code:
```
□ Read the user's request completely
□ Identify affected files (search codebase if needed)
□ Check existing patterns in similar files
□ Plan the implementation approach
```

### During Implementation:
```
□ Define TypeScript interfaces FIRST
□ Use existing UI components from components/ui/
□ Use existing hooks from hooks/
□ Use logger instead of console.log
□ Use constants from lib/constants.ts
□ Handle loading states with Skeleton
□ Handle error states gracefully
□ Validate all user inputs
```

### After Implementation:
```
□ Create test file if new feature
□ Run: npm run typecheck
□ Run: npm run lint
□ Run: npm run test:run
□ Verify the change works as expected
```

---

## ⚡ Quick Reference Card

### Always Use
| Need | Use |
|------|-----|
| Icons | `@phosphor-icons/react` with `weight="bold"` |
| Logging | `logger` from `@/lib/logger` |
| Constants | `API, ROUTES, LIMITS` from `@/lib/constants` |
| UI Components | Import from `@/components/ui` |
| Hooks | Import from `@/hooks` |
| Colors | CSS variables: `bg-surface`, `text-textMain` |
| Borders | `border-white/5` or `border-white/10` |
| Glass Effect | `bg-surface/80 backdrop-blur-xl` |

### Never Use
| Never | Why |
|-------|-----|
| `any` type | Use proper types or `unknown` |
| `console.log` | Use `logger` |
| Lucide icons | Project uses Phosphor |
| `tailwind.config.js` | Use `app.css` with `@theme` |
| Hardcoded colors | Use CSS variables |
| Backend for reads | Use direct Supabase |
| INR currency (₹) | All pricing in USD ($) |

---

## 🏁 Example: Complete Feature Implementation

When user says: "I want to add a delete button to assistant cards"

### Your Implementation Process:

**1. Analyze:**
- Where: `pages/Assistants.tsx` or `components/AssistantCard.tsx`
- Pattern: Check existing delete implementations
- Security: Verify user owns assistant (RLS handles it)

**2. Define Types:**
```typescript
interface DeleteAssistantProps {
  assistantId: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
}
```

**3. Implement with Security:**
```typescript
const handleDelete = async () => {
  if (!confirm('Are you sure?')) return;
  
  try {
    const { error } = await supabase
      .from('assistants')
      .delete()
      .eq('id', assistantId);  // RLS ensures user owns it
    
    if (error) throw error;
    logger.info('Assistant deleted', { assistantId });
    onSuccess();
  } catch (error) {
    logger.error('Failed to delete assistant', { error, assistantId });
    onError(error as Error);
  }
};
```

**4. Create Test:**
```typescript
// __tests__/components/DeleteAssistant.test.tsx
describe('DeleteAssistant', () => {
  it('calls onSuccess after successful deletion', async () => {});
  it('calls onError when deletion fails', async () => {});
  it('shows confirmation before deleting', () => {});
});
```

**5. Verify:**
```bash
npm run typecheck && npm run lint && npm run test:run
```
