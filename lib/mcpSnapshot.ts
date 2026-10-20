import { invoke } from '@tauri-apps/api/core';
import { Component, Project } from './types';
import { getActiveWidgets, isTextWidget } from './categoryHelpers';
import { describePin } from './pinKinds';
import { findCompletenessIssues, isPinQualified } from './completeness';

/**
 * Instantané du projet ouvert, lu par le serveur MCP du pont (`POST /mcp`).
 * Sans images (ni base64, ni contenu) : seulement ce qu'un outil texte peut exploiter.
 */
export function buildMcpSnapshot(project: Project, folderPath?: string) {
  const collections = project.collections ?? [];
  const nameOf = (id: string) => project.components.find((c) => c.id === id)?.name;

  const components = project.components.map((comp: Component) => ({
    id: comp.id,
    name: comp.name,
    category: comp.category,
    description: comp.description,
    estimatedHours: comp.estimatedHours,
    // Contenu texte des documents et blocs de texte, dans l'ordre de la fiche.
    texts: getActiveWidgets(comp)
      .map((w) => ({ id: w.id, widget: w.type, content: comp.notes?.find((n) => n.id === w.id)?.content }))
      .filter((t) => t.content && isTextWidget(t.widget)),
    tasks: comp.tasks.map((t) => ({
      id: t.id, name: t.name, category: t.category, completed: t.completed, outOfScope: t.scope === 'v2' || undefined, pin: t.pinRef?.pinNumber,
    })),
    usedComponents: comp.instances.map((i) => ({ component: nameOf(i.componentId), pin: i.pinRef?.pinNumber })),
    resources: comp.assets?.map((a) => a.name),
    figmaLink: comp.figmaLink,
    images: (comp.images ?? []).map((img) => ({
      id: img.id,
      caption: img.caption,
      filename: img.filename,
      isPrimary: img.isPrimary,
      pins: (img.pins ?? []).map((pin) => {
        const instance = comp.instances.find((i) => i.pinRef?.pinId === pin.id);
        const linked = instance ? nameOf(instance.componentId) : undefined;
        return {
          id: pin.id,
          number: pin.number,
          x: Math.round(pin.x),
          y: Math.round(pin.y),
          label: pin.label,
          kind: pin.kind,
          specs: pin.specs,
          note: pin.note,
          collectionId: pin.collectionId,
          fieldRef: pin.fieldRef,
          linkedComponent: linked,
          description: describePin(pin, collections, linked),
          qualified: isPinQualified(pin, comp),
        };
      }),
    })),
  }));

  return {
    project: {
      id: project.id,
      folderPath,
      name: project.name,
      description: project.description,
      client: project.client,
      version: project.version,
    },
    components,
    collections,
    issues: findCompletenessIssues(project),
  };
}

/** Publie l'instantané au pont, ou `null` quand aucun projet n'est ouvert. */
export async function publishMcpSnapshot(project: Project | null, folderPath?: string): Promise<void> {
  await invoke('set_mcp_snapshot', { snapshot: project ? buildMcpSnapshot(project, folderPath) : null });
}
