'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentCategory } from '@/lib/types';
import { CATEGORY_LABELS, getCategoryLabel, getCategoryColor } from '@/lib/categoryHelpers'; // 🆕

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
  const [newComponentDescription, setNewComponentDescription] = useState(''); // 🆕
  const [newComponentCategory, setNewComponentCategory] = useState<ComponentCategory>('element'); // 🆕
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  const activeProject = projects.find(p => p.id === projectId);

  if (!activeProject) return null;

  function handleCreateComponent() {
    if (!newComponentName.trim()) return;
    
    const newComponent: Component = {
      id: `component-${Date.now()}`,
      name: newComponentName,
      description: newComponentDescription || undefined, // 🆕
      category: newComponentCategory, // 🆕
      instances: [],
      tasks: [],
      fields: []
    };
    
    addComponent(activeProject.id, newComponent);
    setNewComponentName('');
    setNewComponentDescription(''); // 🆕
    setNewComponentCategory('element'); // 🆕
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
          
          {/* 🆕 Description */}
          <textarea
            value={newComponentDescription}
            onChange={(e) => setNewComponentDescription(e.target.value)}
            placeholder="Description (optionnelle)"
            className="border p-2 w-full mb-2 h-20"
          />
          
          {/* 🆕 Catégorie */}
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
                setNewComponentDescription(''); // 🆕
                setNewComponentCategory('element'); // 🆕
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
            const totalFields = component.fields.length;
            const linkedFieldsSet = new Set();
            component.tasks.forEach(t => t.linkedFieldIds.forEach(id => linkedFieldsSet.add(id)));
            const linkedFields = linkedFieldsSet.size;
            
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
                  <div className="flex items-start gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{component.name}</h3>
                    {/* 🆕 Badge catégorie */}
                    <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(component.category)}`}>
                      {getCategoryLabel(component.category)}
                    </span>
                  </div>

                  {/* 🆕 Description */}
                  {component.description && (
                    <p className="text-sm text-gray-600 mb-2 italic">
                      {component.description}
                    </p>
                  )}
                  
                  {/* Badges */}
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {totalFields} champ{totalFields > 1 ? 's' : ''}
                    </span>
                    
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
                    
                    {linkedFields < totalFields && totalFields > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        ⚠ {totalFields - linkedFields} champ{totalFields - linkedFields > 1 ? 's' : ''} non lié{totalFields - linkedFields > 1 ? 's' : ''}
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