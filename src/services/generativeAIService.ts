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
  content: {
    narrative: string;
    options: GeneratedOption[];
  };
}

export interface GenerativeAIServiceOptions extends FastifyPluginOptions {
  baseUrl: string;
  apiKey: string;
}

// For use in place of actual narrative generation
const firstNarrative = 'the initial chapter goes here!';
const nextNarratives = 'a new chapter goes here!';
const finalNarrative = 'this is how the story ends!';
// For use in place of actual choice generation
const placeholderChoices: GeneratedOption[] = [
  { action: 'first action' },
  { action: 'second action' },
  { action: 'third action' },
];

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
The story will have a length of %CHAPTERS% with choices, after these the story must end.
</instructions>
<setting>
%SETTING%
</setting>
`;

const CHOICE_USER_PROMPT = `
<choice>
%CHOICE%
</choice>
`;

const ENSURE_ENDING_INSTRUCTION = `
<intructions>
What follows is the user's final choice, you must end the story in your reply.
</instructions>
`;

const MISTRAL_SMALL = 'mistral-small-latest';

const createService = (options: GenerativeAIServiceOptions) => {
  const client = new Mistral({ apiKey: options.apiKey });

  return {
    getSystemPrompt(numberOfChoices: number): string {
      const replacementMap = { '%N_CHOICES%': numberOfChoices.toString() };
      return replace(SYSTEM_PROMPT, replacementMap);
    },

    getStartingUserPrompt(numberOfChapters: number, storySetting: string): string {
      const replacementMap = {
        '%CHAPTERS%': numberOfChapters.toString(),
        '%SETTING%': storySetting,
      };
      return replace(INITIAL_USER_PROMPT, replacementMap);
    },

    getChoiceUserPrompt(choice: string): string {
      const replacementMap = {
        '%CHOICE%': choice,
      };
      return replace(CHOICE_USER_PROMPT, replacementMap);
    },

    async generate(promptData: StoryPromptData): Promise<GenerativeAIResponse | null> {
      console.log('Generating with Mistral');
      const response = await client.chat.complete({
        model: MISTRAL_SMALL,
        messages: promptData.messages,
        responseFormat: { type: 'json_object' },
      });
      console.log(response);

      // Narrative mock generation
      let generatedNarrative: string;
      if (promptData.messages.length <= 2) {
        generatedNarrative = firstNarrative;
      } else {
        generatedNarrative = nextNarratives;
      }

      // Choices mock generation
      let generatedOptions = placeholderChoices;
      if (
        promptData.messages[promptData.messages.length - 1].content === 'this is my last choice!'
      ) {
        generatedNarrative = finalNarrative;
        generatedOptions = [];
      }

      const generated = {
        content: {
          narrative: generatedNarrative,
          options: generatedOptions,
        },
      };

      return generated;
    },
  };
};

export default fastifyPlugin<GenerativeAIServiceOptions>((fastify, options) => {
  fastify.decorate('generativeAIService', createService(options));
});
