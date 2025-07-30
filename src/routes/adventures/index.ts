import { FastifyInstance, FastifyPluginAsync } from 'fastify';

interface AdventuresRoutesOptions {
  maxAdventureChapters: number;
}

const plugin: FastifyPluginAsync<AdventuresRoutesOptions> = async (
  fastify: FastifyInstance,
  options: AdventuresRoutesOptions,
) => {
  const {
    adventuresRepository,
    adventureTypesRepository,
    chaptersRepository,
    chapterChoicesRepository,
  } = fastify;

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
        return reply.code(404).send('This Adventure Is Lost');
      }
      if (!adventure.active) {
        return reply.code(400).send('This Adventure Has Concluded');
      }

      // Check for latest chapter in the story
      const latestChapter = await chaptersRepository.getLatestByAdventureId(adventure.id);

      // If adventure has started check if supplied choice is valid
      if (latestChapter) {
        if (!choice) {
          return reply.code(400).send('This Adventure Requires A Choice');
        }
        const adventureChoice = await chapterChoicesRepository.getByIds(choice!, latestChapter.id);
        if (!adventureChoice) {
          return reply.code(404).send('This Choice Is Lost');
        }
      }

      // For use in place of actual chapter generation
      const placeholderInitialChapter = {
        adventureId: adventure.id,
        number: 1,
        narrative: 'the initial chapter goes here!',
        storySoFar: 'a choice has presented itself',
      };
      const placeholderFollowupChapter = {
        adventureId: adventure.id,
        number: 0,
        narrative: 'a new chapter goes here!',
        storySoFar: 'another choice has presented itself',
      };
      // For use in place of actual choice generation
      const placeholderChoices = [
        { action: 'first action' },
        { action: 'second action' },
        { action: 'third action' },
      ];

      // If no previous chapters, begin the first, otherwise, carry with the next
      const nextChapterData = !latestChapter
        ? placeholderInitialChapter
        : { ...placeholderFollowupChapter, number: latestChapter.number + 1 };

      // Persist changes in DB
      if (latestChapter && choice) {
        await chapterChoicesRepository.updateByIds(choice, latestChapter.id, { chosen: true });
      }
      const nextChapter = await chaptersRepository.create(nextChapterData);
      const nextChoices =
        nextChapter.number < options.maxAdventureChapters
          ? await chapterChoicesRepository.createMultiple(
              placeholderChoices.map((c) => ({ ...c, chapterId: nextChapter.id })),
            )
          : [];

      return {
        chapterNumber: nextChapter.number,
        narrative: nextChapter.narrative,
        choices: nextChoices.map((c) => ({ id: c.id, action: c.action })),
      };
    },
  );
};

export default plugin;
