import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import generativeAIServicePlugin from '@/services/generativeAIService';
import type { Message, StoryPromptData } from '@/services/generativeAIService';
import type { ChapterChoice } from '@/plugins/chapterChoicesRepository';

interface AdventuresRoutesOptions {
  adventureHourlyRate: number;
  maxAdventureChapters: number;
  genAIApiKey: string;
  generativeAIPluginOverride?: FastifyPluginAsync;
}

const plugin: FastifyPluginAsync<AdventuresRoutesOptions> = async (
  fastify: FastifyInstance,
  options: AdventuresRoutesOptions,
) => {
  if (options.generativeAIPluginOverride) {
    await fastify.register(options.generativeAIPluginOverride);
  } else {
    await fastify.register(generativeAIServicePlugin, {
      baseUrl: '',
      apiKey: options.genAIApiKey,
    });
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

  fastify.get(
    '/adventures/:id',
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
              setting: { type: 'string' },
              chapters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    number: { type: 'number' },
                    narrative: { type: 'string' },
                    choices: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          action: { type: 'string' },
                          chosen: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
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

      const adventure = await adventuresRepository.getByIdWithSetting(id);
      if (!adventure) {
        return reply.code(404).send('This Adventure Is Lost');
      }
      const chapters = await chaptersRepository.getByAdventureIdOrdered(adventure.id);

      return { ...adventure, chapters };
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
      const adventure = await adventuresRepository.getByIdWithSetting(id);
      if (!adventure) {
        return reply.code(404).send('This Adventure Is Lost');
      }
      if (!adventure.active) {
        return reply.code(400).send('This Adventure Has Concluded');
      }

      // Check for latest chapter in the story
      const latestChapter = await chaptersRepository.getLatestByAdventureId(adventure.id);

      // If adventure has started check if supplied choice is valid and store it
      let adventureChoice: ChapterChoice | null = null;
      if (latestChapter) {
        if (!choice) {
          return reply.code(400).send('This Adventure Requires A Choice');
        }
        adventureChoice = await chapterChoicesRepository.getByIds(choice!, latestChapter.id);
        if (!adventureChoice) {
          return reply.code(404).send('This Choice Is Lost');
        }
      }

      const populatedChapters = await chaptersRepository.getByAdventureIdOrderedWithChoices(
        adventure.id,
      );

      // Build story so far
      const CHOICES_PER_CHAPTER = 3;
      const promptData: StoryPromptData = {
        messages: [
          { role: 'system', content: generativeAIService.getSystemPrompt(CHOICES_PER_CHAPTER) },
          {
            role: 'user',
            content: generativeAIService.getStartingUserPrompt(
              options.maxAdventureChapters,
              adventure.setting,
            ),
          },
        ],
      };
      for (const chapterWithChoices of populatedChapters) {
        const { chapters: chapter, chapter_choices: chapterChoice } = chapterWithChoices;
        const messageAssistant: Message = { role: 'assistant', content: chapter.narrative };
        promptData.messages.push(messageAssistant);
        if (chapterChoice) {
          promptData.messages.push({
            role: 'user',
            content: generativeAIService.getChoiceUserPrompt(
              options.maxAdventureChapters,
              chapter.number,
              chapterChoice.action,
            ),
          });
        }
      }
      // Add current user prompt
      if (latestChapter && adventureChoice) {
        const currentChoiceMessage: Message = {
          role: 'user',
          content: generativeAIService.getChoiceUserPrompt(
            options.maxAdventureChapters,
            latestChapter.number,
            adventureChoice.action,
          ),
        };
        promptData.messages.push(currentChoiceMessage);
      }

      const generatedResult = await generativeAIService.generate(promptData);
      if (!generatedResult) {
        // TODO: handle generation mishaps!
        return;
      }

      const generatedNarrative = generatedResult.narrative;

      // If no previous chapters, begin the first, otherwise, carry with the next
      const nextChapterData = {
        adventureId: adventure.id,
        number: populatedChapters.length + 1,
        narrative: generatedNarrative,
      };

      // Persist changes in DB
      const nextChapter = await chaptersRepository.create(nextChapterData);
      const generatedChoices = generatedResult.options.map((opt) => ({
        chapterId: nextChapter.id,
        action: opt,
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
