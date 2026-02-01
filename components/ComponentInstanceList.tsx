'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentInstance } from '@/lib/types';

interface ComponentInstanceListProps {
  projectId: string;
  componentId: string;
  instances: ComponentInstance[];
  allComponents: Component[];
}

export default function ComponentInstanceList({
  projectId,
  componentId,
  instances,
  allComponents
}: ComponentInstanceListProps) {
  const addComponentInstance = useProjectStore(state => state.addComponentInstance);
  const removeComponentInstance = useProjectStore(state => state.removeComponentInstance);
  const setActiveComponent = useProjectStore(state => state.setActiveComponent);
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState('');

  // Grouper les instances par composant pour affichage
  const instancesGrouped = instances.reduce((acc, instance) => {
    const component = allComponents.find(c => c.id === instance.componentId);
    if (!component) return acc;

    if (!acc[component.id]) {
      acc[component.id] = {
        component,
        instances: []
      };
    }
    acc[component.id].instances.push(instance);
    return acc;
  }, {} as Record<string, { component: Component; instances: ComponentInstance[] }>);

  function handleAddInstance() {
    if (!selectedComponentId) return;
    
    addComponentInstance(projectId, componentId, selectedComponentId);
    setSelectedComponentId('');
    setIsAdding(false);
  }

  // Filtrer les composants disponibles (ne pas montrer le composant lui-même)
  const availableComponents = allComponents.filter(c => c.id !== componentId);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Composants utilisés</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          + Ajouter
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 border p-4 rounded bg-gray-50">
          <p className="mb-2 font-semibold">Sélectionner un composant :</p>
          <select
            value={selectedComponentId}
            onChange={(e) => setSelectedComponentId(e.target.value)}
            className="border p-2 w-full mb-2"
            autoFocus
          >
            <option value="">-- Choisir --</option>
            {availableComponents.map(comp => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAddInstance}
              disabled={!selectedComponentId}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              Ajouter
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setSelectedComponentId('');
              }}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {instances.length === 0 ? (
        <p className="text-gray-500">Aucun composant utilisé</p>
      ) : (
        <ul className="space-y-2">
          {Object.values(instancesGrouped).map(({ component, instances: compInstances }) => (
            compInstances.map((instance, index) => (
              <li key={instance.id} className="border p-4 rounded">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <span className="font-semibold">{component.name} #{index + 1}</span>
                    <p className="text-sm text-gray-500">
                      {component.tasks.length} tâche(s) · {component.fields.length} champ(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveComponent(component.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      →
                    </button>
                    <button
                      onClick={() => removeComponentInstance(projectId, componentId, instance.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))
          ))}
        </ul>
      )}
    </div>
  );
}