import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { MealTiming, MealType } from '@/domain/models/meal';
import type { SyncStatus } from '@/domain/models/reading';

export const readings = sqliteTable('readings', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  value: integer('value').notNull(),
  mealType: text('meal_type').$type<MealType>().notNull(),
  mealTiming: text('meal_timing').$type<MealTiming>().notNull(),
  hoursAfterMeal: integer('hours_after_meal'),
  notes: text('notes'),
  recordedAt: integer('recorded_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  syncStatus: text('sync_status').$type<SyncStatus>().notNull().default('pending'),
});

export const appSettings = sqliteTable(
  'app_settings',
  {
    id: text('id').primaryKey(), // = key
    key: text('key').notNull(),
    value: text('value').notNull(), // JSON-serialized value
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('app_settings_key_idx').on(table.key)],
);
