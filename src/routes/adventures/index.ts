import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { adventuresRepository, adventureTypesRepository, chaptersRepository } = fastify;

  fastify.post(
    '/adventures',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            adventureTypeId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              adventure: { type: 'string' },
            },
          },
          '4xx': {
            type: 'string',
          },
        },
      },
    },
    async (request, reply) => {
      const { adventureTypeId } = request.body as { adventureTypeId: string | undefined };

      if (!adventureTypeId) {
        return reply.code(400).send('Invalid Adventure Type');
      }

      const adventureType = await adventureTypesRepository.getById(adventureTypeId);
      if (!adventureType) {
        return reply.code(400).send('Invalid Adventure Type');
      }

      const canCreate = await adventuresRepository.canCreateAdventure();
      if (!canCreate) {
        return reply
          .code(503)
          .header('Retry-After', 30 * 60)
          .send();
      }

      const newAdventure = await adventuresRepository.create(adventureType.id);
      return { adventure: newAdventure.id };
    },
  );

  fastify.post(
    '/adventures/:id/forth',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            choice: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              chapterNumber: { type: 'number' },
              narrative: { type: 'string' },
              choices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    action: { type: 'string' },
                  },
                },
              },
            },
          },
          '4xx': {
            type: 'string',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { choice } = request.body as { choice: string | undefined };

      // Check if adventure ID is valid
      const adventure = await adventuresRepository.getById(id);
      if (!adventure) {
        return reply.code(400).send('Invalid Adventure Type');
      }
      if (!adventure.active) {
        return reply.code(400).send('This Adventure Has Concluded');
      }

      // Check for latest chapter in the story
      const latestChapter = await chaptersRepository.getLatestByAdventureId(adventure.id);

      console.log(latestChapter);
      // If no previous chapters, begin the first
      if (!latestChapter) {
        const nextChapter = await chaptersRepository.create({
          adventureId: adventure.id,
          number: 1,
          storySoFar: 'a choice has presented itself',
        });
        return {
          chapterNumber: nextChapter.number,
          narrative: 'the initial chapter goes here!',
          choices: [],
        };
      }

      // Otherwise, carry on with the story
      const nextChapter = await chaptersRepository.create({
        adventureId: adventure.id,
        number: latestChapter.number + 1,
        storySoFar: 'another choice has presented itself',
      });

      return {
        chapterNumber: nextChapter.number,
        narrative: 'a new chapter goes here!',
        choices: [],
      };
    },
  );
};

export default plugin;
