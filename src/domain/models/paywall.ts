/**
 * Where the paywall was opened from — drives contextual copy and per-source
 * counters/analytics (Session 15/16). Passed as the `paywallSource` route param.
 */
export const PaywallSource = {
  ReportGate: 'report_gate',
  CsvGate: 'csv_gate',
  ChartsGate: 'charts_gate',
  BackupGate: 'backup_gate',
  Settings: 'settings',
} as const;
export type PaywallSource = (typeof PaywallSource)[keyof typeof PaywallSource];

export function toPaywallSource(value: unknown): PaywallSource {
  return Object.values(PaywallSource).includes(value as PaywallSource)
    ? (value as PaywallSource)
    : PaywallSource.Settings;
}
