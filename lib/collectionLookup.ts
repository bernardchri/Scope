import { Collection, CollectionField, ImagePin } from './types';

export function findCollection(collections: Collection[] | undefined, id?: string): Collection | undefined {
  return id ? collections?.find((c) => c.id === id) : undefined;
}

/** Champs d'une collection à plat, sous-champs de répéteur compris, avec leur chemin (« galerie › image »). */
export function flattenFields(fields: CollectionField[], parents: string[] = []): { field: CollectionField; path: string; depth: number }[] {
  return fields.flatMap((field) => {
    const names = [...parents, field.name || 'sans nom'];
    return [
      { field, path: names.join(' › '), depth: parents.length },
      ...flattenFields(field.subFields ?? [], names),
    ];
  });
}

export function findField(collections: Collection[] | undefined, ref?: { collectionId: string; fieldId: string }) {
  const collection = findCollection(collections, ref?.collectionId);
  const found = collection && flattenFields(collection.fields).find((f) => f.field.id === ref?.fieldId);
  return collection && found ? { collection, field: found.field, path: found.path } : undefined;
}

/** Ancre HTML d'une collection dans l'export Markdown. */
export const collectionAnchor = (c: Pick<Collection, 'slug'>) => `collection-${c.slug}`;

/** Lien Markdown vers une collection (`base` = fichier qui contient le modèle de contenu, vide si c'est le même). */
export const collectionLink = (c: Collection, base = '') => `[${c.name}](${base}#${collectionAnchor(c)})`;

/**
 * Lien d'un pin avec le modèle de contenu : « collection « Projets » » / « champ « titre » de la collection « Projets » ».
 * `link` transforme le nom d'une collection en lien (export Markdown) ; une référence orpheline est signalée.
 */
export function describePinContent(
  pin: Pick<ImagePin, 'collectionId' | 'fieldRef'>,
  collections?: Collection[],
  link?: (c: Collection) => string,
): string {
  const name = (c: Collection) => (link ? link(c) : `« ${c.name} »`);
  if (pin.collectionId) {
    const list = findCollection(collections, pin.collectionId);
    return list ? `entrées de la collection ${name(list)}` : 'collection supprimée (à relier)';
  }
  if (pin.fieldRef) {
    const ref = findField(collections, pin.fieldRef);
    return ref ? `champ « ${ref.path} » de la collection ${name(ref.collection)}` : 'champ supprimé (à relier)';
  }
  return '';
}

