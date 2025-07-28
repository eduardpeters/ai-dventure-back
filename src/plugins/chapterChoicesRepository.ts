import { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import { chapterChoicesTable } from '@/db/schema';

declare module 'fastify' {
  export interface FastifyInstance {
    chapterChoicesRepository: ReturnType<typeof createRepository>;
  }
}

type ChapterChoice = typeof chapterChoicesTable.$inferSelect;

interface ChapterChoiceCreate {
  chapterId: string;
  action: string;
}

const createRepository = (fastify: FastifyInstance) => {
  const { db } = fastify;

  return {
    async getByIds(choiceId: string, chapterId: string): Promise<ChapterChoice | null> {
      const results = await db
        .select()
        .from(chapterChoicesTable)
        .where(
          and(eq(chapterChoicesTable.id, choiceId), eq(chapterChoicesTable.chapter_id, chapterId)),
        )
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return results[0];
    },

    async createMultiple(newChapterData: ChapterChoiceCreate[]): Promise<ChapterChoice[]> {
      const newChoices: (typeof chapterChoicesTable.$inferInsert)[] = newChapterData.map(
        (data) => ({ chapter_id: data.chapterId, action: data.action, chosen: false }),
      );

      const results = await db.insert(chapterChoicesTable).values(newChoices).returning();

      return results;
    },
  };
};

export default fastifyPlugin((fastify) => {
  fastify.decorate('chapterChoicesRepository', createRepository(fastify));
});
