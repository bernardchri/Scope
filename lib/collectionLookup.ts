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

/** Lien d'un pin avec le modèle de contenu : « collection « Projets » » / « champ « titre » de la collection « Projets » ». */
export function describePinContent(pin: Pick<ImagePin, 'collectionId' | 'fieldRef'>, collections?: Collection[]): string {
  const list = findCollection(collections, pin.collectionId);
  if (list) return `entrées de la collection « ${list.name} »`;
  const ref = findField(collections, pin.fieldRef);
  if (ref) return `champ « ${ref.path} » de la collection « ${ref.collection.name} »`;
  return '';
}

