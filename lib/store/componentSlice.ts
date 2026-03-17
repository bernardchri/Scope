import { Component } from '../types';

export interface ComponentSlice {
  activeComponentId: string | null;

  setActiveComponent: (componentId: string | null) => void;
  addComponent: (projectId: string, component: Component) => void;
  duplicateComponent: (projectId: string, componentId: string) => string | null;
  deleteComponent: (projectId: string, componentId: string) => void;
  updateComponent: (projectId: string, componentId: string, updates: Partial<Component>) => void;
  reorderComponents: (projectId: string, orderedIds: string[]) => void;
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

  duplicateComponent: (projectId: string, componentId: string): string | null => {
    const state = get();
    const project = state.projects.find((p: any) => p.id === projectId);
    if (!project) return null;
    const source = project.components.find((c: any) => c.id === componentId);
    if (!source) return null;

    const newId = crypto.randomUUID();

    // Build image ID mapping (old → new) for pinRef remapping
    const imageIdMap = new Map<string, string>();
    const pinIdMap = new Map<string, string>();

    const images = (source.images || []).map((img: any) => {
      const newImgId = crypto.randomUUID();
      imageIdMap.set(img.id, newImgId);
      const pins = (img.pins || []).map((pin: any) => {
        const newPinId = crypto.randomUUID();
        pinIdMap.set(pin.id, newPinId);
        return { ...pin, id: newPinId };
      });
      return { ...img, id: newImgId, pins: pins.length ? pins : undefined };
    });

    function remapPinRef(pinRef?: { imageId: string; pinId: string; pinNumber: number }) {
      if (!pinRef) return undefined;
      return {
        imageId: imageIdMap.get(pinRef.imageId) || pinRef.imageId,
        pinId: pinIdMap.get(pinRef.pinId) || pinRef.pinId,
        pinNumber: pinRef.pinNumber,
      };
    }

    // Remap widget IDs for text widgets (notes/paragraph/comment share notes[])
    const widgetIdMap = new Map<string, string>();
    const widgets = source.widgets?.map((w: any) => {
      const newWid = crypto.randomUUID();
      widgetIdMap.set(w.id, newWid);
      return { ...w, id: newWid };
    });

    const notes = source.notes?.map((n: any) => ({
      ...n,
      id: widgetIdMap.get(n.id) || crypto.randomUUID(),
    }));

    const tasks = source.tasks.map((t: any) => ({
      ...t,
      id: crypto.randomUUID(),
      pinRef: remapPinRef(t.pinRef),
    }));

    // Instances: reset componentId references (they point to other components, keep as-is)
    const instances = source.instances.map((inst: any) => ({
      ...inst,
      id: crypto.randomUUID(),
      pinRef: remapPinRef(inst.pinRef),
    }));

    const duplicate: Component = {
      ...source,
      id: newId,
      name: `${source.name} (copie)`,
      images,
      tasks,
      instances,
      widgets,
      notes,
    };

    // Insert right after the source component
    set((state: any) => ({
      projects: state.projects.map((p: any) => {
        if (p.id !== projectId) return p;
        const idx = p.components.findIndex((c: any) => c.id === componentId);
        const components = [...p.components];
        components.splice(idx + 1, 0, duplicate);
        return { ...p, components };
      })
    }));

    return newId;
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

  reorderComponents: (projectId: string, orderedIds: string[]) => {
    set((state: any) => ({
      projects: state.projects.map((p: any) => {
        if (p.id !== projectId) return p;
        const ordered = orderedIds
          .map((id: string) => p.components.find((c: any) => c.id === id))
          .filter(Boolean);
        return { ...p, components: ordered };
      })
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