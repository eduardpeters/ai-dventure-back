import { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import { chaptersTable } from '@/db/schema';

declare module 'fastify' {
  export interface FastifyInstance {
    chaptersRepository: ReturnType<typeof createRepository>;
  }
}

type Chapter = typeof chaptersTable.$inferSelect;

const createRepository = (fastify: FastifyInstance) => {
  const { db } = fastify;

  return {
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
  };
};

export default fastifyPlugin((fastify) => {
  fastify.decorate('chaptersRepository', createRepository(fastify));
});
