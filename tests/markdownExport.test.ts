import { describe, it, expect, vi } from 'vitest';
import type { Component, Project } from '@/lib/types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(), open: vi.fn() }));

const { generateStoriesMd, uniqueSlugs, exportFileNames, staleExportFiles } = await import('@/lib/markdownExport');

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

describe('generateStoriesMd — maquettes', () => {
  it('donne la taille et le lien Figma de chaque image, sans lien exploitable pour un groupe d\'états', () => {
    const home = makeComponent({ figmaLink: { fileKey: 'FILE', groupNodeId: '0:1:accueil' } });
    const imageMap = new Map([['c1', [
      { filename: 'home-0.png', caption: 'desktop', imageIndex: 0, width: 1440, height: 900, figmaUrl: 'https://www.figma.com/design/FILE?node-id=12-34' },
    ]]]);
    const md = generateStoriesMd(makeProject([home]), imageMap);
    expect(md).toContain('_desktop — maquette 1440×900 px · [frame dans Figma](https://www.figma.com/design/FILE?node-id=12-34)_');
    expect(md).toContain('Source Figma : fichier `FILE` — le lien de chaque maquette est donné sous son image.');
    expect(md).not.toContain('0:1:accueil');
  });
});

describe('uniqueSlugs', () => {
  it('suffixe les composants de même nom', () => {
    const slugs = uniqueSlugs([makeComponent({ id: 'a', name: 'Carte' }), makeComponent({ id: 'b', name: 'Carte' })]);
    expect(slugs.get('a')).toBe('carte');
    expect(slugs.get('b')).toBe('carte-2');
  });
});

describe('generateStoriesMd — design tokens', () => {
  it('ajoute la section et le guide de lecture quand le projet a des tokens', () => {
    const project = {
      ...makeProject([makeComponent()]),
      tokens: {
        syncedAt: '2026-10-20T10:00:00.000Z', fileName: 'Site',
        collections: [{ name: 'Couleurs', defaultMode: 'Mode 1', modes: ['Mode 1'], variables: [{ name: 'brand', type: 'COLOR', values: { 'Mode 1': '#ff0000' } }] }],
        textStyles: [], colorStyles: [], effectStyles: [],
      },
    } as Project;
    const md = generateStoriesMd(project);
    expect(md).toContain('## Design tokens');
    expect(md).toContain('| brand | `--brand` | `#ff0000` |');
    expect(md).toContain('tokens.css');
    expect(generateStoriesMd(makeProject([makeComponent()]))).not.toContain('## Design tokens');
  });
});

describe('generateStoriesMd — documents avec notes', () => {
  it('garde la todo-liste, les pins et les composants utilisés d\'un document ou d\'un template qui a des notes', () => {
    const header = makeComponent({ id: 'h', name: 'Header', category: 'component' });
    const doc = makeComponent({
      id: 'd', name: 'Cahier', category: 'document',
      notes: [{ id: 'n1', content: 'Intro du cahier' }],
      widgets: [{ id: 'n1', type: 'notes' }, { id: 'tasks', type: 'tasks' }],
      tasks: [
        { id: 't1', name: 'Valider la charte', completed: false, category: 'frontend' },
        { id: 't2', name: 'API contenus', completed: true, category: 'backend' },
        { id: 't3', name: 'Version anglaise', completed: false, category: 'frontend', scope: 'v2' },
      ],
      instances: [{ id: 'i1', componentId: 'h' }],
    });
    const md = generateStoriesMd(makeProject([doc, header]));
    expect(md).toContain('## Contenu\n\nIntro du cahier');
    expect(md).toContain('Valider la charte');
    expect(md).toContain('API contenus');
    expect(md).toContain('v2: Version anglaise');
    expect(md).toContain('## Composants utilisés');
  });
});

describe('noms de fichiers de l\'export multi-fichiers', () => {
  const doc = makeComponent({ id: '7d3f2a10-1111-4222-8333-444455556666', name: 'Stack technique', category: 'document' });
  const home = makeComponent({ id: 'c9e81b22-aaaa-4bbb-8ccc-ddddeeeeffff', name: 'Accueil', category: 'template' });
  const header = makeComponent({ id: '5a6b7c8d-0000-4111-8222-333344445555', name: 'Header', category: 'component' });

  it('utilise le début de l\'id plutôt qu\'un numéro d\'ordre : déplacer un élément ne change aucun nom', () => {
    const slugs = (list: Component[]) => uniqueSlugs(list);
    const before = exportFileNames([doc, home, header], slugs([doc, home, header]));
    const after = exportFileNames([header, home, doc], slugs([header, home, doc]));
    expect(before.get(doc.id)).toBe('document_stack-technique_7d3f2a.md');
    expect(before.get(home.id)).toBe('template_accueil_c9e81b.md');
    expect([...after.entries()].sort()).toEqual([...before.entries()].sort());
  });

  it('allonge l\'identifiant quand deux éléments commencent pareil', () => {
    const twin = makeComponent({ id: '7d3f2a10-ffff-4222-8333-444455556666', name: 'Stack technique', category: 'document' });
    const names = exportFileNames([doc, twin], uniqueSlugs([doc, twin]));
    expect(new Set(names.values()).size).toBe(2);
    expect(names.get(doc.id)).toMatch(/_7d3f2a10[0-9a-f]*\.md$/);
  });

  it('repère les anciens fichiers à supprimer, jamais index.md ni les fichiers étrangers', () => {
    const current = exportFileNames([doc, home], uniqueSlugs([doc, home]));
    const existing = [
      'index.md', 'notes-perso.md', 'README.md',
      '01_document_stack-technique.md', '02_template_accueil.md', // ancienne numérotation
      'template_ancien-nom_c9e81b.md', // renommé depuis
      ...current.values(),
    ];
    expect(staleExportFiles(existing, current).sort()).toEqual(['01_document_stack-technique.md', '02_template_accueil.md', 'template_ancien-nom_c9e81b.md']);
  });

  it('écrit l\'identifiant de l\'élément dans sa fiche', () => {
    expect(generateStoriesMd(makeProject([home]))).toContain(`<!-- scope-id: ${home.id} -->`);
  });
});
