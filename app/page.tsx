'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Account, Category, Transaction } from '@/lib/supabase';
import AccountsPanel from './components/AccountsPanel';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import CategoriesPanel from './components/CategoriesPanel';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadAll = useCallback(async () => {
    setLoadError('');
    const [catRes, accRes, txRes] = await Promise.all([
      supabase.from('categories').select('*').order('is_default', { ascending: false }).order('name'),
      supabase.from('accounts').select('*').order('created_at'),
      supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('transaction_time', { ascending: false }),
    ]);
    if (catRes.error) {
      setLoadError(`Failed to load categories: ${catRes.error.message}`);
    } else if (accRes.error) {
      setLoadError(`Failed to load accounts: ${accRes.error.message}`);
    } else if (txRes.error) {
      setLoadError(`Failed to load transactions: ${txRes.error.message}`);
    } else {
      setCategories(catRes.data ?? []);
      setAccounts(accRes.data ?? []);
      setTransactions(txRes.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (editingTx?.id === id) setEditingTx(null);
  };

  const balances: Record<string, number> = {};
  for (const acc of accounts) {
    balances[acc.id] = Number(acc.opening_balance);
  }
  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === 'income' && tx.account_id) {
      balances[tx.account_id] = (balances[tx.account_id] ?? 0) + amt;
    } else if (tx.type === 'expense' && tx.account_id) {
      balances[tx.account_id] = (balances[tx.account_id] ?? 0) - amt;
    } else if (tx.type === 'transfer') {
      if (tx.from_account_id) balances[tx.from_account_id] = (balances[tx.from_account_id] ?? 0) - amt;
      if (tx.to_account_id) balances[tx.to_account_id] = (balances[tx.to_account_id] ?? 0) + amt;
    }
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <main style={{ padding: '28px 20px', display: 'flex', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 1000 }}>
        <h1 style={{ marginBottom: 4, fontSize: 26, fontWeight: 700 }}>Personal Finance Ledger</h1>
        <p style={{ color: 'var(--muted-text)', marginBottom: 24, fontSize: 14 }}>Record, organize, and review your financial activity.</p>

        {loadError && (
          <div style={{ padding: '10px 16px', background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 4, marginBottom: 20, fontSize: 14 }}>
            {loadError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <SummaryCard label="Total Income" value={totalIncome} color="var(--income)" prefix="+" />
          <SummaryCard label="Total Expenses" value={totalExpense} color="var(--expense)" prefix="-" />
          <SummaryCard label="Net Balance" value={netBalance} color={netBalance >= 0 ? 'var(--income)' : 'var(--expense)'} />
        </div>

        <AccountsPanel accounts={accounts} balances={balances} onRefresh={loadAll} />

        <hr style={dividerStyle} />

        <h2 style={{ marginBottom: 12 }}>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h2>
        {loading ? (
          <p style={loadingStyle}>Loading...</p>
        ) : (
          <TransactionForm
            categories={categories}
            accounts={accounts}
            editing={editingTx}
            onSaved={loadAll}
            onCancelEdit={() => setEditingTx(null)}
          />
        )}

        <hr style={dividerStyle} />

        <h2 style={{ marginBottom: 12 }}>Transaction Ledger</h2>
        {loading ? (
          <p style={loadingStyle}>Loading...</p>
        ) : (
          <TransactionTable
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onEdit={tx => { setEditingTx(tx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onDelete={handleDelete}
            editingId={editingTx?.id ?? null}
          />
        )}

        <hr style={{ ...dividerStyle, margin: '28px 0' }} />

        {!loading && <CategoriesPanel categories={categories} onRefresh={loadAll} />}
      </div>
    </main>
  );
}

function SummaryCard({ label, value, color, prefix = '' }: { label: string; value: number; color: string; prefix?: string }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 20px',
      minWidth: 160,
      background: 'var(--surface)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--muted-text)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {prefix}${Math.abs(value).toFixed(2)}
      </div>
    </div>
  );
}

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--border)',
  marginBottom: 24,
};

const loadingStyle: React.CSSProperties = {
  color: 'var(--muted-text)',
  fontSize: 14,
};
