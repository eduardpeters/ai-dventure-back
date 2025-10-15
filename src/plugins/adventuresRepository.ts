import { FastifyInstance } from 'fastify';
import { eq, gt } from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import { adventuresTable, adventureTypesTable } from '@/db/schema';

declare module 'fastify' {
  export interface FastifyInstance {
    adventuresRepository: ReturnType<typeof createRepository>;
  }
}

type Adventure = typeof adventuresTable.$inferSelect;
type AdventureWithSetting = Adventure & { setting: string | null };

interface AdventureUpdate {
  active: boolean;
}

const createRepository = (fastify: FastifyInstance) => {
  const { db } = fastify;

  return {
    async create(adventureTypeId: string): Promise<Adventure> {
      const newAdventure: typeof adventuresTable.$inferInsert = {
        adventure_type_id: adventureTypeId,
        created: new Date(),
        active: true,
      };

      const result = await db.insert(adventuresTable).values(newAdventure).returning();

      return result[0];
    },

    async canCreateAdventure(adventureHourlyRate: number) {
      const currentDate = new Date();
      const oneHourInMs = 60 * 60 * 1000;
      let oneHourLess = new Date();
      oneHourLess.setTime(currentDate.getTime() - oneHourInMs);
      const count = await db.$count(adventuresTable, gt(adventuresTable.created, oneHourLess));

      return count < adventureHourlyRate;
    },

    async getById(id: string): Promise<Adventure | null> {
      const results = await db.select().from(adventuresTable).where(eq(adventuresTable.id, id));

      if (results.length === 0) {
        return null;
      }

      return results[0];
    },

    async getByIdWithSetting(id: string): Promise<AdventureWithSetting | null> {
      const results = await db
        .select({
          id: adventuresTable.id,
          active: adventuresTable.active,
          created: adventuresTable.created,
          last_modified: adventuresTable.last_modified,
          adventure_type_id: adventuresTable.adventure_type_id,
          setting: adventureTypesTable.setting,
        })
        .from(adventuresTable)
        .innerJoin(
          adventureTypesTable,
          eq(adventuresTable.adventure_type_id, adventureTypesTable.id),
        )
        .where(eq(adventuresTable.id, id));

      if (results.length === 0) {
        return null;
      }

      return results[0];
    },

    async updateById(id: string, updateAdventureData: AdventureUpdate): Promise<Adventure | null> {
      const results = await db
        .update(adventuresTable)
        .set({ ...updateAdventureData, last_modified: new Date() })
        .where(eq(adventuresTable.id, id))
        .returning();

      if (results.length === 0) {
        return null;
      }

      return results[0];
    },
  };
};

export default fastifyPlugin((fastify) => {
  fastify.decorate('adventuresRepository', createRepository(fastify));
});
