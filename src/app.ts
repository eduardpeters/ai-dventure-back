import fastify, { FastifyInstance, FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import dbPlugin from '@/plugins/db';
import adventuresRepository from '@/plugins/adventuresRepository';
import adventureTypesRepository from '@/plugins/adventureTypesRepository';
import chaptersRepository from '@/plugins/chaptersRepository';
import chapterChoicesRepository from '@/plugins/chapterChoicesRepository';
import adventureRoutes from '@/routes/adventures';
import adventureTypesRoutes from '@/routes/adventureTypes';

interface AppOptions {
  logger: boolean;
  corsOrigins: string[] | boolean;
  connectionString: string;
  adventureHourlyRate: number;
  maxAdventureChapters: number;
  genAIApiKey: string;
  generativeAIPluginOverride?: FastifyPluginAsync;
}

function build(options: AppOptions): FastifyInstance {
  const app = fastify({ logger: options.logger, routerOptions: { ignoreTrailingSlash: true } });

  app.register(cors, { origin: options.corsOrigins });

  app.register(dbPlugin, { connectionString: options.connectionString });
  app.register(adventuresRepository);
  app.register(adventureTypesRepository);
  app.register(chaptersRepository);
  app.register(chapterChoicesRepository);

  app.get('/', async (request, reply) => {
    return { hello: 'world!' };
  });

  app.get('/ping', async (request, reply) => {
    const result = await app.db.execute('SELECT NOW()');
    return { result: result.rows[0] };
  });

  app.register(adventureRoutes, {
    adventureHourlyRate: options.adventureHourlyRate,
    maxAdventureChapters: options.maxAdventureChapters,
    genAIApiKey: options.genAIApiKey,
    generativeAIPluginOverride: options.generativeAIPluginOverride,
  });
  app.register(adventureTypesRoutes);

  return app;
}

export default build;
