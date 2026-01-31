'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Project, Component, Task, Field } from '@/lib/types';

export default function Home() {
  const projects = useProjectStore(state => state.projects);
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const activeComponentId = useProjectStore(state => state.activeComponentId);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  const addProject = useProjectStore(state => state.addProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const addTask = useProjectStore(state => state.addTask);
  const deleteTask = useProjectStore(state => state.deleteTask);
  const toggleTask = useProjectStore(state => state.toggleTask);
  const addField = useProjectStore(state => state.addField);
  const deleteField = useProjectStore(state => state.deleteField);
  const linkTaskToField = useProjectStore(state => state.linkTaskToField);
  const unlinkTaskFromField = useProjectStore(state => state.unlinkTaskFromField);

  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [newComponentName, setNewComponentName] = useState('');
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  const [newTaskName, setNewTaskName] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<Field['type']>('text');
  const [isCreatingField, setIsCreatingField] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeComponent = activeProject?.components.find(c => c.id === activeComponentId);





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

  function handleCreateTask() {
    if (!newTaskName.trim() || !activeProject || !activeComponent) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: newTaskName,
      completed: false,
      linkedFieldIds: []
    };

    addTask(activeProject.id, activeComponent.id, newTask);
    setNewTaskName('');
    setIsCreatingTask(false);
  }

  function handleCreateField() {
    if (!newFieldName.trim() || !activeProject || !activeComponent) return;

    const newField: Field = {
      id: `field-${Date.now()}`,
      name: newFieldName,
      type: newFieldType,
      required: false
    };

    addField(activeProject.id, activeComponent.id, newField);
    setNewFieldName('');
    setNewFieldType('text');
    setIsCreatingField(false);
  }

  // Vue détail d'un composant
  if (activeComponent && activeProject) {
    return (
      <div className="p-8">
        <button
          onClick={() => setActiveComponent(null)}
          className="text-blue-500 mb-4"
        >
          ← Retour au projet {activeProject.name}
        </button>

        <h1 className="text-2xl font-bold mb-6">{activeComponent.name}</h1>

{/* Section Tâches */}
<div className="mb-8">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">Tâches</h2>
    <button
      onClick={() => setIsCreatingTask(true)}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      Nouvelle tâche
    </button>
  </div>

  {isCreatingTask && (
    <div className="mb-4 border p-4 rounded bg-gray-50">
      <input
        type="text"
        value={newTaskName}
        onChange={(e) => setNewTaskName(e.target.value)}
        placeholder="Nom de la tâche"
        className="border p-2 w-full mb-2"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={handleCreateTask}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Créer
        </button>
        <button
          onClick={() => {
            setIsCreatingTask(false);
            setNewTaskName('');
          }}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Annuler
        </button>
      </div>
    </div>
  )}

  {activeComponent.tasks.length === 0 ? (
    <p className="text-gray-500">Aucune tâche</p>
  ) : (
    <ul className="space-y-4">
      {activeComponent.tasks.map(task => (
        <li key={task.id} className="border p-4 rounded">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(activeProject.id, activeComponent.id, task.id)}
                className="w-5 h-5"
              />
              <span className={task.completed ? 'line-through text-gray-500' : 'font-semibold'}>
                {task.name}
              </span>
            </div>
            <button
              onClick={() => deleteTask(activeProject.id, activeComponent.id, task.id)}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Supprimer
            </button>
          </div>

          {/* Gestion des liens avec les champs */}
          <div className="ml-8">
            <p className="text-sm text-gray-600 mb-2">Champs liés :</p>
            {activeComponent.fields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucun champ disponible</p>
            ) : (
              <div className="space-y-1">
                {activeComponent.fields.map(field => {
                  const isLinked = task.linkedFieldIds.includes(field.id);
                  return (
                    <label key={field.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={() => {
                          if (isLinked) {
                            unlinkTaskFromField(activeProject.id, activeComponent.id, task.id, field.id);
                          } else {
                            linkTaskToField(activeProject.id, activeComponent.id, task.id, field.id);
                          }
                        }}
                      />
                      <span>{field.name} ({field.type})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )}
</div>

        {/* Section Champs CMS */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Champs CMS</h2>
            <button
              onClick={() => setIsCreatingField(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Nouveau champ
            </button>
          </div>

          {isCreatingField && (
            <div className="mb-4 border p-4 rounded bg-gray-50">
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Nom du champ"
                className="border p-2 w-full mb-2"
                autoFocus
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as Field['type'])}
                className="border p-2 w-full mb-2"
              >
                <option value="text">Texte</option>
                <option value="textarea">Textarea</option>
                <option value="image">Image</option>
                <option value="number">Nombre</option>
                <option value="date">Date</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateField}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Créer
                </button>
                <button
                  onClick={() => {
                    setIsCreatingField(false);
                    setNewFieldName('');
                    setNewFieldType('text');
                  }}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {activeComponent.fields.length === 0 ? (
            <p className="text-gray-500">Aucun champ</p>
          ) : (
            <ul className="space-y-2">
              {activeComponent.fields.map(field => (
                <li key={field.id} className="border p-4 rounded flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{field.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({field.type})</span>
                  </div>
                  <button
                    onClick={() => deleteField(activeProject.id, activeComponent.id, field.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // Vue liste des composants d'un projet
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
                <div
                  onClick={() => setActiveComponent(component.id)}
                  className="cursor-pointer mb-2"
                >
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
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Vue liste des projets
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