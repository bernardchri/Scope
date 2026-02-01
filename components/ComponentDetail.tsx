'use client';

import { useProjectStore } from '@/lib/projectStore';
import TaskList from './TaskList';
import FieldList from './FieldList';
import ComponentInstanceList from './ComponentInstanceList'; // 🆕

interface ComponentDetailProps {
  projectId: string;
  componentId: string;
}

export default function ComponentDetail({ projectId, componentId }: ComponentDetailProps) {
  const projects = useProjectStore(state => state.projects);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);

  const activeProject = projects.find(p => p.id === projectId);
  const activeComponent = activeProject?.components.find(c => c.id === componentId);

  if (!activeProject || !activeComponent) return null;

  return (
    <div className="p-8">
      <button
        onClick={() => setActiveComponent(null)}
        className="text-blue-500 mb-4"
      >
        ← Retour au projet {activeProject.name}
      </button>
      
      <h1 className="text-2xl font-bold mb-6">{activeComponent.name}</h1>

      <TaskList 
        projectId={projectId}
        componentId={componentId}
        tasks={activeComponent.tasks}
        fields={activeComponent.fields}
      />

      <FieldList
        projectId={projectId}
        componentId={componentId}
        fields={activeComponent.fields}
        tasks={activeComponent.tasks}
      />

      {/* 🆕 Section Composants utilisés */}
      <div className="mt-8">
        <ComponentInstanceList
          projectId={projectId}
          componentId={componentId}
          instances={activeComponent.instances}
          allComponents={activeProject.components}
        />
      </div>
    </div>
  );
}