// components/ProjectList.tsx

'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import ProjectCard from './molecules/ProjectCard';
import ProjectForm from './forms/ProjectForm';

export default function ProjectList() {
  const projects = useProjectStore(state => state.projects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const addProject = useProjectStore(state => state.addProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const updateProject = useProjectStore(state => state.updateProject);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function handleCreateProject(name: string) {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name,
      components: [],
      createdAt: new Date().toISOString()
    };
    
    addProject(newProject);
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mes Projets</h1>
        <Button onClick={() => setIsCreating(true)}>
          Nouveau projet
        </Button>
      </div>

      {isCreating && (
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setIsCreating(false)}
        />
      )}
      
      {projects.length === 0 ? (
        <p className="text-muted-foreground">Aucun projet pour le moment</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isEditing={editingId === project.id}
              editName={editName}
              onEditNameChange={setEditName}
              onSelect={() => setActiveProject(project.id)}
              onStartEdit={() => startEditing(project)}
              onSaveEdit={handleRename}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => deleteProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}