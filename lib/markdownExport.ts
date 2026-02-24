import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Project, Component } from './types';
import { COMPONENT_CATEGORIES } from './categoryHelpers';
import { slugify } from './persistence';

const CATEGORY_LABELS: Record<string, string> = {
  template:    'Templates',
  navigation:  'Navigation',
  section:     'Sections',
  composition: 'Compositions',
  element:     'Éléments',
  media:       'Médias',
  form:        'Formulaires',
  content:     'Contenus',
};

const CATEGORY_ORDER = COMPONENT_CATEGORIES;

type ImageRef = { filename: string; caption?: string };
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

function generateComponentBlock(component: Component, imageMap: ImageMap): string {
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

  if (component.tasks.length > 0) {
    const taskLines = ['## Tâches', ''];
    for (const task of component.tasks) {
      taskLines.push(`- [${task.completed ? 'x' : ' '}] ${task.name}`);
    }
    parts.push(taskLines.join('\n'));
  }

  parts.push('---');
  return parts.join('\n\n');
}

function generateDocumentBlock(component: Component, imageMap: ImageMap): string {
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

  if (component.content) {
    parts.push(`## Contenu\n\n${component.content}`);
  }

  parts.push('---');
  return parts.join('\n\n');
}

export function generateStoriesMd(project: Project, imageMap: ImageMap = new Map()): string {
  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const uiComponents = project.components.filter(c => c.category !== 'document');
  const documents = project.components.filter(c => c.category === 'document');
  const total = project.components.length;

  const sections: string[] = [];

  // Header
  const headerParts = [`# ${project.name}`];
  if (project.description) headerParts.push(`> ${project.description}`);
  headerParts.push(`Exporté le ${date} · ${total} composant${total > 1 ? 's' : ''}`);
  headerParts.push('---');
  sections.push(headerParts.join('\n\n'));

  // UI components grouped by category
  for (const category of CATEGORY_ORDER) {
    const group = uiComponents.filter(c => c.category === category);
    if (group.length === 0) continue;
    sections.push(`<!-- ${CATEGORY_LABELS[category] ?? category} -->`);
    for (const comp of group) {
      sections.push(generateComponentBlock(comp, imageMap));
    }
  }

  // Documents
  if (documents.length > 0) {
    sections.push('<!-- Documents -->');
    for (const doc of documents) {
      sections.push(generateDocumentBlock(doc, imageMap));
    }
  }

  return sections.join('\n\n');
}

async function collectImages(project: Project, dir: string): Promise<ImageMap> {
  const imageMap: ImageMap = new Map();

  for (const comp of project.components) {
    const compImages = comp.images ?? [];
    if (compImages.length === 0) continue;

    const compSlug = slugify(comp.name);
    const refs: ImageRef[] = [];

    for (let i = 0; i < compImages.length; i++) {
      const img = compImages[i];
      const ext = getImageExtension(img.base64);
      const filename = `${compSlug}-${i}.${ext}`;
      const imgPath = `${dir}/stories-img/${filename}`;
      await invoke('write_binary_file', { path: imgPath, base64Data: img.base64 });
      refs.push({ filename, caption: img.caption });
    }

    imageMap.set(comp.id, refs);
  }

  return imageMap;
}

export async function exportProjectMarkdown(project: Project): Promise<void> {
  const slug = project.filename ?? slugify(project.name);
  const filePath = await save({
    defaultPath: `${slug}-stories.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  if (!filePath) return;

  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  const imageMap = await collectImages(project, dir);
  const content = generateStoriesMd(project, imageMap);
  await invoke('write_text_file', { path: filePath, content });
}
