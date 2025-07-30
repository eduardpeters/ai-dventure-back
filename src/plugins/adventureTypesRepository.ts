import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import { adventureTypesTable } from '@/db/schema';

declare module 'fastify' {
  export interface FastifyInstance {
    adventureTypesRepository: ReturnType<typeof createRepository>;
  }
}

type AdventureType = typeof adventureTypesTable.$inferSelect;

const createRepository = (fastify: FastifyInstance) => {
  const { db } = fastify;

  return {
    async getAll(): Promise<AdventureType[]> {
      const results = await db.select().from(adventureTypesTable);

      return results;
    },

    async getById(id: string): Promise<AdventureType | null> {
      const results = await db
        .select()
        .from(adventureTypesTable)
        .where(eq(adventureTypesTable.id, id));

      if (results.length === 0) {
        return null;
      }

      return results[0];
    },
  };
};

export default fastifyPlugin((fastify) => {
  fastify.decorate('adventureTypesRepository', createRepository(fastify));
});
