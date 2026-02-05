'use client';

import { useState } from 'react';
import { Component } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentDetailViewProps {
  projectId: string;
  document: Component;
  onUpdate: (documentId: string, updates: Partial<Component>) => void;
  // 🆕 onBack supprimé
}

export default function DocumentDetailView({
  projectId,
  document,
  onUpdate,
  // 🆕 onBack supprimé
}: DocumentDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [editName, setEditName] = useState(document.name);
  const [editDescription, setEditDescription] = useState(document.description || '');
  const [editContent, setEditContent] = useState(document.content || '');

  function handleSave() {
    onUpdate(document.id, {
      name: editName,
      description: editDescription || undefined,
      content: editContent
    });
    setIsEditing(false);
    setMode('preview');
  }

  function handleCancel() {
    setEditName(document.name);
    setEditDescription(document.description || '');
    setEditContent(document.content || '');
    setIsEditing(false);
    setMode('preview');
  }

  function startEditing() {
    setIsEditing(true);
    setMode('edit');
  }

  return (
    <div className="space-y-6">
      {/* 🆕 Bouton "Retour" supprimé */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-2xl font-bold border-b-2 border-blue-500 outline-none"
              autoFocus
            />
          ) : (
            <h1 className="text-2xl font-bold">{document.name}</h1>
          )}
          <Badge className="bg-slate-100 text-slate-700">
            📄 Document
          </Badge>
        </div>

        {!isEditing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            Modifier
          </Button>
        )}
      </div>

      {/* Description */}
      {isEditing ? (
        <input
          type="text"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optionnelle)"
          className="w-full text-muted-foreground italic border-b border-gray-300 outline-none pb-1"
        />
      ) : (
        document.description && (
          <p className="text-muted-foreground italic">{document.description}</p>
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
              className="min-h-[500px] font-mono"
            />
          ) : (
            <div className="border rounded-lg p-6 min-h-[500px] prose prose-slate max-w-none">
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
        <div className="border rounded-lg p-6 prose prose-slate max-w-none">
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
    </div>
  );
}