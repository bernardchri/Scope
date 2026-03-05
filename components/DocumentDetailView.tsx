'use client';

import { useState } from 'react';
import { Component } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock } from 'lucide-react';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';
import NoteWidget from './NoteWidget';

interface DocumentDetailViewProps {
  projectId: string;
  document: Component;
  allComponents: Component[];
  onUpdate: (documentId: string, updates: Partial<Component>) => void;
  onDelete: () => void;
  onNavigate: (componentId: string) => void;
}

export default function DocumentDetailView({
  projectId,
  document,
  allComponents,
  onUpdate,
  onDelete,
  onNavigate,
}: DocumentDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(document.name);
  const [editDescription, setEditDescription] = useState(document.description || '');
  const [editHours, setEditHours] = useState<string>(
    document.estimatedHours !== undefined ? String(document.estimatedHours) : ''
  );

  function handleSave() {
    const hours = editHours !== '' ? parseFloat(editHours) : undefined;
    onUpdate(document.id, {
      name: editName,
      description: editDescription || undefined,
      estimatedHours: hours && !isNaN(hours) ? hours : undefined,
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setEditName(document.name);
    setEditDescription(document.description || '');
    setEditHours(document.estimatedHours !== undefined ? String(document.estimatedHours) : '');
    setIsEditing(false);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-3xl font-bold border-b-2 border-blue-500 outline-none bg-transparent"
              autoFocus
            />
          ) : (
            <h1 className="text-3xl font-bold">{document.name}</h1>
          )}
          <Badge className="bg-slate-100 text-slate-700">
            📄 Document
          </Badge>
        </div>

        {!isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Modifier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => { if (confirm(`Supprimer "${document.name}" ?`)) onDelete(); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Description */}
      {isEditing ? (
        <input
          type="text"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optionnelle)"
          className="w-full text-muted-foreground italic border-b border-gray-300 outline-none pb-1 bg-transparent"
        />
      ) : (
        document.description && (
          <p className="text-muted-foreground italic text-lg">
            {document.description}
          </p>
        )
      )}

      {/* Estimation de temps */}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <input
            type="number"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            placeholder="Heures estimées"
            min="0"
            step="0.5"
            className="w-32 border-b border-gray-300 outline-none pb-1 bg-transparent text-sm"
          />
          <span className="text-sm text-muted-foreground">h estimées</span>
        </div>
      ) : (
        document.estimatedHours !== undefined && (
          <p className="text-sm font-medium text-orange-600 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Estimation : {document.estimatedHours}h
          </p>
        )
      )}

      <Separator />

      <NoteWidget
        content={document.content || ''}
        onSave={(content) => onUpdate(document.id, { content })}
      />

      <Separator />

      <TaskList
        projectId={projectId}
        componentId={document.id}
        tasks={document.tasks}
      />

      <Separator />

      <ComponentInstanceList
        projectId={projectId}
        componentId={document.id}
        instances={document.instances}
        allComponents={allComponents}
        onNavigate={onNavigate}
      />
    </div>
  );
}