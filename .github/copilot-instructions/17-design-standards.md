# Design Standards — Apple App of the Year Bar

## The Standard

Voicory is a premium B2B SaaS. Every screen must look and feel like it could win an Apple Design Award. No exceptions.

**Reference products:** Linear, Vercel Dashboard, Raycast, Notion, Loom — study them, match them.

**The test before marking any UI task done:**
> "Would a paying B2B customer opening this for the first time feel like they're using a world-class product?"

If no → keep going.

---

## Design Language

### Brand Essence
Voicory = **intelligent, fast, trustworthy** voice AI.
Every screen must reinforce these three qualities.

### Visual Hierarchy
- One dominant heading per screen
- Clear primary action (one CTA rules the page)
- Supporting content visually recedes
- Whitespace is intentional — let elements breathe

### Depth & Dimension
- Use glassmorphism: `bg-surface/80 backdrop-blur-xl border border-white/5`
- Ambient glow for focal points: `absolute blur-3xl bg-primary/10`
- Subtle shadows on interactive elements: `shadow-lg shadow-primary/25`
- Cards lift on hover: `hover:-translate-y-0.5 hover:shadow-xl`

---

## Micro-Animations (Required)

Every interactive element must have a transition. No bare state changes.

```tsx
// Base transition on all interactive elements
className="transition-all duration-200"

// Hover lift for cards/buttons
className="hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"

// Fade in for modals/dropdowns
className="animate-in fade-in duration-200"

// Skeleton pulse for loading
className="animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5"

// Spin for loading indicators
className="animate-spin"  // Use CircleNotch from Phosphor
```

---

## Performance (No Perceived Lag)

- **Optimistic UI** — update state immediately, sync to server in background
- **Skeleton loaders** — not spinners. Skeletons must match the actual layout shape
- **Debounce** all search inputs (300-350ms)
- **Lazy load** heavy routes and modals
- **No unnecessary re-renders** — memoize with useMemo/useCallback where data is expensive
- **Batch API calls** — use Promise.all() for parallel fetches
- **Cache aggressively** — don't refetch data you already have in state

---

## Required States for Every Component

### Loading State
```tsx
// Skeleton that matches the actual layout
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-lg w-3/4" />
    <div className="h-4 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-lg w-1/2" />
  </div>
);
```

### Empty State
```tsx
// Always: custom icon container + heading + subtext + CTA
<div className="flex flex-col items-center justify-center py-16 gap-4">
  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
    <Icon size={28} weight="duotone" className="text-primary" />
  </div>
  <div className="text-center">
    <h3 className="text-textMain font-semibold">No [items] yet</h3>
    <p className="text-textMuted text-sm mt-1">Create your first [item] to get started</p>
  </div>
  <button className="px-4 py-2 bg-primary text-black font-semibold rounded-xl ...">
    Create [Item]
  </button>
</div>
```

### Error State
```tsx
// Human language — never raw error strings
<div className="text-center py-8">
  <Warning size={32} className="text-red-400 mx-auto mb-2" />
  <p className="text-textMain font-medium">Something went wrong</p>
  <p className="text-textMuted text-sm">We couldn't load your data. Try refreshing.</p>
  <button onClick={retry} className="mt-3 text-primary text-sm hover:underline">Try again</button>
</div>
```

### Success Feedback
- Use toast notifications for async actions (save, delete, create)
- Toast duration: 3s for success, 5s for errors
- Never silent success — always confirm to the user

---

## Component Quality Checklist

### Buttons
- [ ] Correct size + padding for context (compact in tables, full in forms)
- [ ] Hover state (color/shadow shift)
- [ ] Active/pressed state (slight scale down)
- [ ] Disabled state (opacity-50, cursor-not-allowed)
- [ ] Loading state (spinner + text change e.g. "Saving...")
- [ ] No button without a clear label or icon

### Inputs & Forms
- [ ] Label above input
- [ ] Placeholder text that helps (not "Enter value")
- [ ] Focus ring: `focus:outline-none focus:ring-2 focus:ring-primary/50`
- [ ] Inline error message (red, below input, with Warning icon)
- [ ] Inline success indicator where appropriate
- [ ] Submit button shows loading state during submission

### Modals & Dialogs
- [ ] Backdrop blur: `bg-black/50 backdrop-blur-sm`
- [ ] Close button (X) in top right
- [ ] Keyboard escape to close
- [ ] Focus trapped inside modal
- [ ] Smooth open/close animation

### Tables & Lists
- [ ] Column headers with proper weight
- [ ] Row hover state: `hover:bg-white/[0.02]`
- [ ] Empty state when no data
- [ ] Pagination or infinite scroll for long lists
- [ ] Row actions visible on hover (not always shown)

---

## Custom SVGs

When a Phosphor icon doesn't capture the brand feeling:
- Create a custom SVG in `/frontend/src/assets/icons/`
- Match the OKLCH color palette
- Use `currentColor` for easy color theming
- Size: design at 24x24, export clean paths

Brand-critical icons that should be custom:
- Voicory logo mark
- Voice waveform / audio indicators
- Empty state illustrations (per page)
- Onboarding flow illustrations

---

## Responsive Behavior

Primary target: 1280px–1440px desktop (B2B SaaS users)
- Test at 1280px (minimum supported)
- Test at 1440px (most common)
- Mobile: dashboard is not mobile-first, but must not break below 768px

---

## Typography Scale

```
text-xs     → 12px  → meta labels, timestamps
text-sm     → 14px  → body text, table content, descriptions
text-base   → 16px  → primary UI text
text-lg     → 18px  → section headings
text-xl     → 20px  → card headings
text-2xl    → 24px  → page sub-headings
text-3xl    → 30px  → page headings
text-4xl+   → 36px+ → hero/marketing only
```

Font weights:
- `font-normal` → body text
- `font-medium` → UI labels, table headers
- `font-semibold` → headings, CTAs, important values
- `font-bold` → sparingly, maximum emphasis only

---

## What "Done" Looks Like for UI Work

1. ✅ Screenshot before (shows the problem)
2. ✅ Fix applied properly (root cause, not symptom)
3. ✅ Screenshot after (shows the improvement)
4. ✅ All interactive states work (hover, loading, error, empty)
5. ✅ No console errors
6. ✅ Tested at 1280px and 1440px
7. ✅ Animation/transition feels smooth (not jarring)
8. ✅ Committed with design context file update
