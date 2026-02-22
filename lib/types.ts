export type ComponentCategory = 
  | 'document'
  | 'template'
  | 'section'
  | 'composition'
  | 'element'
  | 'navigation'
  | 'media'
  | 'form'
  | 'content';

export type TaskCategory = 'frontend' | 'backend' | 'seo' | 'motion';

export interface ComponentInstance {
  id: string;
  componentId: string;
}

export interface Task {
  id: string;
  name: string;
  completed: boolean;
  category: TaskCategory;
}

// 🆕 Nouvelle interface pour les images
export interface ComponentImage {
  id: string;
  base64: string;
  caption?: string;
  isPrimary: boolean; // Une seule image peut être principale
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  category: ComponentCategory;
  
  // 🆕 Remplacer imageBase64 par images (array)
  imageBase64?: string; // @deprecated - Garder pour compatibilité
  images?: ComponentImage[]; // 🆕 Nouvelle propriété
  
  estimatedHours?: number;
  content?: string;
  instances: ComponentInstance[];
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  filename?: string; // slug utilisé pour le fichier, ex: "site-menuiserie"
  components: Component[];
  createdAt: string;
}