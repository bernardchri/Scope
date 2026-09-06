import { Component } from '../types';
import type { SetState, GetState } from './types';

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

export const createComponentSlice = (set: SetState, get: GetState) => ({
  activeComponentId: null as string | null,

  setActiveComponent: (componentId: string | null) => set({ activeComponentId: componentId }),

  addComponent: (projectId: string, component: Component) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, components: [...p.components, component] }
          : p
      )
    }));
  },

  duplicateComponent: (projectId: string, componentId: string): string | null => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return null;
    const source = project.components.find((c) => c.id === componentId);
    if (!source) return null;

    const newId = crypto.randomUUID();

    // Build image ID mapping (old → new) for pinRef remapping
    const imageIdMap = new Map<string, string>();
    const pinIdMap = new Map<string, string>();

    const images = (source.images || []).map((img) => {
      const newImgId = crypto.randomUUID();
      imageIdMap.set(img.id, newImgId);
      const pins = (img.pins || []).map((pin) => {
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
    const widgets = source.widgets?.map((w) => {
      const newWid = crypto.randomUUID();
      widgetIdMap.set(w.id, newWid);
      return { ...w, id: newWid };
    });

    const notes = source.notes?.map((n) => ({
      ...n,
      id: widgetIdMap.get(n.id) || crypto.randomUUID(),
    }));

    const tasks = source.tasks.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      pinRef: remapPinRef(t.pinRef),
    }));

    // Instances: reset componentId references (they point to other components, keep as-is)
    const instances = source.instances.map((inst) => ({
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
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const idx = p.components.findIndex((c) => c.id === componentId);
        const components = [...p.components];
        components.splice(idx + 1, 0, duplicate);
        return { ...p, components };
      })
    }));

    return newId;
  },

  deleteComponent: (projectId: string, componentId: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, components: p.components.filter((c) => c.id !== componentId) }
          : p
      ),
      activeComponentId: state.activeComponentId === componentId ? null : state.activeComponentId
    }));
  },

  updateComponent: (projectId: string, componentId: string, updates: Partial<Component>) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              components: p.components.map((c) =>
                c.id === componentId ? { ...c, ...updates } : c
              )
            }
          : p
      )
    }));
  },

  reorderComponents: (projectId: string, orderedIds: string[]) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const ordered = orderedIds
          .map((id) => p.components.find((c) => c.id === id))
          .filter((c): c is Component => Boolean(c));
        return { ...p, components: ordered };
      })
    }));
  },

  canDeleteComponent: (projectId: string, componentId: string) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return true;

    const isUsed = project.components.some((c) =>
      c.instances.some((i) => i.componentId === componentId)
    );

    return !isUsed;
  }
});
