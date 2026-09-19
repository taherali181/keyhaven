import { describe, expect, it } from 'vitest';
import { acceptedKey, withoutAccents } from '@/lib/typing-match';

describe('typing accented letters', () => {
  it('lets the plain letter stand for an accented one', () => {
    expect(acceptedKey('e', 'é')).toBe('é');
    expect(acceptedKey('i', 'ï')).toBe('ï');
    expect(acceptedKey('N', 'Ñ')).toBe('Ñ');
  });

  it('keeps every other key as typed', () => {
    expect(acceptedKey('é', 'é')).toBe('é');
    expect(acceptedKey('x', 'é')).toBe('x');
    expect(acceptedKey('E', 'é')).toBe('E');
    expect(acceptedKey('e', 'f')).toBe('e');
    expect(acceptedKey('e', undefined)).toBe('e');
  });

  it('strips accents without touching other characters', () => {
    expect(withoutAccents('Yermolaï')).toBe('Yermolai');
    expect(withoutAccents('£')).toBe('£');
  });
});
