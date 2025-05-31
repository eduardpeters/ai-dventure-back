import { describe, expect, test, afterAll } from 'vitest';
import build from '../src/app';

describe('App http injection tests', () => {
  const app = build();
  afterAll(() => app.close());

  test('request the "/" route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.json()).toStrictEqual({ hello: 'world!' });
  });
});
