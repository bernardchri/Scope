import { describe, it, expect } from 'vitest';
import { parseProject } from '@/lib/projectSchema';

const base = {
  id: 'p1',
  name: 'Projet',
  createdAt: '2024-01-01',
  components: [],
};

describe('parseProject', () => {
  it('accepts a valid project unchanged', () => {
    const { project, issues } = parseProject(base);
    expect(project?.id).toBe('p1');
    expect(issues).toEqual([]);
  });

  it('rejects a project without id/name', () => {
    expect(parseProject({ createdAt: 'x', components: [] }).project).toBeNull();
    expect(parseProject(null).project).toBeNull();
  });

  it('repairs an unknown component category to "component"', () => {
    const { project } = parseProject({
      ...base,
      components: [{ id: 'c1', name: 'a', category: 'molecule', tasks: [], instances: [] }],
    });
    expect(project?.components[0].category).toBe('component');
  });

  it('drops invalid components and reports it', () => {
    const { project, issues } = parseProject({
      ...base,
      components: [
        { id: 'c1', name: 'ok', category: 'component', tasks: [], instances: [] },
        { name: 'no-id' },
        42,
      ],
    });
    expect(project?.components).toHaveLength(1);
    expect(issues[0]).toMatch(/2 composant/);
  });

  it('coerces broken scalar fields instead of failing', () => {
    const { project } = parseProject({
      ...base,
      components: [
        {
          id: 'c1',
          name: 'a',
          category: 'component',
          instances: [],
          tasks: [{ id: 't1', name: 'x', completed: 'yes', category: 'wat' }],
        },
      ],
    });
    const task = project?.components[0].tasks[0];
    expect(task?.completed).toBe(false);
    expect(task?.category).toBe('frontend');
  });

  it('tolerates a future formatVersion', () => {
    const { project } = parseProject({ ...base, formatVersion: 99 });
    expect(project?.formatVersion).toBe(99);
  });
});
