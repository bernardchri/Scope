import { Component } from '../types';

export interface ComponentSlice {
  activeComponentId: string | null;
  
  setActiveComponent: (componentId: string | null) => void;
  addComponent: (projectId: string, component: Component) => void;
  deleteComponent: (projectId: string, componentId: string) => void;
}

export const createComponentSlice = (set: any) => ({
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
  }
});