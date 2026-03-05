import { ScopeItemType, WidgetType, Component } from './types';
import scopeConfig from './scope.config.json';

// --- Derived from scope.config.json ---

export const SCOPE_ITEM_TYPES: ScopeItemType[] =
  scopeConfig.itemTypes.map(t => t.id as ScopeItemType);

export const TYPE_LABELS: Record<ScopeItemType, string> =
  Object.fromEntries(scopeConfig.itemTypes.map(t => [t.id, t.label])) as Record<ScopeItemType, string>;

export const TYPE_COLORS: Record<ScopeItemType, string> =
  Object.fromEntries(scopeConfig.itemTypes.map(t => [t.id, t.color])) as Record<ScopeItemType, string>;

export const DEFAULT_WIDGETS: Record<ScopeItemType, WidgetType[]> =
  Object.fromEntries(scopeConfig.itemTypes.map(t => [t.id, t.defaultWidgets])) as Record<ScopeItemType, WidgetType[]>;

export const WIDGET_LABELS: Record<WidgetType, string> =
  Object.fromEntries(scopeConfig.widgets.map(w => [w.id, w.label])) as Record<WidgetType, string>;

export const ALL_WIDGET_TYPES: WidgetType[] =
  scopeConfig.widgets.map(w => w.id as WidgetType);

// --- Helpers ---

export function getActiveWidgets(item: Component): WidgetType[] {
  return item.widgets ?? DEFAULT_WIDGETS[item.category];
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
