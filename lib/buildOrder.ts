import { Component } from './types';

/** Éléments qui utilisent `component` (une instance de lui dans leurs maquettes). */
export function usedBy(component: Component, components: Component[]): Component[] {
  return components.filter(c => c.id !== component.id && c.instances.some(i => i.componentId === component.id));
}

/**
 * Ordre de construction suggéré : un élément n'arrive qu'après tous ceux qu'il utilise (logo, flèche → header →
 * section → page). Parcours en profondeur dans l'ordre du projet ; les cycles sont coupés sans bloquer.
 */
export function buildOrder(components: Component[]): Component[] {
  const byId = new Map(components.map(c => [c.id, c]));
  const done = new Set<string>();
  const visiting = new Set<string>();
  const order: Component[] = [];

  function visit(component: Component) {
    if (done.has(component.id) || visiting.has(component.id)) return;
    visiting.add(component.id);
    for (const instance of component.instances) {
      const dependency = byId.get(instance.componentId);
      if (dependency) visit(dependency);
    }
    visiting.delete(component.id);
    done.add(component.id);
    order.push(component);
  }

  // Les documents ne se construisent pas : ils décrivent le projet.
  for (const component of components.filter(c => c.category !== 'document')) visit(component);
  return order;
}

/** Section Markdown « Ordre de construction suggéré » (vide s'il y a moins de deux éléments). */
export function generateBuildOrderMd(
  components: Component[],
  heading = '##',
  href: (c: Component) => string | undefined = () => undefined,
): string {
  const order = buildOrder(components);
  if (order.length < 2) return '';
  const lines = [
    `${heading} Ordre de construction suggéré`,
    '',
    'Chaque élément est listé après ceux qu\'il utilise : construis dans cet ordre pour réutiliser plutôt que recréer.',
    '',
  ];
  order.forEach((c, i) => {
    const link = href(c);
    lines.push(`${i + 1}. ${link ? `[${c.name}](${link})` : c.name}`);
  });
  lines.push('');
  return lines.join('\n');
}
