import { ComponentCategory } from './types';

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  document: '📄 Document',     // 🆕
  template: '📄 Template',
  section: '📦 Section',
  composition: '🔲 Composition',
  element: '🔘 Élément',
  navigation: '🧭 Navigation',
  media: '🎬 Média',
  form: '📝 Formulaire',
  content: '📰 Contenu'
};

export const CATEGORY_COLORS: Record<ComponentCategory, string> = {
  document: 'bg-slate-100 text-slate-700',  // 🆕
  template: 'bg-purple-100 text-purple-700',
  section: 'bg-blue-100 text-blue-700',
  composition: 'bg-green-100 text-green-700',
  element: 'bg-yellow-100 text-yellow-700',
  navigation: 'bg-indigo-100 text-indigo-700',
  media: 'bg-pink-100 text-pink-700',
  form: 'bg-orange-100 text-orange-700',
  content: 'bg-teal-100 text-teal-700'
};

// Catégories composants uniquement (sans 'document')
export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'template', 'navigation', 'section', 'composition',
  'element', 'media', 'form', 'content',
];

// Labels pour les sections de groupement (dashboard, PDF, exports) — pluriels, sans emoji
export const CATEGORY_SECTION_LABELS: Record<ComponentCategory, string> = {
  document:    'Documents',
  template:    'Templates',
  navigation:  'Navigation',
  section:     'Sections',
  composition: 'Compositions',
  element:     'Éléments',
  media:       'Médias',
  form:        'Formulaires',
  content:     'Contenus',
};

// Ordre d'affichage incluant les documents — documents en dernier (dashboard)
export const COMPONENT_DISPLAY_ORDER: ComponentCategory[] = [
  'template', 'navigation', 'section', 'composition',
  'element', 'media', 'form', 'content', 'document',
];

// Ordre d'affichage pour le PDF — documents en premier
export const PDF_DISPLAY_ORDER: ComponentCategory[] = [
  'document', 'template', 'navigation', 'section', 'composition',
  'element', 'media', 'form', 'content',
];

export function getCategoryLabel(category: ComponentCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategoryColor(category: ComponentCategory): string {
  return CATEGORY_COLORS[category];
}