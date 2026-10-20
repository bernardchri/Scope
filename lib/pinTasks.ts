import { Component, ImagePin, Task } from './types';
import { getPinKind } from './pinKinds';

/** Types de pin dont le travail est du côté données/serveur plutôt que de l'intégration. */
const BACKEND_KINDS = ['list', 'relation', 'repeater', 'category', 'form'];

export const pinTaskCategory = (pin: ImagePin): Task['category'] =>
  BACKEND_KINDS.includes(pin.kind ?? '') ? 'backend' : 'frontend';

/** Intitulé de la tâche d'un pin : « Intégrer « header » » s'il est relié à un composant, sinon son nom, son type ou son numéro. */
export function pinTaskName(component: Component, pin: ImagePin, allComponents: Component[]): string {
  const instance = component.instances.find(i => i.pinRef?.pinId === pin.id);
  const linked = instance ? allComponents.find(c => c.id === instance.componentId) : undefined;
  if (linked) return `Intégrer « ${linked.name} »`;
  return pin.label?.trim() || getPinKind(pin.kind)?.label || `Pin #${pin.number}`;
}

/**
 * Rapproche les tâches des pins : tout pin a sa tâche (sauf `noTask`), et une tâche automatique dont le pin a disparu
 * s'en va (si elle n'est pas faite ; sinon elle reste, détachée). Les éléments inchangés gardent leur identité.
 */
export function reconcilePinTasks(components: Component[]): { components: Component[]; added: number; removed: number } {
  let added = 0;
  let removed = 0;
  const next = components.map(component => {
    const pins = (component.images ?? []).flatMap(img => (img.pins ?? []).map(pin => ({ imageId: img.id, pin })));
    const pinIds = new Set(pins.map(p => p.pin.id));

    let tasks = component.tasks.flatMap<Task>(task => {
      if (!task.auto || !task.pinRef || pinIds.has(task.pinRef.pinId)) return [task];
      if (!task.completed) { removed++; return []; }
      return [{ ...task, pinRef: undefined, auto: undefined }];
    });

    const linked = new Set(tasks.map(t => t.pinRef?.pinId).filter(Boolean));
    const taken = new Set(tasks.map(t => t.name.toLowerCase()));
    const created: Task[] = [];
    for (const { imageId, pin } of pins) {
      if (pin.noTask || linked.has(pin.id)) continue;
      let name = pinTaskName(component, pin, components);
      if (taken.has(name.toLowerCase())) name = `${name} (pin #${pin.number})`;
      taken.add(name.toLowerCase());
      created.push({
        id: crypto.randomUUID(), name, completed: false, category: pinTaskCategory(pin),
        pinRef: { imageId, pinId: pin.id, pinNumber: pin.number }, auto: true,
      });
    }
    added += created.length;
    tasks = [...tasks, ...created];

    const changed = created.length > 0 || tasks.length !== component.tasks.length || tasks.some((t, i) => t !== component.tasks[i]);
    return changed ? { ...component, tasks } : component;
  });
  return { components: added || removed || next.some((c, i) => c !== components[i]) ? next : components, added, removed };
}

/** Pins qui n'ont pas encore leur tâche (hors `noTask`) : ce que la première activation va créer. */
export function pinsWithoutTask(components: Component[]): number {
  return reconcilePinTasks(components).added;
}

/**
 * Supprimer la tâche d'un pin, c'est dire que ce pin n'est pas une tâche : sans cela, la tâche reviendrait aussitôt.
 * (Les autres tâches liées au même pin, s'il y en a, le gardent « tâche ».)
 */
export function optOutPinOfDeletedTask(component: Component, taskId: string): Component {
  const deleted = component.tasks.find(t => t.id === taskId);
  const tasks = component.tasks.filter(t => t.id !== taskId);
  const pinId = deleted?.pinRef?.pinId;
  if (!pinId || tasks.some(t => t.pinRef?.pinId === pinId)) return { ...component, tasks };
  return {
    ...component,
    tasks,
    images: (component.images ?? []).map(img =>
      (img.pins ?? []).some(p => p.id === pinId)
        ? { ...img, pins: img.pins!.map(p => (p.id === pinId ? { ...p, noTask: true } : p)) }
        : img,
    ),
  };
}

/** Marque un pin « n'est pas une tâche » (ou l'inverse) : les tâches non faites qui lui sont liées sont retirées. */
export function setPinNoTask(component: Component, pinId: string, noTask: boolean): Component {
  return {
    ...component,
    images: (component.images ?? []).map(img =>
      (img.pins ?? []).some(p => p.id === pinId)
        ? { ...img, pins: img.pins!.map(p => (p.id === pinId ? { ...p, noTask: noTask || undefined } : p)) }
        : img,
    ),
    tasks: noTask ? component.tasks.filter(t => t.pinRef?.pinId !== pinId || t.completed) : component.tasks,
  };
}
