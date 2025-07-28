import { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
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
