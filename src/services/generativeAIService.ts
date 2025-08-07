import fastifyPlugin from 'fastify-plugin';
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

const createService = (options: GenerativeAIServiceOptions) => {
  return {
    async generate(promptData: StoryPromptData): Promise<GenerativeAIResponse | null> {
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
