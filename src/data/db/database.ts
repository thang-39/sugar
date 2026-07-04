import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * The Drizzle sync-SQLite database type used across the app. Both the
 * expo-sqlite (prod) and better-sqlite3 (test) drivers satisfy it — they share
 * the identical sync query API.
 */
export type SugarDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
