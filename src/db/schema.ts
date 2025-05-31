import { boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const adventuresTable = pgTable('adventures', {
  id: uuid().primaryKey().defaultRandom(),
  active: boolean().default(true),
  created: timestamp().notNull(),
  last_modified: timestamp(),
});
