import { ImagePin } from './types';

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
    else if (field.type === 'select' && field.id === 'editable') out.push(value);
    else out.push(`${field.label.toLowerCase()} : ${value}${field.unit ? ` ${field.unit}` : ''}`);
  }
  return out;
}

/** Libellé court d'un pin pour les exports : « Titre — max 128 caractères, SEO : H2 ». */
export function describePin(pin: Pick<ImagePin, 'kind' | 'specs' | 'note'>): string {
  const kind = getPinKind(pin.kind);
  const specs = describePinSpecs(pin);
  const parts = [kind ? kind.label : '', specs.join(', ')].filter(Boolean);
  const head = parts.join(' — ');
  return [head, pin.note?.trim()].filter(Boolean).join(' — ');
}
