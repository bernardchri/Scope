import { describe, it, expect } from 'vitest';
import { componentProgress, pinState, projectProgress } from '@/lib/progress';
import type { Component } from '@/lib/types';

const task = (id: string, completed: boolean, extra: Partial<Component['tasks'][number]> = {}) =>
  ({ id, name: id, completed, category: 'frontend' as const, ...extra });
const comp = (id: string, estimatedHours: number | undefined, tasks: Component['tasks']) =>
  ({ id, name: id, category: 'section', estimatedHours, tasks, instances: [] }) as Component;

describe('avancement', () => {
  it('compte les tâches du périmètre, pas les évolutions v2', () => {
    const p = componentProgress(comp('a', 4, [task('1', true), task('2', false), task('3', false, { scope: 'v2' })]));
    expect(p).toEqual({ done: 1, total: 2, ratio: 0.5 });
    expect(componentProgress(comp('b', 4, [])).ratio).toBe(0);
  });

  it('pondère chaque élément par ses heures estimées', () => {
    const progress = projectProgress({
      components: [
        comp('grand', 6, [task('1', true), task('2', true)]),         // 100 % de 6 h
        comp('moyen', 4, [task('1', true), task('2', false)]),        // 50 % de 4 h
        comp('sans-tache', 2, []),                                    // chiffré mais pas planifié : 0 % de 2 h
        comp('doc', undefined, [task('1', true)]),                    // sans heures : ne pèse pas
      ],
    });
    expect(progress.totalHours).toBe(12);
    expect(progress.doneHours).toBe(8);
    expect(progress.percent).toBe(67);
    expect(progress.plannedElements).toBe(2);
    expect(progress.estimatedElements).toBe(3);
    expect(progress.doneTasks).toBe(4);
    expect(progress.totalTasks).toBe(5);
  });

  it('sans estimation, retombe sur la part de tâches faites', () => {
    const p = projectProgress({ components: [comp('a', undefined, [task('1', true), task('2', false), task('3', false), task('4', false)])] });
    expect(p.percent).toBe(25);
    expect(projectProgress({ components: [] }).percent).toBe(0);
  });

  it('déduit l\'état d\'un pin de ses tâches liées', () => {
    const link = (pinId: string) => ({ pinRef: { imageId: 'i', pinId, pinNumber: 1 } });
    const c = comp('a', 1, [
      task('1', true, link('p-done')), task('2', true, link('p-partial')), task('3', false, link('p-partial')),
      task('4', false, link('p-todo')), task('5', false, { ...link('p-v2'), scope: 'v2' }),
    ]);
    expect(pinState(c, { id: 'p-done' })).toBe('done');
    expect(pinState(c, { id: 'p-partial' })).toBe('partial');
    expect(pinState(c, { id: 'p-todo' })).toBe('todo');
    expect(pinState(c, { id: 'p-v2' })).toBe('none');
    expect(pinState(c, { id: 'inconnu' })).toBe('none');
  });
});
