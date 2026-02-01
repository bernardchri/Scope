'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { ComponentCategory } from '@/lib/types';
import { getCategoryLabel, getCategoryColor, CATEGORY_LABELS } from '@/lib/categoryHelpers';
import { convertImageToBase64 } from '@/lib/imageHelpers';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';

interface ComponentDetailProps {
  projectId: string;
  componentId: string;
}

export default function ComponentDetail({ projectId, componentId }: ComponentDetailProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  const updateComponent = useProjectStore(state => state.updateComponent);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<ComponentCategory>('element');
  const [editImageBase64, setEditImageBase64] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === projectId);
  const activeComponent = activeProject?.components.find(c => c.id === componentId);

  if (!activeProject || !activeComponent) return null;

  function startEditing() {
    setEditName(activeComponent.name);
    setEditDescription(activeComponent.description || '');
    setEditCategory(activeComponent.category);
    setEditImageBase64(activeComponent.imageBase64);
    setImageError(null);
    setIsEditing(true);
  }

  function handleSaveEdit() {
    if (!editName.trim()) return;

    updateComponent(activeProject.id, activeComponent.id, {
      name: editName,
      description: editDescription || undefined,
      category: editCategory,
      imageBase64: editImageBase64
    });

    setIsEditing(false);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setImageError(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    
    const result = await convertImageToBase64(file);
    
    if (result.valid && result.base64) {
      setEditImageBase64(result.base64);
    } else {
      setImageError(result.error || 'Erreur inconnue');
    }
  }

  function handleRemoveImage() {
    setEditImageBase64(undefined);
    setImageError(null);
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

            <div className="mb-4">
              <label className="block font-semibold mb-2">Image du composant</label>
              
              {editImageBase64 ? (
                <div className="relative inline-block">
                  <img 
                    src={editImageBase64} 
                    alt="Aperçu" 
                    className="max-w-xs max-h-48 rounded border"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer text-blue-500 hover:text-blue-700"
                  >
                    📷 Cliquer pour ajouter une image
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Maximum 1 MB</p>
                </div>
              )}
              
              {imageError && (
                <p className="text-red-500 text-sm mt-2">{imageError}</p>
              )}
            </div>
            
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
          <div>
            <div className="flex items-start gap-4 mb-4">
              {activeComponent.imageBase64 && (
                <img 
                  src={activeComponent.imageBase64} 
                  alt={activeComponent.name}
                  className="w-24 h-24 object-cover rounded border"
                />
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{activeComponent.name}</h1>
                  <span className={`text-sm px-3 py-1 rounded ${getCategoryColor(activeComponent.category)}`}>
                    {getCategoryLabel(activeComponent.category)}
                  </span>
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
            </div>
          </div>
        )}
      </div>

      <TaskList 
        projectId={projectId}
        componentId={componentId}
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