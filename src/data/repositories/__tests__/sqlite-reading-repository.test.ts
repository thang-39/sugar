import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import { SqliteReadingRepository } from '@/data/repositories/sqlite-reading-repository';
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
    createdAt: 1000,
    updatedAt: 1000,
    syncStatus: SyncStatus.Pending,
    ...overrides,
  };
}

function newRepo(): SqliteReadingRepository {
  return new SqliteReadingRepository(createTestDb());
}

describe('SqliteReadingRepository', () => {
  it('creates and reads back a reading, normalizing null → undefined', async () => {
    const repo = newRepo();
    const reading = makeReading();
    await repo.create(reading);

    const loaded = await repo.getById('r1');
    expect(loaded).toEqual(reading);
    expect(loaded?.userId).toBeUndefined();
    expect(loaded?.hoursAfterMeal).toBeUndefined();
    expect(loaded?.notes).toBeUndefined();
  });

  it('returns undefined for a missing id', async () => {
    const repo = newRepo();
    expect(await repo.getById('nope')).toBeUndefined();
  });

  it('persists optional fields when present', async () => {
    const repo = newRepo();
    await repo.create(
      makeReading({
        id: 'r2',
        mealTiming: MealTiming.After,
        hoursAfterMeal: 2,
        notes: 'sau ăn sáng',
        userId: 'u1',
      }),
    );
    const loaded = await repo.getById('r2');
    expect(loaded?.hoursAfterMeal).toBe(2);
    expect(loaded?.notes).toBe('sau ăn sáng');
    expect(loaded?.userId).toBe('u1');
  });

  it('updates an existing reading', async () => {
    const repo = newRepo();
    await repo.create(makeReading());
    await repo.update(makeReading({ value: 90, updatedAt: 2000 }));
    const loaded = await repo.getById('r1');
    expect(loaded?.value).toBe(90);
    expect(loaded?.updatedAt).toBe(2000);
  });

  it('deletes a reading', async () => {
    const repo = newRepo();
    await repo.create(makeReading());
    await repo.delete('r1');
    expect(await repo.getById('r1')).toBeUndefined();
  });

  it('lists newest-first by recordedAt', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a', recordedAt: 1000 }));
    await repo.create(makeReading({ id: 'b', recordedAt: 3000 }));
    await repo.create(makeReading({ id: 'c', recordedAt: 2000 }));
    const list = await repo.list();
    expect(list.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks recordedAt ties by createdAt (larger createdAt first)', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'x', recordedAt: 1000, createdAt: 1 }));
    await repo.create(makeReading({ id: 'y', recordedAt: 1000, createdAt: 2 }));
    const list = await repo.list();
    expect(list.map((r) => r.id)).toEqual(['y', 'x']);
  });

  it('returns an empty list and zero count for a fresh repo', async () => {
    const repo = newRepo();
    expect(await repo.list()).toEqual([]);
    expect(await repo.count()).toBe(0);
  });

  it('filters list by inclusive recordedAt range', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a', recordedAt: 1000 }));
    await repo.create(makeReading({ id: 'b', recordedAt: 2000 }));
    await repo.create(makeReading({ id: 'c', recordedAt: 3000 }));
    const list = await repo.list({ from: 2000, to: 3000 });
    expect(list.map((r) => r.id)).toEqual(['c', 'b']);
  });

  it('counts all and filtered', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a', recordedAt: 1000 }));
    await repo.create(makeReading({ id: 'b', recordedAt: 2000 }));
    expect(await repo.count()).toBe(2);
    expect(await repo.count({ from: 1500 })).toBe(1);
  });

  it('counts within an inclusive from/to window', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a', recordedAt: 1000 }));
    await repo.create(makeReading({ id: 'b', recordedAt: 2000 }));
    await repo.create(makeReading({ id: 'c', recordedAt: 3000 }));
    expect(await repo.count({ from: 1500, to: 2500 })).toBe(1);
  });

  it('delete of a missing id is a silent no-op', async () => {
    const repo = newRepo();
    await repo.create(makeReading());
    await expect(repo.delete('missing')).resolves.toBeUndefined();
    expect(await repo.count()).toBe(1);
  });

  it('update of a missing id is a silent no-op (does not insert)', async () => {
    const repo = newRepo();
    await expect(repo.update(makeReading({ id: 'ghost' }))).resolves.toBeUndefined();
    expect(await repo.count()).toBe(0);
    expect(await repo.getById('ghost')).toBeUndefined();
  });

  it('deleteAll removes every reading', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a' }));
    await repo.create(makeReading({ id: 'b' }));
    await repo.deleteAll();
    expect(await repo.count()).toBe(0);
    expect(await repo.list()).toEqual([]);
  });

  it('deleteAll on an empty repo is a no-op', async () => {
    const repo = newRepo();
    await expect(repo.deleteAll()).resolves.toBeUndefined();
    expect(await repo.count()).toBe(0);
  });

  it('replaceAll atomically clears then bulk-inserts the given readings', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'old1' }));
    await repo.create(makeReading({ id: 'old2' }));

    await repo.replaceAll([
      makeReading({ id: 'new1', value: 120, createdAt: 10 }),
      makeReading({ id: 'new2', value: 130, createdAt: 20 }),
    ]);

    const rows = await repo.list();
    expect(rows.map((r) => r.id).sort()).toEqual(['new1', 'new2']);
    expect(await repo.getById('old1')).toBeUndefined();
    expect((await repo.getById('new1'))?.createdAt).toBe(10);
  });

  it('replaceAll with an empty array clears the table', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a' }));
    await repo.replaceAll([]);
    expect(await repo.count()).toBe(0);
  });
});
