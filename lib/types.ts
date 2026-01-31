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
  linkedFieldIds: string[]; // IDs des champs liés à cette tâche
}

export interface Component {
  id: string;
  name: string;
  tasks: Task[];
  fields: Field[];
}

export interface Project {
  id: string;
  name: string;
  components: Component[];
  createdAt: string;
}