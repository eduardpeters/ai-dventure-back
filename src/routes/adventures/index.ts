import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { adventuresRepository } = fastify;

  fastify.post(
    '/adventures',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              adventure: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const canCreate = await adventuresRepository.canCreateAdventure();
      if (!canCreate) {
        return reply
          .code(503)
          .header('Retry-After', 30 * 60)
          .send();
      }

      const newAdventure = await adventuresRepository.create();
      return { adventure: newAdventure.id };
    },
  );
};

export default plugin;
