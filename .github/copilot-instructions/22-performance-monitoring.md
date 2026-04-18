# Performance Budgets & Monitoring

## Core Web Vitals Targets (Lighthouse)

These are the minimum acceptable scores. Every deploy must maintain them.

| Metric | Target | Fail Threshold |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | > 4s |
| FID / INP (Interaction to Next Paint) | < 200ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | > 0.25 |
| Lighthouse Performance | > 80 | < 60 |
| Lighthouse Accessibility | > 90 | < 70 |

### How to check
```bash
# Run Lighthouse against local build
cd frontend && npm run build
npx serve dist &
npx lighthouse http://localhost:3000 --view

# Or use browser DevTools → Lighthouse tab
```

---

## Bundle Size Budgets

| Asset | Budget | Action if Exceeded |
|---|---|---|
| Initial JS bundle | < 500KB gzipped | Code-split the new feature |
| Largest chunk | < 200KB gzipped | Lazy load the route |
| Total CSS | < 50KB gzipped | Purge unused Tailwind classes |

### Check bundle size
```bash
cd frontend && npm run build
# Look at dist/ output for chunk sizes
# Anything >200KB gzipped → investigate and split
```

---

## Frontend Performance Rules

### Mandatory for Every Component

**Prevent unnecessary re-renders:**
```typescript
// Expensive computations → useMemo
const sortedAssistants = useMemo(() =>
  assistants.sort((a, b) => a.name.localeCompare(b.name)),
  [assistants]
);

// Stable callbacks → useCallback
const handleDelete = useCallback(async (id: string) => {
  await deleteAssistant(id);
}, []); // empty deps if no dependencies

// Heavy child components → React.memo
export const AssistantCard = React.memo(({ assistant }: Props) => {
  // ...
});
```

**Search inputs → always debounce:**
```typescript
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 350); // 350ms

useEffect(() => {
  if (debouncedQuery) fetchResults(debouncedQuery);
}, [debouncedQuery]);
```

**Route-level code splitting:**
```typescript
// Every page-level component must be lazy loaded
const CallLogs = lazy(() => import('./pages/CallLogs'));
const Assistants = lazy(() => import('./pages/Assistants'));
```

**Images:**
```tsx
// Always: width, height, loading="lazy"
<img src={url} alt="description" width={48} height={48} loading="lazy" />
// Prefer WebP for product images
// Use Supabase Storage image transform for thumbnails
```

---

## Backend Performance Rules

**Database queries:**
```javascript
// ✅ Select only columns you need — never SELECT *
const { data } = await supabase
  .from('assistants')
  .select('id, name, created_at')  // not select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);

// ✅ Parallel fetches — never chain awaits unnecessarily
const [assistants, callCount] = await Promise.all([
  fetchAssistants(userId),
  fetchCallCount(userId)
]);
```

**Redis caching — use for:**
- User session data (TTL: 1 hour)
- Frequently-read config (assistant settings) (TTL: 5 min)
- Rate limit counters

**Response times targets:**
| Endpoint type | Target | Alert threshold |
|---|---|---|
| Simple CRUD | < 200ms | > 500ms |
| Analytics/aggregation | < 1s | > 3s |
| AI/voice generation | < 3s | > 10s |

---

## Error Monitoring

### Errors must be tracked, not swallowed

**Frontend — every async operation:**
```typescript
try {
  const data = await fetchAssistants();
  setAssistants(data);
} catch (error) {
  // Log structured error
  console.error('[AssistantsPage] fetch failed:', error);
  // Show user-friendly message
  setError('Failed to load assistants. Please refresh.');
  // TODO: integrate Sentry when budget allows
}
```

**Backend — structured logging:**
```javascript
// Always include: request ID, user ID, what failed, why
console.error(`[${req.id}] [user:${req.user?.id}] twilio voice AI failed:`, {
  error: error.message,
  stack: error.stack,
  callSid: req.body.CallSid
});
```

### Error Budget
- **P0 errors (5xx on core flows)**: 0 tolerance — fix same day
- **P1 errors (broken features)**: < 1% of requests — fix within 24h
- **P2 errors (degraded experience)**: < 5% of requests — fix within 1 week

---

## Accessibility Baseline (a11y)

Voicory's users are businesses — accessibility = professionalism and legal compliance.

### Required for all interactive elements:
```tsx
// Buttons must have aria-label when icon-only
<button aria-label="Delete assistant">
  <Trash size={18} />
</button>

// Form inputs must have associated labels
<label htmlFor="assistant-name">Assistant Name</label>
<input id="assistant-name" type="text" />

// Images must have meaningful alt text
<img src={logo} alt="Voicory logo" />
// Decorative images
<img src={decoration} alt="" aria-hidden="true" />

// Loading states must be announced
<div role="status" aria-live="polite">
  {isLoading ? 'Loading...' : ''}
</div>
```

### Keyboard navigation:
- All interactive elements reachable via Tab
- Modals trap focus (use `focus-trap-react` or `@headlessui/react`)
- Escape key closes modals/dropdowns

### Color contrast:
- Text on background: minimum 4.5:1 ratio
- The OKLCH color system in `05-design-system.md` is designed to pass — don't deviate from it
