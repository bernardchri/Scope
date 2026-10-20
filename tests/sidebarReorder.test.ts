import { describe, it, expect } from 'vitest';
import { computeReorder } from '@/lib/sidebarReorder';
import { Component } from '@/lib/types';

const c = (id: string, category: Component['category']) => ({ id, name: id, category, tasks: [], instances: [] }) as Component;
const list = [c('d1', 'document'), c('t1', 'template'), c('t2', 'template'), c('t3', 'template'), c('k1', 'component')];

describe('computeReorder', () => {
  it('descend un élément dans sa section : après l\'élément survolé', () => {
    expect(computeReorder(list, 't1', 't3')!.orderedIds).toEqual(['d1', 't2', 't3', 't1', 'k1']);
  });

  it('remonte un élément dans sa section : avant l\'élément survolé', () => {
    expect(computeReorder(list, 't3', 't1')!.orderedIds).toEqual(['d1', 't3', 't1', 't2', 'k1']);
  });

  it('change de section avant ou après l\'élément survolé selon la position', () => {
    const before = computeReorder(list, 'k1', 't2', false)!;
    expect(before.orderedIds).toEqual(['d1', 't1', 'k1', 't2', 't3']);
    expect(before.categoryChange).toEqual({ id: 'k1', category: 'template' });
    expect(computeReorder(list, 'k1', 't2', true)!.orderedIds).toEqual(['d1', 't1', 't2', 'k1', 't3']);
  });

  it('dépose en fin de section sur une zone de section, même vide', () => {
    expect(computeReorder(list, 'd1', 'cat:section')!.orderedIds).toEqual(['t1', 't2', 't3', 'd1', 'k1']);
    expect(computeReorder(list, 'd1', 'cat:template')!.orderedIds).toEqual(['t1', 't2', 't3', 'd1', 'k1']);
    expect(computeReorder(list, 'd1', 'cat:template')!.categoryChange?.category).toBe('template');
  });

  it('ignore un dépôt sur soi-même ou sur une cible inconnue', () => {
    expect(computeReorder(list, 't1', 't1')).toBeNull();
    expect(computeReorder(list, 't1', 'inconnu')).toBeNull();
    expect(computeReorder(list, 'inconnu', 't1')).toBeNull();
  });
});
