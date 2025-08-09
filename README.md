# ai-dventure-back

Backend code for the ai-dventure app project

## Features

- Uses generative AI to create the stories
- Handles the gameplay flow with a set length
- Implements "wallet protection measures" to prevent service abuse

## Technologies

- Backend application written in [TypeScript](https://github.com/microsoft/TypeScript) using [Fastify](https://github.com/fastify/fastify)
- Postgres database managed using [Drizzle](https://github.com/drizzle-team/drizzle-orm) (ORM, migrations)

## Application Options

The Fastify application accepts the following options (set up is explained in the Setup sections below):

```typescript
interface AppOptions {
  logger: boolean;
  connectionString: string;
  adventureHourlyRate: number;
  maxAdventureChapters: number;
  generativeAIPluginOverride?: FastifyPluginAsync;
}
```

- `logger`: maps directly to the fastify instance logger option
- `connectionString`: used by Drizzle to connect to the database
- `adventureHourlyRate`: limits the hourly amount of new adventures that are generated
- `maxAdventureChapters`: limits the amount of interactive chapters for the stories
- `generativeAIPluginOverride`: optional, used by the tests suite to supply a mock to avoid using the real service

## General Setup

The project requires a series of configuration variables, supplied as environment variables. What follows is a sample `.env` file:

```bash
ENVIRONMENT=PRODUCTION|DEVELOPMENT
API_PORT=8080
DATABASE_URL=""
HOURLY_RATE=5
ADVENTURE_LENGTH=5
```

## Development Setup

When developing you will want to run and expand the tests. Be aware that instead of mocking the database, a working test database is supplied to the application in integration tests.
For this purpose, during tests a `.env.test` file is also supplied with the following content:

```bash
ENVIRONMENT=TEST
TEST_DATABASE_URL=""
```

The test runner will only inject the expected test database connection string to avoid mishaps.

### Test Mocks

The application has the option to receive an override for the Generative AI service plugin. This is currently set up only for testing purposes, so that a mock service is supplied instead of using real API calls to models. This is set up by default in the tests.
