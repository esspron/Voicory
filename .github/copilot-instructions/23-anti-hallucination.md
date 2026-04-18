# Anti-Hallucination Protocol — ZERO TOLERANCE

## The Rule

**Never write code based on assumed knowledge. Verify everything before touching it.**

A hallucinated function name in a React app = a bug.
A hallucinated Cosmos SDK method = a chain halt.
A hallucinated API endpoint = broken payments for merchants.

There is no acceptable hallucination. None.

---

## Before Writing Any Code — Mandatory Verification

### Third-Party Libraries
```bash
# ALWAYS check Context7 first
mcporter call context7.resolve-library-id --args '{"libraryName": "<lib>"}'
mcporter call context7.get-library-docs --args '{"context7CompatibleLibraryID": "<id>", "topic": "<topic>", "tokens": 8000}'

# If Context7 doesn't have it → read the actual source
cat node_modules/<package>/dist/index.js | head -100
# OR
cat vendor/<module>/keeper.go | head -100
```

### Existing Codebase
```bash
# ALWAYS read the file before editing it
cat <file> | head -100

# ALWAYS check if a function actually exists before calling it
grep -rn "func.*FunctionName" x/vitacoin/
grep -rn "export.*functionName" src/services/

# ALWAYS check current imports before adding new ones
head -30 <file>

# ALWAYS verify the API route exists before wiring frontend to it
grep -rn "router\.\|app\." backend/routes/
```

### File Paths
```bash
# ALWAYS verify a file exists before reading/editing it
ls <directory>/
find . -name "<filename>" 2>/dev/null

# NEVER assume a file is at a path — always verify first
```

---

## The "I Think" Test

Before writing any line of code, ask:
> "Am I certain this is correct, or do I just think it might be?"

| Certainty | Action |
|---|---|
| 100% certain (just read it) | Write the code |
| "Pretty sure" | Verify first, then write |
| "I think" / "should be" | Stop. Verify. Then write. |
| "I believe" / "might be" | Stop. Verify. Then write. |
| "Usually works like" | Stop. Read the actual docs/source. Then write. |

---

## What Must Be Verified (Not Assumed)

### Always verify:
- Every function/method signature before calling it
- Every import path before using it
- Every API endpoint before wiring to it
- Every environment variable name before referencing it
- Every database column name before querying it
- Every Cosmos SDK message type before constructing it
- Every CosmJS method before calling it
- Every Expo API before using it
- Every file path before reading/writing

### Never assume:
- That a function signature matches what you remember
- That an API response shape matches training knowledge
- That a package version has the same API as an older version
- That a file exists at a path you haven't verified
- That a test passes without running it
- That code works without testing it

---

## Verification Commands — Quick Reference

```bash
# Does this file exist?
ls path/to/file

# What functions does this file export?
grep -n "^func\|^export" path/to/file.go
grep -n "^export\|^const\|^function" path/to/file.ts

# What does this API route accept/return?
grep -A 20 "router.get\|router.post" backend/routes/<file>.js

# What columns does this table have?
grep -rn "create table\|ALTER TABLE" backend/supabase/migrations/

# What's the actual function signature?
grep -n "func.*FunctionName" x/vitacoin/keeper/*.go

# What version of this package is installed?
grep "<package>" go.mod
grep '"<package>"' package.json

# Does this test actually pass?
go test ./x/vitacoin/keeper/ -run TestFunctionName -v
npm run test:run -- --filter FunctionName
```

---

## After Writing Code — Verify It Works

```bash
# Blockchain: always compile before claiming it works
make build
# If it doesn't compile → it doesn't work. Don't report it as done.

# Run the specific test
go test -v ./x/vitacoin/keeper/ -run TestYourChange

# Mobile: TypeScript must pass
npx tsc --noEmit
# Zero errors before committing

# Backend: start it and hit the endpoint
node index.js &
curl -X POST http://localhost:3001/api/your-endpoint -d '{}' -H "Content-Type: application/json"

# Frontend: check for console errors
# Screenshot the actual running UI — not just the code
```

---

## Reporting Standards — Be Exact

When reporting to Vishwas, never say:
- ❌ "Should work now"
- ❌ "I think this fixes it"
- ❌ "This looks correct"
- ❌ "It should pass"

Always say:
- ✅ "Tests pass: `go test ./x/vitacoin/keeper/` — 97 tests, 0 failures"
- ✅ "Build succeeds: `make build` output: `vitacoind built successfully`"
- ✅ "Endpoint verified: `curl /api/calls` returns 200 with correct shape"
- ✅ "TypeScript clean: `tsc --noEmit` — 0 errors"
- ✅ "UI screenshot attached — before/after"

**If you can't show proof it works → it's not done.**

---

## Track Every TODO

Every unresolved point gets tracked — not left as a mental note.

```bash
# Add to STATUS.md immediately when you discover an issue
# Never say "I'll remember to fix this" — write it down NOW

# Find all TODOs in the codebase
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.go" --include="*.ts" --include="*.tsx" .
```

**Rule:** If you discover a TODO or issue while working on something else:
1. Add it to STATUS.md Fix Queue immediately
2. Finish your current task
3. Then address the new issue

Never leave a session without logging everything you found.
