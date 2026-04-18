# Context7 & Dependency Standards

## MANDATORY: Always Use Context7 Before Writing Integration Code

Before writing ANY code that uses a third-party library or SDK — **every single time, no exceptions**:

```bash
# Step 1: Resolve the library ID
mcporter call context7.resolve-library-id --args '{"libraryName": "<library name>"}'

# Step 2: Fetch current docs for your specific topic
mcporter call context7.get-library-docs --args '{
  "context7CompatibleLibraryID": "<id from step 1>",
  "topic": "<specific topic, e.g. authentication, real-time, webhooks>",
  "tokens": 8000
}'
```

**If Context7 doesn't have the library:**
→ Read `node_modules/<package>/dist/` or the SDK source directly before writing code
→ Never rely on training knowledge alone for third-party SDKs

**Why this rule exists:**
Skipping Context7 caused multi-hour debug loops from stale API knowledge. SDK methods change between minor versions. One wrong method call = broken feature in production.

---

## Libraries That ALWAYS Require Context7 Check

| Library | Why |
|---|---|
| `@supabase/supabase-js` | Auth/RLS/realtime APIs change frequently |
| `livekit-client` / `@livekit/components-react` | WebRTC + room APIs evolve rapidly |
| `framer-motion` | Animation API changed significantly v10→v11→v12 |
| `react-router-dom` | v7 has breaking changes from v6 |
| `@paddle/paddle-js` | Billing API, overlay vs inline checkout |
| `tailwindcss` | v4 is fundamentally different from v3 (CSS-first, no config.js) |
| `zod` | v4 has new API patterns |
| `@stripe/stripe-js` | Payment intents, webhook events |
| `@livekit/components-styles` | CSS class names |
| `vitest` | Test runner API |
| `@testing-library/react` | Rendering patterns |
| Any backend npm package | Always verify before use |

---

## Version Registry — Single Source of Truth

**NEVER introduce a new package version without updating this table.**
**NEVER have the same package at different versions in frontend vs backend.**

### Frontend (`frontend/package.json`)

| Package | Version | Last Verified via Context7 |
|---|---|---|
| react | ^19.2.0 | — |
| react-dom | ^19.2.0 | — |
| react-router-dom | ^7.9.6 | — |
| typescript | ~5.8.2 | — |
| vite | ^6.2.0 | — |
| tailwindcss | ^4.1.17 | — |
| @tailwindcss/vite | ^4.1.17 | — |
| @supabase/supabase-js | ^2.84.0 | — |
| @phosphor-icons/react | ^2.1.10 | — |
| framer-motion | ^12.23.24 | — |
| livekit-client | ^2.16.1 | — |
| @livekit/components-react | ^2.9.17 | — |
| zod | ^4.1.13 | — |
| recharts | ^3.4.1 | — |
| @headlessui/react | ^2.2.9 | — |
| clsx | ^2.1.1 | — |
| tailwind-merge | ^3.4.0 | — |

### Backend (`backend/package.json`)

> Run `cat backend/package.json` to populate — keep this in sync.

### ⚠️ Known Misalignment Issues (Fix Before Adding New Code)
- `lucide-react` is in `frontend/package.json` but has been migrated to `@phosphor-icons/react`. **Remove lucide-react.** Any remaining lucide imports must be converted.

---

## Rules for Adding New Dependencies

1. **Check Context7 first** — is the library well-documented and actively maintained?
2. **Check bundle size** — use bundlephobia.com mental model: is there a lighter alternative?
3. **Check version compatibility** — does it support React 19, TypeScript 5.8, Vite 6?
4. **Add to this registry** — update the version table above in the same commit
5. **One version everywhere** — if a package is used in both frontend and backend, pin the same major version
6. **No duplicate functionality** — don't add a new date library if one already exists, don't add a new HTTP client if fetch works

---

## Version Misalignment Prevention

### Before every `npm install <package>`:
```bash
# Check if it's already installed somewhere else in the project
grep -r "<package>" frontend/package.json backend/package.json package.json 2>/dev/null

# Check for peer dependency warnings after install
npm install <package> 2>&1 | grep "peer dep"
```

### Periodic audit (run monthly):
```bash
# Check for outdated packages
cd frontend && npm outdated
cd backend && npm outdated

# Check for security vulnerabilities
npm audit --audit-level=moderate
```

### When upgrading a package:
1. Check Context7 for breaking changes in the new version
2. Update version in this registry file
3. Test the specific features you use
4. Run full test suite: `npm run test:run`
5. Document what changed in the commit message

---

## Tailwind v4 Specific Rules

Tailwind v4 is fundamentally different from v3:
- **NO** `tailwind.config.js` — does not exist in this project
- **CSS-first config** in `frontend/app.css` using `@theme` directive
- **OKLCH P3 color system** — see `05-design-system.md` for all color variables
- **Plugin**: `@tailwindcss/vite` (not PostCSS)
- **Never** look for or create `tailwind.config.js`
- **Never** use v3 syntax like `theme.extend` in JS

Always verify Tailwind v4 syntax via Context7 before using any advanced feature.

---

## Context7 MCP Config

API Key: `ctx7sk-d460bbf1-8354-4219-ace7-30c3b91c62f8`

Available via mcporter in this workspace. If MCP is unavailable, fallback to curl:
```bash
# Search for library
curl -s "https://context7.com/api/v1/search?query=<lib>" \
  -H "Authorization: Bearer ctx7sk-d460bbf1-8354-4219-ace7-30c3b91c62f8"

# Get docs
curl -s "https://context7.com/api/v1<id>/llms.txt?tokens=8000&topic=<topic>" \
  -H "Authorization: Bearer ctx7sk-d460bbf1-8354-4219-ace7-30c3b91c62f8"
```
