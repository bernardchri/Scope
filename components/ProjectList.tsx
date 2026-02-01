'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Project } from '@/lib/types';

export default function ProjectList() {
  const projects = useProjectStore(state => state.projects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const addProject = useProjectStore(state => state.addProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const updateProject = useProjectStore(state => state.updateProject);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
          {projects.map(project => {
            // Calcul des stats du projet
            const totalComponents = project.components.length;
            const totalTasks = project.components.reduce((acc, c) => acc + c.tasks.length, 0);
            const completedTasks = project.components.reduce(
              (acc, c) => acc + c.tasks.filter(t => t.completed).length,
              0
            );
            
            const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return (
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
                      className="cursor-pointer mb-3"
                    >
                      <h2 className="font-semibold text-lg mb-2">{project.name}</h2>
                      
                      {/* Badges de statut */}
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {totalComponents} composant{totalComponents > 1 ? 's' : ''}
                        </span>
                        
                        {totalTasks > 0 && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            taskProgress === 100 
                              ? 'bg-green-100 text-green-700' 
                              : taskProgress > 0 
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            Tâches: {completedTasks}/{totalTasks} ({taskProgress}%)
                          </span>
                        )}
                      </div>
                      
                      {/* Barres de progression */}
                      {totalTasks > 0 && (
                        <div className="mb-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${taskProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}