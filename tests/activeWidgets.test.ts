import { describe, it, expect } from 'vitest';
import type { Component } from '@/lib/types';
import { getActiveWidgets } from '@/lib/categoryHelpers';

function makeComponent(overrides: Partial<Component> = {}): Component {
  return { id: 'c1', name: 'C', category: 'component', instances: [], tasks: [], ...overrides };
}

describe('getActiveWidgets — blocs forcés quand des données existent', () => {
  it('ajoute Ressources et Composants utilisés si les données existent sans le bloc', () => {
    const item = makeComponent({
      widgets: [{ id: 'tasks', type: 'tasks' }],
      assets: [{ id: 'a', name: 'Flèche', filename: 'a.svg' }],
      instances: [{ id: 'i', componentId: 'c2' }],
    });
    expect(getActiveWidgets(item).map((w) => w.type)).toEqual(['tasks', 'instances', 'resources']);
  });

  it("n'ajoute rien sans données, et ne duplique pas un bloc déjà présent", () => {
    expect(getActiveWidgets(makeComponent({ widgets: [{ id: 'tasks', type: 'tasks' }] })).map((w) => w.type)).toEqual(['tasks']);
    const item = makeComponent({ widgets: [{ id: 'resources', type: 'resources' }], assets: [{ id: 'a', name: 'F', filename: 'a.svg' }] });
    expect(getActiveWidgets(item)).toHaveLength(1);
  });
});
