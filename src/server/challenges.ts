import { COMMON_WORDS_200 } from '@/data/word-lists';

export function seededRandom(seed: string) {
  let value = [...seed].reduce((total, character) => Math.imul(total ^ character.charCodeAt(0), 2654435761), 2166136261) >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function challengeText(seed: string, count: number) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => COMMON_WORDS_200[Math.floor(random() * COMMON_WORDS_200.length)]).join(' ');
}
