import { Collection, Component, ComponentImage, ImagePin, PageInfo, Project, ScopeItemType, Task, TaskCategory, WidgetInstance } from './types';
import { getActiveWidgets, isTextWidget } from './categoryHelpers';
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

const TASK_CATEGORIES: TaskCategory[] = ['frontend', 'backend', 'seo', 'motion'];
const ITEM_CATEGORIES: ScopeItemType[] = ['document', 'component', 'template', 'section'];

/** Pins : outils qui agissent sur l'image d'un élément. */
function runPinCommand(project: Project, component: Component, tool: string, args: McpArgs): McpOutcome {
  const collections = project.collections ?? [];
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
  } else {
    const number = Number(args.pin);
    const matches = pins.filter((p) => p.number === number);
    if (!Number.isInteger(number) || matches.length === 0) {
      return fail(`Pin #${args.pin} introuvable sur cette image (pins : ${pins.map((p) => `#${p.number}`).join(', ') || 'aucun'}).`);
    }
    const qualified = qualify(matches[0], args, collections);
    if (typeof qualified === 'string') return fail(qualified);
    target = qualified;
    updatedPins = pins.map((p) => (p.id === target.id ? target : p));
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

/** Champs propres à l'élément : nom, description, type, estimation. */
function runUpdateComponent(component: Component, args: McpArgs, collections: Collection[]): McpOutcome {
  const updates: Partial<Component> = {};
  if (args.name !== undefined) {
    const name = str(args.name)?.trim();
    if (!name) return fail('`name` ne peut pas être vide.');
    updates.name = name;
  }
  if (args.description !== undefined) updates.description = str(args.description)?.trim() || undefined;
  if (args.category !== undefined) {
    if (!ITEM_CATEGORIES.includes(args.category as ScopeItemType)) return fail(`Type inconnu. Types : ${ITEM_CATEGORIES.join(', ')}.`);
    updates.category = args.category as ScopeItemType;
  }
  if (args.estimatedHours !== undefined) {
    const hours = args.estimatedHours === null ? undefined : Number(args.estimatedHours);
    if (hours !== undefined && !(Number.isFinite(hours) && hours >= 0)) return fail('`estimatedHours` doit être un nombre positif (ou null pour effacer).');
    updates.estimatedHours = hours;
  }
  const pageKeys = ['route', 'seoTitle', 'seoDescription', 'collection', 'collectionRole'] as const;
  if (pageKeys.some((key) => args[key] !== undefined)) {
    const page: PageInfo = { ...(component.page ?? {}) };
    for (const key of ['route', 'seoTitle', 'seoDescription'] as const) {
      if (args[key] !== undefined) page[key] = str(args[key])?.trim() || undefined;
    }
    if (args.collection !== undefined) {
      const ref = str(args.collection)?.trim();
      if (ref) {
        const collection = resolveCollection(collections, ref);
        if (typeof collection === 'string') return fail(collection);
        page.collectionId = collection.id;
      } else {
        page.collectionId = undefined;
      }
    }
    if (args.collectionRole !== undefined) {
      if (args.collectionRole !== '' && args.collectionRole !== 'single' && args.collectionRole !== 'list') return fail('`collectionRole` : single (fiche d\'une entrée) ou list (liste).');
      page.collectionRole = args.collectionRole === '' ? undefined : (args.collectionRole as PageInfo['collectionRole']);
    }
    if (!page.collectionId) page.collectionRole = undefined;
    const clean = Object.fromEntries(Object.entries(page).filter(([, v]) => v !== undefined)) as PageInfo;
    updates.page = Object.keys(clean).length ? clean : undefined;
  }
  if (Object.keys(updates).length === 0) return fail('Rien à modifier : donne `name`, `description`, `category`, `estimatedHours` ou des informations de page (`route`, `seoTitle`, `seoDescription`, `collection`, `collectionRole`).');
  const next = { ...component, ...updates };
  return {
    ok: true,
    componentId: component.id,
    updates,
    result: { id: next.id, name: next.name, category: next.category, description: next.description, estimatedHours: next.estimatedHours, page: next.page },
  };
}

function findTask(component: Component, ref: unknown): Task | string {
  const key = str(ref)?.trim();
  if (!key) return 'Précise `task` (id ou nom exact de la tâche).';
  const byId = component.tasks.find((t) => t.id === key);
  if (byId) return byId;
  const byName = component.tasks.filter((t) => norm(t.name) === norm(key));
  if (byName.length === 1) return byName[0];
  return byName.length === 0
    ? `Tâche introuvable : « ${key} » (tâches : ${component.tasks.map((t) => t.name).join(' | ') || 'aucune'}).`
    : `Plusieurs tâches s'appellent « ${key} » : utilise l'id (${byName.map((t) => t.id).join(', ')}).`;
}

/** Lien tâche → pin (`pin` = numéro sur l'image, 0 pour délier). */
function taskPinRef(component: Component, args: McpArgs): { pinRef: Task['pinRef'] } | string {
  const number = Number(args.pin);
  if (number === 0) return { pinRef: undefined };
  const image = findImage(component, args.image);
  if (typeof image === 'string') return image;
  const pin = (image.pins ?? []).find((p) => p.number === number);
  if (!pin) return `Pin #${args.pin} introuvable sur cette image.`;
  return { pinRef: { imageId: image.id, pinId: pin.id, pinNumber: pin.number } };
}

const taskView = (t: Task) => ({
  id: t.id, name: t.name, category: t.category, completed: t.completed, outOfScope: t.scope === 'v2', pin: t.pinRef?.pinNumber,
});

function runTaskCommand(component: Component, tool: string, args: McpArgs): McpOutcome {
  const category = args.category === undefined ? undefined : (args.category as TaskCategory);
  if (category !== undefined && !TASK_CATEGORIES.includes(category)) {
    return fail(`Catégorie de tâche inconnue. Catégories : ${TASK_CATEGORIES.join(', ')}.`);
  }
  const link = args.pin !== undefined ? taskPinRef(component, args) : undefined;
  if (typeof link === 'string') return fail(link);

  let tasks: Task[];
  let target: Task | undefined;

  if (tool === 'add_task') {
    const name = str(args.name)?.trim();
    if (!name) return fail('`name` est obligatoire.');
    target = {
      id: crypto.randomUUID(),
      name,
      completed: args.completed === true,
      category: category ?? 'frontend',
      scope: args.outOfScope === true ? 'v2' : undefined,
      pinRef: link?.pinRef,
    };
    tasks = [...component.tasks, target];
  } else {
    const found = findTask(component, args.task);
    if (typeof found === 'string') return fail(found);
    if (tool === 'delete_task') {
      tasks = component.tasks.filter((t) => t.id !== found.id);
    } else {
      const name = args.name === undefined ? undefined : str(args.name)?.trim();
      if (args.name !== undefined && !name) return fail('`name` ne peut pas être vide.');
      target = {
        ...found,
        ...(name ? { name } : {}),
        ...(category ? { category } : {}),
        ...(args.completed !== undefined ? { completed: args.completed === true } : {}),
        ...(args.outOfScope !== undefined ? { scope: args.outOfScope === true ? ('v2' as const) : undefined } : {}),
        ...(link ? { pinRef: link.pinRef } : {}),
      };
      tasks = component.tasks.map((t) => (t.id === found.id ? target! : t));
    }
  }
  return {
    ok: true,
    componentId: component.id,
    updates: { tasks },
    result: { component: component.name, task: target ? taskView(target) : 'supprimée', tasks: tasks.map(taskView) },
  };
}

/** Texte des documents et blocs de texte (notes Markdown, paragraphes, commentaires). */
function runTextCommand(component: Component, tool: string, args: McpArgs): McpOutcome {
  const active = getActiveWidgets(component);
  const notes = [...(component.notes ?? [])];
  const id = str(args.id)?.trim();
  const upsert = (noteId: string, content: string) => {
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx >= 0) notes[idx] = { ...notes[idx], content };
    else notes.push({ id: noteId, content });
  };
  const textIds = () => active.filter((w) => isTextWidget(w.type)).map((w) => `${w.id} (${w.type})`).join(', ') || 'aucun';

  if (tool === 'delete_text') {
    const widget = active.find((w) => w.id === id && isTextWidget(w.type));
    if (!widget) return fail(`Texte introuvable : « ${id} ». Textes : ${textIds()}.`);
    return {
      ok: true,
      componentId: component.id,
      updates: { widgets: active.filter((w) => w.id !== widget.id), notes: notes.filter((n) => n.id !== widget.id) },
      result: { component: component.name, deleted: widget.id },
    };
  }

  const content = args.content === undefined ? undefined : String(args.content);
  if (content === undefined) return fail('`content` est obligatoire (texte Markdown).');
  let widgets: WidgetInstance[] = component.widgets ?? active; // fige les identifiants générés à la volée
  let targetId: string;

  if (id) {
    const widget = active.find((w) => w.id === id && isTextWidget(w.type));
    if (!widget) return fail(`Texte introuvable : « ${id} ». Textes : ${textIds()}.`);
    targetId = widget.id;
    const current = notes.find((n) => n.id === targetId)?.content ?? '';
    upsert(targetId, args.mode === 'append' && current ? `${current}\n\n${content}` : content);
  } else {
    const type = (str(args.type) ?? 'notes') as WidgetInstance['type'];
    if (!isTextWidget(type)) return fail('`type` doit être notes, paragraph, heading1, heading2, heading3, bullet ou comment.');
    // Un document vierge a déjà un bloc de notes vide : on le remplit plutôt que d'en ajouter un second.
    const empty = type === 'notes' ? active.find((w) => w.type === 'notes' && !notes.find((n) => n.id === w.id)?.content?.trim()) : undefined;
    if (empty) {
      targetId = empty.id;
    } else {
      targetId = crypto.randomUUID();
      widgets = [...widgets, { id: targetId, type }];
    }
    upsert(targetId, content);
  }
  return {
    ok: true,
    componentId: component.id,
    updates: { widgets, notes },
    result: { component: component.name, id: targetId, content: notes.find((n) => n.id === targetId)?.content },
  };
}

/** Exécute un outil MCP d'écriture sur le projet ouvert ; ne modifie rien, renvoie les mises à jour à appliquer. */
export function runMcpCommand(project: Project, tool: string, args: McpArgs): McpOutcome {
  const component = findComponent(project, args.component);
  if (typeof component === 'string') return fail(component);
  switch (tool) {
    case 'qualify_pin':
    case 'add_pin':
      return runPinCommand(project, component, tool, args);
    case 'update_component':
      return runUpdateComponent(component, args, project.collections ?? []);
    case 'add_task':
    case 'update_task':
    case 'delete_task':
      return runTaskCommand(component, tool, args);
    case 'set_text':
    case 'delete_text':
      return runTextCommand(component, tool, args);
    default:
      return fail(`Outil inconnu : ${tool}`);
  }
}
