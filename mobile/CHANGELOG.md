# Changelog

All notable changes to the Voicory Mobile app are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-04-19

### Initial Release 🎉

#### Features

**Authentication**
- Email/password sign in and sign up via Supabase Auth
- Forgot password flow with email reset link
- Secure session persistence using `expo-secure-store`
- Auth-gated navigation — unauthenticated users redirected to login

**Dashboard**
- Real-time summary stats: total calls, average duration, total cost, success rate
- Credit balance display with progress ring showing usage vs limit
- Animated stat cards with `AnimatedNumber` counter transitions
- MiniChart sparkline for call volume trends

**Call Logs**
- Full call history with inbound/outbound direction indicators
- Filter by status (completed, failed, busy, no-answer)
- Call detail view: transcript, recording URL, duration, cost breakdown
- TTS characters and STT minutes usage per call

**Customers**
- Customer list with search and filter
- Customer detail view: contact info, interaction history, CRM fields
- Add new customer form
- Memory indicator (customers with stored AI context)

**WhatsApp**
- WhatsApp Business conversation list
- Real-time chat view with message bubbles, read receipts, typing indicator
- Send text messages via WhatsApp Business API
- Contact avatar with initials fallback
- Date dividers and unread count badges

**AI Assistant**
- View and manage voice assistant configuration
- See assistant status, model, voice, and first message
- Link to web dashboard for full assistant editing

**Billing**
- Plan type display (free, pro, enterprise)
- Credit balance and voice minutes usage/limit
- Links to billing portal for plan management

**Settings & Profile**
- User profile editing (organization name, email)
- Sign out
- App version display

**Infrastructure**
- Expo Router v6 file-based navigation
- Zustand state management with typed stores
- Supabase real-time subscriptions for call updates
- Offline detection via `useNetworkStatus` hook with `OfflineBanner`
- Push notification registration via `expo-notifications`
- Error boundary wrapping all screens
- Skeleton loading states on all data screens

#### Design System
- Dark-first design — `#050a12` background, `#00d4aa` primary teal
- NativeWind (Tailwind CSS) for utility-class styling
- Custom design tokens in `lib/theme.ts` (colors, spacing, typography, shadows)
- Custom SVG illustrations: `OnboardingHero`, `PhoneCall`, `VoiceWaveform`, `EmptyInbox`, `AnalyticsDashboard`, `MessagingBubbles`, `SuccessCheckmark`, `TeamPeople`, `CreditCard`
- Ahsing custom font for brand wordmark
- `PressableScale` component for tactile button feedback
- `react-native-reanimated` micro-animations throughout
- `expo-haptics` feedback on key interactions

#### Platform Support
- iOS 16+ (portrait orientation)
- Android API 26+ (portrait orientation)
- Dark mode only (`userInterfaceStyle: "dark"`)
- New React Native Architecture enabled (`newArchEnabled: true`)

---

## Upcoming

### [1.1.0] — Planned
- Live call monitoring (active call status)
- Bulk customer import (CSV upload)
- Notification preference controls
- Light mode toggle
- iPad / tablet layout support
- Localization (i18n) — English + Hindi initial

### [1.2.0] — Planned
- Voice playback for call recordings in-app
- Analytics charts (weekly/monthly trends)
- Campaign management from mobile
- Webhook event log viewer
