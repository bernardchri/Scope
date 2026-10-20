import { Collection, Component, ComponentImage, ImagePin, Project } from './types';
import { PIN_KINDS, describePin, getPinKind } from './pinKinds';
import { findCollection, flattenFields } from './collectionLookup';
import { isPinQualified } from './completeness';
import { nextPinNumber } from './pinHelpers';

/** Arguments d'un outil MCP d'écriture, tels que reçus de Claude (non fiables : tout est revalidé). */
export type McpArgs = Record<string, unknown>;

export type McpOutcome =
  | { ok: true; componentId: string; updates: Partial<Component>; result: unknown }
  | { ok: false; error: string };

const fail = (error: string): McpOutcome => ({ ok: false, error });
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const norm = (s: string) => s.trim().toLowerCase();

function findComponent(project: Project, ref: unknown): Component | string {
  const key = str(ref)?.trim();
  if (!key) return 'Précise `component` (id ou nom, voir list_components).';
  const byId = project.components.find((c) => c.id === key);
  if (byId) return byId;
  const exact = project.components.filter((c) => norm(c.name) === norm(key));
  if (exact.length === 1) return exact[0];
  const partial = project.components.filter((c) => norm(c.name).includes(norm(key)));
  const candidates = exact.length > 1 ? exact : partial;
  if (candidates.length === 1) return candidates[0];
  return candidates.length === 0
    ? `Élément introuvable : « ${key} ».`
    : `Nom ambigu « ${key} » : ${candidates.map((c) => `${c.name} (${c.id})`).join(', ')}. Utilise l'id.`;
}

function findImage(component: Component, ref: unknown): ComponentImage | string {
  const images = component.images ?? [];
  if (images.length === 0) return `« ${component.name} » n'a pas d'image : un pin a besoin d'une image.`;
  const key = str(ref)?.trim() ?? (typeof ref === 'number' ? String(ref) : undefined);
  if (!key) return images.find((i) => i.isPrimary) ?? images[0];
  const byId = images.find((i) => i.id === key);
  if (byId) return byId;
  const index = Number(key);
  if (Number.isInteger(index) && images[index - 1]) return images[index - 1];
  return `Image introuvable : « ${key} » (id ou rang à partir de 1, ${images.length} image(s)).`;
}

/** Valeur d'une spécification contrôlée contre le type du pin ; renvoie la valeur à stocker, ou une erreur. */
function checkSpec(kindId: string, fieldId: string, raw: unknown): { value: string } | { error: string } {
  const kind = getPinKind(kindId)!;
  const field = kind.fields.find((f) => f.id === fieldId);
  if (!field) {
    const valid = kind.fields.map((f) => f.id).join(', ') || 'aucune';
    return { error: `Spécification « ${fieldId} » inconnue pour le type ${kindId}. Valides : ${valid}.` };
  }
  const value = String(raw ?? '').trim();
  if (value && field.type === 'select') {
    const match = field.options?.find((o) => norm(o) === norm(value));
    if (!match) return { error: `« ${value} » invalide pour ${fieldId}. Valeurs : ${field.options?.join(' | ')}.` };
    return { value: match };
  }
  if (value && field.type === 'number' && !/^\d+$/.test(value)) {
    return { error: `${fieldId} doit être un nombre entier (reçu « ${value} »).` };
  }
  return { value };
}

function resolveCollection(collections: Collection[], ref: unknown): Collection | string {
  const key = str(ref)?.trim() ?? '';
  const found = findCollection(collections, key) ?? collections.find((c) => norm(c.name) === norm(key) || c.slug === key);
  return found ?? `Collection introuvable : « ${key} ». Disponibles : ${collections.map((c) => c.name).join(', ') || 'aucune'}.`;
}

function resolveField(collection: Collection, ref: unknown) {
  const key = norm(str(ref) ?? '');
  const fields = flattenFields(collection.fields);
  const matches = fields.filter((f) => f.field.id === str(ref) || norm(f.path) === key || norm(f.field.name) === key);
  if (matches.length === 1) return matches[0].field;
  return matches.length === 0
    ? `Champ introuvable dans « ${collection.name} » : « ${str(ref)} ». Champs : ${fields.map((f) => f.path).join(', ') || 'aucun'}.`
    : `Champ ambigu « ${str(ref)} » dans « ${collection.name} » : précise le chemin (${matches.map((m) => m.path).join(', ')}).`;
}

/**
 * Applique les champs de qualification d'un outil MCP (`kind`, `specs`, `note`, `label`, `collection`, `field`)
 * à un pin. Mêmes règles que l'éditeur de pin : changer de type repart de zéro (précisions et liens effacés).
 */
function qualify(pin: ImagePin, args: McpArgs, collections: Collection[]): ImagePin | string {
  let next: ImagePin = { ...pin };

  const kindArg = str(args.kind)?.trim();
  if (kindArg !== undefined) {
    if (kindArg === '') {
      next = { ...next, kind: undefined, specs: undefined, collectionId: undefined, fieldRef: undefined };
    } else if (!getPinKind(kindArg)) {
      return `Type « ${kindArg} » inconnu. Types : ${PIN_KINDS.map((k) => k.id).join(', ')}.`;
    } else if (kindArg !== next.kind) {
      next = { ...next, kind: kindArg, specs: undefined, collectionId: undefined, fieldRef: undefined };
    }
  }

  if (args.specs !== undefined) {
    if (!next.kind) return 'Donne un `kind` avant les `specs`.';
    if (typeof args.specs !== 'object' || args.specs === null) return '`specs` doit être un objet { champ: valeur }.';
    const specs = { ...(next.specs ?? {}) };
    for (const [fieldId, raw] of Object.entries(args.specs)) {
      const checked = checkSpec(next.kind, fieldId, raw);
      if ('error' in checked) return checked.error;
      if (checked.value) specs[fieldId] = checked.value;
      else delete specs[fieldId];
    }
    next = { ...next, specs: Object.keys(specs).length ? specs : undefined };
  }

  if (args.note !== undefined) next = { ...next, note: str(args.note)?.trim() || undefined };
  if (args.label !== undefined) next = { ...next, label: str(args.label)?.trim() || undefined };

  if (args.collection !== undefined || args.field !== undefined) {
    const collectionArg = str(args.collection)?.trim();
    if (collectionArg === '' && args.field === undefined) {
      return { ...next, collectionId: undefined, fieldRef: undefined };
    }
    const collection = resolveCollection(collections, args.collection);
    if (typeof collection === 'string') return collection;
    if (args.field === undefined) {
      if (next.kind !== 'list' && next.kind !== 'relation') {
        return 'Une collection seule se relie à un pin de type list ou relation ; pour les autres types, précise aussi `field`.';
      }
      next = { ...next, collectionId: collection.id, fieldRef: undefined };
    } else {
      if (next.kind === 'list' || next.kind === 'relation') return 'Un pin list ou relation se relie à une collection (`collection`), pas à un champ.';
      const field = resolveField(collection, args.field);
      if (typeof field === 'string') return field;
      next = { ...next, fieldRef: { collectionId: collection.id, fieldId: field.id }, collectionId: undefined };
    }
  }
  return next;
}

function pinReport(pin: ImagePin, component: Component, collections: Collection[]) {
  return { number: pin.number, id: pin.id, description: describePin(pin, collections), qualified: isPinQualified(pin, component) };
}

/** Exécute un outil MCP d'écriture sur le projet ouvert ; ne modifie rien, renvoie les mises à jour à appliquer. */
export function runMcpCommand(project: Project, tool: string, args: McpArgs): McpOutcome {
  const collections = project.collections ?? [];
  const component = findComponent(project, args.component);
  if (typeof component === 'string') return fail(component);
  const image = findImage(component, args.image);
  if (typeof image === 'string') return fail(image);
  const pins = image.pins ?? [];

  let updatedPins: ImagePin[];
  let target: ImagePin;

  if (tool === 'add_pin') {
    const x = Number(args.x);
    const y = Number(args.y);
    if (![x, y].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return fail('`x` et `y` sont des pourcentages entre 0 et 100.');
    const created: ImagePin = { id: crypto.randomUUID(), number: nextPinNumber(pins), x, y };
    const qualified = qualify(created, args, collections);
    if (typeof qualified === 'string') return fail(qualified);
    target = qualified;
    updatedPins = [...pins, target];
  } else if (tool === 'qualify_pin') {
    const number = Number(args.pin);
    const matches = pins.filter((p) => p.number === number);
    if (!Number.isInteger(number) || matches.length === 0) {
      return fail(`Pin #${args.pin} introuvable sur cette image (pins : ${pins.map((p) => `#${p.number}`).join(', ') || 'aucun'}).`);
    }
    const qualified = qualify(matches[0], args, collections);
    if (typeof qualified === 'string') return fail(qualified);
    target = qualified;
    updatedPins = pins.map((p) => (p.id === target.id ? target : p));
  } else {
    return fail(`Outil inconnu : ${tool}`);
  }

  const images = (component.images ?? []).map((img) => (img.id === image.id ? { ...img, pins: updatedPins } : img));
  const updated = { ...component, images };
  return {
    ok: true,
    componentId: component.id,
    updates: { images },
    result: { component: component.name, image: image.id, pin: pinReport(target, updated, collections) },
  };
}
