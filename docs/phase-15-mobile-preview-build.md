# Phase 15.7 — Mobile Preview / Internal Build

## Scope

This document covers the EAS (Expo Application Services) preview build configuration and internal distribution workflow for the Shift Control mobile app.

**Target audience:** Internal team — not a public App Store / Play Store release.

**In scope:**
- EAS build configuration (`eas.json`)
- Android APK preview build against Railway staging backend
- Local testing against Railway staging
- Smoke test checklist

**Out of scope:**
- Production App Store / Play Store release
- iOS TestFlight distribution (requires Apple developer account setup)
- Backend changes
- UI/UX changes

---

## 1. Current Backend Staging URL

```
https://shift-control-staging-production.up.railway.app
```

Both the `development` and `preview` EAS profiles point to this URL via `EXPO_PUBLIC_API_BASE_URL`.

---

## 2. Local Mobile Testing Against Railway Staging

### 2.1 Configure local env

Copy the staging example to `.env.local`:

```bash
cp .env.staging.example .env.local
```

`.env.local` is ignored by git and will not be committed.

`.env.local` contents:
```
EXPO_PUBLIC_API_BASE_URL=https://shift-control-staging-production.up.railway.app
```

### 2.2 Start the development server

```bash
cd shift-control-mobile
pnpm start
```

Scan the QR code with the Expo Go app on your device.

### 2.3 Verify basic flows manually

- Admin login → `/api/auth/admin/login`
- Store creation
- Staff creation
- Staff login → `/api/auth/staff/login`
- Open shift / create sales / close shift

---

## 3. EAS Setup Prerequisites

### 3.1 Install EAS CLI (if not installed)

```bash
pnpm add -g eas-cli
# or
npm install -g eas-cli
```

Verify:
```bash
eas --version
```

### 3.2 Log in to Expo

```bash
eas login
```

Use your Expo account credentials. The project must be linked to an Expo account.

### 3.3 Link the project (first time only)

If the project is not yet linked to an EAS project:

```bash
cd shift-control-mobile
eas build:configure
```

This will:
- Ask for the Expo account/organization.
- Add/update the `projectId` in `app.json` (or `app.config.ts`).
- Confirm `android.package` and `ios.bundleIdentifier`.

> **Note:** `app.json` already has `android.package: com.shiftcontrol.mobile` and `ios.bundleIdentifier: com.shiftcontrol.mobile` set by Phase 15.7. EAS will use these automatically.

---

## 4. Android Preview Build

### 4.1 Build command

```bash
cd shift-control-mobile
eas build --platform android --profile preview
```

This produces an `.apk` file (not an `.aab`) for direct installation — no Play Store required.

The `preview` profile in `eas.json`:
- `distribution: internal` — generates a shareable link
- `android.buildType: apk` — direct install file
- `EXPO_PUBLIC_API_BASE_URL` points to Railway staging

### 4.2 Monitor the build

EAS will print a build URL. Track progress at:
```
https://expo.dev/accounts/<your-account>/projects/shift-control-mobile/builds
```

### 4.3 Install / share the APK

Once the build is complete:
1. Download the `.apk` from the EAS dashboard link.
2. Transfer to Android device via USB, email, or direct download link.
3. On the Android device: **Settings → Install unknown apps** → allow from your transfer source.
4. Install the APK.

> The EAS dashboard also generates a QR code for direct download on Android devices.

---

## 5. Development Build (optional)

For a full development client with dev tools:

```bash
eas build --platform android --profile development
```

This requires installing the development client build on the device first, then running:

```bash
pnpm start --dev-client
```

---

## 6. Smoke Test Checklist

Test these flows on the installed APK against Railway staging:

| Flow | Steps | Expected |
|---|---|---|
| Admin login | Enter admin username + password | JWT stored, redirected to admin dashboard |
| Create store | Admin → Stores → New | Store appears in list |
| Create staff | Admin → Users → New | Staff user created |
| Staff login | Enter staff username + PIN | JWT stored, redirected to staff dashboard |
| Open shift | Staff → Open Shift | Shift created with status OPEN |
| Create sale | Staff → New Sale → add items → submit | Sale registered, totals updated |
| Close shift | Staff → Close Shift → enter amounts | Shift status CLOSED, totals shown |
| Incident | Admin → Incidents → Create | Incident recorded with type/amount |
| Weekly review | Admin → Weekly Reviews | Weekly totals grouped by staff/store |
| Health check | GET `/actuator/health` in browser | `{"status":"UP"}` |

---

## 7. Env File Summary

| File | Purpose | Committed? |
|---|---|---|
| `.env.example` | Local development template (`localhost:8080`) | ✅ Yes |
| `.env.staging.example` | Staging template (Railway URL) | ✅ Yes |
| `.env.production.example` | Production template (placeholder URL) | ✅ Yes |
| `.env.local` | Local overrides (actual values) | ❌ No (gitignored) |
| `eas.json` env block | EAS build-time env vars | ✅ Yes (URL is not secret) |

**For EAS builds:** `eas.json` already injects `EXPO_PUBLIC_API_BASE_URL` per profile. No `.env.local` is needed for EAS builds.

---

## 8. Known Limitations

| Limitation | Notes |
|---|---|
| Backend is Railway staging | Not a production environment. Railway free/hobby tier may have cold starts or limits. |
| Supabase free tier | Connection limits apply on free Supabase plan. |
| No production store release | The APK is for internal testing only. Not published to Google Play or Apple App Store. |
| iOS not covered | iOS requires an Apple Developer account ($99/year). Deferred to a future phase. |
| In-memory rate limiting | Backend rate limits are per-instance. No Redis. |
| No push notifications | Out of scope. |

---

## 9. Security Notes

- **No secrets in mobile.** Only `EXPO_PUBLIC_API_BASE_URL` is bundled — an HTTPS URL is not sensitive.
- **EXPO_PUBLIC_* variables are bundled into the app binary.** Never put tokens, passwords, or API keys there.
- **JWT token is stored in `expo-secure-store`.** On Android this uses the Android Keystore; on iOS it uses the Keychain.
- **HTTPS backend required.** The Railway backend serves only over HTTPS. The mobile app must never connect over plain HTTP in staging/production.
- **No credentials committed.** `.env.local` is gitignored. `eas.json` contains only the API URL, which is not a secret.

---

## 10. Files Changed in This Phase

| File | Change |
|---|---|
| `shift-control-mobile/eas.json` | Created — EAS build profiles: development, preview, production |
| `shift-control-mobile/app.json` | Added `ios.bundleIdentifier` and `android.package` (required by EAS) |
| `docs/phase-15-mobile-preview-build.md` | Created — this document |
