import { describe, it, expect } from 'vitest';
import { applyFieldOverwrites, diffFigmaFields, FigmaImportPayload } from '@/lib/figmaImport';
import { Component } from '@/lib/types';

const payload = (over: Partial<FigmaImportPayload> = {}): FigmaImportPayload => ({
  name: 'Header', category: 'template', description: 'Desc Figma', fileKey: 'k', groupNodeId: 'g', nodeId: 'n', image: '', pins: [], ...over,
});
const existing = { id: 'c', name: 'En-tête', description: 'Desc SCOPE', category: 'component' } as Component;

describe('diffFigmaFields', () => {
  it('liste les champs qui diffèrent', () => {
    expect(diffFigmaFields(payload(), existing).map((d) => d.field)).toEqual(['name', 'description', 'category']);
  });
  it('ignore les valeurs vides côté Figma et les nouveaux composants', () => {
    expect(diffFigmaFields(payload({ category: '', description: '' , name: 'En-tête'}), existing)).toEqual([]);
    expect(diffFigmaFields(payload(), undefined)).toEqual([]);
  });
  it("n'écrase que les champs cochés", () => {
    const diffs = diffFigmaFields(payload(), existing);
    const out = applyFieldOverwrites({ name: 'En-tête', category: 'component' }, diffs, new Set(['category']));
    expect(out).toEqual({ name: 'En-tête', category: 'template' });
  });
});
