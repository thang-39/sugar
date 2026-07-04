import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { SugarDb } from '@/data/db/database';
import * as schema from '@/data/db/schema';

/**
 * Fresh in-memory SQLite DB with all migrations applied.
 * The single cast bridges the better-sqlite3 driver type to the shared SugarDb
 * type — safe because both drive the identical Drizzle sync API.
 */
export function createTestDb(): SugarDb {
  const sqlite = new BetterSqlite3(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db as unknown as SugarDb;
}
