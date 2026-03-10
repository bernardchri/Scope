export type ScopeItemType = 'document' | 'component' | 'template' | 'section';
export type ComponentCategory = ScopeItemType;

export type WidgetType = 'notes' | 'images' | 'tasks' | 'instances' | 'paragraph';

export interface WidgetInstance {
  id: string;
  type: WidgetType;
}

export interface NoteData {
  id: string;
  content: string;
}

export type TaskCategory = 'frontend' | 'backend' | 'seo' | 'motion';

export interface ComponentInstance {
  id: string;
  componentId: string;
  pinRef?: { imageId: string; pinId: string; pinNumber: number };
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

export interface CropRect {
  x: number;      // left edge, % (0-100) of total width
  y: number;      // top edge, % (0-100) of total height
  width: number;  // crop width, % (0-100)
  height: number; // crop height, % (0-100)
}

export interface ComponentImage {
  id: string;
  base64?: string;
  filename?: string;
  caption?: string;
  isPrimary: boolean;
  pins?: ImagePin[];
  crop?: CropRect;
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  category: ScopeItemType;

  images?: ComponentImage[];

  estimatedHours?: number;
  notes?: NoteData[];
  widgets?: WidgetInstance[];
  instances: ComponentInstance[];
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  filename?: string;
  hourlyRate?: number;
  budgetCap?: number;
  components: Component[];
  createdAt: string;
  formatVersion?: number; // 2 = folder format
}
