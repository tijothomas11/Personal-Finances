'use client';

import { useState } from 'react';
import { supabase, Category } from '@/lib/supabase';

interface Props {
  categories: Category[];
  onRefresh: () => void;
}

export default function CategoriesPanel({ categories, onRefresh }: Props) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { setError('Name is required.'); return; }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('A category with this name already exists.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('categories').insert({ name, is_default: false });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setNewName('');
    onRefresh();
  };

  const handleDelete = async (cat: Category) => {
    if (cat.is_default) { alert('Default categories cannot be deleted.'); return; }
    const { data: txns } = await supabase
      .from('transactions')
      .select('id')
      .eq('category_id', cat.id)
      .limit(1);
    if (txns && txns.length > 0) {
      alert('This category is used by one or more transactions and cannot be deleted.');
      return;
    }
    await supabase.from('categories').delete().eq('id', cat.id);
    onRefresh();
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ marginBottom: 10 }}>Manage Categories</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="New category name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14, minWidth: 180 }}
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          style={{ padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
        {error && <span style={{ color: '#c0392b', fontSize: 13 }}>{error}</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categories.map(cat => (
          <div key={cat.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px',
            border: '1px solid #ddd',
            borderRadius: 20,
            background: cat.is_default ? '#f5f5f5' : '#fff',
            fontSize: 13,
          }}>
            <span>{cat.name}</span>
            {!cat.is_default && (
              <button
                onClick={() => handleDelete(cat)}
                style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontWeight: 700, padding: 0, lineHeight: 1 }}
                title="Delete category"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
