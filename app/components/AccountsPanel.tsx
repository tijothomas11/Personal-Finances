'use client';

import { useState } from 'react';
import { supabase, Account, AccountType } from '@/lib/supabase';

// Friendly names used in the UI for each internal account type.
const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank Account',
  credit_card: 'Credit Card',
  savings: 'Savings',
  cash: 'Cash',
  other: 'Other',
};

interface Props {
  accounts: Account[];
  balances: Record<string, number>;
  onRefresh: () => void;
}

// Manage financial accounts such as bank accounts, savings, cash, and credit cards.
// Also displays the live computed balance for each account.
export default function AccountsPanel({ accounts, balances, onRefresh }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Create a new account in Supabase using the entered name,
  // selected account type, and opening balance.
  const handleAdd = async () => {
    if (!name.trim()) { setError('Account name is required.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('accounts').insert({
      name: name.trim(),
      type,
      opening_balance: Number(openingBalance) || 0,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setName('');
    setType('bank');
    setOpeningBalance('0');
    onRefresh();
  };

  // Remove an account from Supabase.
  // Existing transactions will remain, but their account reference may become null.
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account? Transactions linked to it will lose their account reference.')) return;
    await supabase.from('accounts').delete().eq('id', id);
    onRefresh();
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ marginBottom: 12 }}>Accounts</h2>
      {/* Form for adding a new account */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={labelStyle}>Account Name</label>
          <input
            placeholder="e.g. TD Chequing"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...inputStyle, minWidth: 180 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as AccountType)} style={inputStyle}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={labelStyle}>Opening Balance ($)</label>
          <input
            type="number"
            value={openingBalance}
            onChange={e => setOpeningBalance(e.target.value)}
            style={{ ...inputStyle, minWidth: 120 }}
          />
        </div>
        <button onClick={handleAdd} disabled={saving} style={primaryBtnStyle}>
          {saving ? 'Adding...' : 'Add Account'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {/* Show an empty-state message if no accounts exist, otherwise show account cards */}
      {accounts.length === 0 ? (
        <p style={{ color: 'var(--muted-text)', fontSize: 14 }}>No accounts yet. Add one above.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {accounts.map(acc => {            
            // Use the computed running balance if available;
            // otherwise fall back to the opening balance.
            const balance = balances[acc.id] ?? acc.opening_balance;
            const isNeg = balance < 0;
            return (
              <div key={acc.id} style={cardStyle}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{acc.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-text)', marginBottom: 8 }}>{ACCOUNT_TYPE_LABELS[acc.type]}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: isNeg ? 'var(--expense)' : 'var(--income)' }}>
                  {isNeg ? '-' : ''}${Math.abs(balance).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--faint-text)', marginTop: 2 }}>
                  Opening: ${Number(acc.opening_balance).toFixed(2)}
                </div>
                {/* Delete account button */}
                <button
                  onClick={() => handleDelete(acc.id)}
                  style={dangerOutlineBtnStyle}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--muted-text)',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontSize: 14,
  background: 'var(--input-bg)',
  color: 'var(--input-text)',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 16px',
  cursor: 'pointer',
  background: 'var(--primary)',
  color: 'var(--primary-text)',
  border: 'none',
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 600,
};

const dangerOutlineBtnStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  padding: '3px 8px',
  cursor: 'pointer',
  color: 'var(--danger)',
  border: '1px solid var(--danger)',
  borderRadius: 3,
  background: 'transparent',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '14px 18px',
  minWidth: 160,
  background: 'var(--surface)',
};
