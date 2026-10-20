import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Project, Component } from './types';
import { CATEGORY_SECTION_LABELS, PDF_DISPLAY_ORDER, getActiveWidgets, isBlockText, blockTextToMarkdown } from './categoryHelpers';
import { TASK_CATEGORY_ORDER, TASK_CATEGORY_PLAIN_LABELS } from './taskCategoryHelpers';
import { slugify } from './persistence';
import { renderImageWithPins } from './imageHelpers';
import { describePin } from './pinKinds';
import { generateContentModelMd, collectionLink } from './collections';
import { findCollection } from './collectionLookup';
import { generateBuildOrderMd, usedBy } from './buildOrder';
import { isPinQualified } from './completeness';
import { Collection } from './types';
import { figmaNodeUrl } from './figmaUrl';
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
  '- « Modèle de contenu » décrit les collections (custom post types) et leurs champs ; un pin peut renvoyer à une collection (liste) ou à un champ (donnée affichée).',
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

  if (component.estimatedHours && component.estimatedHours > 0) {
    parts.push(`<!-- estimate: ${component.estimatedHours}h -->`);
  }

  if (component.description) {
    parts.push(`## Description\n\n${component.description}`);
  }

  const pageSection = pageInfoLines(component, collections, collectionBase);
  if (pageSection) parts.push(pageSection);

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
        taskLines.push(`- [ ] ${scopePrefix}${task.name}${pinSuffix}`);
      }
      taskLines.push('');
    }
    parts.push(taskLines.join('\n'));
  }

  // Paragraphs & comments
  const textWidgets = getActiveWidgets(component)
    .filter(w => isBlockText(w.type) || (w.type === 'comment' && exportComments));
  for (const w of textWidgets) {
    const note = component.notes?.find(n => n.id === w.id);
    if (!note?.content) continue;
    if (w.type === 'comment') {
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
    const imgLabel = ref ? `Image ${i + 1} — ${ref.filename}` : `Image ${i + 1}`;
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
        linkedTask ? `tâche : ${linkedTask.name}` : '',
        describePin(pin, collections, linkedComponent?.name, (c) => collectionLink(c, collectionBase)),
        isPinQualified(pin, component) ? '' : 'à préciser (type, contraintes)',
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

function generateDocumentBlock(component: Component, imageMap: ImageMap, exportComments = false, assetMap: AssetMap = new Map()): string {
  const parts: string[] = [];
  parts.push(`# ${component.name}`);

  if (component.estimatedHours && component.estimatedHours > 0) {
    parts.push(`<!-- estimate: ${component.estimatedHours}h -->`);
  }

  if (component.description) {
    parts.push(`## Description\n\n${component.description}`);
  }

  const images = imageMap.get(component.id);
  if (images && images.length > 0) {
    parts.push(imagesSection(images, component.name));
  }

  const documentAssets = assetMap.get(component.id) ?? [];
  if (documentAssets.length > 0) {
    parts.push(assetsSection(documentAssets));
  }

  // Notes (markdown content)
  const widgets = getActiveWidgets(component);
  const noteWidgets = widgets.filter(w => w.type === 'notes');
  for (const w of noteWidgets) {
    const note = component.notes?.find(n => n.id === w.id);
    if (note?.content) parts.push(`## Contenu\n\n${note.content}`);
  }

  // Paragraphs & comments (plain text)
  const paraWidgets = widgets.filter(w => isBlockText(w.type) || (w.type === 'comment' && exportComments));
  for (const w of paraWidgets) {
    const note = component.notes?.find(n => n.id === w.id);
    if (!note?.content) continue;
    if (w.type === 'comment') {
      parts.push(note.content.split('\n').map(line => `> ${line}`).join('\n'));
    } else {
      parts.push(blockTextToMarkdown(w.type, note.content));
    }
  }

  parts.push('---');
  return parts.join('\n\n');
}

/** Client, version et total d'heures estimées, en une ligne (vide si rien n'est renseigné). */
export function projectMetaLine(project: Project): string {
  const client = project.client;
  const clientDetails = [client?.url, client?.contact].filter(Boolean).join(', ');
  const hours = project.components.reduce((acc, c) => acc + (c.estimatedHours ?? 0), 0);
  return [
    client?.name ? `Client : ${client.name}${clientDetails ? ` (${clientDetails})` : ''}` : '',
    project.version ? `Version : ${project.version}` : '',
    hours > 0 ? `Estimation totale : ${hours}h` : '',
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
  const buildOrder = generateBuildOrderMd(project.components);
  if (buildOrder) sections.push(buildOrder + '\n---');

  // Grouped by type in display order
  for (const category of CATEGORY_ORDER) {
    const group = project.components.filter(c => c.category === category);
    if (group.length === 0) continue;
    sections.push(`<!-- ${CATEGORY_SECTION_LABELS[category] ?? category} -->`);
    for (const comp of group) {
      const widgets = getActiveWidgets(comp);
      const hasNotes = widgets.some(w => w.type === 'notes') && comp.notes?.some(n => n.content);
      if (hasNotes) {
        sections.push(generateDocumentBlock(comp, imageMap, exportComments, assetMap));
      } else {
        sections.push(generateComponentBlock(comp, imageMap, project.components, exportComments, assetMap, new Map(), project.collections));
      }
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
  const fileNames = new Map<string, string>();
  let counter = 1;
  for (const category of CATEGORY_ORDER) {
    for (const comp of project.components.filter(c => c.category === category)) {
      fileNames.set(comp.id, `${String(counter++).padStart(2, '0')}_${comp.category}_${slugs.get(comp.id)}.md`);
    }
  }
  const links: LinkMap = new Map([...fileNames].map(([id, name]) => [id, `./${name}`]));

  const contentModel = generateContentModelMd(project.collections, '##', project.components, (c) => links.get(c.id));
  if (contentModel) indexLines.push(contentModel, '---', '');
  const buildOrder = generateBuildOrderMd(project.components, '##', (c) => links.get(c.id));
  if (buildOrder) indexLines.push(buildOrder, '---', '');


  for (const category of CATEGORY_ORDER) {
    const group = project.components.filter(c => c.category === category);
    if (group.length === 0) continue;

    indexLines.push(`## ${CATEGORY_SECTION_LABELS[category] ?? category}`);
    indexLines.push('');

    for (const comp of group) {
      const filename = fileNames.get(comp.id)!;

      const widgets = getActiveWidgets(comp);
      const hasNotes = widgets.some(w => w.type === 'notes') && comp.notes?.some(n => n.content);
      const block = hasNotes
        ? generateDocumentBlock(comp, imageMap, exportComments, assetMap)
        : generateComponentBlock(comp, imageMap, project.components, exportComments, assetMap, links, project.collections, './index.md');

      await invoke('write_text_file', { path: `${destDir}/${filename}`, content: block });

      indexLines.push(`- [${comp.name}](./${filename})`);
    }

    indexLines.push('');
  }

  await invoke('write_text_file', { path: `${destDir}/index.md`, content: indexLines.join('\n') });
}
