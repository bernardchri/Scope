import { describe, it, expect, vi } from 'vitest';
import type { Component, Project } from '@/lib/types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(), open: vi.fn() }));

const { generateStoriesMd } = await import('@/lib/markdownExport');
const { buildOrder, usedBy } = await import('@/lib/buildOrder');
const { findCompletenessIssues } = await import('@/lib/completeness');
const { runMcpCommand } = await import('@/lib/mcpCommands');
const { generateContentModelMd } = await import('@/lib/collections');

const c = (id: string, name: string, category: Component['category'], uses: string[] = [], extra: Partial<Component> = {}) =>
  ({ id, name, category, tasks: [], instances: uses.map((u, i) => ({ id: `${id}-${i}`, componentId: u })), ...extra }) as Component;

const logo = c('logo', 'Logo', 'component');
const header = c('header', 'Header', 'section', ['logo']);
const home = c('home', 'Accueil', 'template', ['header', 'logo'], {
  page: { route: '/', seoTitle: 'La Vilaine', seoDescription: 'Éditions', collectionId: 'ouv', collectionRole: 'list' },
});
const doc = c('doc', 'Stack technique', 'document');
const ouvrages = { id: 'ouv', name: 'Ouvrages', slug: 'ouvrage', hasDetailPage: true, fields: [] };
const project = { id: 'p', name: 'Site', components: [home, doc, header, logo], collections: [ouvrages] } as unknown as Project;

describe('ordre de construction', () => {
  it('place chaque élément après ceux qu\'il utilise, sans les documents', () => {
    expect(buildOrder(project.components).map(x => x.name)).toEqual(['Logo', 'Header', 'Accueil']);
  });

  it('coupe les cycles sans planter', () => {
    const a = c('a', 'A', 'component', ['b']);
    const b = c('b', 'B', 'component', ['a']);
    expect(buildOrder([a, b]).map(x => x.name).sort()).toEqual(['A', 'B']);
  });

  it('retrouve les éléments qui en utilisent un autre', () => {
    expect(usedBy(logo, project.components).map(x => x.name).sort()).toEqual(['Accueil', 'Header']);
  });
});

describe('export Markdown — page, utilisé dans, ordre', () => {
  const md = generateStoriesMd(project);

  it('décrit la page d\'un template', () => {
    expect(md).toContain('## Page');
    expect(md).toContain('- Adresse : `/`');
    expect(md).toContain('- Titre SEO : La Vilaine');
    expect(md).toContain('- Affiche la liste des entrées de la collection [Ouvrages](#collection-ouvrage)');
  });

  it('indique où un composant est utilisé et l\'ordre à suivre', () => {
    expect(md).toContain('## Utilisé dans');
    expect(md).toContain('## Ordre de construction suggéré');
    expect(md).toMatch(/1\. Logo\n2\. Header\n3\. Accueil/);
  });

  it('relie la collection à ses pages', () => {
    expect(generateContentModelMd([ouvrages], '##', project.components)).toContain('Pages : Accueil (liste, `/`).');
  });
});

describe('points à compléter — pages', () => {
  it('signale la route manquante et la page de détail sans template', () => {
    const ids = findCompletenessIssues({ components: [c('t', 'Contact', 'template')], collections: [ouvrages] }).map(i => i.id);
    expect(ids).toContain('page-noroute-t');
    expect(ids).toContain('coll-nodetail-ouv');
    const ok = findCompletenessIssues({
      components: [c('t', 'Fiche', 'template', [], { page: { route: '/o/:slug', collectionId: 'ouv', collectionRole: 'single' } })],
      collections: [ouvrages],
    }).map(i => i.id);
    expect(ok).not.toContain('coll-nodetail-ouv');
    expect(ok).not.toContain('coll-unused-ouv');
  });
});

describe('MCP — page d\'un template', () => {
  it('renseigne route, SEO et collection, et les retire', () => {
    const out = runMcpCommand(project, 'update_component', { component: 'Accueil', route: '/ouvrages', collection: 'ouvrages', collectionRole: 'single' });
    expect(out.ok && out.updates.page).toMatchObject({ route: '/ouvrages', collectionId: 'ouv', collectionRole: 'single', seoTitle: 'La Vilaine' });
    const cleared = runMcpCommand(project, 'update_component', { component: 'Accueil', collection: '' });
    expect(cleared.ok && cleared.updates.page?.collectionId).toBeUndefined();
    expect(cleared.ok && cleared.updates.page?.collectionRole).toBeUndefined();
    expect(runMcpCommand(project, 'update_component', { component: 'Accueil', collection: 'inconnue' }).ok).toBe(false);
    expect(runMcpCommand(project, 'update_component', { component: 'Accueil', collectionRole: 'autre' }).ok).toBe(false);
  });
});
