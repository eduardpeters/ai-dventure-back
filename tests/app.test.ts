import { describe, expect, test, afterAll, onTestFinished } from 'vitest';
import build from '../src/app';
import TestDbClient from './TestDbClient';

describe('App http injection tests', () => {
  const app = build({
    logger: false,
    adventureHourlyRate: 1,
    connectionString: import.meta.env.TEST_DATABASE_URL,
  });
  afterAll(() => app.close());

  const db = new TestDbClient(import.meta.env.TEST_DATABASE_URL);

  test('request the "/" route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.json()).toStrictEqual({ hello: 'world!' });
  });

  test('Received an adventure id when POSTing /adventures', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/adventures',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.json()).toHaveProperty('adventure');
  });

  test('Received a 503 response when reaching the limit of POSTing /adventures', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['adventures']);
    });
    const response = await app.inject({
      method: 'POST',
      url: '/adventures',
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['retry-after']).toBeDefined();
  });
});
