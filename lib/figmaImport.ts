import { Component, ComponentAsset, ComponentImage, ComponentInstance, ImagePin, ScopeItemType } from './types';
import { saveImageFromBase64, saveSvgFromString, deleteImage } from './imageManager';
import { nextPinNumber } from './pinHelpers';

/**
 * Occurrence d'un composant Figma cochée dans le plugin (liste aplatie de
 * tous les composants de la frame/du groupe exporté, à toute profondeur) —
 * devient un pin sur l'image, relié à un composant SCOPE s'il est retrouvé.
 */
export interface FigmaImportPin {
  /** Id du calque Figma de l'occurrence — clé de fusion des pins entre deux syncs. */
  figmaLayerId: string;
  /** Nom du composant Figma, utilisé comme label si aucun composant SCOPE n'est relié. */
  label: string;
  /** Centre de l'occurrence, en % de l'image. */
  x: number;
  y: number;
  /** Composant SCOPE choisi explicitement dans le plugin (prime sur `groupNodeId`). */
  componentId?: string;
  /** Id du component set (ou du composant hors variant) — matché avec `figmaLink.groupNodeId`. */
  groupNodeId?: string;
}

/** Calque Figma marqué dans le plugin, exporté en SVG. */
export interface FigmaImportSvg {
  figmaLayerId: string;
  name: string;
  /** Code SVG (SVG_STRING de Figma). */
  svg: string;
}

/** Payload envoyé par le plugin Figma (scope-figma-plugin/code.js) via POST /scope-push. */
export interface FigmaImportPayload {
  name: string;
  /** Type tagué dans Figma (scopeType) ; vide si jamais tagué — le type SCOPE existant est alors conservé. */
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
  /** SVG des calques cochés dans le plugin : ajoutés/mis à jour dans `assets`, jamais supprimés. */
  svgs?: FigmaImportSvg[];
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

/**
 * Construit les updates de `Component` pour un import Figma.
 * Si `existing` est fourni, fait un merge différentiel sur l'image déjà liée
 * à ce node (matching par `figmaNodeId`/`figmaLayerId`) : position/label mis
 * à jour, `pinRef` vers Task/Instance préservé, pins orphelins signalés sans
 * être supprimés automatiquement.
 *
 * Chaque pin du payload est relié à un composant SCOPE de `allComponents` :
 * celui choisi dans le plugin (`componentId`), sinon celui qui a le même
 * lien Figma (`figmaLink.groupNodeId`). Un pin relié prend le nom du
 * composant comme label et donne un `ComponentInstance` rattaché à ce pin ;
 * un composant non relié est ignoré (pas de pin, pas de numéro consommé). Seules les
 * instances auto de l'image renvoyée sont régénérées : celles des autres
 * images du composant (ex. version mobile) sont conservées.
 */
export async function applyFigmaImport(
  folderPath: string,
  payload: FigmaImportPayload,
  existing?: Component,
  allComponents: Component[] = [],
): Promise<FigmaImportResult> {
  const existingImage = existing?.images?.find((img) => img.figmaNodeId === payload.nodeId);
  const existingPins = existingImage?.pins || [];

  const [filename] = await Promise.all([
    saveImageFromBase64(folderPath, payload.image, 'png'),
    existingImage?.filename ? deleteImage(folderPath, existingImage.filename).catch(() => {}) : null,
  ]);

  const imageId = existingImage?.id || crypto.randomUUID();

  const resolveTarget = (pin: FigmaImportPin) =>
    allComponents.find((c) =>
      c.id !== existing?.id &&
      (pin.componentId ? c.id === pin.componentId : !!pin.groupNodeId && c.figmaLink?.groupNodeId === pin.groupNodeId)
    );

  // Un composant non importé dans SCOPE n'a pas de pin : il ne consomme pas de numéro.
  const linkedPins = payload.pins
    .map((pin) => ({ pin, target: resolveTarget(pin) }))
    .filter((l): l is { pin: FigmaImportPin; target: Component } => !!l.target);
  const incomingPins: FigmaImportPin[] = linkedPins.map(({ pin, target }) => ({ ...pin, label: target?.name || pin.label }));

  const incomingIds = new Set(incomingPins.map((p) => p.figmaLayerId));
  const orphanedPins = existingPins.filter((p) => p.figmaLayerId && !incomingIds.has(p.figmaLayerId));
  // Pins ajoutés dans SCOPE (sans calque Figma) : jamais touchés par un re-sync.
  const manualPins = existingPins.filter((p) => !p.figmaLayerId);

  let nextNumber = nextPinNumber(existingPins);
  const mergedPins: ImagePin[] = incomingPins.map((p) => {
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

  const allPins = [...mergedPins, ...manualPins, ...orphanedPins];

  const newImage: ComponentImage = {
    id: imageId,
    filename,
    caption: payload.caption || existingImage?.caption,
    isPrimary: existingImage?.isPrimary ?? !existing?.images?.length,
    pins: allPins.length ? allPins : undefined,
    figmaNodeId: payload.nodeId,
  };

  const images = existingImage
    ? (existing!.images || []).map((img) => (img.id === existingImage.id ? newImage : img))
    : [...(existing?.images || []), newImage];

  const autoInstances: ComponentInstance[] = linkedPins
    .map(({ pin, target }) => {
      const merged = mergedPins.find((p) => p.figmaLayerId === pin.figmaLayerId)!;
      return {
        id: crypto.randomUUID(),
        componentId: target.id,
        pinRef: { imageId, pinId: merged.id, pinNumber: merged.number },
        autoFromFigma: true,
      };
    });

  // Garde les instances manuelles et les instances auto d'autres images ;
  // les instances auto sans pinRef (anciens imports) sont régénérées.
  const keptInstances = (existing?.instances || []).filter(
    (i) => !i.autoFromFigma || (i.pinRef && i.pinRef.imageId !== imageId)
  );
  const instances = [...keptInstances, ...autoInstances];

  // SVG : un fichier par calque, remplacé au re-sync (id et nom conservés) ;
  // ceux absents du payload restent (le plugin ne renvoie que les cochés).
  const assets: ComponentAsset[] = [...(existing?.assets || [])];
  for (const item of payload.svgs || []) {
    const filename = await saveSvgFromString(folderPath, item.svg);
    const idx = assets.findIndex((a) => a.figmaLayerId === item.figmaLayerId);
    if (idx >= 0) {
      deleteImage(folderPath, assets[idx].filename).catch(() => {});
      assets[idx] = { ...assets[idx], filename };
    } else {
      assets.push({ id: crypto.randomUUID(), name: item.name, filename, figmaLayerId: item.figmaLayerId });
    }
  }

  const componentUpdates: Partial<Component> = {
    // Nom et description de Figma ne servent qu'à créer le composant (la
    // description aussi à combler un champ vide) : pas d'écrasement des
    // modifications faites dans SCOPE.
    name: existing?.name || payload.name,
    description: existing?.description || payload.description,
    // Un type jamais tagué dans Figma ne doit pas écraser celui choisi dans SCOPE.
    category: payload.category || !existing ? normalizeFigmaCategory(payload.category) : existing.category,
    images,
    assets: assets.length ? assets : undefined,
    instances,
    figmaLink: { fileKey: payload.fileKey, groupNodeId: payload.groupNodeId, lastSyncAt: new Date().toISOString() },
  };

  return { componentUpdates, imageId: newImage.id, orphanedPins };
}

/**
 * Construit un `Component` complet à partir des updates calculés par
 * `applyFigmaImport`, pour un nouveau composant (pas de composant existant
 * trouvé via `figmaLink.groupNodeId`).
 */
export function buildComponentFromFigmaUpdates(updates: Partial<Component>): Component {
  return {
    id: crypto.randomUUID(),
    instances: [],
    tasks: [],
    name: updates.name || 'Sans nom',
    category: updates.category || 'component',
    ...updates,
  };
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
