'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Component, ComponentImage, ComponentInstance } from '@/lib/types';
import { getCategoryLabel } from '@/lib/categoryHelpers';
import { computeAvailablePins } from '@/lib/pinHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InstanceItem from './molecules/InstanceItem';

interface ComponentInstanceListProps {
  projectId: string;
  componentId: string;
  instances: ComponentInstance[];
  allComponents: Component[];
  images?: ComponentImage[];
  onNavigate: (componentId: string) => void;
}

export default function ComponentInstanceList({
  projectId,
  componentId,
  instances,
  allComponents,
  images = [],
  onNavigate,
}: ComponentInstanceListProps) {
  const addComponentInstance = useProjectStore(state => state.addComponentInstance);
  const removeComponentInstance = useProjectStore(state => state.removeComponentInstance);
  const updateComponentInstance = useProjectStore(state => state.updateComponentInstance);

  const availablePins = computeAvailablePins(images);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState('');

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

  const availableComponents = allComponents.filter(c => c.id !== componentId);

  return (
    <div className="space-y-4 my-2">


      {isAdding && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-2 font-semibold">Sélectionner un composant :</p>
            <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
              <SelectTrigger>
                <SelectValue placeholder="-- Choisir --" />
              </SelectTrigger>
              <SelectContent>
                {availableComponents.map(comp => (
                  <SelectItem key={comp.id} value={comp.id}>
                    {getCategoryLabel(comp.category)} - {comp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={handleAddInstance} disabled={!selectedComponentId}>
              Ajouter
            </Button>
            <Button variant="outline" onClick={() => {
              setIsAdding(false);
              setSelectedComponentId('');
            }}>
              Annuler
            </Button>
          </CardFooter>
        </Card>
      )}

      {instances.length === 0 ? (
        <p className="text-muted-foreground">Aucun composant utilisé</p>
      ) : (
        <div className="space-y-3 grid grid-cols-3 gap-2">
          {Object.values(instancesGrouped).map(({ component, instances: compInstances }) => (
            compInstances.map((instance, index) => (
              <InstanceItem
                key={instance.id}
                instance={instance}
                component={component}
                index={index}
                availablePins={availablePins}
                onNavigate={() => onNavigate(component.id)}
                onRemove={() => removeComponentInstance(projectId, componentId, instance.id)}
                onUpdatePinRef={(pinRef) => updateComponentInstance(projectId, componentId, instance.id, { pinRef })}
              />
            ))
          ))}
        </div>
      )}

      <Button onClick={() => setIsAdding(true)}>
        + Ajouter
      </Button>
    </div>
  );
}

