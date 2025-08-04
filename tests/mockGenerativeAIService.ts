import fastifyPlugin from 'fastify-plugin';

interface GeneratedOption {
  action: string;
}

interface GenerativeAIResponse {
  content: {
    narrative: string;
    options: GeneratedOption[];
  };
}
// For use in place of actual narrative generation
const firstNarrative = 'the initial chapter goes here!';
const nextNarratives = 'a new chapter goes here!';
// For use in place of actual choice generation
const placeholderChoices: GeneratedOption[] = [
  { action: 'first action' },
  { action: 'second action' },
  { action: 'third action' },
];

interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

interface StoryPromptData {
  messages: Message[];
}

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
        promptData.messages[promptData.messages.length - 2].content ===
        'this is the final choice chapter'
      ) {
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
