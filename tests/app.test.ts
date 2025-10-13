import { describe, expect, test, afterAll, onTestFinished } from 'vitest';
import build from '../src/app';
import TestDbClient from './TestDbClient';
import mockGenerativeAIPlugin from './mockGenerativeAIService';
import type { FastifyPluginAsync } from 'fastify';
import * as vitestTypes from './vitest'; // meta type definitions for test environment

const TEST_DATABASE_URL = import.meta.env.TEST_DATABASE_URL;
const TEST_APP_OPTIONS = {
  logger: false,
  adventureHourlyRate: 1,
  connectionString: TEST_DATABASE_URL,
  maxAdventureChapters: 2,
  genAIApiKey: '',
  generativeAIPluginOverride: mockGenerativeAIPlugin as FastifyPluginAsync,
};

describe('Aventure Types Injection Tests', () => {
  const app = build(TEST_APP_OPTIONS);
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
  const app = build(TEST_APP_OPTIONS);
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
  const app = build({ ...TEST_APP_OPTIONS, maxAdventureChapters: 2 });
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

    expect(response.statusCode).toBe(404);
    expect(response.body).toBe('This Adventure Is Lost');
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
    expect(response.body).toBe('This Adventure Has Concluded');
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

  test('It receives a 400 response if no action is supplied when story is underway', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['chapter_choices', 'chapters', 'adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const adventureType = adventureTypes[0];

    const adventure = await db.createAdventure(adventureType.id, true);
    const chapter = await db.createChapter(adventure.id, 1, 'the initial chapter goes here');

    const response = await app.inject({
      method: 'POST',
      url: `/adventures/${adventure.id}/forth`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe('This Adventure Requires A Choice');
  });

  test("It receives a 404 response if the supplied action does not match the latest chapter's", async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['chapter_choices', 'chapters', 'adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const adventureType = adventureTypes[0];

    const adventure = await db.createAdventure(adventureType.id, true);
    const chapter = await db.createChapter(adventure.id, 1, 'the initial chapter goes here');

    const response = await app.inject({
      method: 'POST',
      url: `/adventures/${adventure.id}/forth`,
      payload: {
        choice: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toBe('This Choice Is Lost');
  });

  test('It receives the next chapter if adventure has begun', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['chapter_choices', 'chapters', 'adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const adventureType = adventureTypes[0];

    const adventure = await db.createAdventure(adventureType.id, true);
    const chapter = await db.createChapter(adventure.id, 1, 'the initial chapter goes here');
    const chapterChoice = await db.createChapterChoice(chapter.id, 'a brave action', false);

    const response = await app.inject({
      method: 'POST',
      url: `/adventures/${adventure.id}/forth`,
      payload: {
        choice: chapterChoice.id,
      },
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

    // Check that choice is now flagged as chosen
    const updatedChapterChoice = await db.getChapterChoice(chapterChoice.id);
    expect(updatedChapterChoice.chosen).toBe(true);

    // Check that adventure is still flagged as active
    const updatedAdventure = await db.getAdventure(adventure.id);
    expect(updatedAdventure.active).toBe(true);
    expect(updatedAdventure.last_modified).toBeNull();
  });

  test('It receives no choices for the final chapter', async () => {
    onTestFinished(async () => {
      await db.cleanupTables(['chapter_choices', 'chapters', 'adventures']);
    });
    // We retrieve directly from DB
    const adventureTypes = await db.queryAdventureTypes();
    const adventureType = adventureTypes[0];

    const adventure = await db.createAdventure(adventureType.id, true);
    const firstChapter = await db.createChapter(
      adventure.id,
      1,
      'this is the first choice chapter',
    );
    await db.createChapterChoice(firstChapter.id, 'a brave action', true);
    const chapter = await db.createChapter(adventure.id, 2, 'this is the final choice chapter');
    const chapterChoice = await db.createChapterChoice(chapter.id, 'a brave action', false);

    const response = await app.inject({
      method: 'POST',
      url: `/adventures/${adventure.id}/forth`,
      payload: {
        choice: chapterChoice.id,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    const data = response.json();
    expect(data).toHaveProperty('chapterNumber');
    expect(data).toHaveProperty('narrative');
    expect(data).toHaveProperty('choices');
    expect(data.chapterNumber).toBe(3);
    expect(data.narrative).toBe('this is how the story ends!');
    expect(data.choices.length).toBe(0);

    // Check that choice is now flagged as chosen
    const updatedChapterChoice = await db.getChapterChoice(chapterChoice.id);
    expect(updatedChapterChoice.chosen).toBe(true);

    // Check that adventure is now flagged as complete
    const updatedAdventure = await db.getAdventure(adventure.id);
    expect(updatedAdventure.active).toBe(false);
    expect(updatedAdventure.last_modified).not.toBeNull();
  });
});
