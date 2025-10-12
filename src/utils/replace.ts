type Placeholder = `%${string}%`;
type ReplacementMap = Record<Placeholder, string>;

/**
 * Takes a template text with specified placeholders and replaces them with the provided replacements.
 * Placeholders use % as delimiter: %textToReplace%
 * The replacements are a map with keys being the placeholders and values the text to replace them.
 */
export default function replace(templateText: string, replacements: ReplacementMap): string {
  if (Object.keys(replacements).length === 0) {
    return templateText;
  }
  return templateText.replace(/%\w+%/g, function (match: string) {
    return replacements[match as Placeholder] || match;
  });
}
