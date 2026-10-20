import { ScopeItemType, WidgetType, WidgetInstance, Component } from './types';
import { FileText, Image, ListChecks, Layers, Package, AlignLeft, MessageSquare, Heading1, Heading2, Heading3, List, Globe, type LucideIcon } from 'lucide-react';
import scopeConfig from './scope.config.json';

// --- Derived from scope.config.json ---

export const SCOPE_ITEM_TYPES: ScopeItemType[] =
  scopeConfig.itemTypes.map(t => t.id as ScopeItemType);

export const TYPE_LABELS: Record<ScopeItemType, string> =
  Object.fromEntries(scopeConfig.itemTypes.map(t => [t.id, t.label])) as Record<ScopeItemType, string>;

export const TYPE_COLORS: Record<ScopeItemType, string> =
  Object.fromEntries(scopeConfig.itemTypes.map(t => [t.id, t.color])) as Record<ScopeItemType, string>;

export const DEFAULT_WIDGET_TYPES: Record<ScopeItemType, WidgetType[]> =
  Object.fromEntries(scopeConfig.itemTypes.map(t => [t.id, t.defaultWidgets])) as Record<ScopeItemType, WidgetType[]>;

/** @deprecated Use DEFAULT_WIDGET_TYPES */
export const DEFAULT_WIDGETS = DEFAULT_WIDGET_TYPES;

export const WIDGET_LABELS: Record<WidgetType, string> =
  Object.fromEntries(scopeConfig.widgets.map(w => [w.id, w.label])) as Record<WidgetType, string>;

export const ALL_WIDGET_TYPES: WidgetType[] =
  scopeConfig.widgets.map(w => w.id as WidgetType);

// --- Widget classification (derived from config "storage" field) ---

/** Text widgets store their content in Component.notes[]. Multiple instances allowed. */
const TEXT_WIDGET_SET = new Set<WidgetType>(
  scopeConfig.widgets
    .filter(w => (w as { storage?: string }).storage === 'notes')
    .map(w => w.id as WidgetType)
);

/** Returns true if the widget type stores content in notes[] (multi-instance, text-based). */
export function isTextWidget(type: WidgetType): boolean {
  return TEXT_WIDGET_SET.has(type);
}

/** Singleton widget types — only one instance allowed (all non-text widgets) */
export const SINGLETON_WIDGETS: WidgetType[] =
  ALL_WIDGET_TYPES.filter(t => !isTextWidget(t));

export const WIDGET_ICONS: Record<WidgetType, LucideIcon> = {
  notes: FileText,
  images: Image,
  tasks: ListChecks,
  instances: Layers,
  resources: Package,
  page: Globe,
  paragraph: AlignLeft,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  bullet: List,
  comment: MessageSquare,
};

/** Blocs de texte courts (paragraphe, titres, puces) : du texte brut, exporté en Markdown selon son type. */
export const BLOCK_TEXT_TYPES: WidgetType[] = ['paragraph', 'heading1', 'heading2', 'heading3', 'bullet'];

export function isBlockText(type: WidgetType): boolean {
  return BLOCK_TEXT_TYPES.includes(type);
}

const HEADING_PREFIX: Partial<Record<WidgetType, string>> = { heading1: '# ', heading2: '## ', heading3: '### ' };

/** Contenu d'un bloc de texte tel qu'il s'écrit en Markdown (`# Titre`, `- puce`). */
export function blockTextToMarkdown(type: WidgetType, content: string): string {
  if (type === 'bullet') return content.split('\n').map(line => `- ${line}`).join('\n');
  return `${HEADING_PREFIX[type] ?? ''}${content}`;
}

export function widgetHasContent(item: Component, widget: WidgetInstance): boolean {
  if (isTextWidget(widget.type)) {
    const note = item.notes?.find(n => n.id === widget.id);
    return !!note?.content?.trim();
  }
  switch (widget.type) {
    case 'images':    return (item.images?.length ?? 0) > 0;
    case 'tasks':     return item.tasks.length > 0;
    case 'instances': return item.instances.length > 0;
    case 'resources': return (item.assets?.length ?? 0) > 0;
    case 'page':      return hasPageInfo(item);
    default: return false;
  }
}

// --- Helpers ---

/** Au moins une information de page (route, SEO, collection) renseignée. */
export function hasPageInfo(item: Component): boolean {
  const page = item.page;
  return !!page && Object.values(page).some(v => typeof v === 'string' ? v.trim() !== '' : !!v);
}

/** Build default WidgetInstance[] from type defaults */
function buildDefaultWidgets(category: ScopeItemType, notes?: Component['notes']): WidgetInstance[] {
  return DEFAULT_WIDGET_TYPES[category].map(type => {
    if (type === 'notes') {
      // If there's already a note, use its ID; otherwise generate one
      const noteId = notes?.[0]?.id ?? crypto.randomUUID();
      return { id: noteId, type: 'notes' as const };
    }
    return { id: type, type };
  });
}

/** Blocs dont les données arrivent sans passer par l'utilisateur (import
 * Figma) : retirer le bloc efface ses données, donc des données sans bloc
 * veulent dire qu'il doit s'afficher. */
const FORCED_WIDGETS: { type: WidgetType; hasData: (item: Component) => boolean }[] = [
  { type: 'images', hasData: (item) => (item.images?.length ?? 0) > 0 },
  { type: 'instances', hasData: (item) => item.instances.length > 0 },
  { type: 'resources', hasData: (item) => (item.assets?.length ?? 0) > 0 },
  { type: 'page', hasData: hasPageInfo },
];

export function getActiveWidgets(item: Component): WidgetInstance[] {
  const widgets = item.widgets ?? buildDefaultWidgets(item.category, item.notes);
  const forced = FORCED_WIDGETS
    .filter(({ type, hasData }) => hasData(item) && !widgets.some((w) => w.type === type))
    .map(({ type }) => ({ id: type, type }));
  return forced.length ? [...widgets, ...forced] : widgets;
}

/** Widget types available to add — singletons only if not present, text widgets always */
export function getAvailableWidgetTypes(activeWidgets: WidgetInstance[]): WidgetType[] {
  const result: WidgetType[] = [];
  for (const type of ALL_WIDGET_TYPES) {
    if (isTextWidget(type)) {
      result.push(type); // text widgets always available (multiple allowed)
    } else if (!activeWidgets.some(w => w.type === type)) {
      result.push(type);
    }
  }
  return result;
}

export function getCategoryLabel(category: ScopeItemType): string {
  return TYPE_LABELS[category];
}

export function getCategoryColor(category: ScopeItemType): string {
  return TYPE_COLORS[category];
}

// --- Display orders ---

export const COMPONENT_DISPLAY_ORDER: ScopeItemType[] = [
  'document', 'template', 'section', 'component',
];

export const PDF_DISPLAY_ORDER: ScopeItemType[] = [
  'document', 'template', 'section', 'component',
];

// --- Compat aliases (used by sidebar sections) ---

export const CATEGORY_LABELS: Record<ScopeItemType, string> = TYPE_LABELS;
export const CATEGORY_COLORS: Record<ScopeItemType, string> = TYPE_COLORS;
export const CATEGORY_SECTION_LABELS: Record<ScopeItemType, string> = {
  document: 'Documents',
  component: 'Composants',
  template: 'Templates',
  section: 'Sections',
};

// Legacy export — no longer excludes 'document'
export const COMPONENT_CATEGORIES: ScopeItemType[] = SCOPE_ITEM_TYPES;
