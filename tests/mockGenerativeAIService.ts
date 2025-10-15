import fastifyPlugin from 'fastify-plugin';
import type { StoryPromptData, GenerativeAIResponse } from '../src/services/generativeAIService';

// For use in place of actual narrative generation
const firstNarrative = 'the initial chapter goes here!';
const nextNarratives = 'a new chapter goes here!';
const finalNarrative = 'this is how the story ends!';
// For use in place of actual choice generation
const placeholderChoices = ['first action', 'second action', 'third action'];

const createService = (options: unknown) => {
  void options;
  return {
    getSystemPrompt(): string {
      return 'system prompt';
    },

    getStartingUserPrompt(): string {
      return 'first user prompt';
    },

    getChoiceUserPrompt(choice: string): string {
      return choice;
    },

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
      if (promptData.messages[promptData.messages.length - 1].content === 'a brave final action') {
        generatedNarrative = finalNarrative;
        generatedOptions = [];
      }

      const generated = {
        narrative: generatedNarrative,
        options: generatedOptions,
      };

      return generated;
    },
  };
};

export default fastifyPlugin((fastify, options) => {
  fastify.decorate('generativeAIService', createService(options));
});
