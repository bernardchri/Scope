'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Task, Field } from '@/lib/types';

interface TaskListProps {
  projectId: string;
  componentId: string;
  tasks: Task[];
  fields: Field[];
}

export default function TaskList({ projectId, componentId, tasks, fields }: TaskListProps) {
  const addTask = useProjectStore(state => state.addTask);
  const deleteTask = useProjectStore(state => state.deleteTask);
  const toggleTask = useProjectStore(state => state.toggleTask);
  const linkTaskToField = useProjectStore(state => state.linkTaskToField);
  const unlinkTaskFromField = useProjectStore(state => state.unlinkTaskFromField);
  
  const [newTaskName, setNewTaskName] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  function handleCreateTask() {
    if (!newTaskName.trim()) return;
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: newTaskName,
      completed: false,
      linkedFieldIds: []
    };
    
    addTask(projectId, componentId, newTask);
    setNewTaskName('');
    setIsCreatingTask(false);
  }

  return (
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

      {tasks.length === 0 ? (
        <p className="text-gray-500">Aucune tâche</p>
      ) : (
        <ul className="space-y-4">
          {tasks.map(task => (
            <li key={task.id} className="border p-4 rounded">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(projectId, componentId, task.id)}
                    className="w-5 h-5"
                  />
                  <span className={task.completed ? 'line-through text-gray-500' : 'font-semibold'}>
                    {task.name}
                  </span>
                </div>
                <button
                  onClick={() => deleteTask(projectId, componentId, task.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                >
                  Supprimer
                </button>
              </div>

              {/* Gestion des liens avec les champs */}
              <div className="ml-8">
                <p className="text-sm text-gray-600 mb-2">Champs liés :</p>
                {fields.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucun champ disponible</p>
                ) : (
                  <div className="space-y-1">
                    {fields.map(field => {
                      const isLinked = task.linkedFieldIds.includes(field.id);
                      return (
                        <label key={field.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => {
                              if (isLinked) {
                                unlinkTaskFromField(projectId, componentId, task.id, field.id);
                              } else {
                                linkTaskToField(projectId, componentId, task.id, field.id);
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
  );
}