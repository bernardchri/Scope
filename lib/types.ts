export interface ComponentInstance {
  id: string;
  componentId: string;
}

export interface Field {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'image' | 'number' | 'date' | 'select' | 'checkbox';
  required: boolean;
}

export interface Task {
  id: string;
  name: string;
  completed: boolean;
  linkedFieldIds: string[];
}

export interface Component {
  id: string;
  name: string;
  instances: ComponentInstance[]; // 🆕
  tasks: Task[];
  fields: Field[];
}

export interface Project {
  id: string;
  name: string;
  components: Component[];
  createdAt: string;
}