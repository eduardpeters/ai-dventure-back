import build from '@/app';

const port = process.env.API_PORT ? parseInt(process.env.API_PORT) : 8080;
const adventureHourlyRate = process.env.HOURLY_RATE ? parseInt(process.env.HOURLY_RATE) : 10;
const connectionString = process.env.DATABASE_URL!;

async function start() {
  const app = build({ logger: true, adventureHourlyRate, connectionString });
  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
