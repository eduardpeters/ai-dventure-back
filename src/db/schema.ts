import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const adventuresTable = pgTable('adventures', {
  id: uuid().primaryKey().defaultRandom(),
  active: boolean().default(true),
  created: timestamp().notNull(),
  last_modified: timestamp(),
  adventure_type_id: uuid()
    .notNull()
    .references(() => adventureTypesTable.id),
});

export const adventureTypesTable = pgTable('adventure_types', {
  id: uuid().primaryKey().defaultRandom(),
  description: text(),
});
