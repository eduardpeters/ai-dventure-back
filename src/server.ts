import build from "./app";

const port = process.env.API_PORT ? parseInt(process.env.API_PORT) : 8080;

async function start() {
  const app = build({ logger: true });
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
