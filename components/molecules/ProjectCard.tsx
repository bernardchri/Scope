import { Project } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProjectCardProps {
  project: Project;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (name: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

export default function ProjectCard({
  project,
  isEditing,
  editName,
  onEditNameChange,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete
}: ProjectCardProps) {
  const totalComponents = project.components.length;
  const totalTasks = project.components.reduce((acc, c) => acc + c.tasks.length, 0);
  const completedTasks = project.components.reduce(
    (acc, c) => acc + c.tasks.filter(t => t.completed).length,
    0
  );
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="border p-2 w-full rounded"
            autoFocus
          />
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={onSaveEdit}>Enregistrer</Button>
          <Button variant="outline" onClick={onCancelEdit}>Annuler</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 cursor-pointer" onClick={onSelect}>
        <h2 className="font-semibold text-lg mb-2">{project.name}</h2>
        
        <div className="flex gap-2 mb-3 flex-wrap">
          <Badge variant="secondary">
            {totalComponents} composant{totalComponents > 1 ? 's' : ''}
          </Badge>
          
          {totalTasks > 0 && (
            <Badge 
              variant="secondary"
              className={
                taskProgress === 100 
                  ? 'bg-green-100 text-green-700' 
                  : taskProgress > 0 
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }
            >
              Tâches: {completedTasks}/{totalTasks} ({taskProgress}%)
            </Badge>
          )}
        </div>
        
        {totalTasks > 0 && (
          <Progress value={taskProgress} className="h-2" />
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
        >
          Renommer
        </Button>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Supprimer
        </Button>
      </CardFooter>
    </Card>
  );
}