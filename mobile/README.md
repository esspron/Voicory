# Voicory Mobile 📱

> AI-powered voice agents for your business — in your pocket.

Voicory Mobile is the companion app for the Voicory platform. It gives business owners and agents real-time visibility into their AI voice assistants: live call logs, customer interactions, WhatsApp conversations, analytics, and billing — all from iOS and Android.

---

## What Voicory Mobile Does

- **Dashboard** — At-a-glance stats: total calls, average duration, cost, success rate, credit balance
- **Call Logs** — Browse and replay every inbound/outbound call with transcripts and recordings
- **Customers** — Manage your customer database, view interaction history, add new contacts
- **WhatsApp** — Real-time WhatsApp Business conversation view, send/receive messages
- **AI Assistant** — Configure and monitor your voice assistant settings
- **Billing** — View your plan, credit balance, and usage limits (powered by Paddle)
- **Push Notifications** — Get notified of new calls and messages instantly

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + Expo Router v6 |
| Language | TypeScript 5.9 |
| UI | React Native 0.81 + NativeWind (Tailwind CSS) |
| Styling | Custom design system (`lib/theme.ts`) |
| State | Zustand 5 |
| Auth & DB | Supabase (`@supabase/supabase-js` v2) |
| Animations | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler |
| Navigation | Expo Router (file-based) + React Navigation |
| Notifications | Expo Notifications |
| Build/Deploy | EAS Build (Expo Application Services) |

---

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or yarn/pnpm)
- **Expo CLI**: `npm install -g expo-cli` or use `npx expo`
- **EAS CLI** (for builds): `npm install -g eas-cli`
- **iOS**: Xcode 15+ with iOS Simulator (macOS only)
- **Android**: Android Studio with an AVD, or a physical device

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/esspron/Voicory.git
cd Voicory/mobile

# 2. Install dependencies
npm install

# 3. Configure environment (see Environment Config below)
cp .env.example .env
# Edit .env with your Supabase keys

# 4. Start the dev server
npx expo start

# Or target a specific platform:
npx expo start --ios
npx expo start --android
```

When the dev server starts, scan the QR code with the **Expo Go** app (iOS/Android), or press `i` for iOS Simulator / `a` for Android Emulator.

---

## Environment Config

Create a `.env` file in the `mobile/` directory:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://ssxirklimsdmsnwgtwfs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend API
EXPO_PUBLIC_API_URL=https://api.voicory.com
```

> ⚠️ **Never commit `.env` with real values.** The Supabase anon key is safe to expose to clients (it's governed by Row Level Security), but keep the service role key server-side only.

Environment variables prefixed with `EXPO_PUBLIC_` are bundled into the app. Access them via `process.env.EXPO_PUBLIC_*` or `expo-constants`.

The Supabase client is initialized in [`lib/supabase.ts`](./lib/supabase.ts).

---

## Project Structure

```
mobile/
├── app/                      # Expo Router — file-based routing
│   ├── _layout.tsx           # Root layout (auth gate, fonts, safe area)
│   ├── index.tsx             # Splash/redirect entry point
│   ├── onboarding.tsx        # First-launch onboarding flow
│   ├── (auth)/               # Auth group (unauthenticated screens)
│   │   ├── login.tsx         # Sign in screen
│   │   ├── signup.tsx        # Create account screen
│   │   └── forgot-password.tsx
│   ├── (tabs)/               # Tab group (main app)
│   │   ├── index.tsx         # Dashboard tab
│   │   ├── calls.tsx         # Call logs tab
│   │   ├── customers.tsx     # Customers tab
│   │   ├── whatsapp.tsx      # WhatsApp tab
│   │   └── settings.tsx      # Settings tab
│   ├── call/[id].tsx         # Call detail screen
│   ├── customer/[id].tsx     # Customer detail screen
│   ├── customers/new.tsx     # Add customer screen
│   ├── chat/[phone].tsx      # WhatsApp chat screen
│   ├── contact/[phone].tsx   # Contact info screen
│   ├── assistant/index.tsx   # Assistant management
│   ├── billing.tsx           # Billing & plan screen
│   └── profile.tsx           # User profile screen
│
├── components/               # Reusable UI components
│   ├── ActionSheet.tsx       # Bottom action menu
│   ├── AnimatedListItem.tsx  # Animated FlatList item wrapper
│   ├── AnimatedNumber.tsx    # Smooth number counter animation
│   ├── BottomSheet.tsx       # Generic bottom sheet modal
│   ├── CallCard.tsx          # Call log list item card
│   ├── ConfirmationModal.tsx # Confirm/cancel dialog
│   ├── CustomerCard.tsx      # Customer list item card
│   ├── EmptyState.tsx        # Empty list placeholder with CTA
│   ├── ErrorBoundary.tsx     # React error boundary wrapper
│   ├── FilterChips.tsx       # Horizontal filter chip row
│   ├── Header.tsx            # Screen header with back/actions
│   ├── MiniChart.tsx         # Sparkline chart component
│   ├── OfflineBanner.tsx     # Offline connectivity warning banner
│   ├── PeopleIllustration.tsx
│   ├── PressableScale.tsx    # Pressable with scale feedback
│   ├── ProgressRing.tsx      # Circular progress indicator
│   ├── ScreenContainer.tsx   # Standard screen wrapper (safe area + scroll)
│   ├── SearchBar.tsx         # Animated search input
│   ├── Skeleton.tsx          # Skeleton loading shimmer
│   ├── SplashScreen.tsx      # Animated app splash
│   ├── StatCard.tsx          # Dashboard metric card
│   ├── StatusBadge.tsx       # Status label pill (success/error/etc)
│   ├── illustrations/        # Custom SVG illustrations
│   └── whatsapp/             # WhatsApp-specific components
│       ├── ChatBubble.tsx
│       ├── ChatInput.tsx
│       ├── ContactAvatar.tsx
│       ├── DateDivider.tsx
│       ├── MessageStatus.tsx
│       ├── TypingIndicator.tsx
│       └── UnreadBadge.tsx
│
├── screens/                  # Legacy screen components (pre-router)
│   ├── DashboardScreen.tsx
│   ├── CallLogsScreen.tsx
│   ├── CallDetailScreen.tsx
│   ├── CustomersScreen.tsx
│   ├── CustomerDetailScreen.tsx
│   ├── ChatScreen.tsx
│   ├── ContactInfoScreen.tsx
│   ├── WhatsAppScreen.tsx
│   └── SettingsScreen.tsx
│
├── contexts/
│   └── AuthContext.tsx        # Supabase session context provider
│
├── hooks/
│   └── useNetworkStatus.ts    # Online/offline detection hook
│
├── stores/                    # Zustand state stores
│   ├── authStore.ts           # Auth state (session, user)
│   ├── callStore.ts           # Call logs cache + filters
│   ├── customerStore.ts       # Customer list + search
│   ├── appStore.ts            # App-wide UI state
│   └── index.ts               # Store exports
│
├── services/                  # API + Supabase data layer
│   ├── callService.ts         # Call logs CRUD + realtime
│   ├── customerService.ts     # Customer CRUD
│   ├── analyticsService.ts    # Dashboard stats queries
│   ├── notificationService.ts # Push notification registration
│   └── whatsappService.ts     # WhatsApp message queries
│
├── lib/                       # Core utilities and config
│   ├── supabase.ts            # Supabase client singleton
│   ├── theme.ts               # Design system (colors, spacing, typography)
│   ├── api.ts                 # Backend API client
│   ├── animations.ts          # Reusable animation presets
│   ├── haptics.ts             # Haptic feedback helpers
│   └── webLinks.ts            # External link helpers
│
├── types/
│   ├── index.ts               # Core domain types (CallLog, Customer, etc)
│   └── whatsapp.ts            # WhatsApp-specific types
│
├── assets/                    # Static assets
│   ├── icon.png               # App icon
│   ├── splash-icon.png        # Splash screen image
│   ├── adaptive-icon.png      # Android adaptive icon
│   ├── fonts/ahsing.otf       # Custom brand font
│   └── voicory-logo.png
│
├── app.json                   # Expo app configuration
├── eas.json                   # EAS Build configuration
├── babel.config.js            # Babel config (NativeWind)
├── tailwind.config.js         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
└── package.json
```

---

## Design System

The design system lives entirely in [`lib/theme.ts`](./lib/theme.ts). **All screens and components must import from it — never hardcode values.**

Key exports:

| Export | Description |
|---|---|
| `colors` | Full color palette (backgrounds, text, semantic colors) |
| `spacing` | 8-point spacing scale (`xxs` → `xxxxl`) |
| `radii` | Border radius scale |
| `typography` | Pre-defined text styles (display, headings, body, captions) |
| `shadows` | Cross-platform shadow presets (`sm`, `md`, `lg`, `glow`) |
| `layout` | Screen padding, input/button heights, avatar sizes |
| `durations` | Animation timing values |
| `cardStyle` | Standard card appearance shorthand |
| `theme` | Legacy theme object (backward compat) |

Example usage:
```tsx
import { colors, spacing, typography, radii } from '@/lib/theme';

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, padding: spacing.lg },
  title: { ...typography.h2, color: colors.text },
});
```

---

## Building for Production

EAS Build is configured in [`eas.json`](./eas.json). Three profiles are available: `development`, `preview`, and `production`.

### Prerequisites
```bash
npm install -g eas-cli
eas login        # authenticate with your Expo account
eas build:configure  # first-time setup
```

### iOS Build
```bash
# Development (simulator)
eas build --profile development --platform ios

# Production (App Store)
eas build --profile production --platform ios
```

### Android Build
```bash
# Development (APK)
eas build --profile development --platform android

# Preview (APK for internal testing)
eas build --profile preview --platform android

# Production (AAB for Play Store)
eas build --profile production --platform android
```

### Build both platforms at once
```bash
eas build --profile production --platform all
```

---

## Deploying to App Store / Play Store

EAS Submit handles store submission:

```bash
# Submit to Apple App Store
eas submit --platform ios --latest

# Submit to Google Play Store
eas submit --platform android --latest
```

**App Store requirements** (configure in `eas.json` → `submit.production.ios`):
- `appleId` — your Apple ID email
- `ascAppId` — App Store Connect app ID
- `appleTeamId` — your Apple Developer Team ID

**Play Store requirements**:
- `serviceAccountKeyPath` — path to Google service account JSON
- `track` — `production`, `beta`, or `internal`

> See [EAS Submit docs](https://docs.expo.dev/submit/introduction/) for full details.

---

## Testing

```bash
# Type check
npx tsc --noEmit

# Start with reset cache (fixes most metro issues)
npx expo start --clear
```

---

## Useful Commands

```bash
npx expo start          # Start dev server (Expo Go)
npx expo start --ios    # iOS Simulator
npx expo start --android  # Android Emulator
npx expo start --clear  # Clear Metro cache

eas build --profile development --platform ios     # Dev build (iOS)
eas build --profile production --platform android  # Prod AAB
eas submit --platform ios                          # Submit to App Store
eas submit --platform android                      # Submit to Play Store

npx tsc --noEmit        # TypeScript check
```

---

## Security

- See [SECURITY.md](./SECURITY.md) for security policy and vulnerability reporting
- Never commit `.env` files with real credentials
- The Supabase service role key must **never** be used in the mobile app — use the anon key only (RLS enforces access control)
- All certificate files (`*.p12`, `*.p8`, `*.jks`, `*.mobileprovision`) are gitignored
