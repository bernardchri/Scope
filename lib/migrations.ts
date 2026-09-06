/* eslint-disable @typescript-eslint/no-explicit-any --
 * Ce module normalise des projets issus d'anciens formats JSON dont la forme
 * n'est pas typée (champs disparus, renommés, structures legacy). Les `any` y
 * sont assumés : on inspecte des données brutes avant de les couler dans `Project`. */
import { Project, ComponentImage, ScopeItemType, WidgetInstance, NoteData } from './types';

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

      // Migrate old 9-category system to 4-type system
      const oldCategory = (component as any).category || 'element';
      const VALID_TYPES: ScopeItemType[] = ['document', 'template', 'section', 'component'];
      const category: ScopeItemType = VALID_TYPES.includes(oldCategory) ? oldCategory : 'component';

      return {
        ...component,
        instances: (component as any).instances || [],
        description: (component as any).description || undefined,
        category,
        estimatedHours: (component as any).estimatedHours,
        imageBase64: (component as any).imageBase64 || undefined,
        images,
        tasks: ((component as any).tasks || []).map((task: any) => ({
          ...task,
          category: task.category || 'frontend',
        })),
        content: (component as any).content || undefined,
        ...migrateWidgetsAndNotes(component as any),
      };
    })
  }));
}

/** Migrate widgets from WidgetType[] to WidgetInstance[] and content to notes[] */
function migrateWidgetsAndNotes(component: any): { widgets?: WidgetInstance[]; notes?: NoteData[] } {
  const result: { widgets?: WidgetInstance[]; notes?: NoteData[] } = {};

  // Migrate widgets: string[] → WidgetInstance[]
  const rawWidgets = component.widgets;
  if (Array.isArray(rawWidgets) && rawWidgets.length > 0) {
    if (typeof rawWidgets[0] === 'string') {
      // Old format: WidgetType[]
      result.widgets = (rawWidgets as string[]).map(type => {
        if (type === 'notes') {
          const noteId = crypto.randomUUID();
          return { id: noteId, type: 'notes' as const };
        }
        return { id: type, type: type as any };
      });
    } else {
      // Already new format
      result.widgets = rawWidgets;
    }
  }

  // Migrate content → notes[]
  const existingNotes = component.notes;
  if (Array.isArray(existingNotes) && existingNotes.length > 0) {
    result.notes = existingNotes;
  } else if (component.content) {
    // Find the notes widget ID (from already-migrated widgets, or generate one)
    const notesWidget = result.widgets?.find((w: WidgetInstance) => w.type === 'notes');
    const noteId = notesWidget?.id ?? crypto.randomUUID();
    result.notes = [{ id: noteId, content: component.content }];
    // If widgets weren't set but we had content, make sure the note ID matches
    // when defaults are used later via getActiveWidgets
  }

  return result;
}