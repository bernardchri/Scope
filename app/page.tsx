'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Project, Component } from '@/lib/types';

export default function Home() {
  const projects = useProjectStore(state => state.projects);
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const addProject = useProjectStore(state => state.addProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [newComponentName, setNewComponentName] = useState('');
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId);

  function handleCreateProject() {
    if (!newProjectName.trim()) return;
    
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName,
      components: [],
      createdAt: new Date().toISOString()
    };
    
    addProject(newProject);
    setNewProjectName('');
    setIsCreating(false);
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setEditName(project.name);
  }

  function handleRename() {
    if (!editName.trim() || !editingId) return;
    updateProject(editingId, { name: editName });
    setEditingId(null);
  }

  function handleDelete(projectId: string) {
    deleteProject(projectId);
  }

  function handleCreateComponent() {
    if (!newComponentName.trim() || !activeProject) return;
    
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

  // Si un projet est actif, afficher ses composants
  if (activeProject) {
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
            {activeProject.components.map(component => (
              <li key={component.id} className="border p-4 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{component.name}</h3>
                    <p className="text-sm text-gray-500">
                      {component.tasks.length} tâche(s) · {component.fields.length} champ(s)
                    </p>
                  </div>
                  <button
                    onClick={() => deleteComponent(activeProject.id, component.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Sinon, afficher la liste des projets
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mes Projets</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Nouveau projet
        </button>
      </div>

      {isCreating && (
        <div className="mb-4 border p-4 rounded bg-gray-50">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Nom du projet"
            className="border p-2 w-full mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateProject}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Créer
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewProjectName('');
              }}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      
      {projects.length === 0 ? (
        <p className="text-gray-500">Aucun projet pour le moment</p>
      ) : (
        <ul className="space-y-2">
          {projects.map(project => (
            <li key={project.id} className="border p-4 rounded">
              {editingId === project.id ? (
                <div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border p-2 w-full mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRename}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-gray-300 px-3 py-1 rounded text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => setActiveProject(project.id)}
                    className="cursor-pointer mb-2"
                  >
                    <h2 className="font-semibold">{project.name}</h2>
                    <p className="text-sm text-gray-500">
                      {project.components.length} composant(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(project)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Renommer
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}