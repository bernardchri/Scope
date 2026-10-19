import { Collection, CollectionField } from './types';
import { PIN_KINDS, PinKind, describePinSpecs } from './pinKinds';
import { findCollection } from './collectionLookup';

export { findCollection, findField, describePinContent } from './collectionLookup';

const pinKind = (id: string) => PIN_KINDS.find((k) => k.id === id)!;

/** Types de champ d'une collection : ceux des pins (même spécifications) + types de données. */
export const FIELD_KINDS: PinKind[] = [
  pinKind('title'),
  pinKind('text'),
  pinKind('image'),
  pinKind('link'),
  { id: 'number', label: 'Nombre', fields: [{ id: 'range', label: 'Min / max', type: 'text', placeholder: '0 à 100' }, { id: 'unit', label: 'Unité', type: 'text', placeholder: '€, m²…' }] },
  { id: 'date', label: 'Date', fields: [{ id: 'format', label: 'Format', type: 'text', placeholder: 'JJ/MM/AAAA, mois + année…' }] },
  { id: 'boolean', label: 'Oui / non', fields: [] },
  { id: 'relation', label: 'Relation', fields: [] },
  { id: 'other', label: 'Autre', fields: [] },
];

export function getFieldKind(id?: string): PinKind | undefined {
  return FIELD_KINDS.find((k) => k.id === id);
}

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function createCollection(name: string, existing: Collection[]): Collection {
  const base = slugify(name) || 'collection';
  let slug = base;
  for (let i = 2; existing.some((c) => c.slug === slug); i++) slug = `${base}-${i}`;
  return { id: crypto.randomUUID(), name: name.trim(), slug, fields: [] };
}

export function createField(): CollectionField {
  return { id: crypto.randomUUID(), name: '', kind: 'text' };
}

/** Champ lisible : « Titre, max 128 caractères, SEO : H2, obligatoire » / « Relation → Catégories (plusieurs) ». */
export function describeField(field: CollectionField, collections: Collection[] = []): string {
  const kind = getFieldKind(field.kind);
  const parts: string[] = [kind?.label ?? field.kind];
  if (field.kind === 'relation') {
    const target = findCollection(collections, field.relationTo);
    parts[0] = `Relation → ${target ? target.name : '(collection non choisie)'}${field.multiple ? ' (plusieurs)' : ' (une seule)'}`;
  } else if (kind) {
    const specs = field.specs
      ? kind.fields.flatMap((f) => {
          const v = field.specs?.[f.id]?.trim();
          if (!v) return [];
          const one = describePinSpecs({ kind: kind.id, specs: { [f.id]: v } });
          return one.length ? one : [`${f.label.toLowerCase()} : ${v}`];
        })
      : [];
    parts.push(...specs);
  }
  if (field.required) parts.push('obligatoire');
  if (field.note?.trim()) parts.push(field.note.trim());
  return parts.join(', ');
}

/** Section Markdown « Modèle de contenu » (vide s'il n'y a aucune collection). */
export function generateContentModelMd(collections: Collection[] = [], heading = '##'): string {
  if (collections.length === 0) return '';
  const lines: string[] = [
    `${heading} Modèle de contenu`,
    '',
    'Types de contenu du site (custom post types / collections). Ils décrivent la structure des données, pas les contenus eux-mêmes ; les éléments repérés par des pins renvoient à ces champs.',
    '',
  ];
  for (const c of collections) {
    lines.push(`${heading}# Collection « ${c.name} » (\`${c.slug}\`)`, '');
    if (c.description?.trim()) lines.push(c.description.trim(), '');
    if (c.hasDetailPage) lines.push('Chaque entrée a sa propre page de détail.', '');
    if (c.fields.length === 0) {
      lines.push('_Aucun champ défini._', '');
      continue;
    }
    for (const f of c.fields) lines.push(`- \`${f.name || 'sans nom'}\` — ${describeField(f, collections)}`);
    lines.push('');
  }
  return lines.join('\n');
}
