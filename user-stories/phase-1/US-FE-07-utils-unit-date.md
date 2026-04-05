# US-FE-07 — Unit Conversion & Date Utils

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 43: Choose preferred blood sugar unit

## Goal
Create utility modules for unit conversion and date formatting. These are used throughout the app — on the log form, history list, detail screen, and trends chart.

---

## Steps

### 1. Unit Conversion Utility

**`src/utils/unitConversion.ts`**

```ts
// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
export type PreferredUnit = 'mg/dL' | 'mmol/L';

const MGDL_TO_MMOLL_FACTOR = 0.0555;

// ──────────────────────────────────────────────
// Conversion functions
// ──────────────────────────────────────────────

/**
 * Convert mg/dL → mmol/L
 * Example: 100 mg/dL → 5.6 mmol/L
 */
export function mgdlToMmoll(mgdl: number): number {
  return Math.round(mgdl * MGDL_TO_MMOLL_FACTOR * 10) / 10;
}

/**
 * Convert mmol/L → mg/dL
 * Example: 5.6 mmol/L → 100 mg/dL (approx)
 */
export function mmollToMgdl(mmoll: number): number {
  return Math.round(mmoll / MGDL_TO_MMOLL_FACTOR);
}

/**
 * Convert stored value (always mg/dL) to user's preferred display unit
 * Used when rendering values in UI
 */
export function toDisplayValue(
  mgdlValue: number,
  preferredUnit: PreferredUnit
): number {
  if (preferredUnit === 'mmol/L') {
    return mgdlToMmoll(mgdlValue);
  }
  return mgdlValue;
}

/**
 * Convert user-entered value (in their preferred unit) to mg/dL for storage
 * Used before saving to WatermelonDB
 */
export function fromDisplayValue(
  displayValue: number,
  preferredUnit: PreferredUnit
): number {
  if (preferredUnit === 'mmol/L') {
    return mmollToMgdl(displayValue);
  }
  return displayValue;
}

/**
 * Get the unit suffix string for display
 */
export function unitSuffix(unit: PreferredUnit): string {
  return unit;
}
```

### 2. Date Utilities

**`src/utils/dateUtils.ts`**

```ts
/**
 * Format a Unix ms timestamp to a human-readable date string
 * Example: 1712345678000 → "Apr 5, 2026"
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a Unix ms timestamp to a time string
 * Example: 1712345678000 → "2:30 PM"
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a Unix ms timestamp to date + time string
 * Example: 1712345678000 → "Apr 5, 2026 at 2:30 PM"
 */
export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} at ${formatTime(timestamp)}`;
}

/**
 * Get the start of today (midnight) as a Unix ms timestamp
 */
export function startOfToday(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/**
 * Get a date N days ago as a Unix ms timestamp
 */
export function daysAgo(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get a date N months ago as a Unix ms timestamp
 */
export function monthsAgo(n: number): number {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
```

### 3. Update Shell Files

Replace the empty shells created in US-FE-02 with the code above.

---

## Verification

- [ ] `mgdlToMmoll(100)` ≈ `5.6`
- [ ] `mmollToMgdl(5.6)` ≈ `100`
- [ ] `toDisplayValue(100, 'mmol/L')` ≈ `5.6`
- [ ] `toDisplayValue(100, 'mg/dL')` returns `100`
- [ ] `fromDisplayValue(5.6, 'mmol/L')` ≈ `101`
- [ ] `formatDate(Date.now())` returns a non-empty string
- [ ] `formatTime(Date.now())` returns a non-empty string
- [ ] `daysAgo(7)` returns a timestamp approximately 7 × 24h ago

---

## Dependencies
- **US-FE-02** (folder structure) must be complete first.