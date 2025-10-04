import { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, or, isNull } from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import { chaptersTable, chapterChoicesTable } from '@/db/schema';

declare module 'fastify' {
  export interface FastifyInstance {
    chaptersRepository: ReturnType<typeof createRepository>;
  }
}

type Chapter = typeof chaptersTable.$inferSelect;
type ChapterChoice = typeof chapterChoicesTable.$inferSelect;
type ChapterWithChoices = { chapters: Chapter; chapter_choices: ChapterChoice | null };

interface ChapterCreate {
  adventureId: string;
  number: number;
  narrative: string;
}

const createRepository = (fastify: FastifyInstance) => {
  const { db } = fastify;

  return {
    async getByAdventureIdOrdered(adventureId: string): Promise<Chapter[]> {
      const results = await db
        .select()
        .from(chaptersTable)
        .where(eq(chaptersTable.adventure_id, adventureId))
        .orderBy(asc(chaptersTable.number));

      return results;
    },

    async getByAdventureIdOrderedWithChoices(adventureId: string): Promise<ChapterWithChoices[]> {
      const results = await db
        .select()
        .from(chaptersTable)
        .leftJoin(
          chapterChoicesTable,
          and(
            eq(chaptersTable.id, chapterChoicesTable.chapter_id),
            eq(chapterChoicesTable.chosen, true),
          ),
        )
        .where(eq(chaptersTable.adventure_id, adventureId))
        .orderBy(asc(chaptersTable.number));

      return results;
    },

    async getLatestByAdventureId(adventureId: string): Promise<Chapter | null> {
      const results = await db
        .select()
        .from(chaptersTable)
        .where(eq(chaptersTable.adventure_id, adventureId))
        .orderBy(desc(chaptersTable.number))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return results[0];
    },

    async create(newChapterData: ChapterCreate): Promise<Chapter> {
      const newChapter: typeof chaptersTable.$inferInsert = {
        adventure_id: newChapterData.adventureId,
        number: newChapterData.number,
        narrative: newChapterData.narrative,
        created: new Date(),
      };

      const result = await db.insert(chaptersTable).values(newChapter).returning();

      return result[0];
    },
  };
};

export default fastifyPlugin((fastify) => {
  fastify.decorate('chaptersRepository', createRepository(fastify));
});
