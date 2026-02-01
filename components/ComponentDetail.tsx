'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { ComponentCategory } from '@/lib/types';
import { getCategoryLabel, getCategoryColor, CATEGORY_LABELS } from '@/lib/categoryHelpers';
import TaskList from './TaskList';
import FieldList from './FieldList';
import ComponentInstanceList from './ComponentInstanceList';

interface ComponentDetailProps {
  projectId: string;
  componentId: string;
}

export default function ComponentDetail({ projectId, componentId }: ComponentDetailProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  const updateComponent = useProjectStore(state => state.updateComponent); // 🆕

  const [isEditing, setIsEditing] = useState(false); // 🆕
  const [editName, setEditName] = useState(''); // 🆕
  const [editDescription, setEditDescription] = useState(''); // 🆕
  const [editCategory, setEditCategory] = useState<ComponentCategory>('element'); // 🆕

  const activeProject = projects.find(p => p.id === projectId);
  const activeComponent = activeProject?.components.find(c => c.id === componentId);

  if (!activeProject || !activeComponent) return null;

  // 🆕 Démarrer l'édition
  function startEditing() {
    setEditName(activeComponent.name);
    setEditDescription(activeComponent.description || '');
    setEditCategory(activeComponent.category);
    setIsEditing(true);
  }

  // 🆕 Sauvegarder les modifications
  function handleSaveEdit() {
    if (!editName.trim()) return;

    updateComponent(activeProject.id, activeComponent.id, {
      name: editName,
      description: editDescription || undefined,
      category: editCategory
    });

    setIsEditing(false);
  }

  // 🆕 Annuler l'édition
  function handleCancelEdit() {
    setIsEditing(false);
  }

  return (
    <div className="p-8">
      <button
        onClick={() => setActiveComponent(null)}
        className="text-blue-500 mb-4"
      >
        ← Retour au projet {activeProject.name}
      </button>
      
      <div className="mb-6">
        {isEditing ? (
          // 🆕 Mode édition
          <div className="border p-4 rounded bg-gray-50">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nom du composant"
              className="border p-2 w-full mb-2 text-2xl font-bold"
              autoFocus
            />
            
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description (optionnelle)"
              className="border p-2 w-full mb-2 h-20"
            />
            
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as ComponentCategory)}
              className="border p-2 w-full mb-4"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Enregistrer
              </button>
              <button
                onClick={handleCancelEdit}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          // Mode lecture
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{activeComponent.name}</h1>
              <span className={`text-sm px-3 py-1 rounded ${getCategoryColor(activeComponent.category)}`}>
                {getCategoryLabel(activeComponent.category)}
              </span>
              {/* 🆕 Bouton modifier */}
              <button
                onClick={startEditing}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm ml-auto"
              >
                Modifier
              </button>
            </div>
            
            {activeComponent.description && (
              <p className="text-gray-600 italic">
                {activeComponent.description}
              </p>
            )}
          </div>
        )}
      </div>

      <TaskList 
        projectId={projectId}
        componentId={componentId}
        tasks={activeComponent.tasks}
        fields={activeComponent.fields}
      />

      <FieldList
        projectId={projectId}
        componentId={componentId}
        fields={activeComponent.fields}
        tasks={activeComponent.tasks}
      />

      <div className="mt-8">
        <ComponentInstanceList
          projectId={projectId}
          componentId={componentId}
          instances={activeComponent.instances}
          allComponents={activeProject.components}
        />
      </div>
    </div>
  );
}