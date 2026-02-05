import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onBack: () => void;
  onNewComponent: () => void;
}

export default function ProjectHeader({
  projectName,
  sidebarOpen,
  onToggleSidebar,
  onBack,
  onNewComponent
}: ProjectHeaderProps) {
  return (
    <div className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Gauche : Retour + Toggle Sidebar */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux projets
          </Button>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Masquer la sidebar' : 'Afficher la sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </Button>
        </div>

        {/* Centre : Nom du projet */}
        <h1 className="text-xl font-bold absolute left-1/2 transform -translate-x-1/2">
          {projectName}
        </h1>

        {/* Droite : Nouveau composant */}
        <Button onClick={onNewComponent}>
          Nouveau composant
        </Button>
      </div>
    </div>
  );
}