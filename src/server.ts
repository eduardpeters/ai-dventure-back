import build from '@/app';

const port = process.env.API_PORT ? parseInt(process.env.API_PORT) : 8080;
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : false;
const adventureHourlyRate = process.env.HOURLY_RATE ? parseInt(process.env.HOURLY_RATE) : 10;
const maxAdventureChapters = process.env.ADVENTURE_LENGTH
  ? parseInt(process.env.ADVENTURE_LENGTH)
  : 5;
const connectionString = process.env.DATABASE_URL!;
const genAIApiKey = process.env.GENAI_API_KEY!;

async function start() {
  const app = build({
    logger: true,
    corsOrigins,
    adventureHourlyRate,
    connectionString,
    maxAdventureChapters,
    genAIApiKey,
  });
  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
