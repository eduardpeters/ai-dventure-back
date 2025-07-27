import { boolean, pgTable, text, timestamp, uuid, smallint } from 'drizzle-orm/pg-core';

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

export const chaptersTable = pgTable('chapters', {
  id: uuid().primaryKey().defaultRandom(),
  number: smallint().notNull(),
  story_so_far: text().notNull(),
  created: timestamp().notNull(),
  adventure_id: uuid()
    .notNull()
    .references(() => adventuresTable.id),
});

export const chapterChoicesTable = pgTable('chapter_choices', {
  id: uuid().primaryKey().defaultRandom(),
  action: text().notNull(),
  chosen: boolean().default(false),
  chapter_id: uuid()
    .notNull()
    .references(() => chaptersTable.id),
});
