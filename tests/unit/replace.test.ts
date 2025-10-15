import { describe, expect, test } from 'vitest';
import replace from '../../src/utils/replace';

describe('Text placeholder replacement tests', () => {
  test('It returns the same text if there are no placeholders', () => {
    const inputText = 'This is a bit of text';
    const replacements = {};
    const wanted = inputText;

    const output = replace(inputText, replacements);

    expect(output).toEqual(wanted);
  });

  test('It returns the same text if there are placeholders, but no matches in mapping', () => {
    const inputText = 'This is a bit of %notReplaced% text';
    const replacements = {};
    const wanted = inputText;

    const output = replace(inputText, replacements);

    expect(output).toEqual(wanted);
  });

  test('It returns a replaced text when a placeholder matches a replacement mapping', () => {
    const inputText = 'This is a bit of %replace% text';
    const replacements = { '%replace%': 'different' };
    const wanted = 'This is a bit of different text';

    const output = replace(inputText, replacements);

    expect(output).toEqual(wanted);
  });

  test('It returns the same text for unterminated placeholders', () => {
    const inputText = 'This is a bit of %replace text ending%';
    const replacements = { '%replace%': 'different' };
    const wanted = inputText;

    const output = replace(inputText, replacements);

    expect(output).toEqual(wanted);
  });

  test('It does not replace placeholders with spaces inside', () => {
    const inputText = 'This is a bit of %replace this bit% text';
    const replacements = { '%replace this bit%': 'different' };
    const wanted = inputText;

    const output = replace(inputText, replacements);

    expect(output).toEqual(wanted);
  });
});
