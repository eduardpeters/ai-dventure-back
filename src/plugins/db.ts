import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import fastifyPlugin from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export interface DbPluginOptions extends FastifyPluginOptions {
  connectionString: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: NodePgDatabase;
  }
}

const dbPlugin = async (fastify: FastifyInstance, options: DbPluginOptions) => {
  const pool = new Pool({ connectionString: options.connectionString });
  const db = drizzle(pool);

  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
};

export default fastifyPlugin<DbPluginOptions>(dbPlugin);
