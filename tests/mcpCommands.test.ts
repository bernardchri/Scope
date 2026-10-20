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

describe('suivi du développement : prochaines tâches, avancement, notes et code', () => {
  const task = (id: string, name: string, completed: boolean, extra: Record<string, unknown> = {}) => ({ id, name, completed, category: 'frontend', ...extra });
  const dev = {
    id: 'p', name: 'Site', createdAt: '', components: [
      { id: 'home', name: 'Accueil', category: 'template', estimatedHours: 6, instances: [{ id: 'i1', componentId: 'slider' }], tasks: [task('h1', 'Page', false)], images: [] },
      { id: 'slider', name: 'Slider', category: 'section', estimatedHours: 4, instances: [{ id: 'i2', componentId: 'nav' }],
        tasks: [task('s1', 'Structure', true), task('s2', 'Navigation', false, { pinRef: { imageId: 'im', pinId: 'pp', pinNumber: 3 } }), task('s3', 'Évolution', false, { scope: 'v2' }), task('s4', 'Motion', false, { category: 'motion' })],
        images: [{ id: 'im', isPrimary: true, pins: [{ id: 'pp', number: 3, x: 0, y: 0 }] }] },
      { id: 'nav', name: 'Navigation', category: 'component', estimatedHours: 1, instances: [], tasks: [task('n1', 'Flèches', false)], images: [] },
      { id: 'doc', name: 'Cahier', category: 'document', instances: [], tasks: [task('d1', 'Valider la charte', false)], images: [] },
    ],
  } as unknown as Project;

  it('propose les prochaines tâches dans l\'ordre de construction, sans les v2 ni les faites', () => {
    const out = runMcpCommand(dev, 'get_next_tasks', {});
    expect(out.ok && out.query).toBe(true);
    const result = (out.ok ? out.result : {}) as { remaining: number; next: { element: string; name: string }[]; progress: { percent: number } };
    expect(result.next.map(n => `${n.element} / ${n.name}`)).toEqual([
      'Navigation / Flèches', 'Slider / Navigation', 'Slider / Motion', 'Accueil / Page', 'Cahier / Valider la charte',
    ]);
    expect(result.remaining).toBe(5);
    expect(result.progress.percent).toBeGreaterThan(0);
  });

  it('filtre par catégorie, par élément et limite le nombre', () => {
    const motion = runMcpCommand(dev, 'get_next_tasks', { category: 'motion' });
    expect((motion.ok ? (motion.result as { next: unknown[] }).next : []).length).toBe(1);
    const only = runMcpCommand(dev, 'get_next_tasks', { component: 'Slider', limit: 1 });
    expect((only.ok ? (only.result as { next: { name: string }[] }).next : []).map(n => n.name)).toEqual(['Navigation']);
    expect(runMcpCommand(dev, 'get_next_tasks', { category: 'design' }).ok).toBe(false);
  });

  it('résume l\'avancement par catégorie et par élément', () => {
    const out = runMcpCommand(dev, 'get_progress', {});
    const r = (out.ok ? out.result : {}) as { byCategory: Record<string, { done: number; total: number }>; elements: { element: string; percent: number }[] };
    expect(r.byCategory.frontend).toEqual({ done: 1, total: 5 }); // la tâche v2 ne compte pas
    expect(r.byCategory.motion).toEqual({ done: 0, total: 1 });
    expect(r.elements.find(e => e.element === 'Slider')?.percent).toBe(33);
  });

  it('coche une tâche avec une note, retrouvée par son pin, et date la réalisation', () => {
    const out = runMcpCommand(dev, 'update_task', { component: 'Slider', forPin: 3, completed: true, note: 'fait dans slider.php (commit ab12cd)' });
    expect(out.ok).toBe(true);
    const done = out.ok ? out.updates.tasks!.find(t => t.id === 's2')! : undefined;
    expect(done).toMatchObject({ completed: true, note: 'fait dans slider.php (commit ab12cd)' });
    expect(done?.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const undone = runMcpCommand(dev, 'update_task', { component: 'Slider', task: 's1', completed: false });
    expect(undone.ok && undone.updates.tasks!.find(t => t.id === 's1')!.completedAt).toBeUndefined();
    expect(runMcpCommand(dev, 'update_task', { component: 'Slider', forPin: 9, completed: true }).ok).toBe(false);
  });

  it('coche plusieurs tâches d\'un coup, ou rien si l\'une est introuvable', () => {
    const ok = runMcpCommand(dev, 'update_tasks', { component: 'Slider', items: [{ task: 's2', completed: true }, { forPin: 3, note: 'ok' }, { task: 's4', completed: true, note: 'transition CSS' }] });
    expect(ok.ok && ok.updates.tasks!.filter(t => t.completed).map(t => t.id).sort()).toEqual(['s1', 's2', 's4']);
    const bad = runMcpCommand(dev, 'update_tasks', { component: 'Slider', items: [{ task: 's2', completed: true }, { task: 'inconnue', completed: true }] });
    expect(!bad.ok && bad.error).toContain('Rien n\'a été modifié');
    expect(runMcpCommand(dev, 'update_tasks', { component: 'Slider', items: [] }).ok).toBe(false);
  });

  it('enregistre où se trouve le code, en ajoutant ou en remplaçant', () => {
    const first = runMcpCommand(dev, 'link_code', { component: 'Slider', files: ['wp-content/themes/vilaine/slider.php'], branch: 'feature/slider', commit: 'ab12cd' });
    expect(first.ok && first.updates.code).toMatchObject({ files: ['wp-content/themes/vilaine/slider.php'], branch: 'feature/slider', commit: 'ab12cd' });
    const withCode = { ...dev, components: dev.components.map(c => (c.id === 'slider' ? { ...c, code: first.ok ? first.updates.code : undefined } : c)) } as Project;
    const added = runMcpCommand(withCode, 'link_code', { component: 'Slider', files: ['assets/slider.js', 'wp-content/themes/vilaine/slider.php'] });
    expect(added.ok && added.updates.code!.files).toEqual(['wp-content/themes/vilaine/slider.php', 'assets/slider.js']);
    expect(added.ok && added.updates.code!.branch).toBe('feature/slider');
    const replaced = runMcpCommand(withCode, 'link_code', { component: 'Slider', files: ['x.php'], replace: true });
    expect(replaced.ok && replaced.updates.code!.files).toEqual(['x.php']);
    expect(runMcpCommand(dev, 'link_code', { component: 'Slider' }).ok).toBe(false);
    expect(runMcpCommand(withCode, 'link_code', { component: 'Slider', clear: true }).ok).toBe(true);
  });
});
