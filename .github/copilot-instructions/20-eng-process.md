# Engineering Process — PRs, Reviews, Releases

## Pull Request Rules

### Every PR must have:
- [ ] Clear title following commit format: `feat: description`
- [ ] Description: what changed, why, how to test
- [ ] Screenshots for any UI change (before + after)
- [ ] All tests passing (`npm run test:run`)
- [ ] No console errors
- [ ] Relevant context file updated
- [ ] Security scan passed

### PR Size Rules
- **Small PRs win** — under 400 lines of change preferred
- If a PR is >400 lines → split it. No exceptions.
- One feature/fix per PR. Don't bundle unrelated changes.
- Draft PRs are allowed and encouraged for WIP

### PR Template (use this)
```markdown
## What
Brief description of what changed.

## Why
Why this change was needed.

## How to Test
1. Go to [page]
2. Do [action]
3. Expected: [result]

## Screenshots
[Before] [After]

## Checklist
- [ ] Tests passing
- [ ] Context files updated
- [ ] Security scan clean
- [ ] No console errors
- [ ] UI states complete (loading/empty/error)
```

---

## Code Review Standards

### As a Reviewer
- Review within **24 hours** of PR opening
- Approve only if you've actually tested it (not just read it)
- Be specific in comments — not "this is wrong" but "this will cause a re-render on every keystroke because X, use useMemo like this: ..."
- Block on: security issues, broken tests, no error handling, missing states
- Comment (don't block) on: style preferences, minor suggestions

### As the Author
- Respond to every review comment (resolve or explain)
- Don't merge until all blocking comments are resolved
- Don't argue in PRs — take it to a call if needed

### What Gets Blocked (automatic rejection)
- Any hardcoded secret or API key
- Missing error handling on async operations
- No loading state on async UI
- TypeScript errors (`any` types without justification)
- Broken tests
- No context file update when code changed

---

## Release Process

### Branching Strategy
```
feature/* → staging → main (production)
```

### Staging Deploy
- Automatic on merge to `staging` branch
- URL: Vercel preview URL (see PR)
- Every PR should be tested on staging before merging to main

### Production Release
1. All features for release are merged to `staging`
2. Vishwas does final review on staging
3. Vishwas approves merge to `main`
4. Auto-deploys: Vercel (frontend) + Cloud Run (backend)
5. Verify production health check: `GET https://api.voicory.com/health`
6. Monitor error tracking for 30 min post-deploy

### Hotfix Process (production is broken)
```bash
git checkout main
git checkout -b hotfix/description
# fix it
# fast PR — Vishwas reviews immediately
git merge hotfix/description main
# deploy immediately
```

---

## Feature Flags

For features that need gradual rollout:
```typescript
// Use Supabase feature flags table
const { data } = await supabase
  .from('feature_flags')
  .select('enabled')
  .eq('name', 'new_dashboard_v2')
  .eq('org_id', orgId)
  .single();

if (data?.enabled) {
  return <NewDashboard />;
}
return <OldDashboard />;
```

This lets you ship code without exposing it to all users — essential for risky changes.

---

## Database Migration Rules

**Production DB changes are irreversible. Treat them like surgery.**

### Rules
1. **Never alter a production table** without a written migration file in `backend/supabase/migrations/`
2. **Always add, never rename** columns in a live table (rename = breaking change)
3. **Always nullable first** — add a column as nullable, backfill data, then add NOT NULL if needed
4. **Test migrations on dev DB first**
5. **Get Vishwas approval** before running any migration on production
6. **One migration per PR** — never bundle schema changes

### Migration file naming
```
YYYYMMDD_NNN_description.sql
e.g.: 20260419_017_add_feature_flags_table.sql
```

### Before running any migration
```sql
-- Always check: what's the rollback?
-- Write the DOWN migration before running the UP migration
-- Test on: SELECT * FROM table LIMIT 5; to verify structure after
```

---

## Incident Response

### If production is down
1. **Immediately notify Vishwas** — don't investigate alone for more than 5 min
2. Check: `GET https://api.voicory.com/health` — is backend alive?
3. Check: Vercel dashboard — is frontend deployed?
4. Check: Supabase dashboard — is DB responding?
5. Check: Railway/Cloud Run logs for errors
6. **Rollback first, investigate second** — get users back online
7. Write a post-mortem in `memory/YYYY-MM-DD-incident.md` after resolution

### Rollback commands
```bash
# Vercel frontend — go to Vercel dashboard → Deployments → Redeploy previous
# Cloud Run backend
gcloud run services update-traffic voicory-backend \
  --to-revisions=<previous-revision>=100 \
  --region asia-south1
```

### Severity levels
- **P0 (Critical)** — all users affected, revenue impacted → fix in <1 hour, wake up Vishwas
- **P1 (High)** — major feature broken for some users → fix in <4 hours
- **P2 (Medium)** — non-critical feature broken → fix in <24 hours
- **P3 (Low)** — cosmetic issue, minor bug → next sprint
