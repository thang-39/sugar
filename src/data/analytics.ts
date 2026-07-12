/**
 * Thin analytics wrapper (Session 15, recommended + removable). Exactly six
 * anonymous events — NEVER a glucose value, NEVER PII. Honors the opt-out flag
 * pushed down from the settings store via `setAnalyticsEnabled`.
 *
 * The actual sink (Aptabase) is deferred until an app key exists: `send` dev-logs
 * for now. Wiring the SDK later touches only `send` — call sites don't change.
 */
type EventProps = Record<string, string | number>;

let enabled = true;

/** Settings store syncs the opt-out state here (data stays free of the ui layer). */
export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
}

function send(name: string, props?: EventProps): void {
  if (!enabled) return;
  // TODO(admin track): swap for Aptabase `trackEvent(name, props)` once the app
  // key is configured. Kept as a no-op-with-dev-log so call sites are stable.
  if (__DEV__) {
    console.log('[analytics]', name, props ?? {});
  }
}

export const analytics = {
  onboardingCompleted: (mode: string): void => send('onboarding_completed', { mode }),
  firstReadingLogged: (): void => send('first_reading_logged'),
  reportExported: (count: number): void => send('report_exported', { count }),
  paywallViewed: (source: string): void => send('paywall_viewed', { source }),
  purchaseCompleted: (): void => send('purchase_completed'),
  backupEnabled: (): void => send('backup_enabled'),
};
