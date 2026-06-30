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

// Visual badge styles used to distinguish income, expense, and transfer rows in the ledger.
const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  income: { label: 'Income', color: 'var(--income)', bg: 'var(--income-soft)' },
  expense: { label: 'Expense', color: 'var(--expense)', bg: 'var(--expense-soft)' },
  transfer: { label: 'Transfer', color: 'var(--transfer)', bg: 'var(--transfer-soft)' },
};

// Format the stored transaction date for display in the ledger.
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format the stored transaction time for display in the ledger.
function formatTime(t: string) {
  return t.slice(0, 5);
}

// Show how many days later the transaction was entered into the app
// compared to the actual transaction date.
function daysBetween(isoDate: string, createdAt: string) {
  const txDate = new Date(isoDate + 'T00:00:00');
  const entryDate = new Date(createdAt);
  return Math.round((entryDate.getTime() - txDate.getTime()) / 86400000);
}

// Ledger table that displays transactions in reverse chronological order.
// Also resolves category and account labels from lookup maps.
export default function TransactionTable({ transactions, accounts, categories, onEdit, onDelete, editingId }: Props) {
  // Show a simple empty state if the ledger has no transaction rows yet.
  if (transactions.length === 0) {
    return <p style={{ color: 'var(--muted-text)', fontSize: 14, marginTop: 8 }}>No transactions yet. Add one above.</p>;
  }

  // Build quick lookup maps so account and category names
  // can be resolved from database IDs efficiently.
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  return (
    {/* Allow horizontal scrolling on smaller screens so the ledger remains readable */}
    {/* Main transaction ledger table */}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-strong)', color: 'var(--muted-text)', textAlign: 'left' }}>
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
            // Income is shown as positive, expense as negative,
            // and transfer is displayed without an income/expense sign.
            const amtSign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
            const amtColor = tx.type === 'income' ? 'var(--income)' : tx.type === 'expense' ? 'var(--expense)' : 'var(--app-text)';
            const category = tx.category_id ? categoryMap[tx.category_id] : null;
            const account = tx.account_id ? accountMap[tx.account_id] : null;
            const fromAcc = tx.from_account_id ? accountMap[tx.from_account_id] : null;
            const toAcc = tx.to_account_id ? accountMap[tx.to_account_id] : null;
              
            // Transfers show "From Account -> To Account".
            // Income and expense rows show the single linked account.
            const accountLabel = tx.type === 'transfer'
              ? (fromAcc && toAcc ? `${fromAcc.name} -> ${toAcc.name}` : '-')
              : (account?.name ?? '-');

            // Used to show whether the transaction was entered into the app later
            // than the actual transaction date.
            const daysLate = daysBetween(tx.transaction_date, tx.created_at);

            return (
              <tr
                key={tx.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: isEditing ? 'var(--warning-bg)' : undefined,
                  transition: 'background 0.15s',
                }}
              >
                <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: amtColor, fontVariantNumeric: 'tabular-nums' }}>
                  {amtSign}${Number(tx.amount).toFixed(2)}
                </td>
                <td style={td}>
                  <span>{formatDate(tx.transaction_date)}</span>
                  {/* Show how many days later the user recorded this transaction */}
                  {daysLate >= 1 && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--faint-text)' }}>
                      (entered {daysLate}d later)
                    </span>
                  )}
                </td>
                <td style={{ ...td, color: 'var(--muted-text)', fontSize: 13 }}>{formatTime(tx.transaction_time)}</td>
                <td style={td}>{tx.description || '-'}</td>
                <td style={{ ...td, color: 'var(--muted-text)' }}>{category?.name ?? (tx.type === 'transfer' ? <em style={{ color: 'var(--faint-text)' }}>Transfer</em> : '-')}</td>
                <td style={{ ...td, color: 'var(--muted-text)' }}>{accountLabel}</td>
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
                    style={editBtnStyle}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(tx.id)}
                    style={deleteBtnStyle}
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

const th: React.CSSProperties = {
  padding: '10px 12px',
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
};

const editBtnStyle: React.CSSProperties = {
  marginRight: 6,
  padding: '3px 10px',
  cursor: 'pointer',
  fontSize: 12,
  border: '1px solid var(--border)',
  borderRadius: 3,
  background: 'var(--surface)',
  color: 'var(--app-text)',
};

const deleteBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  cursor: 'pointer',
  fontSize: 12,
  border: '1px solid var(--danger-border)',
  borderRadius: 3,
  background: 'var(--surface)',
  color: 'var(--danger)',
};
