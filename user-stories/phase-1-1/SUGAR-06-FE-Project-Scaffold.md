# SUGAR-06-FE-Project-Scaffold

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | Supports all — the app must exist first |
| **Status** | Not started |

---

## Context

Before any feature code can be written, the React Native project must exist with all dependencies installed and a basic build that produces a working app on both iOS and Android.

This user story covers the bootstrap: project init, all dependencies, and a minimal working shell.

---

## User Story

> As a **developer**, I want a working React Native bare project with all required dependencies installed so that I can start writing feature code immediately.

> As a **user**, I want the app to exist on my phone and start quickly so I can log my reading without waiting.

---

## Acceptance Criteria

### AC-1: Project initialized

- `npx react-native@latest init SugarTracker` runs without errors
- Project created inside `sugar-tracker/` directory (sibling to `PRD.md`)
- Min targets respected: iOS 14+, Android API 24+

### AC-2: Blank app builds on both platforms

- `npx react-native run-ios` → blank white screen, no red errors
- `npx react-native run-android` → blank white screen, no red errors
- Any build errors are resolved before this card is marked done

### AC-3: All dependencies installed

Dependencies grouped by purpose:

**Navigation**
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `react-native-screens`
- `react-native-safe-area-context`

**Database**
- `@nozbe/watermelondb`
- `@nozbe/with-observables`

**State & Storage**
- `zustand`
- `@react-native-async-storage/async-storage`

**Connectivity**
- `@react-native-community/netinfo`

**Charts**
- `react-native-gifted-charts`
- `react-native-linear-gradient`
- `react-native-svg`

**Backend**
- `@supabase/supabase-js`

**Utilities**
- `uuid` + `@types/uuid`

**Build tooling**
- `@babel/plugin-proposal-decorators` (required for WatermelonDB)

### AC-4: Babel configured for WatermelonDB

- `babel.config.js` includes the decorators plugin:
  ```js
  plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]]
  ```

### AC-5: Environment files in place

- `sugar-tracker/.env` exists with placeholder values (gitignored)
- `sugar-tracker/.env.example` exists with the same keys but placeholder values (committed)
- `.env` listed in `.gitignore`

### AC-6: `.gitignore` covers build artifacts

- iOS build folders (`ios/Pods/`, `ios/build/`)
- Android build folders (`android/.gradle/`, `android/build/`, `android/app/build/`)
- `.env`

---

## Definition of Done

- [ ] `npx react-native init SugarTracker` succeeded
- [ ] iOS build runs cleanly
- [ ] Android build runs cleanly
- [ ] All dependencies in AC-3 are installed with correct versions
- [ ] `babel.config.js` has decorators plugin
- [ ] `.env` and `.env.example` exist
- [ ] `.gitignore` is correct

---

## Notes

- Use **bare React Native** (not Expo) per the PRD
- `react-native-share` and `react-native-fs` are Phase 6 dependencies but installing now avoids version conflicts later
- WatermelonDB requires the Babel decorators plugin or model definitions will fail to compile
- If `npx react-native run-ios` fails with a CocoaPods error, run `cd ios && pod install && cd ..` first
