import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { buildMcpSnapshot } from '@/lib/mcpSnapshot';
import { Project } from '@/lib/types';

const project = {
  id: 'p', name: 'Site', createdAt: '',
  collections: [{ id: 'c', name: 'Projets', slug: 'projet', fields: [] }],
  components: [
    {
      id: 'home', name: 'Home', category: 'template', tasks: [],
      instances: [{ id: 'i', componentId: 'slider', pinRef: { imageId: 'im', pinId: 'p2', pinNumber: 2 } }],
      images: [{
        id: 'im', isPrimary: true, base64: 'NE-DOIT-PAS-SORTIR',
        pins: [
          { id: 'p1', number: 1, x: 10.4, y: 20.6, kind: 'list', collectionId: 'c' },
          { id: 'p2', number: 2, x: 0, y: 0, label: 'Slider' },
          { id: 'p3', number: 3, x: 0, y: 0 },
        ],
      }],
    },
    { id: 'slider', name: 'Slider', category: 'component', tasks: [], instances: [] },
  ],
} as unknown as Project;

describe('buildMcpSnapshot', () => {
  const snap = buildMcpSnapshot(project);
  const pins = snap.components[0].images[0].pins;

  it("n'embarque pas les images", () => {
    expect(JSON.stringify(snap)).not.toContain('NE-DOIT-PAS-SORTIR');
  });

  it('décrit et qualifie chaque pin', () => {
    expect(pins[0].description).toBe('Liste — entrées de la collection « Projets »');
    expect(pins.map((p) => p.qualified)).toEqual([true, true, false]);
    expect(pins[1].linkedComponent).toBe('Slider');
  });

  it('remonte les points à compléter', () => {
    expect(snap.issues.map((i) => i.id)).toContain('pins-home');
  });
});
