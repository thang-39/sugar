# US-FE-01 — Project Scaffold

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 9: Use the app without creating an account (guest mode)
- US 10: Data stored only on device (not transmitted)
- US 49: Handle offline mode gracefully

## Goal
Bootstrap a bare React Native project with all required dependencies. The app should build on both iOS and Android with no red errors.

---

## Steps

### 1. Initialize React Native Project

```bash
cd /home/thang/Works/sugar
npx react-native@latest init SugarTracker --directory sugar-tracker
```

> Use the **latest** version. Min targets: iOS 14, Android API 24 (RN default).

### 2. Verify Blank App Builds

```bash
# iOS
cd sugar-tracker
npx react-native run-ios
# → Expect: blank white screen, no red errors

# Android
npx react-native run-android
# → Expect: blank white screen, no red errors
```

If build fails, resolve before continuing.

### 3. Install All Dependencies

```bash
cd sugar-tracker

# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Database
npm install @nozbe/watermelondb @nozbe/with-observables

# State management
npm install zustand

# Local storage
npm install @react-native-async-storage/async-storage

# Connectivity
npm install @react-native-community/netinfo

# Charts (needed for Trends, Phase 1 placeholder)
npm install react-native-gifted-charts react-native-linear-gradient react-native-svg

# Export (Phase 6, install now to avoid version conflicts later)
npm install react-native-share react-native-fs

# Utilities
npm install uuid
npm install --save-dev @types/uuid

# Backend
npm install @supabase/supabase-js

# Babel decorator support (required by WatermelonDB)
npm install --save-dev @babel/plugin-proposal-decorators
```

### 4. Configure Babel

Edit `babel.config.js`:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
```

### 5. Create `.gitignore` Entries

Ensure these are in `.gitignore`:
```
# Supabase
.env

# iOS
ios/Pods/
ios/build/

# Android
android/.gradle/
android/build/
android/app/build/

# Misc
*.jks
*.keystore
```

### 6. Create `.env.example`

```bash
# sugar-tracker/.env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

---

## File Changes

| File | Action |
|---|---|
| `sugar-tracker/babel.config.js` | Modify — add decorators plugin |
| `sugar-tracker/.gitignore` | Modify — add .env, build folders |
| `sugar-tracker/.env.example` | Create — template for Supabase credentials |

---

## Verification

- [ ] `npx react-native run-ios` → blank screen, no errors
- [ ] `npx react-native run-android` → blank screen, no errors
- [ ] `node -e "require('@nozbe/watermelondb')"` → no module error
- [ ] `node -e "require('@supabase/supabase-js')"` → no module error
- [ ] `node -e "require('zustand')"` → no module error

---

## Dependencies
- None — this is the first FE task.
