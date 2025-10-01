import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import generativeAIServicePlugin from '@/services/generativeAIService';
import type { Message, StoryPromptData } from '@/services/generativeAIService';
import type { ChapterChoice } from '@/plugins/chapterChoicesRepository';

interface AdventuresRoutesOptions {
  adventureHourlyRate: number;
  maxAdventureChapters: number;
  generativeAIPluginOverride?: FastifyPluginAsync;
}

const plugin: FastifyPluginAsync<AdventuresRoutesOptions> = async (
  fastify: FastifyInstance,
  options: AdventuresRoutesOptions,
) => {
  if (options.generativeAIPluginOverride) {
    await fastify.register(options.generativeAIPluginOverride);
  } else {
    await fastify.register(generativeAIServicePlugin, { baseUrl: 'string', apiKey: 'string' });
  }
  const {
    adventuresRepository,
    adventureTypesRepository,
    chaptersRepository,
    chapterChoicesRepository,
    generativeAIService,
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

      const canCreate = await adventuresRepository.canCreateAdventure(options.adventureHourlyRate);
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

      // Retrieve all chapters so far
      const chapters = await chaptersRepository.getByAdventureIdOrdered(adventure.id);
      console.log('all chapters', chapters);

      // Retrieve all choices so far
      const choices = await chapterChoicesRepository.getByAdventureId(adventure.id);
      console.log('choices for adventure!', choices);

      // Build story so far
      const promptData: StoryPromptData = {
        messages: [
          { role: 'system', content: 'System Prompt' },
          { role: 'user', content: 'Begin Adventure' },
        ],
      };
      for (const chapter of chapters) {
        const messageAssistant: Message = { role: 'assistant', content: chapter.narrative };
        promptData.messages.push(messageAssistant);
        const chapterChoice = choices.find(
          (choice) => choice.chapter_id === chapter.id && choice.chosen,
        );
        if (chapterChoice) {
          promptData.messages.push({ role: 'user', content: chapterChoice.action });
        }
      }
      // Add current user prompt
      const currentChoiceMessage: Message = { role: 'user', content: '' };
      if (choice) {
        if (chapters.length >= options.maxAdventureChapters) {
          currentChoiceMessage.content = 'this is my last choice!';
        } else {
          currentChoiceMessage.content = 'adventure choice!';
        }
        promptData.messages.push(currentChoiceMessage);
      }

      console.log('messages', promptData);

      const generatedResult = await generativeAIService.generate(promptData);
      if (!generatedResult) {
        // TODO: handle generation mishaps!
        return;
      }
      console.log('gen result', generatedResult);

      const generatedNarrative = generatedResult.content.narrative;

      // If no previous chapters, begin the first, otherwise, carry with the next
      const nextChapterData = {
        adventureId: adventure.id,
        number: chapters.length + 1,
        narrative: generatedNarrative,
      };

      // Persist changes in DB
      const nextChapter = await chaptersRepository.create(nextChapterData);
      const generatedChoices = generatedResult.content.options.map((opt) => ({
        chapterId: nextChapter.id,
        action: opt.action,
      }));

      if (latestChapter && choice) {
        await chapterChoicesRepository.updateByIds(choice, latestChapter.id, { chosen: true });
      }

      let nextChoices: ChapterChoice[] = [];
      if (generatedChoices.length > 0) {
        nextChoices = await chapterChoicesRepository.createMultiple(generatedChoices);
      }

      if (nextChoices.length <= 0) {
        await adventuresRepository.updateById(adventure.id, { active: false });
      }

      return {
        chapterNumber: nextChapter.number,
        narrative: nextChapter.narrative,
        choices: nextChoices.map((c) => ({ id: c.id, action: c.action })),
      };
    },
  );
};

export default plugin;
