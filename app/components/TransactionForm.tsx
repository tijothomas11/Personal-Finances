'use client';

import { useState, useEffect } from 'react';
import { supabase, Account, Category, Transaction, TransactionType } from '@/lib/supabase';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowTimeStr() { return new Date().toTimeString().slice(0, 5); }

interface Props {
  categories: Category[];
  accounts: Account[];
  editing: Transaction | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}

export default function TransactionForm({ categories, accounts, editing, onSaved, onCancelEdit }: Props) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTimeStr());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setDescription(editing.description);
      setCategoryId(editing.category_id ?? '');
      setAccountId(editing.account_id ?? '');
      setFromAccountId(editing.from_account_id ?? '');
      setToAccountId(editing.to_account_id ?? '');
      setDate(editing.transaction_date);
      setTime(editing.transaction_time.slice(0, 5));
      setError('');
    }
  }, [editing]);

  const reset = () => {
    setType('expense');
    setAmount('');
    setDescription('');
    setCategoryId('');
    setAccountId('');
    setFromAccountId('');
    setToAccountId('');
    setDate(todayStr());
    setTime(nowTimeStr());
    setError('');
  };

  const validate = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return 'Enter a valid positive amount.';
    if (!description.trim()) return 'Description is required.';
    if (!date) return 'Date is required.';
    if (!time) return 'Time is required.';
    if (type !== 'transfer' && !categoryId) return 'Select a category.';
    if (type === 'transfer') {
      if (!fromAccountId) return 'Select a From account.';
      if (!toAccountId) return 'Select a To account.';
      if (fromAccountId === toAccountId) return 'From and To accounts must be different.';
    }
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');

    const payload: Record<string, unknown> = {
      type,
      amount: Number(amount),
      description: description.trim(),
      transaction_date: date,
      transaction_time: time,
      category_id: type !== 'transfer' ? categoryId || null : null,
      account_id: type !== 'transfer' ? accountId || null : null,
      from_account_id: type === 'transfer' ? fromAccountId : null,
      to_account_id: type === 'transfer' ? toAccountId : null,
    };

    let dbError;
    if (editing) {
      const { error: e } = await supabase
        .from('transactions')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editing.id);
      dbError = e;
    } else {
      const { error: e } = await supabase.from('transactions').insert(payload);
      dbError = e;
    }

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    reset();
    onSaved();
  };

  const handleCancel = () => {
    reset();
    onCancelEdit();
  };

  const isTransfer = type === 'transfer';

  return (
    <div style={{ marginBottom: 28 }}>
      {editing && (
        <div style={{ marginBottom: 10, padding: '6px 12px', background: '#fffbe6', border: '1px solid #f0d060', borderRadius: 4, fontSize: 13 }}>
          Editing transaction — make changes and click Save, or Cancel to discard.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Row 1: type + amount + description */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={lbl}>Type</label>
            <select value={type} onChange={e => setType(e.target.value as TransactionType)} style={inp}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={lbl}>Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              min="0.01"
              step="0.01"
              onChange={e => setAmount(e.target.value)}
              style={{ ...inp, minWidth: 110 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
            <label style={lbl}>Description</label>
            <input
              placeholder="e.g. KFC Lunch, Rent, Netflix"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inp, minWidth: 200 }}
            />
          </div>
        </div>

        {/* Row 2: date + time + category (or transfer accounts) */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={lbl}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={lbl}>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} />
          </div>

          {!isTransfer && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={lbl}>Category</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inp, minWidth: 180 }}>
                  <option value="">-- Select category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={lbl}>Account</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inp, minWidth: 160 }}>
                  <option value="">-- No account --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </>
          )}

          {isTransfer && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={lbl}>From Account</label>
                <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} style={{ ...inp, minWidth: 160 }}>
                  <option value="">-- Select --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={lbl}>To Account</label>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} style={{ ...inp, minWidth: 160 }}>
                  <option value="">-- Select --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Transaction'}
          </button>
          {editing && (
            <button onClick={handleCancel} style={secondaryBtn}>Cancel Edit</button>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, color: '#666', fontWeight: 600 };
const inp: React.CSSProperties = { padding: '7px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14 };
const primaryBtn: React.CSSProperties = { padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 14 };
const secondaryBtn: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
