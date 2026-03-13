import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Project, Component } from './types';
import { CATEGORY_SECTION_LABELS, PDF_DISPLAY_ORDER, getActiveWidgets } from './categoryHelpers';
import { TASK_CATEGORY_ORDER, TASK_CATEGORY_PLAIN_LABELS } from './taskCategoryHelpers';
import { slugify } from './persistence';
import { renderImageWithPins } from './imageHelpers';
import { getImageBase64 } from './imageManager';
import { getAppSettings } from './persistence';

const CATEGORY_ORDER = PDF_DISPLAY_ORDER;

type ImageRef = { filename: string; caption?: string; imageIndex: number };
type ImageMap = Map<string, ImageRef[]>;

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
  }
  return lines.join('\n');
}

function generateComponentBlock(component: Component, imageMap: ImageMap, allComponents: Component[] = [], exportComments = false): string {
  const parts: string[] = [];
  parts.push(`# ${component.name}`);

  if (component.estimatedHours && component.estimatedHours > 0) {
    parts.push(`<!-- estimate: ${component.estimatedHours}h -->`);
  }

  if (component.description) {
    parts.push(`## Description\n\n${component.description}`);
  }

  const imageRefs = imageMap.get(component.id) ?? [];
  if (imageRefs.length > 0) {
    parts.push(imagesSection(imageRefs, component.name));
  }

  if (component.tasks.length > 0) {
    const taskLines = ['## Tâches', ''];
    for (const cat of TASK_CATEGORY_ORDER) {
      const catTasks = component.tasks.filter(t => t.category === cat);
      if (catTasks.length === 0) continue;
      taskLines.push(`### ${TASK_CATEGORY_PLAIN_LABELS[cat]}`, '');
      for (const task of catTasks) {
        const pinSuffix = task.pinRef ? ` [Pin #${task.pinRef.pinNumber}]` : '';
        taskLines.push(`- [ ] ${task.name}${pinSuffix}`);
      }
      taskLines.push('');
    }
    parts.push(taskLines.join('\n'));
  }

  // Paragraphs & comments
  const textWidgets = getActiveWidgets(component)
    .filter(w => w.type === 'paragraph' || (w.type === 'comment' && exportComments));
  for (const w of textWidgets) {
    const note = component.notes?.find(n => n.id === w.id);
    if (!note?.content) continue;
    if (w.type === 'comment') {
      parts.push(note.content.split('\n').map(line => `> ${line}`).join('\n'));
    } else {
      parts.push(note.content);
    }
  }

  // Légende des pins (une section par image qui a des pins)
  const compImages = component.images ?? [];
  const pinsLegendLines: string[] = [];
  compImages.forEach((img, i) => {
    const pins = img.pins ?? [];
    if (pins.length === 0) return;
    const ref = imageRefs[i];
    const imgLabel = ref ? `Image ${i + 1} — ${ref.filename}` : `Image ${i + 1}`;
    pinsLegendLines.push(`**${imgLabel}**`);
    pins.forEach(pin => {
      const linkedTask = component.tasks.find(t => t.pinRef?.pinId === pin.id);
      const linkedInstance = component.instances.find(i => i.pinRef?.pinId === pin.id);
      const linkedComponent = linkedInstance
        ? allComponents.find(c => c.id === linkedInstance.componentId)
        : undefined;
      const label = linkedTask
        ? ` → ${linkedTask.name}`
        : linkedComponent
          ? ` → composant : ${linkedComponent.name}`
          : '';
      pinsLegendLines.push(`- Pin #${pin.number}${label}`);
    });
  });
  if (pinsLegendLines.length > 0) {
    parts.push(`## Légende des pins\n\n${pinsLegendLines.join('\n')}`);
  }

  parts.push('---');
  return parts.join('\n\n');
}

function generateDocumentBlock(component: Component, imageMap: ImageMap, exportComments = false): string {
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

  // Notes (markdown content)
  const widgets = getActiveWidgets(component);
  const noteWidgets = widgets.filter(w => w.type === 'notes');
  for (const w of noteWidgets) {
    const note = component.notes?.find(n => n.id === w.id);
    if (note?.content) parts.push(`## Contenu\n\n${note.content}`);
  }

  // Paragraphs & comments (plain text)
  const paraWidgets = widgets.filter(w => w.type === 'paragraph' || (w.type === 'comment' && exportComments));
  for (const w of paraWidgets) {
    const note = component.notes?.find(n => n.id === w.id);
    if (!note?.content) continue;
    if (w.type === 'comment') {
      parts.push(note.content.split('\n').map(line => `> ${line}`).join('\n'));
    } else {
      parts.push(note.content);
    }
  }

  parts.push('---');
  return parts.join('\n\n');
}

export function generateStoriesMd(project: Project, imageMap: ImageMap = new Map(), exportComments = false): string {
  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const total = project.components.length;

  const sections: string[] = [];

  // Header
  const headerParts = [`# ${project.name}`];
  if (project.description) headerParts.push(`> ${project.description}`);
  headerParts.push(`Exporté le ${date} · ${total} élément${total > 1 ? 's' : ''}`);
  headerParts.push('---');
  sections.push(headerParts.join('\n\n'));

  // Grouped by type in display order
  for (const category of CATEGORY_ORDER) {
    const group = project.components.filter(c => c.category === category);
    if (group.length === 0) continue;
    sections.push(`<!-- ${CATEGORY_SECTION_LABELS[category] ?? category} -->`);
    for (const comp of group) {
      const widgets = getActiveWidgets(comp);
      const hasNotes = widgets.some(w => w.type === 'notes') && comp.notes?.some(n => n.content);
      if (hasNotes) {
        sections.push(generateDocumentBlock(comp, imageMap, exportComments));
      } else {
        sections.push(generateComponentBlock(comp, imageMap, project.components, exportComments));
      }
    }
  }

  return sections.join('\n\n');
}

async function collectImages(project: Project, dir: string, folderPath?: string): Promise<ImageMap> {
  const imageMap: ImageMap = new Map();

  for (const comp of project.components) {
    const compImages = comp.images ?? [];
    if (compImages.length === 0) continue;

    const compSlug = slugify(comp.name);
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
      refs.push({ filename, caption: img.caption, imageIndex: i });
    }

    imageMap.set(comp.id, refs);
  }

  return imageMap;
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
  const imageMap = await collectImages(project, dir, folderPath);
  const content = generateStoriesMd(project, imageMap, settings.comment.exportComments);
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

  const imageMap = await collectImages(project, destDir as string, folderPath);

  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const indexLines: string[] = [];
  indexLines.push(`# ${project.name}`);
  if (project.description) indexLines.push(`> ${project.description}`);
  indexLines.push(`Exporté le ${date} · ${project.components.length} élément${project.components.length > 1 ? 's' : ''}`);
  indexLines.push('---');
  indexLines.push('');

  let fileIndex = 1;

  for (const category of CATEGORY_ORDER) {
    const group = project.components.filter(c => c.category === category);
    if (group.length === 0) continue;

    indexLines.push(`## ${CATEGORY_SECTION_LABELS[category] ?? category}`);
    indexLines.push('');

    for (const comp of group) {
      const nn = String(fileIndex).padStart(2, '0');
      const compSlug = slugify(comp.name);
      const filename = `${nn}_${comp.category}_${compSlug}.md`;

      const widgets = getActiveWidgets(comp);
      const hasNotes = widgets.some(w => w.type === 'notes') && comp.notes?.some(n => n.content);
      const block = hasNotes
        ? generateDocumentBlock(comp, imageMap, exportComments)
        : generateComponentBlock(comp, imageMap, project.components, exportComments);

      await invoke('write_text_file', { path: `${destDir}/${filename}`, content: block });

      indexLines.push(`- [${comp.name}](./${filename})`);
      fileIndex++;
    }

    indexLines.push('');
  }

  await invoke('write_text_file', { path: `${destDir}/index.md`, content: indexLines.join('\n') });
}
