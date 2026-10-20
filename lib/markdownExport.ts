import { invoke } from '@tauri-apps/api/core';
import { save, open, ask } from '@tauri-apps/plugin-dialog';
import { Project, Component } from './types';
import { CATEGORY_SECTION_LABELS, TYPE_LABELS, PDF_DISPLAY_ORDER, getActiveWidgets, isBlockText, blockTextToMarkdown } from './categoryHelpers';
import { TASK_CATEGORY_ORDER, TASK_CATEGORY_PLAIN_LABELS } from './taskCategoryHelpers';
import { slugify } from './persistence';
import { renderImageWithPins } from './imageHelpers';
import { describePin } from './pinKinds';
import { generateContentModelMd, collectionLink } from './collections';
import { findCollection, flattenFields } from './collectionLookup';
import { buildOrder, generateBuildOrderMd, usedBy } from './buildOrder';
import { isPinQualified } from './completeness';
import { Collection } from './types';
import { figmaNodeUrl } from './figmaUrl';
import { componentProgress, projectProgress, progressLabel } from './progress';
import { tokensToCss, tokensToJson, tokensToMarkdown } from './designTokens';
import { getImageBase64 } from './imageManager';
import { getAppSettings } from './persistence';

const CATEGORY_ORDER = PDF_DISPLAY_ORDER;

type ImageRef = {
  filename: string;
  /** Même image sans pins incrustés, si des pins sont dessinés. */
  cleanFilename?: string;
  caption?: string;
  imageIndex: number;
  /** Taille de la frame Figma d'origine (px) et lien vers elle. */
  width?: number;
  height?: number;
  figmaUrl?: string;
};
type ImageMap = Map<string, ImageRef[]>;
/** Chemins relatifs (depuis le Markdown) des SVG exportés, par composant. */
type AssetRef = { path: string; name: string };
type AssetMap = Map<string, AssetRef[]>;

/** Slug unique par composant (suffixe -2, -3… si deux composants portent le même nom). */
/** Début de l'identifiant d'un élément, assez long pour être unique dans le projet (6 caractères, davantage en cas de collision). */
function shortIds(components: Component[]): Map<string, string> {
  const compact = (id: string) => id.replace(/-/g, '');
  for (let length = 6; length <= 32; length += 2) {
    const ids = new Map(components.map(c => [c.id, compact(c.id).slice(0, length)]));
    if (new Set(ids.values()).size === ids.size) return ids;
  }
  return new Map(components.map(c => [c.id, compact(c.id)]));
}

/**
 * Nom de fichier de chaque fiche en export multi-fichiers : `<nom>_<id>.md`. L'identifiant (début de l'id de
 * l'élément) ne change ni quand on déplace un élément, ni quand on en ajoute, ni quand on change son type
 * (document, section, composant…) : un nouvel export réécrit le même fichier. Le type est dans la fiche
 * et dans `index.md`, pas dans le nom.
 */
export function exportFileNames(components: Component[], slugs: Map<string, string>): Map<string, string> {
  const ids = shortIds(components);
  const names = new Map<string, string>();
  for (const category of CATEGORY_ORDER) {
    for (const comp of components.filter(c => c.category === category)) {
      names.set(comp.id, `${slugs.get(comp.id)}_${ids.get(comp.id)}.md`);
    }
  }
  return names;
}

/** Anciennes numérotations : `01_document_nom.md` (ordre), `document_nom_ab12cd.md` (type dans le nom). */
const LEGACY_EXPORT_FILE = /^(?:\d{2}_(?:document|component|template|section)_.+|(?:document|component|template|section)_.+_[0-9a-f]{6,32})\.md$/;
/** Format actuel : `nom_ab12cd.md` ; le groupe capture l'identifiant. */
const EXPORT_FILE = /^.+_([0-9a-f]{6,32})\.md$/;

/**
 * Fichiers d'un export précédent qui n'existent plus sous ce nom :
 * - `replaced` : même élément (même identifiant) sous un autre nom, parce qu'il a été renommé ou que l'ancien format
 *   mettait le type dans le nom. La fiche actuelle les remplace : on peut les supprimer sans rien demander ;
 * - `orphans` : plus aucun élément correspondant (supprimé, ou ancienne numérotation sans identifiant) : à confirmer.
 * `index.md` et les fichiers d'autres noms ne sont jamais concernés.
 */
export function staleExportFiles(existing: string[], current: Map<string, string>): { replaced: string[]; orphans: string[] } {
  const keep = new Set(current.values());
  const currentIds = new Set([...current.values()].map(name => name.match(EXPORT_FILE)?.[1]));
  const replaced: string[] = [];
  const orphans: string[] = [];
  for (const name of existing) {
    if (keep.has(name) || !(LEGACY_EXPORT_FILE.test(name) || EXPORT_FILE.test(name))) continue;
    const id = name.match(/_([0-9a-f]{6,32})\.md$/)?.[1];
    (id !== undefined && currentIds.has(id) ? replaced : orphans).push(name);
  }
  return { replaced, orphans };
}

export function uniqueSlugs(components: Component[]): Map<string, string> {
  const used = new Set<string>();
  const slugs = new Map<string, string>();
  for (const comp of components) {
    const base = slugify(comp.name) || 'element';
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    slugs.set(comp.id, slug);
  }
  return slugs;
}

/** Consignes de lecture, en tête du document : le Markdown sert aussi de prompt (IA, développeur). */
const READING_GUIDE = [
  '## Comment lire ce document',
  '',
  '- Chaque section décrit un élément (composant, template, section, document) : description, images, éléments repérés, composants utilisés, tâches.',
  '- Les images portent des pins numérotés ; la liste « Éléments repérés (pins) » donne pour chaque numéro son type, ses contraintes (longueur max, contenu éditable ou non, balise SEO…), le composant lié et les précisions.',
  '- Une version sans pins est fournie à côté de chaque image annotée : à utiliser pour reproduire la maquette fidèlement.',
  '- « Composants utilisés » liste les composants à réutiliser plutôt qu\'à recréer ; « Éléments SVG » liste les ressources prêtes à l\'emploi.',
  '- Chaque fiche commence par son type (document, composant, template, section) : le nom du fichier ne le porte pas, pour rester stable quand un élément change de type.',
  '- « Modèle de contenu » décrit les collections (custom post types) et leurs champs ; un pin peut renvoyer à une collection (liste) ou à un champ (donnée affichée).',
  '- « Design tokens » donne les variables et styles Figma (couleurs, polices, espacements, ombres) ; utilise `tokens.css` et `tokens.json` plutôt que de relever les valeurs sur les images.',
  '- « Page » (templates) donne l\'adresse, le SEO et la collection affichée ; « Utilisé dans » liste les éléments qui réutilisent celui-ci ; « Ordre de construction suggéré » dit par quoi commencer.',
  '- « Source Figma » donne le fichier d\'origine ; chaque image indique sa taille (point de rupture) et le lien de sa frame.',
].join('\n');

function getImageExtension(base64: string): string {
  if (base64.startsWith('data:image/png')) return 'png';
  if (base64.startsWith('data:image/gif')) return 'gif';
  if (base64.startsWith('data:image/webp')) return 'webp';
  return 'jpg';
}

function imagesSection(refs: ImageRef[], fallbackAlt: string): string {
  const lines = ['## Images', ''];
  for (const ref of refs) {
    lines.push(`![${ref.caption ?? fallbackAlt}](stories-img/${ref.filename})`);
    const meta = [
      ref.width && ref.height ? `maquette ${ref.width}×${ref.height} px` : '',
      ref.figmaUrl ? `[frame dans Figma](${ref.figmaUrl})` : '',
    ].filter(Boolean);
    if (meta.length) lines.push(`_${ref.caption ? `${ref.caption} — ` : ''}${meta.join(' · ')}_`);
    if (ref.cleanFilename) lines.push(`_Même image sans pins : [${ref.cleanFilename}](stories-img/${ref.cleanFilename})_`);
  }
  return lines.join('\n');
}

function assetsSection(refs: AssetRef[]): string {
  return ['## Éléments SVG', '', ...refs.map((r) => `- [${r.name}](${r.path})`)].join('\n');
}

/** Href vers la fiche d'un composant (multi-fichiers), par id de composant. */
type LinkMap = Map<string, string>;

function componentRef(comp: Component, links: LinkMap): string {
  const href = links.get(comp.id);
  return href ? `[${comp.name}](${href})` : `**${comp.name}**`;
}

function generateComponentBlock(component: Component, imageMap: ImageMap, allComponents: Component[] = [], exportComments = false, assetMap: AssetMap = new Map(), links: LinkMap = new Map(), collections: Collection[] = [], collectionBase = ''): string {
  const parts: string[] = [];
  parts.push(`# ${component.name}`);
  // Identifiant stable : retrouve l'élément quel que soit son nom (et dans les outils MCP).
  const progress = componentProgress(component);
  parts.push(
    `**Type :** ${TYPE_LABELS[component.category] ?? component.category}` +
    (progress.total > 0 ? ` · **Avancement :** ${progressLabel(progress)} tâches` : '') +
    `\n\n<!-- scope-id: ${component.id} · type: ${component.category} -->`,
  );

  if (component.estimatedHours && component.estimatedHours > 0) {
    parts.push(`<!-- estimate: ${component.estimatedHours}h -->`);
  }

  if (component.description) {
    parts.push(`## Description\n\n${component.description}`);
  }

  const pageSection = pageInfoLines(component, collections, collectionBase);
  if (pageSection) parts.push(pageSection);
  if (component.code && (component.code.files.length > 0 || component.code.commit || component.code.branch)) {
    parts.push([
      '## Code',
      '',
      ...component.code.files.map(file => `- \`${file}\``),
      component.code.branch ? `- Branche : \`${component.code.branch}\`` : '',
      component.code.commit ? `- Commit : \`${component.code.commit}\`` : '',
    ].filter(Boolean).join('\n'));
  }

  if (component.figmaLink?.fileKey || component.figmaLink?.groupNodeId) {
    // Le « node » d'un groupe d'états (desktop/mobile) est fabriqué par le plugin : seuls les liens des images sont exploitables.
    const groupUrl = figmaNodeUrl(component.figmaLink.fileKey, component.figmaLink.groupNodeId);
    parts.push(
      `Source Figma : fichier \`${component.figmaLink.fileKey}\`` +
      (groupUrl ? `, node \`${component.figmaLink.groupNodeId}\` ([ouvrir](${groupUrl}))` : ' — le lien de chaque maquette est donné sous son image.')
    );
  }

  const imageRefs = imageMap.get(component.id) ?? [];
  if (imageRefs.length > 0) {
    parts.push(imagesSection(imageRefs, component.name));
  }

  const assetRefs = assetMap.get(component.id) ?? [];
  if (assetRefs.length > 0) {
    parts.push(assetsSection(assetRefs));
  }

  if (component.tasks.length > 0) {
    const taskLines = ['## Tâches', ''];
    for (const cat of TASK_CATEGORY_ORDER) {
      const catTasks = component.tasks.filter(t => t.category === cat);
      if (catTasks.length === 0) continue;
      taskLines.push(`### ${TASK_CATEGORY_PLAIN_LABELS[cat]}`, '');
      for (const task of catTasks) {
        const pinSuffix = task.pinRef ? ` [Pin #${task.pinRef.pinNumber}]` : '';
        const scopePrefix = task.scope === 'v2' ? 'v2: ' : '';
        taskLines.push(`- [${task.completed ? 'x' : ' '}] ${scopePrefix}${task.name}${pinSuffix}${task.note?.trim() ? ` — ${task.note.trim()}` : ''}`);
      }
      taskLines.push('');
    }
    parts.push(taskLines.join('\n'));
  }

  // Notes (Markdown libre), paragraphes, titres, puces et commentaires, dans l'ordre de la fiche
  const textWidgets = getActiveWidgets(component)
    .filter(w => w.type === 'notes' || isBlockText(w.type) || (w.type === 'comment' && exportComments));
  for (const w of textWidgets) {
    const note = component.notes?.find(n => n.id === w.id);
    if (!note?.content) continue;
    if (w.type === 'notes') {
      parts.push(`## Contenu\n\n${note.content}`);
    } else if (w.type === 'comment') {
      parts.push(note.content.split('\n').map(line => `> ${line}`).join('\n'));
    } else {
      parts.push(blockTextToMarkdown(w.type, note.content));
    }
  }

  // Éléments repérés par des pins (une liste par image qui a des pins) : type,
  // spécifications, composant ou tâche liés, précision libre.
  const compImages = component.images ?? [];
  const pinsLegendLines: string[] = [];
  compImages.forEach((img, i) => {
    const pins = img.pins ?? [];
    if (pins.length === 0) return;
    const ref = imageRefs.find(r => r.imageIndex === i);
    // Légende de la maquette (desktop, mobile…) et fichier : le même nom que sous l'image, pour s'y retrouver.
    const imgLabel = `Image ${i + 1}${img.caption ? ` — ${img.caption}` : ''}${ref ? ` (${ref.filename})` : ''}`;
    pinsLegendLines.push(`**${imgLabel}**`);
    [...pins].sort((a, b) => a.number - b.number).forEach(pin => {
      const linkedTask = component.tasks.find(t => t.pinRef?.pinId === pin.id);
      const linkedInstance = component.instances.find(i => i.pinRef?.pinId === pin.id);
      const linkedComponent = linkedInstance
        ? allComponents.find(c => c.id === linkedInstance.componentId)
        : undefined;
      const details = [
        pin.label && !linkedComponent ? `« ${pin.label} »` : '',
        linkedComponent ? `composant : ${componentRef(linkedComponent, links)}` : '',
        linkedTask ? `tâche : ${linkedTask.name}${linkedTask.completed ? ' (fait)' : ''}` : '',
        describePin(pin, collections, linkedComponent?.name, (c) => collectionLink(c, collectionBase)),
        isPinQualified(pin, component) ? '' : 'à préciser (type, contraintes)',
        // Position sur la maquette : repère le pin sur l'image sans pins incrustés.
        `position : ${Math.round(pin.x)} % / ${Math.round(pin.y)} %`,
      ].filter(Boolean);
      pinsLegendLines.push(`- Pin #${pin.number}${details.length ? ` — ${details.join(' — ')}` : ''}`);
    });
  });
  if (pinsLegendLines.length > 0) {
    parts.push(`## Éléments repérés (pins)\n\n${pinsLegendLines.join('\n')}`);
  }

  // Composants utilisés : un par composant, avec leurs pins ; les instances
  // sans pin y figurent aussi (elles n'apparaissent pas dans la liste des pins).
  const usedComponents = new Map<string, { comp: Component; pins: number[] }>();
  for (const inst of component.instances) {
    const comp = allComponents.find(c => c.id === inst.componentId);
    if (!comp) continue;
    const entry = usedComponents.get(comp.id) ?? { comp, pins: [] };
    if (inst.pinRef) entry.pins.push(inst.pinRef.pinNumber);
    usedComponents.set(comp.id, entry);
  }
  if (usedComponents.size > 0) {
    const lines = ['## Composants utilisés', ''];
    for (const { comp, pins } of usedComponents.values()) {
      const where = pins.length > 0 ? ` — pin${pins.length > 1 ? 's' : ''} ${[...pins].sort((a, b) => a - b).map(n => `#${n}`).join(', ')}` : '';
      lines.push(`- ${componentRef(comp, links)}${where}`);
    }
    parts.push(lines.join('\n'));
  }

  const parents = usedBy(component, allComponents);
  if (parents.length > 0) {
    parts.push(['## Utilisé dans', '', ...parents.map(p => `- ${componentRef(p, links)}`)].join('\n'));
  }

  parts.push('---');
  return parts.join('\n\n');
}

/** Section « Page » d'un template : adresse, SEO, collection affichée (vide si rien n'est renseigné). */
function pageInfoLines(component: Component, collections: Collection[], collectionBase: string): string {
  const page = component.page;
  if (!page) return '';
  const collection = findCollection(collections, page.collectionId);
  const role = page.collectionRole === 'single' ? 'la fiche d\'une entrée' : page.collectionRole === 'list' ? 'la liste des entrées' : 'les entrées';
  const lines = [
    page.route?.trim() ? `- Adresse : \`${page.route.trim()}\`` : '',
    page.seoTitle?.trim() ? `- Titre SEO : ${page.seoTitle.trim()}` : '',
    page.seoDescription?.trim() ? `- Méta description : ${page.seoDescription.trim()}` : '',
    collection ? `- Affiche ${role} de la collection ${collectionLink(collection, collectionBase)}` : '',
  ].filter(Boolean);
  return lines.length ? ['## Page', '', ...lines].join('\n') : '';
}

/**
 * Brief de développement d'un élément : tout ce qu'une IA (ou un développeur) doit lire pour le construire, en un
 * seul texte — reste à faire, design tokens, modèle de contenu concerné, éléments à réutiliser (en ordre de
 * construction), puis la fiche de l'élément. Les images ne sont pas incluses (outil `get_component_image`).
 */
export function generateBriefMd(project: Project, componentId: string): string | null {
  const component = project.components.find(c => c.id === componentId);
  if (!component) return null;
  const all = project.components;
  const collections = project.collections ?? [];

  // Éléments utilisés, à tous les niveaux : à construire avant celui-ci.
  const needed = new Map<string, Component>();
  const collect = (c: Component) => {
    for (const instance of c.instances) {
      const dependency = all.find(x => x.id === instance.componentId);
      if (dependency && dependency.id !== component.id && !needed.has(dependency.id)) {
        needed.set(dependency.id, dependency);
        collect(dependency);
      }
    }
  };
  collect(component);
  const dependencies = buildOrder([...needed.values()]);

  // Collections touchées par l'élément et ses dépendances (pins, page), et celles que leurs champs relient.
  const touched = new Set<string>();
  for (const c of [component, ...dependencies]) {
    if (c.page?.collectionId) touched.add(c.page.collectionId);
    for (const pin of (c.images ?? []).flatMap(i => i.pins ?? [])) {
      if (pin.collectionId) touched.add(pin.collectionId);
      if (pin.fieldRef) touched.add(pin.fieldRef.collectionId);
    }
  }
  for (const id of [...touched]) {
    for (const field of flattenFields(findCollection(collections, id)?.fields ?? [])) {
      if (field.field.relationTo) touched.add(field.field.relationTo);
    }
  }
  const relevantCollections = collections.filter(c => touched.has(c.id));

  const remaining = component.tasks.filter(t => !t.completed && t.scope !== 'v2');
  const progress = componentProgress(component);
  const parts: string[] = [
    `# Brief de développement : ${component.name}`,
    [
      `**Type :** ${TYPE_LABELS[component.category] ?? component.category}`,
      progress.total > 0 ? `**Avancement :** ${progressLabel(progress)} tâches` : '**Avancement :** aucune tâche planifiée',
    ].join(' · '),
    [
      '## Comment travailler',
      '',
      '- Construis d\'abord les éléments à réutiliser (section « Éléments à réutiliser », déjà dans l\'ordre), puis cet élément.',
      '- Regarde la maquette avec l\'outil `get_component_image` (le texte ne remplace pas l\'image).',
      '- Utilise les design tokens fournis (variables CSS, classes `.text-*`) plutôt que de relever des valeurs sur l\'image.',
      '- Au fil du développement, coche chaque tâche terminée avec `update_task` (`completed: true`), ajoute celles que tu découvres avec `add_task`, et consigne une décision importante avec `set_text`.',
    ].join('\n'),
    remaining.length > 0
      ? ['## Reste à faire', '', ...remaining.map(t => `- [ ] ${t.name} — \`${t.category}\`, id : \`${t.id}\`${t.pinRef ? ` (pin #${t.pinRef.pinNumber})` : ''}`)].join('\n')
      : progress.total > 0 ? '## Reste à faire\n\nToutes les tâches sont faites.' : '## Reste à faire\n\nAucune tâche n\'est planifiée : propose-en une liste avec `add_task` à partir des pins et de la description.',
  ];
  const tokensMd = tokensToMarkdown(project.tokens);
  if (tokensMd) parts.push(tokensMd);
  const model = generateContentModelMd(relevantCollections, '##', all);
  if (model) parts.push(model);
  if (dependencies.length > 0) {
    parts.push(`## Éléments à réutiliser\n\nDans l'ordre de construction : ${dependencies.map(d => d.name).join(' → ')}.`);
    for (const dependency of dependencies) {
      parts.push(generateComponentBlock(dependency, new Map(), all, false, new Map(), new Map(), collections));
    }
  }
  parts.push('## Élément à construire');
  parts.push(generateComponentBlock(component, new Map(), all, false, new Map(), new Map(), collections));
  return parts.join('\n\n');
}

/** Client, version et total d'heures estimées, en une ligne (vide si rien n'est renseigné). */
export function projectMetaLine(project: Project): string {
  const client = project.client;
  const clientDetails = [client?.url, client?.contact].filter(Boolean).join(', ');
  const hours = project.components.reduce((acc, c) => acc + (c.estimatedHours ?? 0), 0);
  const progress = projectProgress(project);
  return [
    client?.name ? `Client : ${client.name}${clientDetails ? ` (${clientDetails})` : ''}` : '',
    project.version ? `Version : ${project.version}` : '',
    hours > 0 ? `Estimation totale : ${hours}h` : '',
    progress.totalTasks > 0 ? `Avancement : ${progress.percent} % (${progress.totalHours > 0 ? `${progress.doneHours} h faites sur ${progress.totalHours} h estimées · ` : ''}${progress.doneTasks}/${progress.totalTasks} tâches)` : '',
  ].filter(Boolean).join(' · ');
}

export function generateStoriesMd(project: Project, imageMap: ImageMap = new Map(), exportComments = false, assetMap: AssetMap = new Map()): string {
  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const total = project.components.length;

  const sections: string[] = [];

  // Header
  const headerParts = [`# ${project.name}`];
  if (project.description) headerParts.push(`> ${project.description}`);
  headerParts.push(`Exporté le ${date} · ${total} élément${total > 1 ? 's' : ''}`);
  if (projectMetaLine(project)) headerParts.push(projectMetaLine(project));
  headerParts.push('---');
  sections.push(headerParts.join('\n\n'));
  sections.push(READING_GUIDE + '\n\n---');
  const contentModel = generateContentModelMd(project.collections, '##', project.components);
  if (contentModel) sections.push(contentModel + '\n---');
  const tokensMd = tokensToMarkdown(project.tokens);
  if (tokensMd) sections.push(tokensMd + '\n---');
  const buildOrder = generateBuildOrderMd(project.components);
  if (buildOrder) sections.push(buildOrder + '\n---');

  // Grouped by type in display order
  for (const category of CATEGORY_ORDER) {
    const group = project.components.filter(c => c.category === category);
    if (group.length === 0) continue;
    sections.push(`<!-- ${CATEGORY_SECTION_LABELS[category] ?? category} -->`);
    for (const comp of group) {
      // Même fiche pour tous les types : un document garde ainsi ses tâches, pins et composants utilisés.
      sections.push(generateComponentBlock(comp, imageMap, project.components, exportComments, assetMap, new Map(), project.collections));
    }
  }

  return sections.join('\n\n');
}

async function collectImages(project: Project, dir: string, folderPath: string | undefined, slugs: Map<string, string>): Promise<ImageMap> {
  const imageMap: ImageMap = new Map();

  for (const comp of project.components) {
    const compImages = comp.images ?? [];
    if (compImages.length === 0) continue;

    const compSlug = slugs.get(comp.id) ?? slugify(comp.name);
    const refs: ImageRef[] = [];

    for (let i = 0; i < compImages.length; i++) {
      const img = compImages[i];
      // Load base64 from disk if using folder format
      let base64 = img.base64 || '';
      if (img.filename && folderPath) {
        try {
          base64 = await getImageBase64(folderPath, img.filename);
        } catch {
          console.warn(`[STORIES] Image introuvable: ${img.filename}`);
        }
      }
      if (!base64) continue;

      const hasPins = (img.pins ?? []).length > 0;
      const hasCrop = !!img.crop;
      const base64ToWrite = (hasPins || hasCrop)
        ? await renderImageWithPins(base64, img.pins ?? [], img.crop)
        : base64;
      const ext = (hasPins || hasCrop) ? 'png' : getImageExtension(base64);
      const filename = `${compSlug}-${i}.${ext}`;
      const imgPath = `${dir}/stories-img/${filename}`;
      await invoke('write_binary_file', { path: imgPath, base64Data: base64ToWrite });
      // Pins incrustés : la même image sans pins est exportée à côté, pour reproduire la maquette.
      let cleanFilename: string | undefined;
      if (hasPins) {
        const cleanBase64 = hasCrop ? await renderImageWithPins(base64, [], img.crop) : base64;
        cleanFilename = `${compSlug}-${i}-clean.${hasCrop ? 'png' : getImageExtension(base64)}`;
        await invoke('write_binary_file', { path: `${dir}/stories-img/${cleanFilename}`, base64Data: cleanBase64 });
      }
      refs.push({
        filename,
        cleanFilename,
        caption: img.caption,
        imageIndex: i,
        width: img.figmaWidth,
        height: img.figmaHeight,
        figmaUrl: figmaNodeUrl(comp.figmaLink?.fileKey, img.figmaNodeId),
      });
    }

    imageMap.set(comp.id, refs);
  }

  return imageMap;
}

/**
 * Écrit les SVG extraits de Figma dans `stories-svg/<composant>/<nom>.svg`
 * (dossier d'items) et renvoie leurs chemins relatifs pour le Markdown.
 */
async function collectAssets(project: Project, dir: string, folderPath: string | undefined, slugs: Map<string, string>): Promise<AssetMap> {
  const assetMap: AssetMap = new Map();
  if (!folderPath) return assetMap;

  for (const comp of project.components) {
    const assets = comp.assets ?? [];
    if (assets.length === 0) continue;

    const compSlug = slugs.get(comp.id) ?? slugify(comp.name);
    const used = new Set<string>();
    const refs: AssetRef[] = [];

    for (const asset of assets) {
      let base64 = '';
      try {
        base64 = await getImageBase64(folderPath, asset.filename);
      } catch {
        console.warn(`[STORIES] SVG introuvable: ${asset.filename}`);
      }
      if (!base64) continue;

      const baseName = slugify(asset.name) || 'element';
      let fileName = baseName;
      for (let n = 2; used.has(fileName); n++) fileName = `${baseName}-${n}`;
      used.add(fileName);

      const relPath = `stories-svg/${compSlug}/${fileName}.svg`;
      await invoke('write_binary_file', { path: `${dir}/${relPath}`, base64Data: base64 });
      refs.push({ path: relPath, name: asset.name });
    }

    if (refs.length > 0) assetMap.set(comp.id, refs);
  }

  return assetMap;
}

/** `tokens.json` (format Design Tokens) et `tokens.css` à côté du Markdown, si le projet a des tokens. */
async function writeTokenFiles(project: Project, dir: string): Promise<void> {
  if (!tokensToMarkdown(project.tokens)) return;
  await invoke('write_text_file', { path: `${dir}/tokens.json`, content: JSON.stringify(tokensToJson(project.tokens!), null, 2) + '\n' });
  await invoke('write_text_file', { path: `${dir}/tokens.css`, content: tokensToCss(project.tokens!) });
}

export async function exportProjectMarkdown(project: Project, folderPath?: string): Promise<void> {
  const settings = await getAppSettings();
  if (settings.markdown.multiFile) {
    return exportProjectMarkdownMulti(project, folderPath, settings.comment.exportComments);
  }

  const slug = project.filename ?? slugify(project.name);
  const defaultDir = folderPath ? `${folderPath}/export` : undefined;
  const defaultPath = defaultDir
    ? `${defaultDir}/${slug}-stories.md`
    : `${slug}-stories.md`;

  const filePath = await save({
    defaultPath,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  if (!filePath) return;

  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  const slugs = uniqueSlugs(project.components);
  const imageMap = await collectImages(project, dir, folderPath, slugs);
  const assetMap = await collectAssets(project, dir, folderPath, slugs);
  const content = generateStoriesMd(project, imageMap, settings.comment.exportComments, assetMap);
  await invoke('write_text_file', { path: filePath, content });
  await writeTokenFiles(project, dir);
}

async function exportProjectMarkdownMulti(project: Project, folderPath?: string, exportComments = false): Promise<void> {
  const defaultDir = folderPath ? `${folderPath}/export` : undefined;

  const destDir = await open({
    directory: true,
    defaultPath: defaultDir,
    title: 'Choisir le dossier de destination',
  });
  if (!destDir) return;

  const slugs = uniqueSlugs(project.components);
  const imageMap = await collectImages(project, destDir as string, folderPath, slugs);
  const assetMap = await collectAssets(project, destDir as string, folderPath, slugs);

  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const indexLines: string[] = [];
  indexLines.push(`# ${project.name}`);
  if (project.description) indexLines.push(`> ${project.description}`);
  indexLines.push(`Exporté le ${date} · ${project.components.length} élément${project.components.length > 1 ? 's' : ''}`);
  if (projectMetaLine(project)) indexLines.push(projectMetaLine(project));
  indexLines.push('---');
  indexLines.push('');
  indexLines.push(READING_GUIDE);
  indexLines.push('');

  // Noms de fichiers calculés d'avance : les fiches se renvoient les unes aux autres.
  const fileNames = exportFileNames(project.components, slugs);
  const links: LinkMap = new Map([...fileNames].map(([id, name]) => [id, `./${name}`]));

  const contentModel = generateContentModelMd(project.collections, '##', project.components, (c) => links.get(c.id));
  if (contentModel) indexLines.push(contentModel, '---', '');
  const tokensMd = tokensToMarkdown(project.tokens);
  if (tokensMd) indexLines.push(tokensMd, '---', '');
  const buildOrder = generateBuildOrderMd(project.components, '##', (c) => links.get(c.id));
  if (buildOrder) indexLines.push(buildOrder, '---', '');


  for (const category of CATEGORY_ORDER) {
    const group = project.components.filter(c => c.category === category);
    if (group.length === 0) continue;

    indexLines.push(`## ${CATEGORY_SECTION_LABELS[category] ?? category}`);
    indexLines.push('');

    for (const comp of group) {
      const filename = fileNames.get(comp.id)!;

      const block = generateComponentBlock(comp, imageMap, project.components, exportComments, assetMap, links, project.collections, './index.md');

      await invoke('write_text_file', { path: `${destDir}/${filename}`, content: block });

      indexLines.push(`- [${comp.name}](./${filename})`);
    }

    indexLines.push('');
  }

  await invoke('write_text_file', { path: `${destDir}/index.md`, content: indexLines.join('\n') });
  await writeTokenFiles(project, destDir as string);
  await removeStaleExportFiles(destDir as string, fileNames);
}

/**
 * Nettoie le dossier d'export après écriture : les fiches remplacées (élément renommé, ancien format du nom)
 * partent sans rien demander ; celles dont l'élément n'existe plus sont proposées à la suppression.
 */
async function removeStaleExportFiles(dir: string, current: Map<string, string>): Promise<void> {
  const { replaced, orphans } = staleExportFiles(await invoke<string[]>('list_markdown_files', { dir }), current);
  if (replaced.length > 0) await invoke('delete_markdown_files', { dir, names: replaced });
  if (orphans.length === 0) return;
  const plural = orphans.length > 1;
  const confirmed = await ask(
    `${orphans.length} ancien${plural ? 's' : ''} fichier${plural ? 's' : ''} d'export ne correspond${plural ? 'ent' : ''} plus à aucun élément (supprimé${plural ? 's' : ''} ou ancienne numérotation) :\n\n${orphans.slice(0, 12).join('\n')}${orphans.length > 12 ? '\n…' : ''}\n\nLes supprimer ?`,
    { title: 'Nettoyer le dossier d\'export', kind: 'warning' },
  );
  if (confirmed) await invoke('delete_markdown_files', { dir, names: orphans });
}
