export type ComponentCategory = 
  | 'template'
  | 'section'
  | 'composition'
  | 'element'
  | 'navigation'
  | 'media'
  | 'form'
  | 'content';

export type TaskCategory = 'frontend' | 'backend' | 'seo' | 'motion'; // 🆕

export interface ComponentInstance {
  id: string;
  componentId: string;
}


export interface Task {
  id: string;
  name: string;
  completed: boolean;
  category: TaskCategory; // 🆕
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  category: ComponentCategory;
  imageBase64?: string;
  instances: ComponentInstance[];
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  components: Component[];
  createdAt: string;
}