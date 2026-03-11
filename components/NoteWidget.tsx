'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteWidgetProps {
  content: string;
  onSave: (content: string) => void;
}

export default function NoteWidget({ content, onSave }: NoteWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [editContent, setEditContent] = useState(content);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  function handleSave() {
    onSave(editContent);
    setIsEditing(false);
    setMode('edit');
  }

  function handleCancel() {
    setEditContent(content);
    setIsEditing(false);
    setMode('edit');
  }

  return (
    <div className="space-y-4">

      {isEditing ? (
        <>
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
        <div className="prose prose-slate prose-normal dark:prose-invert max-w-none border rounded-lg p-8 bg-card shadow-sm">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">
              Aucun contenu. Cliquez sur &quot;Modifier&quot; pour ajouter du texte.
            </p>
          )}
        </div>
      )}

      {!isEditing && (
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          Modifier
        </Button>
      )}
    </div>
  );
}
