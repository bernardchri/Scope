import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(), open: vi.fn() }));

import { createCollection, describeField, generateContentModelMd } from '@/lib/collections';
import { describePin } from '@/lib/pinKinds';
import { Collection } from '@/lib/types';

const projets: Collection = {
  id: 'p', name: 'Projets', slug: 'projet', hasDetailPage: true,
  fields: [
    { id: 'f1', name: 'titre', kind: 'title', specs: { maxLength: '128', seo: 'H2' }, required: true },
    { id: 'f2', name: 'categories', kind: 'relation', relationTo: 'c', multiple: true },
  ],
};
const categories: Collection = { id: 'c', name: 'Catégories', slug: 'categorie', fields: [] };

describe('collections', () => {
  it('crée un slug unique', () => {
    expect(createCollection('Équipe & co', [{ ...categories, slug: 'equipe-co' }]).slug).toBe('equipe-co-2');
  });

  it('décrit un champ et une relation', () => {
    expect(describeField(projets.fields[0])).toBe('Titre, max 128 caractères, SEO : H2, obligatoire');
    expect(describeField(projets.fields[1], [projets, categories])).toBe('Relation → Catégories (plusieurs)');
  });

  it('relie un pin à une collection ou à un champ', () => {
    const all = [projets, categories];
    expect(describePin({ kind: 'list', collectionId: 'p' }, all)).toBe('Liste — entrées de la collection « Projets »');
    expect(describePin({ kind: 'title', fieldRef: { collectionId: 'p', fieldId: 'f1' } }, all))
      .toBe('Titre — champ « titre » de la collection « Projets »');
    expect(describePin({ kind: 'list', collectionId: 'absente' }, all)).toBe('Liste');
  });

  it('génère le modèle de contenu', () => {
    const md = generateContentModelMd([projets, categories]);
    expect(md).toContain('### Collection « Projets » (`projet`)');
    expect(md).toContain('Chaque entrée a sa propre page de détail.');
    expect(md).toContain('- `titre` — Titre, max 128 caractères, SEO : H2, obligatoire');
    expect(generateContentModelMd([])).toBe('');
  });
});
