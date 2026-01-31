'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component } from '@/lib/types';

interface ComponentListProps {
  projectId: string;
}

export default function ComponentList({ projectId }: ComponentListProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  
  const [newComponentName, setNewComponentName] = useState('');
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  const activeProject = projects.find(p => p.id === projectId);

  if (!activeProject) return null;

  function handleCreateComponent() {
    if (!newComponentName.trim()) return;
    
    const newComponent: Component = {
      id: `component-${Date.now()}`,
      name: newComponentName,
      tasks: [],
      fields: []
    };
    
    addComponent(activeProject.id, newComponent);
    setNewComponentName('');
    setIsCreatingComponent(false);
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
            // Stats du composant
            const totalTasks = component.tasks.length;
            const completedTasks = component.tasks.filter(t => t.completed).length;
            const totalFields = component.fields.length;
            const linkedFieldsSet = new Set();
            component.tasks.forEach(t => t.linkedFieldIds.forEach(id => linkedFieldsSet.add(id)));
            const linkedFields = linkedFieldsSet.size;
            
            const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return (
              <li key={component.id} className="border p-4 rounded">
                <div
                  onClick={() => setActiveComponent(component.id)}
                  className="cursor-pointer mb-2"
                >
                  <h3 className="font-semibold mb-2">{component.name}</h3>
                  
                  {/* Badges */}
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {totalFields} champ{totalFields > 1 ? 's' : ''}
                    </span>
                    
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
                  
                  {/* Barre de progression tâches */}
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
                  onClick={() => deleteComponent(activeProject.id, component.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm mt-2"
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