import { Component, ImagePin, Project } from './types';

/** Tâches qui comptent dans l'avancement : celles du périmètre (les évolutions « v2 » en sont exclues, comme du chiffrage). */
export const countedTasks = (component: Pick<Component, 'tasks'>) => (component.tasks ?? []).filter(t => t.scope !== 'v2');

export interface ComponentProgress {
  done: number;
  total: number;
  /** 0 à 1 ; 0 quand aucune tâche n'est planifiée. */
  ratio: number;
}

export function componentProgress(component: Pick<Component, 'tasks'>): ComponentProgress {
  const tasks = countedTasks(component);
  const done = tasks.filter(t => t.completed).length;
  return { done, total: tasks.length, ratio: tasks.length ? done / tasks.length : 0 };
}

export interface ProjectProgress {
  /** Avancement du projet, 0 à 100 (arrondi). */
  percent: number;
  doneTasks: number;
  totalTasks: number;
  /** Heures estimées des éléments terminés au prorata de leurs tâches faites, sur le total estimé. */
  doneHours: number;
  totalHours: number;
  /** Éléments chiffrés qui ont au moins une tâche / éléments chiffrés : ce qui est planifié. */
  plannedElements: number;
  estimatedElements: number;
}

/**
 * Avancement du projet. Chaque élément pèse ses heures estimées : un élément de 4 h à moitié fait vaut 2 h faites.
 * Un élément chiffré sans tâche compte pour 0 (rien n'est fait de ce qui n'est pas planifié). Sans aucune estimation,
 * on retombe sur la part de tâches faites.
 */
export function projectProgress(project: Pick<Project, 'components'>): ProjectProgress {
  const estimated = project.components.filter(c => (c.estimatedHours ?? 0) > 0);
  const totalHours = estimated.reduce((acc, c) => acc + (c.estimatedHours ?? 0), 0);
  const doneHours = estimated.reduce((acc, c) => acc + (c.estimatedHours ?? 0) * componentProgress(c).ratio, 0);
  const all = project.components.map(componentProgress);
  const doneTasks = all.reduce((acc, p) => acc + p.done, 0);
  const totalTasks = all.reduce((acc, p) => acc + p.total, 0);
  const ratio = totalHours > 0 ? doneHours / totalHours : totalTasks > 0 ? doneTasks / totalTasks : 0;
  return {
    percent: Math.round(ratio * 100),
    doneTasks,
    totalTasks,
    doneHours: Math.round(doneHours * 10) / 10,
    totalHours,
    plannedElements: estimated.filter(c => countedTasks(c).length > 0).length,
    estimatedElements: estimated.length,
  };
}

export type PinState = 'none' | 'todo' | 'partial' | 'done';

/** État d'un pin d'après les tâches qui lui sont liées : aucune, à faire, en cours, fait. */
export function pinState(component: Pick<Component, 'tasks'>, pin: Pick<ImagePin, 'id'>): PinState {
  const linked = (component.tasks ?? []).filter(t => t.pinRef?.pinId === pin.id && t.scope !== 'v2');
  if (linked.length === 0) return 'none';
  const done = linked.filter(t => t.completed).length;
  return done === linked.length ? 'done' : done > 0 ? 'partial' : 'todo';
}

export const progressLabel = (p: ComponentProgress) => `${p.done}/${p.total} · ${Math.round(p.ratio * 100)} %`;
