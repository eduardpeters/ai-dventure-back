import { describe, expect, test, afterAll, onTestFinished } from 'vitest';
import build from '../src/app';
import TestDbClient from './TestDbClient';

describe('Aventure Types Injection Tests', () => {
  const app = build({
    logger: false,
    adventureHourlyRate: 1,
    connectionString: import.meta.env.TEST_DATABASE_URL,
  });
  const db = new TestDbClient(import.meta.env.TEST_DATABASE_URL);
  afterAll(() => {
    app.close();
    db.close();
  });

  test('It receives a list of available adventure types', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/adventure-types',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.json()).toBeInstanceOf(Array);
  });

  test('It returns a 404 status if requesting a non existing id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/adventure-types/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(404);
  });

  test('It receives an adventure type by id', async () => {
    // We retrieve directly from DB and request it via API to compare
    const adventureTypes = await db.queryAdventureTypes();
    const requestedAdventureType = adventureTypes[0];

    const response = await app.inject({
      method: 'GET',
      url: `/adventure-types/${requestedAdventureType.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.json()).toStrictEqual(requestedAdventureType);
  });
});

describe('Adventures Injection Tests', () => {
  const app = build({
    logger: false,
    adventureHourlyRate: 1,
    connectionString: import.meta.env.TEST_DATABASE_URL,
  });
  const db = new TestDbClient(import.meta.env.TEST_DATABASE_URL);
  afterAll(() => {
    app.close();
    db.close();
  });

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
