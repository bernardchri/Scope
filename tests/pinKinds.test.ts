import { describe, it, expect } from 'vitest';
import { describePin } from '@/lib/pinKinds';

describe('describePin', () => {
  it('résume type, spécifications et précision', () => {
    expect(describePin({
      kind: 'title',
      specs: { maxLength: '128', editable: 'éditable en backoffice', seo: 'H2' },
      note: 'Une seule ligne sur mobile',
    })).toBe('Titre — max 128 caractères, éditable en backoffice, SEO : H2 — Une seule ligne sur mobile');
  });

  it('gère un pin sans type ni spécification', () => {
    expect(describePin({})).toBe('');
    expect(describePin({ note: 'À préciser' })).toBe('À préciser');
  });
});
