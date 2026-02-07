import { Project, Component, ComponentImage } from './types';

export function migrateProjectsToV2(projects: Project[]): Project[] {
  return projects.map(project => ({
    ...project,
    components: project.components.map(component => {
      // 🆕 Migration imageBase64 → images
      let images: ComponentImage[] = [];
      
      if ((component as any).images && Array.isArray((component as any).images)) {
        // Déjà migré
        images = (component as any).images;
      } else if ((component as any).imageBase64) {
        // Ancienne structure : convertir
        images = [{
          id: 'legacy-' + Date.now(),
          base64: (component as any).imageBase64,
          isPrimary: true
        }];
      }

      return {
        ...component,
        instances: (component as any).instances || [],
        description: (component as any).description || undefined,
        category: (component as any).category || 'element',
        imageBase64: (component as any).imageBase64 || undefined, // Garder pour compatibilité
        images, // 🆕
        tasks: ((component as any).tasks || []).map((task: any) => ({
          id: task.id,
          name: task.name,
          completed: task.completed,
          category: task.category || 'frontend'
        })),
        content: (component as any).content || undefined
      };
    })
  }));
}