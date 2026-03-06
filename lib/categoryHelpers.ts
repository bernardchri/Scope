import { ScopeItemType, WidgetType, WidgetInstance, Component } from './types';
import { FileText, Image, ListChecks, Layers, type LucideIcon } from 'lucide-react';
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

/** Singleton widget types — only one instance allowed */
export const SINGLETON_WIDGETS: WidgetType[] = ['images', 'tasks', 'instances'];

export const WIDGET_ICONS: Record<WidgetType, LucideIcon> = {
  notes: FileText,
  images: Image,
  tasks: ListChecks,
  instances: Layers,
};

export function widgetHasContent(item: Component, widget: WidgetInstance): boolean {
  switch (widget.type) {
    case 'images':    return (item.images?.length ?? 0) > 0;
    case 'notes': {
      const note = item.notes?.find(n => n.id === widget.id);
      return !!note?.content?.trim();
    }
    case 'tasks':     return item.tasks.length > 0;
    case 'instances': return item.instances.length > 0;
    default: return false;
  }
}

// --- Helpers ---

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

export function getActiveWidgets(item: Component): WidgetInstance[] {
  return item.widgets ?? buildDefaultWidgets(item.category, item.notes);
}

/** Widget types available to add — singletons only if not present, notes always */
export function getAvailableWidgetTypes(activeWidgets: WidgetInstance[]): WidgetType[] {
  const result: WidgetType[] = [];
  for (const type of ALL_WIDGET_TYPES) {
    if (type === 'notes') {
      result.push(type); // notes always available
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
  'template', 'section', 'component', 'document',
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
