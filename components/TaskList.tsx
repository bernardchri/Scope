'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Task, TaskCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TASK_CATEGORY_LABELS } from '@/lib/taskCategoryHelpers';
import TaskItem from './molecules/TaskItem';

interface TaskListProps {
  projectId: string;
  componentId: string;
  tasks: Task[];
}

export default function TaskList({ projectId, componentId, tasks }: TaskListProps) {
  const addTask = useProjectStore(state => state.addTask);
  const deleteTask = useProjectStore(state => state.deleteTask);
  const toggleTask = useProjectStore(state => state.toggleTask);
  const updateTask = useProjectStore(state => state.updateTask);
  
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('frontend');
  const [isCreating, setIsCreating] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState<TaskCategory>('frontend');

  function handleCreate() {
    if (!newTaskName.trim()) return;
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: newTaskName,
      completed: false,
      category: newTaskCategory
    };
    
    addTask(projectId, componentId, newTask);
    setNewTaskName('');
    setNewTaskCategory('frontend');
    setIsCreating(false);
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditTaskName(task.name);
    setEditTaskCategory(task.category);
  }

  function handleSaveEdit() {
    if (!editTaskName.trim() || !editingTaskId) return;

    updateTask(projectId, componentId, editingTaskId, {
      name: editTaskName,
      category: editTaskCategory
    });

    setEditingTaskId(null);
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tâches</h2>
        <Button onClick={() => setIsCreating(true)}>
          Nouvelle tâche
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Nom de la tâche"
              autoFocus
            />
            
            <Select value={newTaskCategory} onValueChange={(v) => setNewTaskCategory(v as TaskCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          
          <CardFooter className="flex gap-2">
            <Button onClick={handleCreate}>Créer</Button>
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              setNewTaskName('');
              setNewTaskCategory('frontend');
            }}>
              Annuler
            </Button>
          </CardFooter>
        </Card>
      )}

      {tasks.length === 0 ? (
        <p className="text-muted-foreground">Aucune tâche</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isEditing={editingTaskId === task.id}
              editName={editTaskName}
              editCategory={editTaskCategory}
              onEditNameChange={setEditTaskName}
              onEditCategoryChange={setEditTaskCategory}
              onToggle={() => toggleTask(projectId, componentId, task.id)}
              onStartEdit={() => startEditing(task)}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingTaskId(null)}
              onDelete={() => deleteTask(projectId, componentId, task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}