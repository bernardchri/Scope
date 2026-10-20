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

describe('éléments, tâches et textes', () => {
  const doc = {
    id: 'doc', name: 'Cahier', category: 'document', tasks: [
      { id: 't1', name: 'Intégrer le slider', completed: false, category: 'frontend' },
    ], instances: [], images: [{ id: 'im', isPrimary: true, pins: [{ id: 'p1', number: 1, x: 0, y: 0 }] }],
    notes: [{ id: 'n1', content: 'Intro' }], widgets: [{ id: 'n1', type: 'notes' }],
  };
  const withDoc = { ...project, components: [...project.components, doc] } as unknown as Project;
  const go = (tool: string, args: Record<string, unknown>) => runMcpCommand(withDoc, tool, { component: 'Cahier', ...args });

  it('modifie la description, le type et l\'estimation', () => {
    const out = go('update_component', { description: 'Page de cadrage', category: 'section', estimatedHours: 3 });
    expect(out.ok && out.updates).toEqual({ description: 'Page de cadrage', category: 'section', estimatedHours: 3 });
    expect(go('update_component', { category: 'page' }).ok).toBe(false);
    expect(go('update_component', {}).ok).toBe(false);
  });

  it('ajoute, modifie, coche et supprime des tâches', () => {
    const added = go('add_task', { name: 'API contenus', category: 'backend', outOfScope: true, pin: 1 });
    expect(added.ok && added.updates.tasks).toHaveLength(2);
    expect(added.ok && added.updates.tasks![1]).toMatchObject({ name: 'API contenus', category: 'backend', scope: 'v2', pinRef: { pinNumber: 1 } });
    const done = go('update_task', { task: 'intégrer le slider', completed: true, category: 'motion' });
    expect(done.ok && done.updates.tasks![0]).toMatchObject({ completed: true, category: 'motion' });
    expect(go('delete_task', { task: 't1' })).toMatchObject({ ok: true, updates: { tasks: [] } });
    expect(go('update_task', { task: 'inconnue' }).ok).toBe(false);
    expect(go('add_task', { name: 'x', category: 'design' }).ok).toBe(false);
  });

  it('remplace, complète, ajoute et supprime des textes', () => {
    const replaced = go('set_text', { id: 'n1', content: 'Nouvelle intro' });
    expect(replaced.ok && replaced.updates.notes).toEqual([{ id: 'n1', content: 'Nouvelle intro' }]);
    const appended = go('set_text', { id: 'n1', content: 'Suite', mode: 'append' });
    expect(appended.ok && appended.updates.notes![0].content).toBe('Intro\n\nSuite');
    const created = go('set_text', { type: 'comment', content: 'À valider' });
    const textWidgets = (o: ReturnType<typeof go>) => (o.ok ? o.updates.widgets! : []).filter((w) => ['notes', 'paragraph', 'comment'].includes(w.type));
    expect(textWidgets(created)).toHaveLength(2);
    expect(created.ok && created.updates.notes).toHaveLength(2);
    const deleted = go('delete_text', { id: 'n1' });
    expect(textWidgets(deleted)).toHaveLength(0);
    expect(deleted.ok && deleted.updates.notes).toEqual([]);
    expect(go('set_text', { id: 'absent', content: 'x' }).ok).toBe(false);
  });

  it('remplit le bloc de notes vide d\'un document vierge au lieu d\'en ajouter un', () => {
    const blank = { id: 'b', name: 'Vierge', category: 'document', tasks: [], instances: [] };
    const out = runMcpCommand({ ...project, components: [blank] } as unknown as Project, 'set_text', { component: 'Vierge', content: '# Titre' });
    expect(out.ok && out.updates.widgets!.filter((w) => w.type === 'notes')).toHaveLength(1);
    expect(out.ok && out.updates.notes).toHaveLength(1);
    expect(out.ok && out.updates.notes![0].content).toBe('# Titre');
  });
});
