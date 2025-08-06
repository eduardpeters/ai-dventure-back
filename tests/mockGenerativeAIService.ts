import fastifyPlugin from 'fastify-plugin';
import type { StoryPromptData, GenerativeAIResponse } from '../src/services/generativeAIService';

interface GeneratedOption {
  action: string;
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

const createService = (options: unknown) => {
  void options;
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

export default fastifyPlugin((fastify, options) => {
  fastify.decorate('generativeAIService', createService(options));
});
