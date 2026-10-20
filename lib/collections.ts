import { Collection, CollectionField, Component } from './types';
import { PIN_KINDS, PinKind, describePinSpecs } from './pinKinds';
import { collectionAnchor, collectionLink, findCollection, flattenFields } from './collectionLookup';

export { findCollection, findField, flattenFields, describePinContent, collectionAnchor, collectionLink } from './collectionLookup';

const pinKind = (id: string) => PIN_KINDS.find((k) => k.id === id)!;

/** Types de champ d'une collection : ceux des pins (même spécifications) + types de données. */
export const FIELD_KINDS: PinKind[] = [
  ...['title', 'text', 'image', 'link', 'number', 'date', 'category', 'boolean'].map(pinKind),
  // La cible d'une relation se choisit dans le champ (relationTo), pas dans des spécifications.
  { id: 'relation', label: 'Relation', fields: [] },
  // Les champs d'une ligne sont de vrais sous-champs (subFields), pas du texte libre.
  { id: 'repeater', label: 'Répéteur', fields: pinKind('repeater').fields.filter((f) => f.id !== 'rowFields' && f.id !== 'rowSource') },
  pinKind('other'),
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
export function describeField(field: CollectionField, collections: Collection[] = [], link?: (c: Collection) => string): string {
  const kind = getFieldKind(field.kind);
  const parts: string[] = [kind?.label ?? field.kind];
  if (field.kind === 'relation') {
    const target = findCollection(collections, field.relationTo);
    parts[0] = `Relation → ${target ? (link ? link(target) : target.name) : '(collection non choisie, à relier)'}${field.multiple ? ' (plusieurs)' : ' (une seule)'}`;
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

/** Composants dont au moins un pin utilise la collection (liste ou champ). */
export function collectionUsage(collection: Collection, components: Component[]): Component[] {
  return components.filter((comp) =>
    (comp.images || []).some((img) =>
      (img.pins || []).some((p) => p.collectionId === collection.id || p.fieldRef?.collectionId === collection.id)
    )
  );
}

/** Section Markdown « Modèle de contenu » (vide s'il n'y a aucune collection). */
export function generateContentModelMd(
  collections: Collection[] = [],
  heading = '##',
  components: Component[] = [],
  /** Fiche d'un composant (multi-fichiers) : permet de lier « Utilisée dans ». */
  componentHref: (c: Component) => string | undefined = () => undefined,
): string {
  if (collections.length === 0) return '';
  const lines: string[] = [
    `${heading} Modèle de contenu`,
    '',
    'Types de contenu du site (custom post types / collections). Ils décrivent la structure des données, pas les contenus eux-mêmes ; les éléments repérés par des pins renvoient à ces champs.',
    '',
  ];
  for (const c of collections) {
    lines.push(`<a id="${collectionAnchor(c)}"></a>`, '', `${heading}# Collection « ${c.name} » (\`${c.slug}\`)`, '');
    if (c.description?.trim()) lines.push(c.description.trim(), '');
    if (c.hasDetailPage) lines.push('Chaque entrée a sa propre page de détail.', '');
    if (c.fields.length === 0) lines.push('_Aucun champ défini._', '');
    else {
      for (const { field: f, depth } of flattenFields(c.fields)) lines.push(`${'  '.repeat(depth)}- \`${f.name || 'sans nom'}\` — ${describeField(f, collections, (t) => collectionLink(t))}`);
      lines.push('');
    }
    const used = collectionUsage(c, components);
    if (used.length) {
      lines.push(`Utilisée dans : ${used.map((u) => { const href = componentHref(u); return href ? `[${u.name}](${href})` : u.name; }).join(', ')}.`, '');
    }
    const shownBy = components.filter(comp => comp.page?.collectionId === c.id);
    if (shownBy.length) {
      const pageLabel = (comp: Component) => {
        const href = componentHref(comp);
        const name = href ? `[${comp.name}](${href})` : comp.name;
        const role = comp.page?.collectionRole === 'single' ? 'fiche d\'une entrée' : comp.page?.collectionRole === 'list' ? 'liste' : '';
        const details = [role, comp.page?.route && `\`${comp.page.route}\``].filter(Boolean).join(', ');
        return details ? `${name} (${details})` : name;
      };
      lines.push(`Pages : ${shownBy.map(pageLabel).join(', ')}.`, '');
    }
    const referencedBy = collections
      .filter((o) => o.id !== c.id)
      .flatMap((o) => flattenFields(o.fields).filter((f) => f.field.relationTo === c.id).map((f) => `${collectionLink(o)} › ${f.path}`));
    if (referencedBy.length) lines.push(`Référencée par : ${referencedBy.join(', ')}.`, '');
  }
  return lines.join('\n');
}
