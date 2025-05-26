import fastify, { FastifyInstance } from "fastify";

function build(options = {}): FastifyInstance {
  const app = fastify(options);

  app.get("/", async (request, reply) => {
    return { hello: "world!" };
  });

  return app;
}

export default build;
