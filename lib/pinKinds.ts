import { Collection, ImagePin } from './types';
import { describePinContent } from './collectionLookup';

export type PinFieldType = 'text' | 'number' | 'select';

export interface PinField {
  id: string;
  label: string;
  type: PinFieldType;
  /** Valeurs proposées pour un select. */
  options?: string[];
  /** Texte exporté après la valeur (ex. « car. » pour une longueur). */
  unit?: string;
  placeholder?: string;
}

export interface PinKind {
  id: string;
  label: string;
  fields: PinField[];
}

const EDITABLE: PinField = {
  id: 'editable',
  label: 'Contenu',
  type: 'select',
  options: ["éditable en backoffice", "fixe (en dur dans le code)", "dynamique (donnée liée : titre d'article, prix…)"],
};

/** Types de pin proposés en un clic, avec les champs de spécification propres à chacun. */
export const PIN_KINDS: PinKind[] = [
  {
    id: 'title',
    label: 'Titre',
    fields: [
      { id: 'maxLength', label: 'Longueur max', type: 'number', unit: 'caractères' },
      EDITABLE,
      { id: 'seo', label: 'Balise SEO', type: 'select', options: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'aucune'] },
    ],
  },
  {
    id: 'text',
    label: 'Texte',
    fields: [
      { id: 'maxLength', label: 'Longueur max', type: 'number', unit: 'caractères' },
      EDITABLE,
      { id: 'format', label: 'Format', type: 'select', options: ['texte brut', 'texte enrichi', 'markdown'] },
    ],
  },
  {
    id: 'image',
    label: 'Image',
    fields: [
      { id: 'size', label: 'Dimensions / ratio', type: 'text', placeholder: '1200×630, 16/9…' },
      EDITABLE,
      { id: 'alt', label: 'Texte alternatif', type: 'select', options: ['obligatoire', 'optionnel', 'décorative (vide)'] },
    ],
  },
  {
    id: 'button',
    label: 'Bouton',
    fields: [
      { id: 'maxLength', label: 'Libellé max', type: 'number', unit: 'caractères' },
      { id: 'target', label: 'Cible', type: 'text', placeholder: 'page, ancre, URL…' },
      EDITABLE,
    ],
  },
  {
    id: 'link',
    label: 'Lien',
    fields: [
      { id: 'target', label: 'Cible', type: 'text', placeholder: 'page, ancre, URL…' },
      EDITABLE,
    ],
  },
  {
    id: 'list',
    label: 'Liste',
    fields: [
      { id: 'count', label: 'Nombre d\'éléments', type: 'text', placeholder: '3, 3 à 6, illimité…' },
      { id: 'source', label: 'Source', type: 'text', placeholder: 'articles, projets, saisie manuelle…' },
      EDITABLE,
    ],
  },
  {
    id: 'form',
    label: 'Formulaire',
    fields: [
      { id: 'fields', label: 'Champs', type: 'text', placeholder: 'nom, email, message…' },
      { id: 'recipient', label: 'Destinataire / traitement', type: 'text' },
    ],
  },
  { id: 'number', label: 'Nombre', fields: [{ id: 'range', label: 'Min / max', type: 'text', placeholder: '0 à 100' }, { id: 'unit', label: 'Unité', type: 'text', placeholder: '€, m²…' }, EDITABLE] },
  { id: 'date', label: 'Date', fields: [{ id: 'format', label: 'Format', type: 'text', placeholder: 'JJ/MM/AAAA, mois + année…' }, EDITABLE] },
  {
    id: 'category',
    label: 'Catégorie',
    fields: [
      { id: 'choice', label: 'Sélection', type: 'select', options: ['une seule catégorie', 'plusieurs catégories'] },
      { id: 'values', label: 'Valeurs connues', type: 'text', placeholder: 'Web, Print, Vidéo…' },
      { id: 'hierarchy', label: 'Hiérarchie', type: 'select', options: ['à plat', 'avec sous-catégories'] },
    ],
  },
  { id: 'boolean', label: 'Oui / non', fields: [EDITABLE] },
  { id: 'relation', label: 'Relation', fields: [{ id: 'multiple', label: 'Entrées', type: 'select', options: ['une seule', 'plusieurs'] }] },
  {
    id: 'repeater',
    label: 'Répéteur',
    fields: [
      { id: 'minRows', label: 'Lignes min', type: 'number' },
      { id: 'maxRows', label: 'Lignes max', type: 'number' },
      { id: 'rowSource', label: 'Contenu d\'une ligne', type: 'select', options: ['le composant lié (ses pins décrivent une ligne)'] },
      { id: 'rowFields', label: 'Champs d\'une ligne', type: 'text', placeholder: 'titre, image, lien…' },
    ],
  },
  { id: 'other', label: 'Autre', fields: [] },
];

export function getPinKind(id?: string): PinKind | undefined {
  return PIN_KINDS.find((k) => k.id === id);
}

/** Spécifications renseignées d'un pin, lisibles : « max 128 caractères », « éditable en backoffice »… */
export function describePinSpecs(pin: Pick<ImagePin, 'kind' | 'specs'>): string[] {
  const kind = getPinKind(pin.kind);
  if (!kind) return [];
  const out: string[] = [];
  for (const field of kind.fields) {
    const value = pin.specs?.[field.id]?.trim();
    if (!value) continue;
    if (field.id === 'maxLength') out.push(`max ${value} ${field.unit ?? ''}`.trim());
    else if (field.id === 'seo') out.push(`SEO : ${value}`);
    else if (field.id === 'minRows') out.push(`min ${value} ligne(s)`);
    else if (field.id === 'maxRows') out.push(`max ${value} ligne(s)`);
    else if (field.id === 'rowSource') continue; // décrit par describePin, qui connaît le composant lié
    else if (field.id === 'rowFields') out.push(`chaque ligne : ${value}`);
    else if (field.type === 'select' && field.id === 'editable') out.push(value);
    else out.push(`${field.label.toLowerCase()} : ${value}${field.unit ? ` ${field.unit}` : ''}`);
  }
  return out;
}

/** Libellé court d'un pin pour les exports : « Titre — max 128 caractères, SEO : H2 — champ « titre » de la collection « Projets » ». */
export function describePin(
  pin: Pick<ImagePin, 'kind' | 'specs' | 'note' | 'collectionId' | 'fieldRef'>,
  collections?: Collection[],
  /** Composant relié au pin : une ligne de répéteur peut renvoyer à sa fiche. */
  linkedName?: string,
  collectionLink?: (c: Collection) => string,
): string {
  const kind = getPinKind(pin.kind);
  // Une ligne décrite par le composant lié rend inutile la liste libre des champs (le formulaire la masque, sa valeur peut rester).
  const fromComponent = !!pin.specs?.rowSource && !!linkedName;
  const specs = describePinSpecs(fromComponent ? { ...pin, specs: { ...pin.specs, rowFields: '' } } : pin);
  if (fromComponent) specs.push(`chaque ligne : composant « ${linkedName} » (voir sa fiche)`);
  const parts = [kind ? kind.label : '', specs.join(', ')].filter(Boolean);
  const head = parts.join(' — ');
  return [head, describePinContent(pin, collections, collectionLink), pin.note?.trim()].filter(Boolean).join(' — ');
}
