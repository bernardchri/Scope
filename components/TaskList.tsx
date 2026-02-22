'use client';

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Task, TaskCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import TaskItem from './molecules/TaskItem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskListProps {
  projectId: string;
  componentId: string;
  tasks: Task[];
}

// Wrapper sortable pour chaque TaskItem
function SortableTaskItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: props.task.id,
    disabled: props.isEditing // 🆕 Désactiver drag pendant édition
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem 
        {...props} 
        dragHandleProps={props.isEditing ? {} : { ...attributes, ...listeners }} // 🆕
      />
    </div>
  );
}

export default function TaskList({ projectId, componentId, tasks }: TaskListProps) {
  const addTask = useProjectStore(state => state.addTask);
  const deleteTask = useProjectStore(state => state.deleteTask);
  const toggleTask = useProjectStore(state => state.toggleTask);
  const updateTask = useProjectStore(state => state.updateTask);
  const updateComponent = useProjectStore(state => state.updateComponent);
  
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('frontend');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState<TaskCategory>('frontend');

  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (tasks.length === 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [tasks.length]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      name: newTaskName,
      completed: false,
      category: selectedCategory
    };
    
    addTask(projectId, componentId, newTask);
    setNewTaskName('');
    inputRef.current?.focus();
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localTasks.findIndex(t => t.id === active.id);
      const newIndex = localTasks.findIndex(t => t.id === over.id);

      const newTasks = arrayMove(localTasks, oldIndex, newIndex);
      setLocalTasks(newTasks);
      updateComponent(projectId, componentId, { tasks: newTasks });
    }
  }

  const completedCount = localTasks.filter(t => t.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Tâches {localTasks.length > 0 && (
            <span className="text-muted-foreground text-sm ml-2">
              {completedCount}/{localTasks.length}
            </span>
          )}
        </h2>
      </div>

      {localTasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune tâche pour le moment</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localTasks.map(task => (
                <SortableTaskItem
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
          </SortableContext>
        </DndContext>
      )}

      <Separator />

      <form onSubmit={handleCreate} className="space-y-2">
        <Input
          ref={inputRef}
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          placeholder="+ Ajouter une tâche (Enter)..."
          className="w-full"
        />
        
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-muted-foreground">Catégorie :</span>
          <Badge
            variant={selectedCategory === 'frontend' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('frontend')}
          >
            🎨 Front-end
          </Badge>
          <Badge
            variant={selectedCategory === 'backend' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('backend')}
          >
            ⚙️ Back-end
          </Badge>
          <Badge
            variant={selectedCategory === 'seo' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('seo')}
          >
            🔍 SEO
          </Badge>
          <Badge
            variant={selectedCategory === 'motion' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('motion')}
          >
            🎬 Motion
          </Badge>
        </div>
      </form>
    </div>
  );
}