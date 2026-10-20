import { describe, it, expect } from 'vitest';
import { figmaNodeUrl, isRealFigmaNodeId } from '@/lib/figmaUrl';

describe('figmaNodeUrl', () => {
  it('construit le lien d\'un vrai node', () => {
    expect(figmaNodeUrl('KEY', '12:345')).toBe('https://www.figma.com/design/KEY?node-id=12-345');
  });

  it('refuse les groupes d\'états fabriqués par le plugin et les données manquantes', () => {
    expect(isRealFigmaNodeId('0:1:accueil')).toBe(false);
    expect(figmaNodeUrl('KEY', '0:1:accueil')).toBeUndefined();
    expect(figmaNodeUrl(undefined, '12:345')).toBeUndefined();
    expect(figmaNodeUrl('KEY', undefined)).toBeUndefined();
  });
});
