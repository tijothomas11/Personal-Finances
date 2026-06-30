'use client';

import { useState } from 'react';
import { supabase, Category } from '@/lib/supabase';

interface Props {
  categories: Category[];
  onRefresh: () => void;
}

// Manage the category list for the ledger.
// Default categories are protected.
// Custom categories can be added or deleted if they are unused.
export default function CategoriesPanel({ categories, onRefresh }: Props) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Add a new custom category to Supabase after checking
  // that the name is not empty and does not already exist.
  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { setError('Name is required.'); return; }
    // Prevent duplicate category names, ignoring differences in upper/lower case.
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
  
  // Delete a custom category only if it is not a default category
  // and is not currently linked to any existing transaction.
  const handleDelete = async (cat: Category) => {
    if (cat.is_default) { alert('Default categories cannot be deleted.'); return; }    
    // Check whether at least one transaction still uses this category.
    // If yes, block deletion to avoid breaking existing ledger rows.
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
      {/* Category manager for custom additions and safe cleanup */}
      <h2 style={{ marginBottom: 10 }}>Manage Categories</h2>
      {/* Row for adding a new custom category */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="New category name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          style={inputStyle}
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          style={primaryBtnStyle}
        >
          {saving ? 'Adding...' : 'Add'}
        </button>
        {error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>}
      </div>
      {/* Existing categories shown as chips/tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categories.map(cat => (
          <div
            key={cat.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              border: '1px solid var(--border)',
              borderRadius: 20,
              background: cat.is_default ? 'var(--surface-muted)' : 'var(--surface)',
              fontSize: 13,
            }}
          >
            <span>{cat.name}</span>            
            {/* Show delete button only for custom categories */}
            {!cat.is_default && (
              <button
                onClick={() => handleDelete(cat)}
                style={deleteBtnStyle}
                title="Delete category"
              >
                x
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontSize: 14,
  minWidth: 180,
  background: 'var(--input-bg)',
  color: 'var(--input-text)',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  background: 'var(--primary)',
  color: 'var(--primary-text)',
  border: 'none',
  borderRadius: 4,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14,
};

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--faint-text)',
  cursor: 'pointer',
  fontWeight: 700,
  padding: 0,
  lineHeight: 1,
};
