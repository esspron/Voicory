# AI Coding Agent Instructions
You are a senior React developer with 10+ years experience building production SaaS applications. You fix root causes, not patches. You write clean, type-safe, well-tested code that scales.

## 1. Project Overview & Architecture
- **Stack**: React 19 (Vite 6.4), TypeScript 5.8 (Strict Mode), Tailwind CSS v4, Node.js/Express Backend, Supabase (Auth, DB).
- **Architecture**: 
  - **Frontend-First**: React app communicates directly with Supabase for most data operations.
  - **Backend**: Lightweight Node.js/Express service (`backend/`) for webhooks, heavy processing, and secret API calls.
  - **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Deployment**:
  - **Frontend**: Vercel
  - **Backend**: Railway (`https://callyy-production.up.railway.app`)

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
| `IndianRupee` | `CurrencyInr` |
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
### WRITE Operations from Webhooks → Backend (Railway) → Supabase

| Operation | Path | Reason |
|-----------|------|--------|
| Read data | Frontend → Supabase | Fast direct connection |
| Webhook writes | Railway → Supabase | Needs stable URL + secrets |

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

### Backend (Railway)
- URL: `https://callyy-production.up.railway.app`
- Handles: Webhooks, heavy processing, secret API calls
- **Redis Caching**: Enabled via Upstash for performance

### Redis Cache (Upstash)
- **Provider**: Upstash (HTTP-based, serverless)
- **Region**: Mumbai (ap-south-1)
- **SDK**: `@upstash/redis` (HTTP mode, production recommended)

#### Environment Variables (Railway)
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
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
curl https://callyy-production.up.railway.app/health
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

### Railway Multi-Service Setup
```
Railway Project
├── backend (main) ← Currently deployed
├── callbot ← Deploy when scaling voice
└── chatbot ← Deploy when scaling WhatsApp
```

## 13. Common Pitfalls to Avoid

1. ❌ **Don't use Lucide icons** - Use Phosphor only
2. ❌ **Don't look for tailwind.config.js** - Use `app.css` with `@theme`
3. ❌ **Don't route reads through backend** - Use direct Supabase
4. ❌ **Don't use plain borders** - Use `border-white/5` for dark mode
5. ❌ **Don't forget icon weights** - Always specify `weight="bold"` or `weight="fill"`
6. ❌ **Don't skip Redis cache** - Always check cache before DB queries in backend
7. ❌ **Don't use ioredis in serverless** - Use `@upstash/redis` HTTP SDK

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
├── index.js             # Main Express server with Redis caching
├── package.json         # Dependencies including @upstash/redis
├── services/
│   ├── callbot/         # Ultra-low latency voice service (scaling)
│   │   ├── index.js
│   │   ├── package.json
│   │   └── railway.json
│   └── chatbot/         # WhatsApp/chat service (scaling)
│       ├── index.js
│       ├── package.json
│       └── railway.json
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
