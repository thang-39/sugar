import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import type { Reading } from '@/domain/models/reading';
import type {
  ReadingListFilter,
  ReadingRepository,
} from '@/domain/repositories/reading-repository';
import type { SugarDb } from '../db/database';
import { readings } from '../db/schema';

type ReadingRow = typeof readings.$inferSelect;

function toDomain(row: ReadingRow): Reading {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    value: row.value,
    mealType: row.mealType,
    mealTiming: row.mealTiming,
    hoursAfterMeal: row.hoursAfterMeal ?? undefined,
    notes: row.notes ?? undefined,
    recordedAt: row.recordedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: row.syncStatus,
  };
}

function toRow(reading: Reading): ReadingRow {
  return {
    id: reading.id,
    userId: reading.userId ?? null,
    value: reading.value,
    mealType: reading.mealType,
    mealTiming: reading.mealTiming,
    hoursAfterMeal: reading.hoursAfterMeal ?? null,
    notes: reading.notes ?? null,
    recordedAt: reading.recordedAt,
    createdAt: reading.createdAt,
    updatedAt: reading.updatedAt,
    syncStatus: reading.syncStatus,
  };
}

function whereFor(filter?: ReadingListFilter): SQL | undefined {
  const clauses: SQL[] = [];
  if (filter?.from !== undefined) clauses.push(gte(readings.recordedAt, filter.from));
  if (filter?.to !== undefined) clauses.push(lte(readings.recordedAt, filter.to));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

export class SqliteReadingRepository implements ReadingRepository {
  constructor(private readonly db: SugarDb) {}

  async create(reading: Reading): Promise<void> {
    this.db.insert(readings).values(toRow(reading)).run();
  }

  async update(reading: Reading): Promise<void> {
    this.db.update(readings).set(toRow(reading)).where(eq(readings.id, reading.id)).run();
  }

  async delete(id: string): Promise<void> {
    this.db.delete(readings).where(eq(readings.id, id)).run();
  }

  async getById(id: string): Promise<Reading | undefined> {
    const row = this.db.select().from(readings).where(eq(readings.id, id)).get();
    return row ? toDomain(row) : undefined;
  }

  async list(filter?: ReadingListFilter): Promise<Reading[]> {
    const rows = this.db
      .select()
      .from(readings)
      .where(whereFor(filter))
      .orderBy(desc(readings.recordedAt), desc(readings.createdAt))
      .all();
    return rows.map(toDomain);
  }

  async count(filter?: ReadingListFilter): Promise<number> {
    const result = this.db
      .select({ value: count() })
      .from(readings)
      .where(whereFor(filter))
      .get();
    return result?.value ?? 0;
  }
}
