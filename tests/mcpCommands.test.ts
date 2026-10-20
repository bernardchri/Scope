import { describe, it, expect } from 'vitest';
import { runMcpCommand } from '@/lib/mcpCommands';
import { Project } from '@/lib/types';

const project = {
  id: 'p', name: 'Site', createdAt: '',
  collections: [{ id: 'c', name: 'Projets', slug: 'projet', fields: [{ id: 'f1', name: 'titre', kind: 'title' }] }],
  components: [
    {
      id: 'home', name: 'Home', category: 'template', tasks: [], instances: [],
      images: [{ id: 'im', isPrimary: true, pins: [
        { id: 'p1', number: 1, x: 5, y: 5 },
        { id: 'p2', number: 2, x: 6, y: 6, kind: 'title', specs: { maxLength: '64' } },
      ] }],
    },
    { id: 'home2', name: 'Home mobile', category: 'template', tasks: [], instances: [], images: [] },
  ],
} as unknown as Project;

const run = (tool: string, args: Record<string, unknown>) => runMcpCommand(project, tool, { component: 'home', ...args });
const pinsOf = (o: ReturnType<typeof run>) => (o.ok ? o.updates.images![0].pins! : []);

describe('runMcpCommand', () => {
  it('qualifie un pin comme l\'éditeur', () => {
    const out = run('qualify_pin', { pin: 1, kind: 'title', specs: { maxLength: 128, seo: 'h2', editable: 'éditable en backoffice' } });
    expect(out.ok).toBe(true);
    expect(pinsOf(out)[0]).toMatchObject({ kind: 'title', specs: { maxLength: '128', seo: 'H2', editable: 'éditable en backoffice' } });
    if (out.ok) expect((out.result as { pin: { qualified: boolean } }).pin.qualified).toBe(true);
  });

  it('refuse une valeur hors liste ou une clé inconnue, en disant lesquelles sont valides', () => {
    const bad = run('qualify_pin', { pin: 1, kind: 'title', specs: { seo: 'H9' } });
    expect(bad).toMatchObject({ ok: false });
    expect(!bad.ok && bad.error).toContain('H1 | H2');
    const unknown = run('qualify_pin', { pin: 1, kind: 'title', specs: { couleur: 'rouge' } });
    expect(!unknown.ok && unknown.error).toContain('Valides : maxLength');
  });

  it('changer de type repart de zéro, garder le type conserve les précisions', () => {
    expect(pinsOf(run('qualify_pin', { pin: 2, kind: 'text' }))[1].specs).toBeUndefined();
    expect(pinsOf(run('qualify_pin', { pin: 2, kind: 'title', note: 'Accroche' }))[1]).toMatchObject({ specs: { maxLength: '64' }, note: 'Accroche' });
  });

  it('relie une liste à une collection par son nom, et un titre à un champ', () => {
    const list = run('qualify_pin', { pin: 1, kind: 'list', collection: 'projets' });
    expect(pinsOf(list)[0].collectionId).toBe('c');
    const field = run('qualify_pin', { pin: 1, kind: 'title', collection: 'Projets', field: 'titre' });
    expect(pinsOf(field)[0].fieldRef).toEqual({ collectionId: 'c', fieldId: 'f1' });
    expect(run('qualify_pin', { pin: 1, kind: 'title', collection: 'Projets' }).ok).toBe(false);
  });

  it('ajoute un pin avec le prochain numéro', () => {
    const out = run('add_pin', { x: 40, y: 60, kind: 'button', label: 'CTA' });
    expect(pinsOf(out).map((p) => p.number)).toEqual([1, 2, 3]);
    expect(pinsOf(out)[2]).toMatchObject({ x: 40, y: 60, kind: 'button', label: 'CTA' });
    expect(run('add_pin', { x: 140, y: 0 }).ok).toBe(false);
  });

  it('signale les élements ambigus, introuvables ou sans image', () => {
    expect(runMcpCommand(project, 'qualify_pin', { component: 'hom', pin: 1 })).toMatchObject({ ok: false });
    expect(runMcpCommand(project, 'qualify_pin', { component: 'inconnu', pin: 1 })).toMatchObject({ ok: false });
    const noImage = runMcpCommand(project, 'add_pin', { component: 'Home mobile', x: 1, y: 1 });
    expect(!noImage.ok && noImage.error).toContain("n'a pas d'image");
    expect(run('qualify_pin', { pin: 9 }).ok).toBe(false);
  });
});
