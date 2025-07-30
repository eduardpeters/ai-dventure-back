import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { adventureTypesRepository } = fastify;

  fastify.get(
    '/adventure-types',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const adventureTypes = await adventureTypesRepository.getAll();

      return adventureTypes;
    },
  );

  fastify.get(
    '/adventure-types/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
            },
          },
          404: {
            type: 'string',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const adventureType = await adventureTypesRepository.getById(id);

      if (adventureType === null) {
        return reply.code(404).send('Adventure Type Not Found');
      }

      return adventureType;
    },
  );
};

export default plugin;
