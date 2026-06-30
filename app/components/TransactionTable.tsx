'use client';

import { Account, Category, Transaction } from '@/lib/supabase';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
}

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  income:   { label: 'Income',   color: '#1a7a4a', bg: '#e6f4ee' },
  expense:  { label: 'Expense',  color: '#c0392b', bg: '#fdecea' },
  transfer: { label: 'Transfer', color: '#555',    bg: '#f0f0f0' },
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

function daysBetween(isoDate: string, createdAt: string) {
  const txDate = new Date(isoDate + 'T00:00:00');
  const entryDate = new Date(createdAt);
  const diff = Math.round((entryDate.getTime() - txDate.getTime()) / 86400000);
  return diff;
}

export default function TransactionTable({ transactions, accounts, categories, onEdit, onDelete, editingId }: Props) {
  if (transactions.length === 0) {
    return <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>No transactions yet. Add one above.</p>;
  }

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e0e0e0', color: '#555', textAlign: 'left' }}>
            <th style={th}>Amount</th>
            <th style={th}>Date</th>
            <th style={th}>Time</th>
            <th style={th}>Description</th>
            <th style={th}>Category</th>
            <th style={th}>Account</th>
            <th style={{ ...th, textAlign: 'center' }}>Type</th>
            <th style={{ ...th, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => {
            const badge = TYPE_BADGE[tx.type];
            const isEditing = tx.id === editingId;
            const amtSign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
            const amtColor = tx.type === 'income' ? '#1a7a4a' : tx.type === 'expense' ? '#c0392b' : '#333';
            const category = tx.category_id ? categoryMap[tx.category_id] : null;
            const account = tx.account_id ? accountMap[tx.account_id] : null;
            const fromAcc = tx.from_account_id ? accountMap[tx.from_account_id] : null;
            const toAcc = tx.to_account_id ? accountMap[tx.to_account_id] : null;

            const accountLabel = tx.type === 'transfer'
              ? (fromAcc && toAcc ? `${fromAcc.name} → ${toAcc.name}` : '—')
              : (account?.name ?? '—');

            const daysLate = daysBetween(tx.transaction_date, tx.created_at);

            return (
              <tr
                key={tx.id}
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: isEditing ? '#fffbe6' : undefined,
                  transition: 'background 0.15s',
                }}
              >
                <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: amtColor, fontVariantNumeric: 'tabular-nums' }}>
                  {amtSign}${Number(tx.amount).toFixed(2)}
                </td>
                <td style={td}>
                  <span>{formatDate(tx.transaction_date)}</span>
                  {daysLate >= 1 && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#aaa' }}>
                      (entered {daysLate}d later)
                    </span>
                  )}
                </td>
                <td style={{ ...td, color: '#888', fontSize: 13 }}>{formatTime(tx.transaction_time)}</td>
                <td style={td}>{tx.description || '—'}</td>
                <td style={{ ...td, color: '#555' }}>{category?.name ?? (tx.type === 'transfer' ? <em style={{ color: '#aaa' }}>Transfer</em> : '—')}</td>
                <td style={{ ...td, color: '#555' }}>{accountLabel}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 9px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    color: badge.color,
                    background: badge.bg,
                  }}>
                    {badge.label}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => onEdit(tx)}
                    style={{ marginRight: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, border: '1px solid #ccc', borderRadius: 3, background: '#fff' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(tx.id)}
                    style={{ padding: '3px 10px', cursor: 'pointer', fontSize: 12, border: '1px solid #e0b0b0', borderRadius: 3, background: '#fff', color: '#c0392b' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' };
