import { describe, it, expect, vi } from 'vitest';
import type { Component, Project } from '@/lib/types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(), open: vi.fn(), ask: vi.fn() }));

import { optOutPinOfDeletedTask, pinsWithoutTask, reconcilePinTasks, setPinNoTask } from '@/lib/pinTasks';
import { runMcpCommand } from '@/lib/mcpCommands';

const pin = (id: string, number: number, extra: Record<string, unknown> = {}) => ({ id, number, x: 10, y: 10, ...extra });
const comp = (extra: Partial<Component> = {}): Component => ({
  id: 'c', name: 'Accueil', category: 'template', tasks: [], instances: [],
  images: [{ id: 'img', isPrimary: true, pins: [pin('p1', 1, { label: 'Titre du hero', kind: 'title' }), pin('p2', 2, { kind: 'list' }), pin('p3', 3)] }],
  ...extra,
}) as Component;

describe('un pin = une tâche', () => {
  it('crée une tâche automatique par pin, nommée d\'après lui, avec la bonne catégorie', () => {
    const header = { id: 'h', name: 'Header', category: 'section', tasks: [], instances: [] } as Component;
    const home = comp({ instances: [{ id: 'i', componentId: 'h', pinRef: { imageId: 'img', pinId: 'p3', pinNumber: 3 } }] });
    const { components, added } = reconcilePinTasks([home, header]);
    expect(added).toBe(3);
    const tasks = components[0].tasks;
    expect(tasks.map(t => [t.name, t.category, t.auto, t.pinRef?.pinNumber])).toEqual([
      ['Titre du hero', 'frontend', true, 1],
      ['Liste', 'backend', true, 2],
      ['Intégrer « Header »', 'frontend', true, 3],
    ]);
    expect(components[1]).toBe(header); // inchangé : même objet
  });

  it('est stable : une seconde passe ne crée rien', () => {
    const once = reconcilePinTasks([comp()]).components;
    const twice = reconcilePinTasks(once);
    expect(twice.added).toBe(0);
    expect(twice.components).toBe(once);
  });

  it('ne recrée pas la tâche d\'un pin qui n\'en est pas une, et respecte les tâches existantes', () => {
    const c = comp({
      images: [{ id: 'img', isPrimary: true, pins: [pin('p1', 1, { noTask: true }), pin('p2', 2), pin('p3', 3)] }] as Component['images'],
      tasks: [{ id: 't', name: 'Déjà là', completed: false, category: 'frontend', pinRef: { imageId: 'img', pinId: 'p2', pinNumber: 2 } }],
    });
    const { components, added } = reconcilePinTasks([c]);
    expect(added).toBe(1);
    expect(components[0].tasks.map(t => t.name)).toEqual(['Déjà là', 'Pin #3']);
    expect(pinsWithoutTask([c])).toBe(1);
  });

  it('distingue deux tâches de même nom', () => {
    const c = comp({ images: [{ id: 'img', isPrimary: true, pins: [pin('p1', 1, { kind: 'button' }), pin('p2', 2, { kind: 'button' })] }] as Component['images'] });
    expect(reconcilePinTasks([c]).components[0].tasks.map(t => t.name)).toEqual(['Bouton', 'Bouton (pin #2)']);
  });

  it('retire la tâche automatique d\'un pin supprimé, sauf si elle est faite (alors elle reste, détachée)', () => {
    const auto = (id: string, pinId: string, completed: boolean) =>
      ({ id, name: id, completed, category: 'frontend' as const, auto: true, pinRef: { imageId: 'img', pinId, pinNumber: 1 } });
    const c = comp({
      images: [{ id: 'img', isPrimary: true, pins: [] }] as Component['images'],
      tasks: [auto('a', 'gone1', false), auto('b', 'gone2', true), { id: 'manuelle', name: 'Manuelle', completed: false, category: 'seo', pinRef: { imageId: 'img', pinId: 'gone3', pinNumber: 1 } }],
    });
    const { components, removed } = reconcilePinTasks([c]);
    expect(removed).toBe(1);
    expect(components[0].tasks.map(t => t.id)).toEqual(['b', 'manuelle']);
    expect(components[0].tasks[0].pinRef).toBeUndefined();
    expect(components[0].tasks[0].auto).toBeUndefined();
    expect(components[0].tasks[1].pinRef).toBeDefined(); // tâche manuelle : intacte
  });

  it('supprimer la tâche d\'un pin le marque « pas une tâche » (elle ne revient pas)', () => {
    const { components } = reconcilePinTasks([comp()]);
    const taskId = components[0].tasks[0].id;
    const after = optOutPinOfDeletedTask(components[0], taskId);
    expect(after.tasks).toHaveLength(2);
    expect(after.images![0].pins!.find(p => p.id === 'p1')!.noTask).toBe(true);
    expect(reconcilePinTasks([after]).added).toBe(0);
  });

  it('« ce n\'est pas une tâche » retire les tâches non faites du pin, et l\'inverse la recrée', () => {
    const { components } = reconcilePinTasks([comp()]);
    const off = setPinNoTask(components[0], 'p1', true);
    expect(off.tasks.some(t => t.pinRef?.pinId === 'p1')).toBe(false);
    expect(off.images![0].pins![0].noTask).toBe(true);
    const on = setPinNoTask(off, 'p1', false);
    expect(on.images![0].pins![0].noTask).toBeUndefined();
    expect(reconcilePinTasks([on]).added).toBe(1);
  });
});

describe('MCP — pin et tâche', () => {
  const project = { id: 'p', name: 'P', createdAt: '', components: [comp()] } as unknown as Project;

  it('isTask:false retire les tâches du pin et le marque', () => {
    const withTasks = { ...project, components: reconcilePinTasks(project.components).components } as Project;
    const out = runMcpCommand(withTasks, 'qualify_pin', { component: 'Accueil', pin: 1, isTask: false });
    expect(out.ok && out.updates.images![0].pins!.find(p => p.number === 1)!.noTask).toBe(true);
    expect(out.ok && out.updates.tasks!.some(t => t.pinRef?.pinNumber === 1)).toBe(false);
  });

  it('supprimer une tâche de pin par MCP marque le pin', () => {
    const { components } = reconcilePinTasks(project.components);
    const taskId = components[0].tasks[0].id;
    const out = runMcpCommand({ ...project, components } as Project, 'delete_task', { component: 'Accueil', task: taskId });
    expect(out.ok && out.updates.images![0].pins!.find(p => p.id === 'p1')!.noTask).toBe(true);
    expect(out.ok && out.updates.tasks).toHaveLength(2);
  });
});
