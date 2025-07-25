import fastify, { FastifyInstance, FastifyHttpOptions } from 'fastify';
import dbPlugin from '@/plugins/db';
import adventuresRepository from './plugins/adventuresRepository';
import adventureRoutes from '@/routes/adventures';

interface AppOptions {
  logger: boolean;
  connectionString: string;
  adventureHourlyRate: number;
}

function build(options: AppOptions): FastifyInstance {
  const app = fastify({ logger: options.logger });

  app.register(dbPlugin, { connectionString: options.connectionString });
  app.register(adventuresRepository, { adventureHourlyRate: options.adventureHourlyRate });

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
