import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { adventuresTable } from '@/db/schema';

declare module 'fastify' {
  export interface FastifyInstance {
    adventuresRepository: ReturnType<typeof createRepository>;
  }
}

const createRepository = (fastify: FastifyInstance) => {
  const { db } = fastify;

  return {
    async create() {
      const newAdventure: typeof adventuresTable.$inferInsert = {
        created: new Date(),
        active: true,
      };

      const result = await db.insert(adventuresTable).values(newAdventure).returning();

      return result[0];
    },
  };
};

export default fastifyPlugin((fastify) => {
  fastify.decorate('adventuresRepository', createRepository(fastify));
});
