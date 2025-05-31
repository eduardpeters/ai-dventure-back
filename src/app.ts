import fastify, { FastifyInstance } from 'fastify';
import dbPlugin from '@/plugins/db';
import adventuresRepository from './plugins/adventuresRepository';
import adventureRoutes from '@/routes/adventures';

function build(options = {}): FastifyInstance {
  const app = fastify(options);

  app.register(dbPlugin, { connectionString: process.env.DATABASE_URL! });
  app.register(adventuresRepository);

  app.get('/', async (request, reply) => {
    return { hello: 'world!' };
  });

  app.get('/ping', async (request, reply) => {
    const result = await app.db.execute('SELECT NOW()');
    return { result: result.rows[0] };
  });

  app.register(adventureRoutes);

  return app;
}

export default build;
