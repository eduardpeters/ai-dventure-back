import fastifyPlugin from 'fastify-plugin';
import { Mistral } from '@mistralai/mistralai';
import replace from '@/utils/replace';
import type { FastifyPluginOptions } from 'fastify';

declare module 'fastify' {
  export interface FastifyInstance {
    generativeAIService: ReturnType<typeof createService>;
  }
}

export interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

export interface StoryPromptData {
  messages: Message[];
}

interface GeneratedOption {
  action: string;
}

export interface GenerativeAIResponse {
  narrative: string;
  options: string[];
}

export interface GenerativeAIServiceOptions extends FastifyPluginOptions {
  baseUrl: string;
  apiKey: string;
}

const SYSTEM_PROMPT = `
<context>
You are a master storyteller with large expertise in the "choose you own adventure" style of games.
You build engaging short story worlds tailored to the user's preferences.
</context>
<instructions>
The user will provide you with a setting for the story and you will start providing the narrative.
You must end each step (except the final one) presenting the user %N_CHOICES% actions from which 
the user will select one and reply with it you to continue the story.
The user will indicate in their first message how many times this process will be repeated until the story must end. 
Keep this in mind to pace the story in a way that is both entertaining and ensures closure after reaching the final choice.
</instructions>
<output>
You will provide each answer in JSON format with the following schema:
{
  "narrative": string;
  "options": string[];
}

You will generate the next step in the story setting up the next choice or providing an ending in the "narrative" field.
For each step except the ending you will provide the %N_CHOICES% possible actions for the user in the "options" field.
If the ending has been reached you will provide an empty array in the "options" field.
</output>
`;

const INITIAL_USER_PROMPT = `
<intructions>
Begin a new story with the setting that follows.
The story will have a length of %CHAPTERS% chapters with choices, after these the story must end.
</instructions>
<setting>
%SETTING%
</setting>
`;

const PROGRESSION_USER_PROMPT = `
<progression>
Chapter %CHAPTER% of %N_CHAPTERS%
%PROGRESSION_INSTRUCTIONS%
</progression>
`;

const CHOICE_USER_PROMPT = `
<choice>
%CHOICE%
</choice>
`;

const MISTRAL_SMALL = 'mistral-small-latest';

const createService = (options: GenerativeAIServiceOptions) => {
  const client = new Mistral({ apiKey: options.apiKey });

  return {
    getSystemPrompt(numberOfChoices: number): string {
      const replacementMap = { '%N_CHOICES%': numberOfChoices.toString() };
      return replace(SYSTEM_PROMPT, replacementMap);
    },

    getStartingUserPrompt(numberOfChapters: number, storySetting: string | null): string {
      const replacementMap = {
        '%CHAPTERS%': numberOfChapters.toString(),
        '%SETTING%': storySetting || 'Surprise me! Choose a random setting!',
      };
      return replace(INITIAL_USER_PROMPT, replacementMap);
    },

    getChoiceUserPrompt(numberOfChapters: number, currentChapter: number, choice: string): string {
      let currentProgression: string;
      if (currentChapter >= numberOfChapters) {
        currentProgression =
          "What follows is the user's final choice, you must end the story in your reply.";
      } else if (currentChapter >= numberOfChapters / 2) {
        currentProgression =
          'You have reached the middle of the story, things will need to wrap up soon.';
      } else {
        currentProgression = 'You are still at the first half of the story.';
      }

      const replacementMap = {
        '%CHAPTER%': currentChapter.toString(),
        '%N_CHAPTERS%': numberOfChapters.toString(),
        '%PROGRESSION_INSTRUCTIONS%': currentProgression,
        '%CHOICE%': choice,
      };
      return (
        replace(PROGRESSION_USER_PROMPT, replacementMap) +
        replace(CHOICE_USER_PROMPT, replacementMap)
      );
    },

    async generate(promptData: StoryPromptData): Promise<GenerativeAIResponse | null> {
      const response = await client.chat.complete({
        model: MISTRAL_SMALL,
        messages: promptData.messages,
        responseFormat: { type: 'json_object' },
      });

      const responseJSON = response.choices[0].message.content;
      if (!responseJSON || typeof responseJSON !== 'string') {
        throw new Error('This response is not valid?');
      }

      const parsed = JSON.parse(responseJSON) as {
        narrative: string;
        options: string[];
      };

      const generated = {
        narrative: parsed.narrative,
        options: parsed.options,
      };

      return generated;
    },
  };
};

export default fastifyPlugin<GenerativeAIServiceOptions>((fastify, options) => {
  fastify.decorate('generativeAIService', createService(options));
});
