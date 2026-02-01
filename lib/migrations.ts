import { Project, Component } from './types';

export function migrateProjectsToV2(projects: Project[]): Project[] {
  return projects.map(project => ({
    ...project,
    components: project.components.map(component => ({
      ...component,
      instances: (component as any).instances || [],
      description: (component as any).description || undefined,  // 🆕
      category: (component as any).category || 'element'         // 🆕 Défaut: element
    }))
  }));
}