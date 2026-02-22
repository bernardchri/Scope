'use client';

import { useState } from 'react';
import { Component } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Trash2, Clock } from 'lucide-react';
import TaskList from './TaskList';
import ComponentInstanceList from './ComponentInstanceList';

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
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [editName, setEditName] = useState(document.name);
  const [editDescription, setEditDescription] = useState(document.description || '');
  const [editContent, setEditContent] = useState(document.content || '');
  const [editHours, setEditHours] = useState<string>(
    document.estimatedHours !== undefined ? String(document.estimatedHours) : ''
  );

  function handleSave() {
    const hours = editHours !== '' ? parseFloat(editHours) : undefined;
    onUpdate(document.id, {
      name: editName,
      description: editDescription || undefined,
      content: editContent,
      estimatedHours: hours && !isNaN(hours) ? hours : undefined,
    });
    setIsEditing(false);
    setMode('preview');
  }

  function handleCancel() {
    setEditName(document.name);
    setEditDescription(document.description || '');
    setEditContent(document.content || '');
    setEditHours(document.estimatedHours !== undefined ? String(document.estimatedHours) : '');
    setIsEditing(false);
    setMode('preview');
  }

  function startEditing() {
    setIsEditing(true);
    setMode('edit');
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
            <Button variant="outline" size="sm" onClick={startEditing}>
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

      {/* Toggle Edit/Preview */}
      {isEditing && (
        <div className="flex gap-2">
          <Button
            variant={mode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('edit')}
          >
            ✏️ Éditer
          </Button>
          <Button
            variant={mode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('preview')}
          >
            👁️ Prévisualiser
          </Button>
        </div>
      )}

      {/* Contenu */}
      {isEditing ? (
        <>
          {mode === 'edit' ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Écrivez votre contenu en Markdown..."
              className="min-h-[600px] font-mono text-sm resize-none"
            />
          ) : (
            <div className="prose prose-slate prose-lg dark:prose-invert max-w-none min-h-125 border rounded-lg p-8 bg-card">
              {editContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editContent}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">Aucun contenu</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave}>Enregistrer</Button>
            <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          </div>
        </>
      ) : (
        <div className="prose prose-slate prose-lg dark:prose-invert max-w-none border rounded-lg p-8 bg-card shadow-sm">
          {document.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {document.content}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">
              Aucun contenu. Cliquez sur "Modifier" pour ajouter du texte.
            </p>
          )}
        </div>
      )}

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