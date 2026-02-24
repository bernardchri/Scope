import { ComponentInstance } from '../types';

export interface InstanceSlice {
  addComponentInstance: (projectId: string, parentId: string, componentId: string) => void;
  removeComponentInstance: (projectId: string, parentId: string, instanceId: string) => void;
  updateComponentInstance: (projectId: string, parentId: string, instanceId: string, updates: Partial<ComponentInstance>) => void;
}

export const createInstanceSlice = (set: any) => ({
  addComponentInstance: (projectId: string, parentId: string, componentId: string) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
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
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === parentId
                  ? {
                      ...c,
                      instances: c.instances.map((i: any) =>
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
    set((state: any) => ({
      projects: state.projects.map((p: any) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c: any) =>
                c.id === parentId
                  ? {
                      ...c,
                      instances: c.instances.filter((i: any) => i.id !== instanceId)
                    }
                  : c
              )
            }
          : p
      )
    }));
  }
});