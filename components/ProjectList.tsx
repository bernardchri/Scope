'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Project } from '@/lib/types';
import { exportProjects, importProjects } from '@/lib/backup';
import { ask } from '@tauri-apps/plugin-dialog'; // 🆕
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Upload, Download, Trash2 } from 'lucide-react';
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
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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

  // Export
  async function handleExport() {
    setIsExporting(true);
    try {
      await exportProjects(projects);
    } catch (error) {
      console.error('Erreur export:', error);
    } finally {
      setIsExporting(false);
    }
  }

  // 🆕 Import avec dialog Tauri
  async function handleImport() {
    setIsImporting(true);
    
    try {
      // 🆕 Utiliser ask de Tauri au lieu de window.confirm
      const confirmed = await ask(
        'L\'import va remplacer tous vos projets actuels. Continuer ?',
        {
          title: 'Attention',
          kind: 'warning'
        }
      );
      
      console.log('Confirmation:', confirmed);
      
      if (!confirmed) {
        console.log('Import annulé par l\'utilisateur');
        return;
      }

      console.log('Import confirmé, ouverture du dialog...');
      const importedProjects = await importProjects();
      
      console.log('Projets importés:', importedProjects);
      useProjectStore.setState({ projects: importedProjects });
      
      // 🆕 Message de succès avec dialog Tauri
      await ask('Import réussi !', { title: 'Succès', kind: 'info' });
    } catch (error) {
      console.error('Erreur import:', error);
      // 🆕 Message d'erreur avec dialog Tauri
      await ask(`Erreur lors de l'import: ${error}`, { title: 'Erreur', kind: 'error' });
    } finally {
      setIsImporting(false);
    }
  }

  // 🆕 Supprimer tous avec dialog Tauri
  async function handleDeleteAll() {
    const confirmed = await ask(
      'Êtes-vous sûr de vouloir supprimer TOUS les projets ? Cette action est irréversible.',
      {
        title: 'Confirmation',
        kind: 'warning'
      }
    );
    
    if (!confirmed) return;

    useProjectStore.setState({ projects: [] });
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mes Projets</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreating(true)}>
            Nouveau projet
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport} disabled={isExporting || projects.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Export en cours...' : 'Exporter mes projets (.scope)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImport} disabled={isImporting}>
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Import en cours...' : 'Importer des projets (.scope)'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDeleteAll} 
                disabled={projects.length === 0}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer tous les projets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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