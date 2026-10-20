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

describe('brief de développement', () => {
  it('réunit reste à faire, tokens, collections concernées et éléments à réutiliser dans l\'ordre', async () => {
    const { generateBriefMd } = await import('@/lib/markdownExport');
    const nav = c('nav', 'Navigation', 'component');
    const push = c('push', 'Push', 'component', ['nav']);
    const slider = c('slider', 'Slider', 'section', ['push', 'nav'], {
      estimatedHours: 4,
      tasks: [
        { id: 'task-1', name: 'Structure', completed: true, category: 'frontend' },
        { id: 'task-2', name: 'Navigation', completed: false, category: 'frontend', pinRef: { imageId: 'i', pinId: 'p', pinNumber: 3 } },
        { id: 'task-3', name: 'Version anglaise', completed: false, category: 'frontend', scope: 'v2' },
      ],
      images: [{ id: 'i', isPrimary: true, pins: [{ id: 'p', number: 3, x: 1, y: 1, kind: 'list', collectionId: 'ouv' }] }],
    });
    const other = { id: 'zzz', name: 'Autre collection', slug: 'autre', fields: [] };
    const brief = generateBriefMd({
      ...project, components: [home, slider, push, nav],
      collections: [ouvrages, other],
      tokens: { syncedAt: '2026-10-20T00:00:00.000Z', collections: [], textStyles: [], effectStyles: [], colorStyles: [{ name: 'Accent', origin: 'manual', paints: [{ type: 'SOLID', color: '#b694b5' }] }] },
    } as Project, 'slider')!;
    expect(brief).toContain('# Brief de développement : Slider');
    expect(brief).toContain('**Avancement :** 1/2 · 50 % tâches');
    expect(brief).toContain('- [ ] Navigation — `frontend`, id : `task-2` (pin #3)');
    expect(brief).not.toContain('task-3'); // évolution v2 : hors périmètre
    expect(brief).not.toContain('id : `task-1`'); // déjà faite
    expect(brief).toContain('## Design tokens');
    expect(brief).toContain('Collection « Ouvrages »');
    expect(brief).not.toContain('Autre collection');
    expect(brief).toContain('Dans l\'ordre de construction : Navigation → Push.');
    expect(brief.indexOf('# Navigation')).toBeLessThan(brief.indexOf('# Push'));
    expect(brief.indexOf('# Push')).toBeLessThan(brief.indexOf('# Slider'));
    expect(brief).toContain('update_task');
    expect(generateBriefMd(project, 'absent')).toBeNull();
  });

  it('propose de planifier quand il n\'y a aucune tâche', async () => {
    const { generateBriefMd } = await import('@/lib/markdownExport');
    expect(generateBriefMd(project, 'logo')).toContain('Aucune tâche n\'est planifiée');
  });

  it('le brief est une lecture : rien à appliquer au projet', () => {
    const out = runMcpCommand(project, 'get_build_brief', { component: 'Accueil' });
    expect(out.ok && out.query).toBe(true);
    expect(out.ok && typeof out.result).toBe('string');
  });
});
