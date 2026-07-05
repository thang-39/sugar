import type { Reading } from '../models/reading';

export interface ReadingListFilter {
  from?: number; // inclusive: recordedAt >= from (Unix ms)
  to?: number; // inclusive: recordedAt <= to (Unix ms)
}

export interface ReadingRepository {
  create(reading: Reading): Promise<void>;
  update(reading: Reading): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Reading | undefined>;
  /** Newest-first by recordedAt. */
  list(filter?: ReadingListFilter): Promise<Reading[]>;
  count(filter?: ReadingListFilter): Promise<number>;
  /** Remove every reading (used by the "delete all data" flow). */
  deleteAll(): Promise<void>;
}
