import { describe, it, expect, vi } from 'vitest';
import type { Component, Project } from '@/lib/types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(), open: vi.fn() }));

const { generateStoriesMd, uniqueSlugs } = await import('@/lib/markdownExport');

function makeComponent(overrides: Partial<Component> = {}): Component {
  return { id: 'c1', name: 'Home', category: 'template', instances: [], tasks: [], ...overrides };
}

function makeProject(components: Component[]): Project {
  return { id: 'p1', name: 'Projet', components } as Project;
}

describe('generateStoriesMd — export lisible comme un prompt', () => {
  const header = makeComponent({ id: 'c2', name: 'Header', category: 'component' });
  const home = makeComponent({
    figmaLink: { fileKey: 'FILE', groupNodeId: '1:2' },
    images: [{
      id: 'img1', isPrimary: true, filename: 'a.png',
      pins: [
        { id: 'p1', number: 1, x: 10, y: 10, kind: 'title', specs: { maxLength: '128', seo: 'H2' }, note: 'Accroche' },
        { id: 'p2', number: 2, x: 50, y: 50, label: 'Bandeau' },
        { id: 'p3', number: 3, x: 80, y: 80 },
      ],
    }],
    instances: [
      { id: 'i1', componentId: 'c2', pinRef: { imageId: 'img1', pinId: 'p3', pinNumber: 3 } },
      { id: 'i2', componentId: 'c2' },
    ],
  });

  const imageMap = new Map([['c1', [{ filename: 'home-0.png', cleanFilename: 'home-0-clean.png', imageIndex: 0 }]]]);
  const md = generateStoriesMd(makeProject([header, home]), imageMap);

  it('décrit chaque pin : type, contraintes, nom Figma, composant lié', () => {
    expect(md).toContain('- Pin #1 — Titre — max 128 caractères, SEO : H2 — Accroche');
    expect(md).toContain('- Pin #2 — « Bandeau »');
    expect(md).toContain('- Pin #3 — composant : **Header**');
  });

  it('liste les composants utilisés, y compris une instance sans pin', () => {
    expect(md).toContain('## Composants utilisés');
    expect(md).toContain('- **Header** — pin #3');
  });

  it("référence l'image sans pins, la source Figma et le guide de lecture", () => {
    expect(md).toContain('home-0-clean.png');
    expect(md).toContain('Source Figma : fichier `FILE`, node `1:2`');
    expect(md).toContain('## Comment lire ce document');
  });
});

describe('uniqueSlugs', () => {
  it('suffixe les composants de même nom', () => {
    const slugs = uniqueSlugs([makeComponent({ id: 'a', name: 'Carte' }), makeComponent({ id: 'b', name: 'Carte' })]);
    expect(slugs.get('a')).toBe('carte');
    expect(slugs.get('b')).toBe('carte-2');
  });
});
