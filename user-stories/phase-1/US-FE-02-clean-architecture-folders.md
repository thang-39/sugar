# US-FE-02 — Clean Architecture Folder Structure

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 11: Data persists across app restarts in guest mode

## Goal
Set up the Clean Architecture folder structure so every future file has a clear, consistent home. No code logic is written here — just folders and empty shell files.

---

## Steps

### 1. Create All Folders

```bash
cd sugar-tracker
mkdir -p src/{ui/{screens,components,navigation,theme},domain/{models,useCases},data/{database/models,repositories,supabase,stores},utils}
mkdir -p docs
```

Resulting tree:

```
src/
├── ui/
│   ├── screens/
│   │   ├── OnboardingScreen.tsx
│   │   ├── LogReadingScreen.tsx
│   │   ├── HistoryListScreen.tsx
│   │   ├── ReadingDetailScreen.tsx
│   │   ├── EditReadingScreen.tsx
│   │   ├── TrendsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── theme/
│       └── index.ts
├── domain/
│   ├── models/
│   │   ├── Reading.ts
│   │   └── AppSettings.ts
│   └── useCases/
│       ├── ValidateReading.ts
│       ├── CreateReading.ts
│       ├── EditReading.ts
│       ├── DeleteReading.ts
│       ├── GetReadings.ts
│       └── ConvertUnit.ts
├── data/
│   ├── database/
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   ├── index.ts
│   │   └── models/
│   │       ├── ReadingModel.ts
│   │       └── AppSettingModel.ts
│   ├── repositories/
│   │   ├── ReadingRepository.ts
│   │   └── AppSettingsRepository.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── syncEngine.ts
│   └── stores/
│       └── useAppStore.ts
└── utils/
    ├── unitConversion.ts
    └── dateUtils.ts
docs/
└── API.md
```

### 2. Create Empty Shell Files

For every `.tsx` and `.ts` file listed above, create an empty file with a minimal export so imports resolve:

**Example: `src/domain/models/Reading.ts`**
```ts
export interface Reading {
  id: string;
  // TODO: fill in fields
}
```

**Example: `src/ui/screens/OnboardingScreen.tsx`**
```tsx
import React from 'react';
const OnboardingScreen: React.FC = () => null;
export default OnboardingScreen;
```

Do this for all files. The actual logic is added in later user stories.

### 3. Set Up Theme File

**`src/ui/theme/index.ts`**
```ts
export const colors = {
  primary: '#2196F3',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FFA000',
  success: '#388E3C',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

### 4. Create `src/utils/dateUtils.ts`

```ts
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}
```

---

## Verification

- [ ] All folders created with correct hierarchy
- [ ] All `.ts` / `.tsx` files exist and are non-empty (at least with shell code)
- [ ] `import AppNavigator from '../ui/navigation/AppNavigator'` resolves without error
- [ ] `import { colors } from '../ui/theme'` resolves without error
- [ ] `import { formatDate } from '../utils/dateUtils'` resolves without error

---

## Dependencies
- **US-FE-01** must be complete first.
