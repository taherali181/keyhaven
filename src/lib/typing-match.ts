// Letters with accents (é, ï, ñ…) aren't on every keyboard. Typing the plain letter counts as typing the accented one.

/** The letter without its accent marks: "é" → "e", "Ï" → "I". Characters without marks come back unchanged. */
export const withoutAccents = (character: string) => character.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** What a key press stands for at this point in the text: the text's own accented letter when the plain one is typed. */
export function acceptedKey(key: string, expected: string | undefined): string {
  if (!expected || key === expected || key.length !== 1) return key;
  const plain = withoutAccents(expected);
  return plain !== expected && plain === key ? expected : key;
}
