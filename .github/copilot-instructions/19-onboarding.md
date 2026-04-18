# Developer Onboarding — Get Running in 60 Minutes

## Welcome to Voicory

Voicory is a premium voice AI SaaS for businesses. Real users, real revenue. You're joining a product that's live — every change you make affects paying customers.

Read this entire file before writing a single line of code.

---

## What You Need to Know First

| Topic | File |
|---|---|
| Architecture overview | `03-architecture.md` |
| Design system | `05-design-system.md` + `17-design-standards.md` |
| Security rules | `02-security.md` |
| Dependency standards | `18-context7-dependencies.md` |
| Code quality | `01-code-quality.md` |
| Current status | `workspace-voicory/STATUS.md` |

Read all of them. No shortcuts.

---

## Local Setup (60 min target)

### Prerequisites
```bash
node --version   # must be >=20
npm --version    # must be >=10
git --version
```

### Step 1: Clone & Install (10 min)
```bash
git clone https://github.com/esspron/Voicory.git
cd Voicory

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### Step 2: Environment Variables (15 min)
```bash
# Backend
cp backend/.env.example backend/.env.local
# Fill in from Vishwas or 1Password — ask for the dev env values
# NEVER use production keys locally

# Frontend
cp frontend/.env.example frontend/.env.local
# VITE_API_URL=http://localhost:3001 for local dev
# VITE_SUPABASE_URL=<dev project url>
# VITE_SUPABASE_ANON_KEY=<dev anon key>
```

**Ask Vishwas for:** Dev Supabase project credentials, dev API keys.
**Never use** production keys on your local machine.

### Step 3: Run Locally (5 min)
```bash
# Terminal 1 — Backend
cd backend && node index.js
# Runs on http://localhost:3001
# Health check: curl http://localhost:3001/health

# Terminal 2 — Frontend
cd frontend && npm run dev
# Runs on http://localhost:5173
```

### Step 4: Verify Setup (10 min)
- [ ] Frontend loads at localhost:5173
- [ ] Can log in with dev credentials
- [ ] Network tab shows API calls hitting localhost:3001
- [ ] No console errors on the dashboard

### Step 5: Run Tests (5 min)
```bash
cd frontend && npm run test:run
# All tests must pass before you write any code
```

---

## Your First Day Checklist

- [ ] Read all 18 copilot instruction files
- [ ] Local setup working
- [ ] All tests passing
- [ ] Understand the git workflow (see below)
- [ ] Understand the PR process (see `19-eng-process.md`)
- [ ] Talk to Vishwas about your first task

---

## Git Workflow

```
feature/your-feature-name
        ↓ PR + review
     staging
        ↓ approved by Vishwas
       main  →  auto-deploy (Vercel + Cloud Run)
```

### Branch naming
```
feature/assistant-editor-redesign
fix/twilio-webhook-signature
chore/remove-lucide-react
test/playwright-dashboard-e2e
docs/update-api-contracts
```

### Commit format (enforced)
```
type: short description (max 72 chars)

Types: feat | fix | chore | docs | test | refactor | perf | style
```

Examples:
```
feat: add voice preview button to AssistantEditor
fix: skeleton loader matches actual layout in CallLogs
perf: memoize assistant list to prevent re-renders on tab switch
docs: update 08-backend.md with new /api/calls endpoint
```

---

## What "Done" Means at Voicory

A task is **not done** until:
1. ✅ Code works end-to-end (not just "locally seems fine")
2. ✅ Tests written and passing
3. ✅ UI has all states: loading, empty, error, success
4. ✅ Relevant context file updated (see `00-overview.md` sync table)
5. ✅ Security scan passed: `git diff --cached | grep -E "eyJ|sk-|re_[A-Za-z]"` returns empty
6. ✅ PR opened with screenshots for any UI change
7. ✅ Reviewed and approved

---

## Getting Help

- **Codebase questions** → read the copilot instructions first, then ask
- **Product questions** → ask Vishwas
- **Blocked on credentials** → ask Vishwas (keep a list, batch your asks)
- **Found a bug that's not in your task** → log it in STATUS.md, don't fix it now unless it's critical

---

## Red Lines (Non-Negotiable)

1. **Never push secrets** to the public repo `esspron/Voicory`
2. **Never merge to main** without Vishwas approval
3. **Never deploy to production** without running tests
4. **Never modify another person's in-progress branch** without telling them
5. **Never skip the context sync** — stale docs break AI tools and future devs
