import { Collection, Component, ImagePin, Project } from './types';
import { findCollection, flattenFields } from './collectionLookup';

export interface CompletenessIssue {
  id: string;
  level: 'warning' | 'info';
  message: string;
  /** Composant à ouvrir pour corriger. */
  componentId?: string;
  /** Collection à ouvrir pour corriger. */
  collectionId?: string;
}

/** Un pin est « qualifié » dès qu'il a un type, une précision, ou un lien (composant, tâche, collection, champ). */
export function isPinQualified(pin: ImagePin, component: Component): boolean {
  return !!(
    pin.kind ||
    pin.note?.trim() ||
    pin.collectionId ||
    pin.fieldRef ||
    component.instances.some((i) => i.pinRef?.pinId === pin.id) ||
    component.tasks.some((t) => t.pinRef?.pinId === pin.id)
  );
}

/** Pins d'un composant qu'il reste à préciser. */
export function unqualifiedPins(component: Component): ImagePin[] {
  return (component.images ?? []).flatMap((img) => (img.pins ?? []).filter((p) => !isPinQualified(p, component)));
}

/** Incohérences et oublis du projet : pins à préciser, modèle de contenu incomplet ou cassé. */
export function findCompletenessIssues(project: Pick<Project, 'components' | 'collections'>): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  const collections = project.collections ?? [];

  for (const comp of project.components) {
    const open = unqualifiedPins(comp);
    if (open.length > 0) {
      issues.push({
        id: `pins-${comp.id}`,
        level: 'warning',
        message: `${comp.name} : ${open.length} pin${open.length > 1 ? 's' : ''} à préciser (${open.map((p) => `#${p.number}`).join(', ')})`,
        componentId: comp.id,
      });
    }
    for (const pin of (comp.images ?? []).flatMap((i) => i.pins ?? [])) {
      const needsCollection = pin.kind === 'list' || pin.kind === 'relation';
      if (needsCollection && !pin.collectionId) {
        issues.push({
          id: `pin-nocoll-${pin.id}`,
          level: 'warning',
          message: `${comp.name} : le pin #${pin.number} (${pin.kind === 'list' ? 'liste' : 'relation'}) n'a pas de collection`,
          componentId: comp.id,
        });
      }
      const dangling =
        (pin.collectionId && !findCollection(collections, pin.collectionId)) ||
        (pin.fieldRef && !findCollection(collections, pin.fieldRef.collectionId)) ||
        (pin.fieldRef && !flattenFields(findCollection(collections, pin.fieldRef.collectionId)?.fields ?? []).some((f) => f.field.id === pin.fieldRef!.fieldId));
      if (dangling) {
        issues.push({
          id: `pin-dangling-${pin.id}`,
          level: 'warning',
          message: `${comp.name} : le pin #${pin.number} renvoie à une collection ou un champ supprimé`,
          componentId: comp.id,
        });
      }
    }
  }

  for (const c of collections) {
    if (c.fields.length === 0) {
      issues.push({ id: `coll-empty-${c.id}`, level: 'warning', message: `Collection « ${c.name} » : aucun champ`, collectionId: c.id });
    }
    for (const { field, path } of flattenFields(c.fields)) {
      const where = `Collection « ${c.name} » › ${path}`;
      if (!field.name.trim()) {
        issues.push({ id: `field-noname-${field.id}`, level: 'warning', message: `Collection « ${c.name} » : un champ n'a pas de nom`, collectionId: c.id });
      }
      if (field.kind === 'relation' && !findCollection(collections, field.relationTo)) {
        issues.push({ id: `field-reltarget-${field.id}`, level: 'warning', message: `${where} : relation sans collection cible`, collectionId: c.id });
      }
      if (field.kind === 'repeater' && !(field.subFields?.length)) {
        issues.push({ id: `field-repeater-${field.id}`, level: 'warning', message: `${where} : répéteur sans sous-champ`, collectionId: c.id });
      }
    }
    if (!usedAnywhere(c, collections, project.components)) {
      issues.push({ id: `coll-unused-${c.id}`, level: 'info', message: `Collection « ${c.name} » : aucun pin ni relation ne l'utilise`, collectionId: c.id });
    }
  }

  return issues;
}

function usedAnywhere(c: Collection, collections: Collection[], components: Component[]): boolean {
  const byPin = components.some((comp) =>
    (comp.images ?? []).some((img) =>
      (img.pins ?? []).some((p) => p.collectionId === c.id || p.fieldRef?.collectionId === c.id)
    )
  );
  const byRelation = collections.some((o) => o.id !== c.id && flattenFields(o.fields).some((f) => f.field.relationTo === c.id));
  return byPin || byRelation;
}
