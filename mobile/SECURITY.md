# Mobile App Security Documentation

Last audited: 2026-04-19 by Volt (Wave 14 Security Audit)

---

## ✅ Security Measures in Place

### 1. Token Storage — SecureStore (✅ GOOD)
All authentication tokens are stored via `expo-secure-store`, **not** AsyncStorage.

- `lib/supabase.ts` uses a custom `ExpoSecureStoreAdapter` that wraps SecureStore for all `getItem`, `setItem`, and `removeItem` operations.
- Supabase client is configured with `autoRefreshToken: true` and `persistSession: true` — tokens auto-refresh before expiry without any custom logic needed.
- **No AsyncStorage usage** found anywhere in the mobile app.

### 2. Supabase Client — Anon Key Only (✅ GOOD)
- The mobile app uses `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon/public key).
- The service role key is **never** used or exposed in the mobile app.
- Anon key is safe to expose client-side; RLS policies on Supabase enforce data access control.

### 3. Environment Variables — Not Tracked (✅ GOOD)
- `.gitignore` includes `.env` — the file is **not** tracked by git.
- `git ls-files | grep env` returns nothing.
- Git history shows only `.env.example` files were ever committed — no real env files.

### 4. HTTPS Enforcement (✅ GOOD)
- All API calls go to `EXPO_PUBLIC_BACKEND_URL` (Cloud Run — `https://...`)
- Supabase URL is `https://...`
- No `http://` (non-TLS) URLs found in source code.

### 5. No Dangerous HTML (✅ GOOD)
- No `dangerouslySetInnerHTML` usage (React Native doesn't support it, but confirmed absent).
- No `eval()` usage found.

### 6. Console Log Safety (✅ GOOD)
- API request/response logs in `lib/api.ts` are guarded by `if (__DEV__)`.
- `ErrorBoundary.tsx` logs are guarded by `if (__DEV__)`.
- No unguarded `console.log` with sensitive data found.

### 7. Auth Token Refresh (✅ GOOD)
- Supabase JS SDK handles token refresh automatically via `autoRefreshToken: true`.
- `AuthContext` uses `onAuthStateChange` listener to react to refresh events.
- No manual refresh logic needed — SDK manages expiry transparently.

### 8. 401 Global Handler (✅ GOOD)
- `lib/api.ts` exposes `registerUnauthorizedHandler()` — on 401 response, user is automatically signed out.
- Prevents stale/expired sessions from silently failing.

---

## 🔧 Fixes Applied This Audit

| Issue | Fix |
|-------|-----|
| `screens/ChatScreen.tsx` used `EXPO_PUBLIC_API_URL` (undefined env var) | Fixed to use `EXPO_PUBLIC_BACKEND_URL` — consistent with `lib/api.ts` |

---

## ⚠️ Known Limitations / Future Tasks

### Certificate Pinning (FUTURE — P2)
Certificate pinning is not currently implemented. This would prevent MITM attacks on rooted devices.

**To implement:**
- For Expo managed workflow: use `expo-build-properties` to add SSL pinning via TrustKit (iOS) or OkHttp (Android).
- Requires EAS Build (bare workflow or config plugins).
- Pin against Supabase and backend Cloud Run certificates.
- **Tradeoff:** Certificate rotation will require app update — plan accordingly.

**Risk level without pinning:** Low-Medium. All traffic is TLS/HTTPS. Pinning only matters if a user installs a rogue CA cert (requires physical device access or rooted device).

### Jailbreak/Root Detection (FUTURE — P3)
No jailbreak/root detection implemented. Consider `expo-device` `isRooted` check or `react-native-jail-monkey` for high-security flows (e.g., before showing call recording or sensitive customer data).

### Biometric Auth Lock (FUTURE — P2)
For the dashboard/sensitive screens, consider requiring biometric authentication (FaceID/fingerprint) on app resume after background. Use `expo-local-authentication`.

### Rate Limiting on Mobile (FUTURE — P2)
API rate limiting is handled server-side (backend). No client-side rate limiting implemented. This is acceptable — server enforcement is more reliable.

---

## Security Contacts
- Security issues: raise as private GitHub issue on `esspron/Voicory`
- Never commit secrets — see SOUL.md Red Lines section

---

## Pre-Release Security Checklist

Before every production release:
- [ ] `git ls-files | grep -i env` returns nothing
- [ ] `grep -rn 'eyJ\|sk-\|service_role' --include='*.ts' --include='*.tsx' . | grep -v node_modules` returns no hardcoded secrets
- [ ] All API calls verified HTTPS
- [ ] No `console.log` outside `__DEV__` guards
- [ ] `.env` in `.gitignore`
- [ ] SecureStore used for all token storage (not AsyncStorage)
