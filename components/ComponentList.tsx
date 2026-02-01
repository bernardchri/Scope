'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentCategory, TaskCategory } from '@/lib/types';
import { CATEGORY_LABELS, getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers';
import { getTaskStatsByCategory, getTaskCategoryLabel } from '@/lib/taskCategoryHelpers';

interface ComponentListProps {
  projectId: string;
}

export default function ComponentList({ projectId }: ComponentListProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const canDeleteComponent = useProjectStore(state => state.canDeleteComponent);
  
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentDescription, setNewComponentDescription] = useState('');
  const [newComponentCategory, setNewComponentCategory] = useState<ComponentCategory>('element');
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  const activeProject = projects.find(p => p.id === projectId);

  if (!activeProject) return null;

  function handleCreateComponent() {
    if (!newComponentName.trim()) return;
    
    const newComponent: Component = {
      id: `component-${Date.now()}`,
      name: newComponentName,
      description: newComponentDescription || undefined,
      category: newComponentCategory,
      instances: [],
      tasks: []
    };
    
    addComponent(activeProject.id, newComponent);
    setNewComponentName('');
    setNewComponentDescription('');
    setNewComponentCategory('element');
    setIsCreatingComponent(false);
  }

  function handleDeleteComponent(componentId: string) {
    if (!canDeleteComponent(activeProject.id, componentId)) {
      const usages = activeProject.components.filter(c =>
        c.instances.some(i => i.componentId === componentId)
      );
      
      alert(`Impossible de supprimer ce composant, il est utilisé dans ${usages.length} composant(s) : ${usages.map(c => c.name).join(', ')}`);
      return;
    }

    deleteComponent(activeProject.id, componentId);
  }

  return (
    <div className="p-8">
      <button
        onClick={() => setActiveProject(null)}
        className="text-blue-500 mb-4"
      >
        ← Retour aux projets
      </button>
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{activeProject.name}</h1>
        <button
          onClick={() => setIsCreatingComponent(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Nouveau composant
        </button>
      </div>

      {isCreatingComponent && (
        <div className="mb-4 border p-4 rounded bg-gray-50">
          <input
            type="text"
            value={newComponentName}
            onChange={(e) => setNewComponentName(e.target.value)}
            placeholder="Nom du composant"
            className="border p-2 w-full mb-2"
            autoFocus
          />
          
          <textarea
            value={newComponentDescription}
            onChange={(e) => setNewComponentDescription(e.target.value)}
            placeholder="Description (optionnelle)"
            className="border p-2 w-full mb-2 h-20"
          />
          
          <select
            value={newComponentCategory}
            onChange={(e) => setNewComponentCategory(e.target.value as ComponentCategory)}
            className="border p-2 w-full mb-2"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <button
              onClick={handleCreateComponent}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Créer
            </button>
            <button
              onClick={() => {
                setIsCreatingComponent(false);
                setNewComponentName('');
                setNewComponentDescription('');
                setNewComponentCategory('element');
              }}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      
      {activeProject.components.length === 0 ? (
        <p className="text-gray-500">Aucun composant</p>
      ) : (
        <ul className="space-y-2">
          {activeProject.components.map(component => {
            const totalTasks = component.tasks.length;
            const completedTasks = component.tasks.filter(t => t.completed).length;
            
            // Calcul des stats par catégorie
            const taskStats = getTaskStatsByCategory(component.tasks);
            
            const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            const usageCount = activeProject.components.reduce((count, c) => {
              return count + c.instances.filter(i => i.componentId === component.id).length;
            }, 0);

            const canDelete = canDeleteComponent(activeProject.id, component.id);
            
            return (
              <li key={component.id} className="border p-4 rounded">
                <div
                  onClick={() => setActiveComponent(component.id)}
                  className="cursor-pointer mb-2"
                >
                  <div className="flex items-start gap-3 mb-2">
                    {component.imageBase64 && (
                      <img 
                        src={component.imageBase64} 
                        alt={component.name}
                        className="w-16 h-16 object-cover rounded border flex-shrink-0"
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{component.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(component.category)}`}>
                          {getCategoryLabel(component.category)}
                        </span>
                      </div>

                      {component.description && (
                        <p className="text-sm text-gray-600 mb-2 italic">
                          {component.description}
                        </p>
                      )}
                      
                      {/* Badges par catégorie de tâche */}
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {Object.entries(taskStats).map(([category, stats]) => {
                          if (stats.total === 0) return null;
                          
                          const isComplete = stats.completed === stats.total;
                          
                          return (
                            <span
                              key={category}
                              className={`text-xs px-2 py-1 rounded ${
                                isComplete
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {getTaskCategoryLabel(category as TaskCategory).split(' ')[0]} {stats.completed}/{stats.total}
                            </span>
                          );
                        })}

                        {component.instances.length > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {component.instances.length} instance{component.instances.length > 1 ? 's' : ''}
                          </span>
                        )}

                        {usageCount > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            🔗 Utilisé {usageCount}× dans le projet
                          </span>
                        )}
                        
                        {completedTasks === totalTasks && totalTasks > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            ✓ Terminé
                          </span>
                        )}
                      </div>
                      
                      {totalTasks > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${taskProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteComponent(component.id)}
                  className={`px-3 py-1 rounded text-sm mt-2 ${
                    canDelete 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!canDelete}
                  title={!canDelete ? 'Ce composant est utilisé ailleurs' : ''}
                >
                  Supprimer
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}