import { Field } from '../types';

export interface FieldSlice {
  addField: (projectId: string, componentId: string, field: Field) => void;
  deleteField: (projectId: string, componentId: string, fieldId: string) => void;
  updateField: (projectId: string, componentId: string, fieldId: string, updates: Partial<Field>) => void;
}

export const createFieldSlice = (set: any) => ({
  addField: (projectId: string, componentId: string, field: Field) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId
                  ? { ...c, fields: [...c.fields, field] }
                  : c
              )
            }
          : p
      )
    }));
  },
  
  deleteField: (projectId: string, componentId: string, fieldId: string) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId
                  ? { ...c, fields: c.fields.filter((f: any) => f.id !== fieldId) }
                  : c
              )
            }
          : p
      )
    }));
  },
  
  updateField: (projectId: string, componentId: string, fieldId: string, updates: Partial<Field>) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId
                  ? {
                      ...c,
                      fields: c.fields.map((f: any) =>
                        f.id === fieldId ? { ...f, ...updates } : f
                      )
                    }
                  : c
              )
            }
          : p
      )
    }));
  }
});