import fastifyPlugin from 'fastify-plugin';

interface GenerativeAIResponse {
  content: {
    narrative: string;
    options: string[];
  };
}

// For use in place of actual choice generation
const placeholderChoices = [
  { action: 'first action' },
  { action: 'second action' },
  { action: 'third action' },
];

const createService = (options: unknown) => {
  void options;
  return {
    async generate(prompt: string): Promise<GenerativeAIResponse | null> {
      const generated = {
        content: {
          narrative: prompt,
          options: [],
        },
      };

      return generated;
    },
  };
};

export default fastifyPlugin((fastify, options) => {
  fastify.decorate('generativeAIService', createService(options));
});
