import { Component } from '../types';

export interface ComponentSlice {
  activeComponentId: string | null;
  
  setActiveComponent: (componentId: string | null) => void;
  addComponent: (projectId: string, component: Component) => void;
  deleteComponent: (projectId: string, componentId: string) => void;
  updateComponent: (projectId: string, componentId: string, updates: Partial<Component>) => void; // 🆕
  canDeleteComponent: (projectId: string, componentId: string) => boolean;
}

export const createComponentSlice = (set: any, get: any) => ({
  activeComponentId: null,
  
  setActiveComponent: (componentId: string | null) => set({ activeComponentId: componentId }),
  
  addComponent: (projectId: string, component: Component) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? { ...p, components: [...p.components, component] }
          : p
      )
    }));
  },
  
  deleteComponent: (projectId: string, componentId: string) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? { ...p, components: p.components.filter((c: any) => c.id !== componentId) }
          : p
      ),
      activeComponentId: state.activeComponentId === componentId ? null : state.activeComponentId
    }));
  },

  // 🆕 Mettre à jour un composant
  updateComponent: (projectId: string, componentId: string, updates: Partial<Component>) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === componentId ? { ...c, ...updates } : c
              )
            }
          : p
      )
    }));
  },

  canDeleteComponent: (projectId: string, componentId: string) => {
    const state = get();
    const project = state.projects.find((p: any) => p.id === projectId);
    if (!project) return true;

    const isUsed = project.components.some((c: any) =>
      c.instances.some((i: any) => i.componentId === componentId)
    );

    return !isUsed;
  }
});