import { describe, it, expect } from 'vitest';
import { migrateProjectsToV2 } from '@/lib/migrations';
import type { Project } from '@/lib/types';

describe('migrateProjectsToV2', () => {
  it('converts a legacy imageBase64 field into an images[] entry', () => {
    const legacy = {
      id: 'p1',
      name: 'Legacy',
      createdAt: '2024-01-01',
      components: [
        { id: 'c1', name: 'Hero', imageBase64: 'data:image/png;base64,AAAA', tasks: [], instances: [] },
      ],
    } as unknown as Project;

    const [migrated] = migrateProjectsToV2([legacy]);
    const img = migrated.components[0].images?.[0];
    expect(img?.base64).toBe('data:image/png;base64,AAAA');
    expect(img?.isPrimary).toBe(true);
  });

  it('remaps an unknown category to "component" and keeps valid ones', () => {
    const legacy = {
      id: 'p1', name: 'x', createdAt: '2024-01-01',
      components: [
        { id: 'c1', name: 'a', category: 'atom', tasks: [], instances: [] },
        { id: 'c2', name: 'b', category: 'template', tasks: [], instances: [] },
      ],
    } as unknown as Project;

    const [migrated] = migrateProjectsToV2([legacy]);
    expect(migrated.components[0].category).toBe('component');
    expect(migrated.components[1].category).toBe('template');
  });

  it('migrates string[] widgets and content into WidgetInstance[] + notes[]', () => {
    const legacy = {
      id: 'p1', name: 'x', createdAt: '2024-01-01',
      components: [
        { id: 'c1', name: 'a', widgets: ['notes', 'tasks'], content: '# Titre', tasks: [], instances: [] },
      ],
    } as unknown as Project;

    const [migrated] = migrateProjectsToV2([legacy]);
    const comp = migrated.components[0];
    expect(comp.widgets?.map(w => w.type)).toEqual(['notes', 'tasks']);
    const notesWidgetId = comp.widgets?.find(w => w.type === 'notes')?.id;
    expect(comp.notes?.[0]).toEqual({ id: notesWidgetId, content: '# Titre' });
  });

  it('gives every task a default category when missing', () => {
    const legacy = {
      id: 'p1', name: 'x', createdAt: '2024-01-01',
      components: [
        { id: 'c1', name: 'a', tasks: [{ id: 't1', name: 'do', completed: false }], instances: [] },
      ],
    } as unknown as Project;

    const [migrated] = migrateProjectsToV2([legacy]);
    expect(migrated.components[0].tasks[0].category).toBe('frontend');
  });
});
