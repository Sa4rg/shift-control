# Phase 15.7C — iOS Preview / Internal Build Readiness

## 1. Scope

This phase prepares the Shift Control mobile app for future iOS internal distribution
using EAS Build. No backend, API contract, DB schema, or Android behavior is changed.

## 2. Current Status

| Component | Status |
|-----------|--------|
| Android internal build | ✅ Completed — APK installed and tested on device |
| Android package | `com.shiftcontrol.mobile` |
| Backend staging | ✅ Running on Railway |
| Database | ✅ Supabase PostgreSQL connected |
| iOS internal build | ⏳ Pending — requires Apple Developer account |
| iOS bundle identifier | `com.shiftcontrol.mobile` |
| Expo SDK | `~54.0.33` |
| EAS CLI requirement | `>= 16.0.0` |

## 3. iOS App Config Summary

| Property | Value | Notes |
|----------|-------|-------|
| `ios.bundleIdentifier` | `com.shiftcontrol.mobile` | Valid |
| `ios.supportsTablet` | `true` | Present |
| `scheme` | `shiftcontrolmobile` | Required for deep linking |
| `version` | `1.0.0` | Present |
| `icon` | `./assets/images/icon.png` | Present |
| `splash` | `./assets/images/splash-icon.png` | Present |
| `expo-secure-store` plugin | ✅ Present | JWT stored securely |
| `infoPlist` | Not needed | App uses only API + SecureStore |
| Camera permission | Not needed | App does not use camera |
| Location permission | Not needed | App does not use location |
| Push notifications | Not needed | Not in MVP scope |
| Photos permission | Not needed | App does not access photo library |

The iOS configuration in `app.json` is sufficient for the current app scope.

## 4. EAS Profiles — iOS

### 4.1 `preview` Profile (physical device)

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  },
  "ios": {
    "simulator": false
  },
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "https://shift-control-staging-production.up.railway.app"
  }
}
```

- `distribution: internal` — enables ad hoc distribution for iOS physical devices.
- `ios.simulator: false` — explicit: targets physical iPhones, not simulator.
- `android.buildType: apk` — Android-only config; does not affect iOS builds.
- API URL points to Railway staging backend.

### 4.2 `ios-simulator` Profile (Mac Simulator)

```json
"ios-simulator": {
  "ios": {
    "simulator": true
  },
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "https://shift-control-staging-production.up.railway.app"
  }
}
```

- Produces a `.app` bundle for iOS Simulator.
- Does **not** require Apple Developer account.
- Requires a Mac with Xcode Simulator installed.
- Useful for developer UI testing without a physical device.

## 5. iOS Distribution Options

### Option A — Ad Hoc Internal Distribution (recommended for physical iPhone testing)

Ad hoc distribution allows installing the app on specific registered iPhones without
going through the App Store.

**Requirements:**
- Apple Developer Program membership (paid, annual — verify cost at developer.apple.com)
- Each test device must be registered in Apple Developer portal
- Device UDID required for registration
- EAS manages provisioning profiles automatically

**Steps:**

```bash
# Step 1 — Register test devices
eas device:create

# Step 2 — Build iOS internal (ad hoc) binary
eas build --platform ios --profile preview

# Step 3 — Install on device via EAS link, QR code, or Apple Configurator
```

EAS provides a download link and QR code after a successful build.

### Option B — TestFlight

TestFlight allows beta testing through the App Store ecosystem with up to 10,000 testers.

**Requirements:**
- Apple Developer Program membership
- App Store Connect app record created
- Binary uploaded to App Store Connect
- Review by Apple (typically fast for internal beta)

**Status:** Not configured in this phase. Deferred to a future phase when broader
beta distribution is needed.

### Option C — Simulator Build (Mac only)

Produces a `.app` bundle that runs in the iOS Simulator on a Mac.

**Requirements:**
- Mac with Xcode installed
- iOS Simulator
- No Apple Developer account required

**Build command:**

```bash
eas build --platform ios --profile ios-simulator
```

After build, download the `.app` file and drag it into the iOS Simulator.

## 6. Apple Developer Account Requirements

| Requirement | Details |
|-------------|---------|
| Membership | Apple Developer Program — paid, annual |
| Cost | Verify current pricing at [developer.apple.com/programs](https://developer.apple.com/programs/) |
| Required for | Physical iPhone builds (ad hoc and TestFlight) |
| Not required for | iOS Simulator builds |
| Managed by EAS | Signing certificates and provisioning profiles handled automatically |

> **Note:** The developer should verify Apple Developer account availability before
> running physical iPhone builds. EAS will prompt for Apple credentials on first run.

## 7. Recommended Path

```
Current state:
  ✅ Android internal build validated on device
  ✅ Staging backend connected
  ⏳ iOS physical build pending Apple Developer account

If Apple Developer account is available:
  → eas device:create  (register test iPhones)
  → eas build --platform ios --profile preview
  → Install via EAS QR/link
  → Run smoke test checklist (Section 8)

If Apple Developer account is NOT yet available:
  → Use iOS Simulator build for developer testing:
    eas build --platform ios --profile ios-simulator
  → Defer physical iPhone build until account is ready
```

## 8. iOS Smoke Test Checklist

After installing on device or simulator:

| Flow | Test | Expected Result |
|------|------|-----------------|
| Auth | ADMIN login | Token stored in SecureStore, navigates to admin dashboard |
| Auth | STAFF login with PIN | Token stored in SecureStore, navigates to staff dashboard |
| Auth | Invalid credentials | Generic error shown, no username enumeration |
| Stores | List stores | Admin sees store list |
| Stores | Create store | Store appears in list |
| Shifts | STAFF opens shift | Shift created, status OPEN |
| Shifts | Duplicate open shift blocked | Error shown |
| Sales | Register sale with payment | Sale appears in shift |
| Sales | Split payment (cash + card) | Amounts match total |
| Sales | Cancel sale | Sale marked cancelled, not deleted |
| Closures | Close shift | Shift status CLOSED, totals calculated |
| Closures | Reopen closed shift blocked | Error shown |
| Incidents | Create incident | Incident saved with timestamp |
| Reports | Admin weekly review | Weekly totals by staff/store visible |
| Logout | STAFF logout | SecureStore cleared |
| Logout | ADMIN logout | SecureStore cleared |

## 9. Security

| Concern | Implementation |
|---------|---------------|
| Secrets in mobile | None — no secrets bundled |
| API base URL | `EXPO_PUBLIC_*` — public, intentional |
| JWT token | Stored in `expo-secure-store` (encrypted native storage) |
| Backend communication | HTTPS only (Railway staging) |
| Credentials in code | None — all via environment variables |
| `.mobileprovision`, `.p12`, `.p8` | Listed in `.gitignore` |

## 10. Known Limitations

- No TestFlight submission in this phase
- No App Store / production release
- Physical iPhone builds require Apple Developer Program
- iOS signing and provisioning managed by EAS Build (not local Xcode)
- `ios-simulator` build requires a Mac with Xcode to run
- `newArchEnabled: true` is set — test for React Native new architecture compatibility

## 11. Build Commands Reference

```bash
# Build for iOS physical device (requires Apple Developer account)
eas build --platform ios --profile preview

# Build for iOS Simulator only (no Apple account needed)
eas build --platform ios --profile ios-simulator

# Register test iPhone devices (before first ad hoc build)
eas device:create

# Build Android APK (existing, unchanged)
eas build --platform android --profile preview

# Check build status
eas build:list
```

## 12. Files Changed in This Phase

| File | Change |
|------|--------|
| `eas.json` | Added `ios.simulator: false` to `preview` profile; added `ios-simulator` profile |
| `app.json` | No changes — config was already sufficient |
| `docs/phase-15-ios-preview-readiness.md` | Created (this file) |

## 13. No-Change Confirmations

- ✅ Backend unchanged
- ✅ API contracts unchanged
- ✅ DB schema unchanged
- ✅ Android behavior unchanged
- ✅ Android package unchanged (`com.shiftcontrol.mobile`)
- ✅ API base URL unchanged
- ✅ No secrets added
- ✅ No App Store submission performed
- ✅ No TestFlight submission performed
- ✅ Mobile UI unchanged
