import { Collection, ImagePin } from './types';

export function findCollection(collections: Collection[] | undefined, id?: string): Collection | undefined {
  return id ? collections?.find((c) => c.id === id) : undefined;
}

export function findField(collections: Collection[] | undefined, ref?: { collectionId: string; fieldId: string }) {
  const collection = findCollection(collections, ref?.collectionId);
  const field = collection?.fields.find((f) => f.id === ref?.fieldId);
  return collection && field ? { collection, field } : undefined;
}

/** Lien d'un pin avec le modèle de contenu : « collection « Projets » » / « champ « titre » de la collection « Projets » ». */
export function describePinContent(pin: Pick<ImagePin, 'collectionId' | 'fieldRef'>, collections?: Collection[]): string {
  const list = findCollection(collections, pin.collectionId);
  if (list) return `entrées de la collection « ${list.name} »`;
  const ref = findField(collections, pin.fieldRef);
  if (ref) return `champ « ${ref.field.name} » de la collection « ${ref.collection.name} »`;
  return '';
}

