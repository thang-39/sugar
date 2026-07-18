import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import type {
  ReadingListFilter,
  ReadingRepository,
} from '@/domain/repositories/reading-repository';
import { createReading } from '@/domain/use-cases/create-reading';
import { updateReading } from '@/domain/use-cases/update-reading';
import { deleteReading } from '@/domain/use-cases/delete-reading';
import type { ReadingUseCaseDeps } from '@/domain/use-cases/reading-use-case-deps';

class FakeReadingRepository implements ReadingRepository {
  readonly store = new Map<string, Reading>();
  async create(reading: Reading): Promise<void> {
    this.store.set(reading.id, { ...reading });
  }
  async update(reading: Reading): Promise<void> {
    this.store.set(reading.id, { ...reading });
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
  async deleteAll(): Promise<void> {
    this.store.clear();
  }
  async replaceAll(readings: Reading[]): Promise<void> {
    this.store.clear();
    for (const reading of readings) this.store.set(reading.id, { ...reading });
  }
  async getById(id: string): Promise<Reading | undefined> {
    const found = this.store.get(id);
    return found ? { ...found } : undefined;
  }
  async list(_filter?: ReadingListFilter): Promise<Reading[]> {
    return [...this.store.values()];
  }
  async count(_filter?: ReadingListFilter): Promise<number> {
    return this.store.size;
  }
}

function makeDeps(repository: ReadingRepository, now: number): ReadingUseCaseDeps {
  let counter = 0;
  return {
    repository,
    generateId: () => `id-${++counter}`,
    now: () => now,
  };
}

describe('createReading', () => {
  it('persists a reading with generated id, timestamps and pending sync', async () => {
    const repo = new FakeReadingRepository();
    const deps = makeDeps(repo, 1000);

    const reading = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        recordedAt: 500,
      },
      deps,
    );

    expect(reading).toEqual({
      id: 'id-1',
      value: 120,
      mealType: MealType.Lunch,
      mealTiming: MealTiming.Before,
      hoursAfterMeal: undefined,
      notes: undefined,
      recordedAt: 500,
      createdAt: 1000,
      updatedAt: 1000,
      syncStatus: SyncStatus.Pending,
    });
    expect(await repo.getById('id-1')).toEqual(reading);
  });

  it('drops hoursAfterMeal when timing is Before', async () => {
    const repo = new FakeReadingRepository();
    const reading = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        hoursAfterMeal: 2,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );
    expect(reading.hoursAfterMeal).toBeUndefined();
  });

  it('keeps hoursAfterMeal when timing is After', async () => {
    const repo = new FakeReadingRepository();
    const reading = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.After,
        hoursAfterMeal: 2,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );
    expect(reading.hoursAfterMeal).toBe(2);
  });
});

describe('updateReading', () => {
  it('updates fields and updatedAt, preserving createdAt', async () => {
    const repo = new FakeReadingRepository();
    const created = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );

    const updated = await updateReading(
      created.id,
      { value: 90 },
      makeDeps(repo, 2000),
    );

    expect(updated.value).toBe(90);
    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(2000);
    expect((await repo.getById(created.id))?.value).toBe(90);
  });

  it('drops hoursAfterMeal when switching timing After → Before', async () => {
    const repo = new FakeReadingRepository();
    const created = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.After,
        hoursAfterMeal: 2,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );

    const updated = await updateReading(
      created.id,
      { mealTiming: MealTiming.Before },
      makeDeps(repo, 2000),
    );

    expect(updated.mealTiming).toBe(MealTiming.Before);
    expect(updated.hoursAfterMeal).toBeUndefined();
    expect((await repo.getById(created.id))?.hoursAfterMeal).toBeUndefined();
  });

  it('keeps hoursAfterMeal when switching timing Before → After', async () => {
    const repo = new FakeReadingRepository();
    const created = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );

    const updated = await updateReading(
      created.id,
      { mealTiming: MealTiming.After, hoursAfterMeal: 3 },
      makeDeps(repo, 2000),
    );

    expect(updated.mealTiming).toBe(MealTiming.After);
    expect(updated.hoursAfterMeal).toBe(3);
    expect((await repo.getById(created.id))?.hoursAfterMeal).toBe(3);
  });

  it('throws when the reading does not exist', async () => {
    const repo = new FakeReadingRepository();
    await expect(
      updateReading('missing', { value: 90 }, makeDeps(repo, 2000)),
    ).rejects.toThrow('Reading not found: missing');
  });
});

describe('deleteReading', () => {
  it('removes the reading', async () => {
    const repo = new FakeReadingRepository();
    const created = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );
    await deleteReading(created.id, { repository: repo });
    expect(await repo.count()).toBe(0);
  });
});
