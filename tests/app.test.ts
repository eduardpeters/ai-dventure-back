import { describe, expect, test, afterAll, onTestFinished } from 'vitest';
import build from '../src/app';
import TestDbClient from './TestDbClient';
import * as vitestTypes from './vitest'; // meta type definitions for test environment

const TEST_DATABASE_URL = import.meta.env.TEST_DATABASE_URL;

describe('Aventure Types Injection Tests', () => {
  const app = build({
    logger: false,
    adventureHourlyRate: 1,
    connectionString: TEST_DATABASE_URL,
  });
  const db = new TestDbClient(TEST_DATABASE_URL);
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
    connectionString: TEST_DATABASE_URL,
  });
  const db = new TestDbClient(TEST_DATABASE_URL);
  afterAll(() => {
    app.close();
    db.close();
  });

  test('It receives a 400 status if requesting without a valid adventure type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/adventures',
      payload: {
        adventureTypeId: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  test('It receives an adventure id when POSTing /adventures', async () => {
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const requestedAdventureType = adventureTypes[0];

    const response = await app.inject({
      method: 'POST',
      url: '/adventures',
      payload: {
        adventureTypeId: requestedAdventureType.id,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.json()).toHaveProperty('adventure');
  });

  test('It receives a 503 response when reaching the limit of POSTing /adventures', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const requestedAdventureType = adventureTypes[0];

    const response = await app.inject({
      method: 'POST',
      url: '/adventures',
      payload: {
        adventureTypeId: requestedAdventureType.id,
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['retry-after']).toBeDefined();
  });
});

describe('Adventures Gameplay Injection Tests', () => {
  const app = build({
    logger: false,
    adventureHourlyRate: 1,
    connectionString: TEST_DATABASE_URL,
  });
  const db = new TestDbClient(TEST_DATABASE_URL);
  afterAll(() => {
    app.close();
    db.close();
  });

  test('It receives a 400 if adventure id is not valid', async () => {
    // DB is empty
    const response = await app.inject({
      method: 'POST',
      url: `/adventures/00000000-0000-0000-0000-000000000000/forth`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe('Invalid Adventure Type');
  });

  test('It receives a 400 if adventure is no longer active', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const adventureType = adventureTypes[0];

    const adventure = await db.createAdventure(adventureType.id, false);

    const response = await app.inject({
      method: 'POST',
      url: `/adventures/${adventure.id}/forth`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  test('It receives the first chapter if adventure is brand new', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['chapter_choices', 'chapters', 'adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const adventureType = adventureTypes[0];

    const adventure = await db.createAdventure(adventureType.id, true);

    const response = await app.inject({
      method: 'POST',
      url: `/adventures/${adventure.id}/forth`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    const data = response.json();
    expect(data).toHaveProperty('chapterNumber');
    expect(data).toHaveProperty('narrative');
    expect(data).toHaveProperty('choices');
    expect(data.chapterNumber).toBe(1);
    expect(data.narrative).toBe('the initial chapter goes here!');
    expect(data.choices.length).toBe(3);
    expect(data.choices.every((c) => c.id)).toBe(true);
    expect(data.choices.every((c) => c.action.length > 0)).toBe(true);
  });

  test('It receives the next chapter if adventure has begun', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['chapter_choices', 'chapters', 'adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const adventureType = adventureTypes[0];

    const adventure = await db.createAdventure(adventureType.id, true);
    const chapter = await db.createChapter(
      adventure.id,
      1,
      'the initial chapter goes here',
      'an epic adventure has ensued',
    );

    const response = await app.inject({
      method: 'POST',
      url: `/adventures/${adventure.id}/forth`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    const data = response.json();
    expect(data).toHaveProperty('chapterNumber');
    expect(data).toHaveProperty('narrative');
    expect(data).toHaveProperty('choices');
    expect(data.chapterNumber).toBe(2);
    expect(data.narrative).toBe('a new chapter goes here!');
    expect(data.choices.length).toBe(3);
    expect(data.choices.every((c) => c.id)).toBe(true);
    expect(data.choices.every((c) => c.action.length > 0)).toBe(true);
  });
});
