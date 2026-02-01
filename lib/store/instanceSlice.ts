import { ComponentInstance } from '../types';

export interface InstanceSlice {
  addComponentInstance: (projectId: string, parentId: string, componentId: string) => void;
  removeComponentInstance: (projectId: string, parentId: string, instanceId: string) => void;
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
                          id: `instance-${Date.now()}`,
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