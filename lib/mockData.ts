import { Project } from './types';

export const mockProject: Project = {
  id: 'project-1',
  name: 'Mon site WordPress',
  createdAt: new Date().toISOString(),
  components: [
    {
      id: 'comp-1',
      name: 'Page d\'accueil',
      tasks: [
        {
          id: 'task-1',
          name: 'Créer le template',
          completed: false,
          linkedFieldIds: []
        },
        {
          id: 'task-2',
          name: 'Ajouter les champs ACF',
          completed: false,
          linkedFieldIds: ['field-1', 'field-2']
        }
      ],
      fields: [
        {
          id: 'field-1',
          name: 'Titre hero',
          type: 'text',
          required: true
        },
        {
          id: 'field-2',
          name: 'Image hero',
          type: 'image',
          required: true
        }
      ]
    },
    {
      id: 'comp-2',
      name: 'Blog',
      tasks: [
        {
          id: 'task-3',
          name: 'Créer le post type',
          completed: true,
          linkedFieldIds: []
        }
      ],
      fields: []
    },
  ]
};