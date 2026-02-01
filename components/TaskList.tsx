'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Task, TaskCategory } from '@/lib/types';
import { TASK_CATEGORY_LABELS, getTaskCategoryLabel, getTaskCategoryColor } from '@/lib/taskCategoryHelpers'; // 🆕

interface TaskListProps {
  projectId: string;
  componentId: string;
  tasks: Task[];
}

export default function TaskList({ projectId, componentId, tasks }: TaskListProps) {
  const addTask = useProjectStore(state => state.addTask);
  const deleteTask = useProjectStore(state => state.deleteTask);
  const toggleTask = useProjectStore(state => state.toggleTask);
  const updateTask = useProjectStore(state => state.updateTask); // 🆕
  
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('frontend'); // 🆕
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null); // 🆕
  const [editTaskName, setEditTaskName] = useState(''); // 🆕
  const [editTaskCategory, setEditTaskCategory] = useState<TaskCategory>('frontend'); // 🆕

  function handleCreateTask() {
    if (!newTaskName.trim()) return;
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: newTaskName,
      completed: false,
      category: newTaskCategory // 🆕
    };
    
    addTask(projectId, componentId, newTask);
    setNewTaskName('');
    setNewTaskCategory('frontend'); // 🆕 Reset
    setIsCreatingTask(false);
  }

  // 🆕 Démarrer l'édition
  function startEditingTask(task: Task) {
    setEditingTaskId(task.id);
    setEditTaskName(task.name);
    setEditTaskCategory(task.category);
  }

  // 🆕 Sauvegarder l'édition
  function handleSaveEdit() {
    if (!editTaskName.trim() || !editingTaskId) return;

    updateTask(projectId, componentId, editingTaskId, {
      name: editTaskName,
      category: editTaskCategory
    });

    setEditingTaskId(null);
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
          
          {/* 🆕 Sélection de catégorie */}
          <select
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
            className="border p-2 w-full mb-2"
          >
            {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

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
                setNewTaskCategory('frontend');
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
              {editingTaskId === task.id ? (
                // 🆕 Mode édition
                <div>
                  <input
                    type="text"
                    value={editTaskName}
                    onChange={(e) => setEditTaskName(e.target.value)}
                    className="border p-2 w-full mb-2"
                    autoFocus
                  />
                  
                  <select
                    value={editTaskCategory}
                    onChange={(e) => setEditTaskCategory(e.target.value as TaskCategory)}
                    className="border p-2 w-full mb-2"
                  >
                    {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingTaskId(null)}
                      className="bg-gray-300 px-3 py-1 rounded text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                // Mode lecture
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(projectId, componentId, task.id)}
                      className="w-5 h-5 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={task.completed ? 'line-through text-gray-500' : 'font-semibold'}>
                          {task.name}
                        </span>
                        {/* 🆕 Badge catégorie */}
                        <span className={`text-xs px-2 py-1 rounded ${getTaskCategoryColor(task.category)}`}>
                          {getTaskCategoryLabel(task.category)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingTask(task)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteTask(projectId, componentId, task.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}