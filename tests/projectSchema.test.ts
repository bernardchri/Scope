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

  it('preserves task pinRef, scope and image pins/crop', () => {
    const { project, issues } = parseProject({
      ...base,
      hourlyRate: 60,
      budgetCap: 5000,
      client: { name: 'ACME' },
      components: [
        {
          id: 'c1',
          name: 'a',
          category: 'template',
          instances: [{ id: 'i1', componentId: 'c2', pinRef: { imageId: 'im1', pinId: 'p9', pinNumber: 2 } }],
          images: [
            {
              id: 'im1',
              filename: 'im1.png',
              isPrimary: true,
              pins: [{ id: 'p9', number: 2, x: 10, y: 20 }],
              crop: { x: 0, y: 0, width: 50, height: 50 },
            },
          ],
          tasks: [
            { id: 't1', name: 'todo', completed: false, category: 'backend', scope: 'v2',
              pinRef: { imageId: 'im1', pinId: 'p9', pinNumber: 2 } },
          ],
          widgets: [{ id: 'w1', type: 'images' }],
        },
      ],
    });
    expect(issues).toEqual([]);
    const c = project!.components[0];
    expect(c.tasks[0].pinRef).toEqual({ imageId: 'im1', pinId: 'p9', pinNumber: 2 });
    expect(c.tasks[0].scope).toBe('v2');
    expect(c.images![0].pins).toHaveLength(1);
    expect(c.images![0].crop).toEqual({ x: 0, y: 0, width: 50, height: 50 });
    expect(c.instances[0].pinRef?.pinNumber).toBe(2);
    expect(project!.hourlyRate).toBe(60);
    expect(project!.budgetCap).toBe(5000);
    expect(project!.client?.name).toBe('ACME');
  });
});
