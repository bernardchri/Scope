'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { Field, Task } from '@/lib/types';

interface FieldListProps {
  projectId: string;
  componentId: string;
  fields: Field[];
  tasks: Task[];
}

export default function FieldList({ projectId, componentId, fields, tasks }: FieldListProps) {
  const addField = useProjectStore(state => state.addField);
  const deleteField = useProjectStore(state => state.deleteField);
  const updateField = useProjectStore(state => state.updateField);
  
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<Field['type']>('text');
  const [isCreatingField, setIsCreatingField] = useState(false);
  
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldType, setEditFieldType] = useState<Field['type']>('text');

  function handleCreateField() {
    if (!newFieldName.trim()) return;
    
    const newField: Field = {
      id: `field-${Date.now()}`,
      name: newFieldName,
      type: newFieldType,
      required: false
    };
    
    addField(projectId, componentId, newField);
    setNewFieldName('');
    setNewFieldType('text');
    setIsCreatingField(false);
  }

  function startEditingField(field: Field) {
    setEditingFieldId(field.id);
    setEditFieldName(field.name);
    setEditFieldType(field.type);
  }

  function handleUpdateField() {
    if (!editFieldName.trim() || !editingFieldId) return;
    
    updateField(projectId, componentId, editingFieldId, {
      name: editFieldName,
      type: editFieldType
    });
    
    setEditingFieldId(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Champs CMS</h2>
        <button
          onClick={() => setIsCreatingField(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Nouveau champ
        </button>
      </div>

      {isCreatingField && (
        <div className="mb-4 border p-4 rounded bg-gray-50">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Nom du champ"
            className="border p-2 w-full mb-2"
            autoFocus
          />
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as Field['type'])}
            className="border p-2 w-full mb-2"
          >
            <option value="text">Texte</option>
            <option value="textarea">Textarea</option>
            <option value="image">Image</option>
            <option value="number">Nombre</option>
            <option value="date">Date</option>
            <option value="select">Select</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreateField}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Créer
            </button>
            <button
              onClick={() => {
                setIsCreatingField(false);
                setNewFieldName('');
                setNewFieldType('text');
              }}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {fields.length === 0 ? (
        <p className="text-gray-500">Aucun champ</p>
      ) : (
        <ul className="space-y-2">
          {fields.map(field => {
            // Compter combien de tâches utilisent ce champ
            const linkedTasksCount = tasks.filter(t => 
              t.linkedFieldIds.includes(field.id)
            ).length;
            
            return (
              <li key={field.id} className="border p-4 rounded">
                {editingFieldId === field.id ? (
                  // Mode édition
                  <div>
                    <input
                      type="text"
                      value={editFieldName}
                      onChange={(e) => setEditFieldName(e.target.value)}
                      className="border p-2 w-full mb-2"
                      autoFocus
                    />
                    <select
                      value={editFieldType}
                      onChange={(e) => setEditFieldType(e.target.value as Field['type'])}
                      className="border p-2 w-full mb-2"
                    >
                      <option value="text">Texte</option>
                      <option value="textarea">Textarea</option>
                      <option value="image">Image</option>
                      <option value="number">Nombre</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateField}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditingFieldId(null)}
                        className="bg-gray-300 px-3 py-1 rounded text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  // Mode lecture
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{field.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({field.type})</span>
                      {linkedTasksCount > 0 ? (
                        <span className="ml-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {linkedTasksCount} tâche(s) liée(s)
                        </span>
                      ) : (
                        <span className="ml-3 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Non lié
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditingField(field)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => deleteField(projectId, componentId, field.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}