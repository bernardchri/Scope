import { Component, ScopeItemType } from './types';

/** Ordre des sections de la sidebar. */
export const SIDEBAR_ORDER: ScopeItemType[] = ['document', 'template', 'section', 'component'];

/** Préfixe des zones de dépôt « section » (par opposition aux éléments eux-mêmes). */
export const CATEGORY_DROP_PREFIX = 'cat:';

export interface ReorderResult {
  orderedIds: string[];
  categoryChange?: { id: string; category: ScopeItemType };
}

/**
 * Nouvel ordre des éléments après un glisser-déposer dans la sidebar.
 * `overId` est un élément (on prend sa section) ou une zone `cat:<type>` (fin de la section).
 * `belowOverMiddle` : l'élément glissé est passé sous le milieu de l'élément survolé (utile entre deux sections).
 */
export function computeReorder(
  components: Component[],
  activeId: string,
  overId: string,
  belowOverMiddle = false,
): ReorderResult | null {
  if (activeId === overId) return null;
  const dragged = components.find(c => c.id === activeId);
  if (!dragged) return null;

  const overItem = overId.startsWith(CATEGORY_DROP_PREFIX) ? undefined : components.find(c => c.id === overId);
  if (!overId.startsWith(CATEGORY_DROP_PREFIX) && !overItem) return null;
  const targetCategory = overItem ? overItem.category : (overId.slice(CATEGORY_DROP_PREFIX.length) as ScopeItemType);

  const groupsWithDragged: Record<string, string[]> = {};
  const groups: Record<string, string[]> = {};
  for (const cat of SIDEBAR_ORDER) {
    groupsWithDragged[cat] = components.filter(c => c.category === cat).map(c => c.id);
    groups[cat] = groupsWithDragged[cat].filter(id => id !== dragged.id);
  }
  const target = groups[targetCategory];
  if (!target) return null;

  let index = overItem ? target.indexOf(overItem.id) : target.length;
  if (overItem && targetCategory === dragged.category) {
    // Même section : vers le bas, après l'élément survolé ; vers le haut, avant lui.
    const before = groupsWithDragged[targetCategory];
    if (before.indexOf(dragged.id) < before.indexOf(overItem.id)) index += 1;
  } else if (overItem && belowOverMiddle) {
    index += 1;
  }
  target.splice(index, 0, dragged.id);

  return {
    orderedIds: SIDEBAR_ORDER.flatMap(cat => groups[cat]),
    categoryChange: targetCategory !== dragged.category ? { id: dragged.id, category: targetCategory } : undefined,
  };
}
