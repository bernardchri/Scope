import { ComponentInstance } from '../types';
import type { SetState } from './types';

export interface InstanceSlice {
  addComponentInstance: (projectId: string, parentId: string, componentId: string) => void;
  removeComponentInstance: (projectId: string, parentId: string, instanceId: string) => void;
  updateComponentInstance: (projectId: string, parentId: string, instanceId: string, updates: Partial<ComponentInstance>) => void;
}

export const createInstanceSlice = (set: SetState) => ({
  addComponentInstance: (projectId: string, parentId: string, componentId: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c) =>
                c.id === parentId
                  ? {
                      ...c,
                      instances: [
                        ...c.instances,
                        {
                          id: crypto.randomUUID(),
                          componentId
                        }
                      ]
                    }
                  : c
              )
            }
          : p
      )
    }));
  },

  updateComponentInstance: (projectId: string, parentId: string, instanceId: string, updates: Partial<ComponentInstance>) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c) =>
                c.id === parentId
                  ? {
                      ...c,
                      instances: c.instances.map((i) =>
                        i.id === instanceId ? { ...i, ...updates } : i
                      )
                    }
                  : c
              )
            }
          : p
      )
    }));
  },

  removeComponentInstance: (projectId: string, parentId: string, instanceId: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c) =>
                c.id === parentId
                  ? {
                      ...c,
                      instances: c.instances.filter((i) => i.id !== instanceId)
                    }
                  : c
              )
            }
          : p
      )
    }));
  }
});
