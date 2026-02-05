import { Project } from './types';

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Site WordPress - Menuiserie',
    createdAt: new Date().toISOString(),
    components: [
      {
        id: 'component-1',
        name: 'Hero Section',
        description: 'Section hero de la page d\'accueil',
        category: 'section',
        instances: [],
        tasks: [
          {
            id: 'task-1',
            name: 'Créer le template',
            completed: false,
            category: 'frontend'  // 🆕
          },
          {
            id: 'task-2',
            name: 'Ajouter les champs ACF',
            completed: false,
            category: 'backend'  // 🆕
          },
          {
            id: 'task-3',
            name: 'Intégrer le design',
            completed: true,
            category: 'frontend'  // 🆕
          }
        ]
      },
      {
        id: 'component-2',
        name: 'Bouton CTA',
        description: 'Bouton d\'appel à l\'action réutilisable',
        category: 'element',
        instances: [],
        tasks: [
          {
            id: 'task-4',
            name: 'Créer les variantes',
            completed: false,
            category: 'frontend'  // 🆕
          },
          {
            id: 'task-5',
            name: 'Ajouter les animations',
            completed: false,
            category: 'motion'  // 🆕
          }
        ]
      }
    ]
  }
];