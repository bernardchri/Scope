import { Task, TaskCategory } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { getTaskCategoryLabel, getTaskCategoryColor, TASK_CATEGORY_LABELS } from '@/lib/taskCategoryHelpers';

interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  editName: string;
  editCategory: TaskCategory;
  onEditNameChange: (name: string) => void;
  onEditCategoryChange: (category: TaskCategory) => void;
  onToggle: () => void;
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
  onEditNameChange,
  onEditCategoryChange,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete
}: TaskItemProps) {
  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            autoFocus
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={task.completed}
              onCheckedChange={onToggle}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={task.completed ? 'line-through text-muted-foreground' : 'font-semibold'}>
                  {task.name}
                </span>
                <Badge className={getTaskCategoryColor(task.category)}>
                  {getTaskCategoryLabel(task.category)}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onStartEdit}>
              Modifier
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}