'use client';

import { useEffect, useState } from 'react';
import { getStore } from '@/lib/store';

export default function TestStore() {
  const [value, setValue] = useState('');
  const [storedValue, setStoredValue] = useState('');

  useEffect(() => {
    loadValue();
  }, []);

  async function loadValue() {
    const store = await getStore();
    const val = await store.get('test-key');
    setStoredValue(val as string || 'Aucune valeur');
  }

  async function saveValue() {
    const store = await getStore();
    await store.set('test-key', value);
    await store.save();
    loadValue();
  }

  return (
    <div className="p-8">
      <h1>Page de Test Store</h1>
      <p>Valeur stockée : <strong>{storedValue}</strong></p>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={saveValue}>Sauvegarder</button>
      <button onClick={loadValue}>Recharger</button>
    </div>
  );
}