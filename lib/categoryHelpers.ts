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

export function getCategoryLabel(category: ComponentCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategoryColor(category: ComponentCategory): string {
  return CATEGORY_COLORS[category];
}