import fastifyPlugin from 'fastify-plugin';
import type { FastifyPluginOptions } from 'fastify';

declare module 'fastify' {
  export interface FastifyInstance {
    generativeAIService: ReturnType<typeof createService>;
  }
}

interface GenerativeAIResponse {
  content: {
    narrative: string;
  };
}

export interface GenerativeAIServiceOptions extends FastifyPluginOptions {
  baseUrl: string;
  apiKey: string;
}

const createService = (options: GenerativeAIServiceOptions) => {
  return {
    async generate(prompt: string): Promise<GenerativeAIResponse | null> {
      const generated = {
        content: {
          narrative: prompt,
        },
      };

      return generated;
    },
  };
};

export default fastifyPlugin<GenerativeAIServiceOptions>((fastify, options) => {
  fastify.decorate('generativeAIService', createService(options));
});
