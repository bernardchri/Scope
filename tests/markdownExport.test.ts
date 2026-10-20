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

describe('generateStoriesMd — légende des pins', () => {
  it('nomme chaque image par sa légende et indique la position de chaque pin', () => {
    const comp = makeComponent({
      images: [
        { id: 'a', isPrimary: true, caption: 'desktop', pins: [{ id: 'p1', number: 1, x: 12.4, y: 8, kind: 'title' }] },
        { id: 'b', isPrimary: false, caption: 'mobile', pins: [{ id: 'p2', number: 1, x: 50, y: 49.6, kind: 'button' }] },
      ],
    });
    const imageMap = new Map([['c1', [{ filename: 'home-0.png', imageIndex: 0 }, { filename: 'home-1.png', imageIndex: 1 }]]]);
    const md = generateStoriesMd(makeProject([comp]), imageMap);
    expect(md).toContain('**Image 1 — desktop (home-0.png)**');
    expect(md).toContain('**Image 2 — mobile (home-1.png)**');
    expect(md).toContain('- Pin #1 — Titre — position : 12 % / 8 %');
    expect(md).toContain('- Pin #1 — Bouton — position : 50 % / 50 %');
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
  const names = (list: Component[]) => exportFileNames(list, uniqueSlugs(list));

  it('utilise le début de l\'id : ni déplacement ni changement de type ne changent le nom', () => {
    const before = names([doc, home, header]);
    expect(before.get(doc.id)).toBe('stack-technique_7d3f2a.md');
    expect(before.get(home.id)).toBe('accueil_c9e81b.md');
    expect([...names([header, home, doc]).entries()].sort()).toEqual([...before.entries()].sort());
    // document → section → composant : même fichier
    for (const category of ['section', 'component'] as const) {
      expect(names([{ ...doc, category }, home, header]).get(doc.id)).toBe('stack-technique_7d3f2a.md');
    }
  });

  it('allonge l\'identifiant quand deux éléments commencent pareil', () => {
    const twin = makeComponent({ id: '7d3f2a10-ffff-4222-8333-444455556666', name: 'Stack technique', category: 'document' });
    const both = names([doc, twin]);
    expect(new Set(both.values()).size).toBe(2);
    expect(both.get(doc.id)).toMatch(/_7d3f2a10[0-9a-f]*\.md$/);
  });

  it('remplace sans demander un fichier du même élément sous un autre nom, et signale les orphelins', () => {
    const current = names([doc, home]);
    const existing = [
      'index.md', 'notes-perso.md', 'README.md', 'tokens.css',
      ...current.values(),
      'ancien-nom_7d3f2a.md', // doc renommé
      'document_stack-technique_7d3f2a.md', // ancien format (type dans le nom), même élément
      '02_template_accueil.md', // ancienne numérotation : pas d'identifiant
      'section_supprimee_123abc.md', // élément supprimé
      'supprime_9f8e7d.md', // élément supprimé, format actuel
    ];
    const { replaced, orphans } = staleExportFiles(existing, current);
    expect(replaced.sort()).toEqual(['ancien-nom_7d3f2a.md', 'document_stack-technique_7d3f2a.md']);
    expect(orphans.sort()).toEqual(['02_template_accueil.md', 'section_supprimee_123abc.md', 'supprime_9f8e7d.md']);
  });

  it('écrit l\'identifiant de l\'élément dans sa fiche', () => {
    const md = generateStoriesMd(makeProject([home]));
    expect(md).toContain(`<!-- scope-id: ${home.id} · type: template -->`);
    expect(md).toContain('**Type :** Template');
    expect(generateStoriesMd(makeProject([doc]))).toContain('**Type :** Document');
  });
});
