import { Project, Component } from './types';

export function migrateProjectsToV2(projects: Project[]): Project[] {
  return projects.map(project => ({
    ...project,
    components: project.components.map(component => ({
      ...component,
      instances: (component as any).instances || [],
      description: (component as any).description || undefined,
      category: (component as any).category || 'element',
      imageBase64: (component as any).imageBase64 || undefined,
      tasks: ((component as any).tasks || []).map((task: any) => ({
        id: task.id,
        name: task.name,
        completed: task.completed,
        category: task.category || 'frontend'
      })),
      // 🆕 Migration pour documents
      content: (component as any).content || undefined
    }))
  }));
}