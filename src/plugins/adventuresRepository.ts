import { FastifyInstance } from 'fastify';
import { gt } from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import { adventuresTable } from '@/db/schema';

declare module 'fastify' {
  export interface FastifyInstance {
    adventuresRepository: ReturnType<typeof createRepository>;
  }
}

interface AdventuresRepositoryOptions {
  adventureHourlyRate: number;
}

const createRepository = (fastify: FastifyInstance, options: AdventuresRepositoryOptions) => {
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

    async canCreateAdventure() {
      const currentDate = new Date();
      const oneHourInMs = 60 * 60 * 1000;
      let oneHourLess = new Date();
      oneHourLess.setTime(currentDate.getTime() - oneHourInMs);
      const count = await db.$count(adventuresTable, gt(adventuresTable.created, oneHourLess));

      return count < options.adventureHourlyRate;
    },
  };
};

export default fastifyPlugin((fastify, options: AdventuresRepositoryOptions) => {
  fastify.decorate('adventuresRepository', createRepository(fastify, options));
});
