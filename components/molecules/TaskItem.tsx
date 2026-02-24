'use client';

import { Task, TaskCategory } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Pencil, GripVertical } from 'lucide-react';
import { getTaskCategoryLabel, getTaskCategoryColor, TASK_CATEGORY_LABELS } from '@/lib/taskCategoryHelpers';

interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  editName: string;
  editCategory: TaskCategory;
  dragHandleProps?: any; // 🆕
  onEditNameChange: (name: string) => void;
  onEditCategoryChange: (category: TaskCategory) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

export default function TaskItem({
  task,
  isEditing,
  editName,
  editCategory,
  dragHandleProps = {}, // 🆕
  onEditNameChange,
  onEditCategoryChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete
}: TaskItemProps) {
  if (isEditing) {
    return (
      <Card>
        <CardContent className="py-3 px-4 space-y-3">
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveEdit();
              } else if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
          />
          
          <Select value={editCategory} onValueChange={(v) => onEditCategoryChange(v as TaskCategory)}>
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

          <div className="flex gap-2">
            <Button onClick={onSaveEdit}>Enregistrer</Button>
            <Button variant="outline" onClick={onCancelEdit}>Annuler</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group/item hover:shadow-sm transition-shadow">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Poignée drag & drop */}
          <div 
            {...dragHandleProps}
            className="transition-opacity cursor-grab active:cursor-grabbing -ml-1"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Badge catégorie */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge className={`${getTaskCategoryColor(task.category)} cursor-pointer flex-shrink-0`}>
                {getTaskCategoryLabel(task.category)}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => onEditCategoryChange(value as TaskCategory)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Nom de l'élément */}
          <span
            className="flex-1"
            onDoubleClick={onStartEdit}
          >
            {task.name}
          </span>
          
          {/* Icônes au hover */}
          <div className="flex gap-1 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onStartEdit}
              className="h-8 w-8 opacity-20 hover:opacity-100"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 hover:text-destructive opacity-20 hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}