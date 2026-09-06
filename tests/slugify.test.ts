import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/persistence';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Mon Projet Web')).toBe('mon-projet-web');
  });

  it('strips accents', () => {
    expect(slugify('Château de Négrepelisse')).toBe('chateau-de-negrepelisse');
  });

  it('removes special characters', () => {
    expect(slugify('Projet #1 : (v2) !')).toBe('projet-1-v2');
  });

  it('collapses repeated separators and trims edges', () => {
    expect(slugify('  --Site__Vitrine--  ')).toBe('site-vitrine');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('§$%*')).toBe('');
  });
});
