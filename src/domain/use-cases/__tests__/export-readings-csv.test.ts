import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import { Unit } from '@/domain/models/unit';
import { exportReadingsCsv } from '@/domain/use-cases/export-readings-csv';
import type { ExportOptions } from '@/domain/models/export';

const BOM = '﻿';
const TAB = '\t';
const HEADER = ['Date', 'Time', 'Value', 'Unit', 'Meal', 'Timing', 'Hours After', 'Notes'].join(TAB);

const mealLabels: Record<MealType, string> = {
  [MealType.Breakfast]: 'Ăn sáng',
  [MealType.Lunch]: 'Ăn trưa',
  [MealType.Dinner]: 'Ăn tối',
  [MealType.Snack]: 'Ăn vặt',
};

// Deterministic formatter so tests don't depend on the machine timezone.
const opts = (overrides: Partial<ExportOptions> = {}): ExportOptions => ({
  unit: Unit.MgDl,
  mealLabels,
  formatRecordedAt: () => ({ date: '2026-07-05', time: '08:30' }),
  ...overrides,
});

const reading = (extra: Partial<Reading> = {}): Reading => ({
  id: 'id-1',
  value: 120,
  mealType: MealType.Breakfast,
  mealTiming: MealTiming.Before,
  recordedAt: 1_000,
  createdAt: 1_000,
  updatedAt: 1_000,
  syncStatus: SyncStatus.Pending,
  ...extra,
});

const lines = (csv: string): string[] => csv.slice(BOM.length).split('\r\n');

describe('exportReadingsCsv', () => {
  it('starts with a BOM (becomes the UTF-16LE BOM once the file is encoded)', () => {
    const csv = exportReadingsCsv([], opts());
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('emits only the header row for an empty list', () => {
    const csv = exportReadingsCsv([], opts());
    expect(lines(csv)).toEqual([HEADER]);
  });

  it('emits the locked header in column order, tab-separated', () => {
    const csv = exportReadingsCsv([reading()], opts());
    expect(lines(csv)[0]).toBe(HEADER);
  });

  it('formats a mg/dL reading as an integer value, tab-separated', () => {
    const csv = exportReadingsCsv([reading({ value: 120 })], opts({ unit: Unit.MgDl }));
    expect(lines(csv)[1]).toBe(
      ['2026-07-05', '08:30', '120', 'mg/dL', 'Ăn sáng', 'Before', '', ''].join(TAB),
    );
  });

  it('formats a mmol/L reading with one decimal and a dot separator', () => {
    // 120 mg/dL → 6.66 → 6.7 mmol/L
    const csv = exportReadingsCsv([reading({ value: 120 })], opts({ unit: Unit.MmolL }));
    const cells = lines(csv)[1]!.split(TAB);
    expect(cells[2]).toBe('6.7');
    expect(cells[3]).toBe('mmol/L');
  });

  it('leaves "Hours After" empty when timing is Before', () => {
    const csv = exportReadingsCsv(
      [reading({ mealTiming: MealTiming.Before, hoursAfterMeal: 2 })],
      opts(),
    );
    const cells = lines(csv)[1]!.split(TAB);
    expect(cells[5]).toBe('Before');
    expect(cells[6]).toBe('');
  });

  it('writes "Hours After" when timing is After', () => {
    const csv = exportReadingsCsv(
      [reading({ mealTiming: MealTiming.After, hoursAfterMeal: 2 })],
      opts(),
    );
    const cells = lines(csv)[1]!.split(TAB);
    expect(cells[5]).toBe('After');
    expect(cells[6]).toBe('2');
  });

  it('uses the injected localized meal label', () => {
    const csv = exportReadingsCsv([reading({ mealType: MealType.Dinner })], opts());
    expect(lines(csv)[1]).toContain('Ăn tối');
  });

  it('does NOT quote a comma (comma is a normal character in tab-separated output)', () => {
    const csv = exportReadingsCsv([reading({ notes: 'sau khi ăn phở, mệt' })], opts());
    expect(csv).toContain('sau khi ăn phở, mệt');
    expect(csv).not.toContain('"sau khi ăn phở, mệt"');
  });

  it('quotes a field containing a tab and doubles inner quotes', () => {
    const csv = exportReadingsCsv([reading({ notes: 'cột 1\tcột 2' })], opts());
    expect(csv).toContain('"cột 1\tcột 2"');
  });

  it('doubles embedded quotes and wraps the field', () => {
    const csv = exportReadingsCsv([reading({ notes: 'nói "khỏe"' })], opts());
    expect(csv).toContain('"nói ""khỏe"""');
  });

  it('quotes notes containing a newline', () => {
    const csv = exportReadingsCsv([reading({ notes: 'dòng 1\ndòng 2' })], opts());
    expect(csv).toContain('"dòng 1\ndòng 2"');
  });

  it('renders one data row per reading in the given order', () => {
    const csv = exportReadingsCsv(
      [reading({ id: 'a', value: 100 }), reading({ id: 'b', value: 200 })],
      opts(),
    );
    const rows = lines(csv);
    expect(rows).toHaveLength(3); // header + 2
    expect(rows[1]!.split(TAB)[2]).toBe('100');
    expect(rows[2]!.split(TAB)[2]).toBe('200');
  });
});
