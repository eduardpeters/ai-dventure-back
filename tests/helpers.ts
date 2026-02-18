import { Response } from 'light-my-request';
import { expect } from 'vitest';

const STATUS_OK = 200;

export function isOKResponse(response: Response) {
  expect(response.statusCode).toBe(STATUS_OK);
}

export function isJSONContent(response: Response) {
  expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
}

interface RetrievedAventure {
  id: string;
  setting: string;
  chapters: Chapter[];
}
export function isExpectedAdventureResponse(want: RetrievedAventure, got: RetrievedAventure) {
  expect(got).toHaveProperty('id', want.id);
  expect(got).toHaveProperty('setting');
  expect(got).toHaveProperty('chapters');
}

interface Chapter {
  number: number;
  narrative: string;
  choices: unknown[];
}
export function isExpectedChapterResponse(want: Chapter, got: Chapter) {
  expect(got).toHaveProperty('number', want.number);
  expect(got).toHaveProperty('narrative', want.narrative);
  expect(got).toHaveProperty('choices');
}

interface ChapterChoice {
  id: string;
  action: string;
  chosen: boolean;
}
export function isExpectedChapterChoiceResponse(want: ChapterChoice, got: ChapterChoice) {
  expect(got).toHaveProperty('id', want.id);
  expect(got).toHaveProperty('action', want.action);
  expect(got).toHaveProperty('chosen', want.chosen);
}
