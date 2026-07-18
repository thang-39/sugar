import { BACKUP_SCHEMA_VERSION, type BackupFile } from '@/domain/models/backup';
import { MealTiming, MealType } from '@/domain/models/meal';
import { type Reading, SyncStatus } from '@/domain/models/reading';
import { type AppSettings, DEFAULT_SETTINGS, Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { applyBackup } from '@/domain/use-cases/apply-backup';
import { BackupMalformedError, BackupTooNewError } from '@/domain/use-cases/backup-errors';
import { migrateBackup } from '@/domain/use-cases/migrate-backup';
import { parseBackup } from '@/domain/use-cases/parse-backup';
import { serializeBackup } from '@/domain/use-cases/serialize-backup';
import { SqliteReadingRepository } from '@/data/repositories/sqlite-reading-repository';
import { SqliteSettingsRepository } from '@/data/repositories/sqlite-settings-repository';
import { createTestDb } from '@/test-support/test-db';

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    id: 'r1',
    value: 100,
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    hoursAfterMeal: undefined,
    notes: undefined,
    recordedAt: 1000,
    createdAt: 900,
    updatedAt: 1000,
    syncStatus: SyncStatus.Pending,
    ...overrides,
  };
}

const SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  preferredUnit: Unit.MmolL,
  preferredLanguage: Language.English,
  fastingRange: { low: 65, high: 95 },
  conditionType: 'gestational',
  reportCount: 3,
  lastLocalBackupAt: 555,
};

/** Round-trip a backup through JSON exactly as the file I/O layer would. */
function roundTrip(file: BackupFile): unknown {
  return JSON.parse(JSON.stringify(file));
}

describe('serializeBackup + parseBackup', () => {
  it('round-trips readings and settings byte-identically', () => {
    const readings = [makeReading({ id: 'a' }), makeReading({ id: 'b', value: 150 })];
    const file = serializeBackup(readings, SETTINGS, 12345);

    expect(file.app).toBe('sugar');
    expect(file.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(file.exportedAt).toBe(12345);

    const parsed = parseBackup(roundTrip(file));
    expect(parsed.readings).toEqual(readings);
    expect(parsed.settings).toEqual(SETTINGS);
  });

  it('fills settings keys missing from an older backup with defaults', () => {
    const partial = {
      app: 'sugar',
      schemaVersion: 1,
      exportedAt: 1,
      readings: [],
      settings: { preferredUnit: Unit.MmolL },
    };
    const parsed = parseBackup(partial);
    expect(parsed.settings.preferredUnit).toBe(Unit.MmolL);
    // A key absent from the file falls back to the default.
    expect(parsed.settings.analyticsEnabled).toBe(DEFAULT_SETTINGS.analyticsEnabled);
    expect(parsed.settings.lastLocalBackupAt).toBe(DEFAULT_SETTINGS.lastLocalBackupAt);
  });

  it('rejects a file whose schemaVersion is newer than the app', () => {
    const file = { app: 'sugar', schemaVersion: 999, exportedAt: 1, readings: [], settings: {} };
    expect(() => parseBackup(file)).toThrow(BackupTooNewError);
  });

  it('rejects a non-Sugar or malformed file', () => {
    expect(() => parseBackup({ app: 'other', schemaVersion: 1, exportedAt: 1, readings: [], settings: {} })).toThrow(
      BackupMalformedError,
    );
    expect(() => parseBackup(null)).toThrow(BackupMalformedError);
    expect(() => parseBackup('nope')).toThrow(BackupMalformedError);
    expect(() => parseBackup({ app: 'sugar', schemaVersion: 1, exportedAt: 1, readings: {}, settings: {} })).toThrow(
      BackupMalformedError,
    );
  });
});

describe('migrateBackup', () => {
  it('is the identity for the current schema version', () => {
    const file = serializeBackup([makeReading()], SETTINGS, 1);
    expect(migrateBackup(file)).toEqual(file);
  });
});

describe('applyBackup', () => {
  function newRepos(): { readingRepo: SqliteReadingRepository; settingsRepo: SqliteSettingsRepository } {
    const db = createTestDb();
    return {
      readingRepo: new SqliteReadingRepository(db),
      settingsRepo: new SqliteSettingsRepository(db),
    };
  }

  it('replaces readings preserving id/createdAt and restores settings', async () => {
    const { readingRepo, settingsRepo } = newRepos();
    // Pre-existing data that restore must wipe.
    await readingRepo.create(makeReading({ id: 'old', createdAt: 1 }));
    await settingsRepo.set('reportCount', 99);

    const backup = serializeBackup(
      [makeReading({ id: 'x', createdAt: 111, value: 210 }), makeReading({ id: 'y', createdAt: 222 })],
      SETTINGS,
      1,
    );
    const result = await applyBackup(backup, { readingRepo, settingsRepo });

    expect(result).toEqual({ restored: 2, skipped: 0 });
    const rows = await readingRepo.list();
    expect(rows.map((r) => r.id).sort()).toEqual(['x', 'y']);
    const x = rows.find((r) => r.id === 'x');
    expect(x?.createdAt).toBe(111);
    expect(x?.value).toBe(210); // out-of-normal-range value preserved (warn-only)
    // Settings replaced, not merged with the old row.
    expect(await settingsRepo.get('reportCount')).toBe(SETTINGS.reportCount);
    expect(await settingsRepo.get('preferredUnit')).toBe(Unit.MmolL);
  });

  it('skips and counts structurally-invalid reading rows without aborting', async () => {
    const { readingRepo, settingsRepo } = newRepos();
    const good = makeReading({ id: 'good' });
    const backup: BackupFile = {
      app: 'sugar',
      schemaVersion: 1,
      exportedAt: 1,
      readings: [
        good,
        { id: 'bad', value: 'oops' } as unknown as Reading,
        { value: 100 } as unknown as Reading, // missing id
      ],
      settings: SETTINGS,
    };
    const result = await applyBackup(backup, { readingRepo, settingsRepo });

    expect(result).toEqual({ restored: 1, skipped: 2 });
    const rows = await readingRepo.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('good');
  });

  it('accepts an empty backup (0 readings is valid)', async () => {
    const { readingRepo, settingsRepo } = newRepos();
    await readingRepo.create(makeReading({ id: 'old' }));
    const backup = serializeBackup([], SETTINGS, 1);

    const result = await applyBackup(backup, { readingRepo, settingsRepo });
    expect(result).toEqual({ restored: 0, skipped: 0 });
    expect(await readingRepo.list()).toHaveLength(0);
  });
});
