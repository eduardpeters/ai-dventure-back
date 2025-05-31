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
      const newAdventure = await adventuresRepository.create();
      return { adventure: newAdventure.id };
    },
  );
};

export default plugin;
