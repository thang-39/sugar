import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, openDatabaseSync } from 'expo-sqlite';
import { Platform } from 'react-native';
import * as schema from './schema';

// The concrete expo driver type — `useMigrations` requires it, and it is
// assignable to the driver-agnostic `SugarDb` the repositories accept.
type Db = ExpoSQLiteDatabase<typeof schema>;

const DB_NAME = 'sugar.db';

let instance: Db | undefined;

/**
 * Open the database, warming the web worker first.
 *
 * On web, expo-sqlite runs SQLite in a Web Worker backed by wa-sqlite (WASM).
 * The very first *synchronous* call (`openDatabaseSync`) busy-waits on a
 * SharedArrayBuffer and throws "Sync operation timeout" because the freshly
 * spawned worker has not finished loading its WASM yet. Awaiting an async open
 * first lets the worker load the WASM; afterwards the synchronous handle Drizzle
 * needs resolves instantly. On native there is no worker — the async warm-up is
 * skipped and this is a plain synchronous open.
 *
 * Idempotent: subsequent calls return the already-open instance.
 */
export async function initDatabase(): Promise<Db> {
  if (instance) return instance;
  if (Platform.OS === 'web') {
    await openDatabaseAsync(DB_NAME);
  }
  instance = drizzle(openDatabaseSync(DB_NAME), { schema });
  return instance;
}

/**
 * Synchronous accessor for the open database. Valid only after `initDatabase()`
 * has resolved (the app gates rendering on it at boot).
 */
export function getDb(): Db {
  if (!instance) {
    throw new Error('Database accessed before initDatabase() resolved.');
  }
  return instance;
}
