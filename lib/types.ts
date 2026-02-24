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
  pinRef?: { imageId: string; pinId: string; pinNumber: number };
}

export interface ImagePin {
  id: string;
  number: number;
  x: number; // % 0-100
  y: number; // % 0-100
}

// 🆕 Nouvelle interface pour les images
export interface ComponentImage {
  id: string;
  base64: string;
  caption?: string;
  isPrimary: boolean; // Une seule image peut être principale
  pins?: ImagePin[];
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
  description?: string;
  filename?: string; // slug utilisé pour le fichier, ex: "site-menuiserie"
  hourlyRate?: number;
  budgetCap?: number;
  components: Component[];
  createdAt: string;
}