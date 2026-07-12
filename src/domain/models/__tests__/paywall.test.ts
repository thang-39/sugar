import { PaywallSource, toPaywallSource } from '../paywall';

describe('toPaywallSource', () => {
  it('passes through a valid source', () => {
    expect(toPaywallSource('report_gate')).toBe(PaywallSource.ReportGate);
    expect(toPaywallSource('csv_gate')).toBe(PaywallSource.CsvGate);
  });

  it('falls back to settings for unknown/missing values', () => {
    expect(toPaywallSource(undefined)).toBe(PaywallSource.Settings);
    expect(toPaywallSource('bogus')).toBe(PaywallSource.Settings);
    expect(toPaywallSource(42)).toBe(PaywallSource.Settings);
  });
});
