import { Component, ComponentImage, ImagePin, ScopeItemType } from './types';
import { saveImageFromBase64, deleteImage } from './imageManager';

export interface FigmaImportPin {
  figmaLayerId: string;
  label: string;
  x: number;
  y: number;
}

/** Payload envoyé par figma-plugin/code.js via POST /import-figma. */
export interface FigmaImportPayload {
  name: string;
  category: string;
  /** Tagué sur le node Figma (scopeCaption) ; vide si jamais renseigné côté Figma. */
  caption?: string;
  /** Description Figma du composant (component set), utilisée comme description SCOPE. */
  description?: string;
  fileKey: string;
  /**
   * Id du composant Figma, stable entre tous ses états/variants (component
   * set, ou le node lui-même hors variant) — sert à retrouver le composant
   * SCOPE cible sans repasser par la liste à chaque état envoyé.
   */
  groupNodeId: string;
  /** Id du node exporté (l'état précis) — matche une ComponentImage donnée. */
  nodeId: string;
  /** PNG en base64 brut (sans préfixe data:). */
  image: string;
  pins: FigmaImportPin[];
  /** true = fait partie d'un "Importer tous les états" — appliqué sans popup de revue. */
  bulk?: boolean;
}

const VALID_CATEGORIES: ScopeItemType[] = ['document', 'component', 'template', 'section'];

export function normalizeFigmaCategory(value: string): ScopeItemType {
  return (VALID_CATEGORIES as string[]).includes(value) ? (value as ScopeItemType) : 'component';
}

export interface FigmaImportResult {
  componentUpdates: Partial<Component>;
  /** id de l'image dans componentUpdates.images dont les pins peuvent contenir des orphelins. */
  imageId: string;
  /** Pins présents avant l'import mais absents du payload (calque supprimé/renommé côté Figma). */
  orphanedPins: ImagePin[];
}

function nextPinNumber(taken: number[]): number {
  return taken.reduce((max, n) => Math.max(max, n), 0) + 1;
}

/**
 * Construit les updates de `Component` pour un import Figma.
 * Si `existing` est fourni, fait un merge différentiel sur l'image déjà liée
 * à ce node (matching par `figmaNodeId`/`figmaLayerId`) : position/label mis
 * à jour, `pinRef` vers Task/Instance préservé, pins orphelins signalés sans
 * être supprimés automatiquement.
 */
export async function applyFigmaImport(
  folderPath: string,
  payload: FigmaImportPayload,
  existing?: Component,
): Promise<FigmaImportResult> {
  const existingImage = existing?.images?.find((img) => img.figmaNodeId === payload.nodeId);
  const existingPins = existingImage?.pins || [];

  const filename = await saveImageFromBase64(folderPath, payload.image, 'png');
  if (existingImage?.filename) {
    await deleteImage(folderPath, existingImage.filename).catch(() => {});
  }

  const incomingIds = new Set(payload.pins.map((p) => p.figmaLayerId));
  const orphanedPins = existingPins.filter((p) => p.figmaLayerId && !incomingIds.has(p.figmaLayerId));

  let nextNumber = nextPinNumber(existingPins.map((p) => p.number));
  const mergedPins: ImagePin[] = payload.pins.map((p) => {
    const match = existingPins.find((ep) => ep.figmaLayerId === p.figmaLayerId);
    if (match) {
      return { ...match, label: p.label, x: p.x, y: p.y };
    }
    return {
      id: crypto.randomUUID(),
      number: nextNumber++,
      x: p.x,
      y: p.y,
      label: p.label,
      figmaLayerId: p.figmaLayerId,
    };
  });

  const allPins = [...mergedPins, ...orphanedPins];

  const newImage: ComponentImage = {
    id: existingImage?.id || crypto.randomUUID(),
    filename,
    caption: payload.caption || existingImage?.caption,
    isPrimary: existingImage?.isPrimary ?? !(existing?.images && existing.images.length > 0),
    pins: allPins.length ? allPins : undefined,
    figmaNodeId: payload.nodeId,
  };

  const images = existingImage
    ? (existing!.images || []).map((img) => (img.id === existingImage.id ? newImage : img))
    : [...(existing?.images || []), newImage];

  const componentUpdates: Partial<Component> = {
    name: payload.name || existing?.name,
    description: payload.description || existing?.description,
    category: normalizeFigmaCategory(payload.category),
    images,
    figmaLink: { fileKey: payload.fileKey, nodeId: payload.groupNodeId, lastSyncAt: new Date().toISOString() },
  };

  return { componentUpdates, imageId: newImage.id, orphanedPins };
}

/**
 * Retire les pins orphelins choisis par l'utilisateur des updates calculés
 * par `applyFigmaImport` (à appeler avant `addComponent`/`updateComponent`
 * si l'utilisateur confirme leur suppression).
 */
export function dropOrphanedPins(
  componentUpdates: Partial<Component>,
  imageId: string,
  pinIdsToRemove: string[],
): Partial<Component> {
  if (!pinIdsToRemove.length || !componentUpdates.images) return componentUpdates;
  const toRemove = new Set(pinIdsToRemove);
  return {
    ...componentUpdates,
    images: componentUpdates.images.map((img) =>
      img.id === imageId
        ? { ...img, pins: (img.pins || []).filter((p) => !toRemove.has(p.id)) }
        : img
    ),
  };
}
