'use client';

// React hooks for state and lifecycle
import { useState, useEffect, useCallback } from 'react';
// Supabase types and client
import { supabase, Account, Category, Transaction } from '@/lib/supabase';
// App components
import AccountsPanel from './components/AccountsPanel';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import CategoriesPanel from './components/CategoriesPanel';

// Main page for the Personal Finance Ledger.
// Loads data from Supabase, computes balances and totals,
// and passes everything into the UI components.
export default function Home() {
  // Core application dat
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Track which transaction is being edited
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  // Loading + error state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  
  // Fetch categories, accounts, and transactions from Supabase
  // and keep the UI in sync with the database.
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
    // Handle errors (one at a time)
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

  // Load all data when the page first mounts.
  useEffect(() => { loadAll(); }, [loadAll]);

  
  // Delete a transaction and update local state immediately
  // so the UI reflects the change without reloading everything.
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    // Update UI immediately
    setTransactions(prev => prev.filter(t => t.id !== id));
    // Clear edit state if needed
    if (editingTx?.id === id) setEditingTx(null);
  };

    
  // Compute live account balances from opening balances + transactions.
  // Income adds, expense subtracts, and transfers move money between accounts.
  const balances: Record<string, number> = {};
  // Start with opening balance
  for (const acc of accounts) {
    balances[acc.id] = Number(acc.opening_balance);
  }
  // Apply transaction effects
  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === 'income' && tx.account_id) {
      balances[tx.account_id] = (balances[tx.account_id] ?? 0) + amt;
    } else if (tx.type === 'expense' && tx.account_id) {
      balances[tx.account_id] = (balances[tx.account_id] ?? 0) - amt;
    } else if (tx.type === 'transfer') {
      // Move money between owned accounts
      if (tx.from_account_id) balances[tx.from_account_id] = (balances[tx.from_account_id] ?? 0) - amt;
      if (tx.to_account_id) balances[tx.to_account_id] = (balances[tx.to_account_id] ?? 0) + amt;
    }
  }

  
  // Summary totals for dashboard cards.
  // Transfers are excluded because they do not create or remove money.
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <main style={{ padding: '28px 20px', display: 'flex', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 1000 }}>
        {/* Page title */}
        <h1 style={{ marginBottom: 4, fontSize: 26, fontWeight: 700 }}>Personal Finance Ledger</h1>
        <p style={{ color: 'var(--muted-text)', marginBottom: 24, fontSize: 14 }}>Record, organize, and review your financial activity.</p>

        {/* Show load errors */}
        {loadError && (
          <div style={{ padding: '10px 16px', background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 4, marginBottom: 20, fontSize: 14 }}>
            {loadError}
          </div>
        )}

        {/* Dashboard summary cards for income, expenses, and net balance */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <SummaryCard label="Total Income" value={totalIncome} color="var(--income)" prefix="+" />
          <SummaryCard label="Total Expenses" value={totalExpense} color="var(--expense)" prefix="-" />
          <SummaryCard label="Net Balance" value={netBalance} color={netBalance >= 0 ? 'var(--income)' : 'var(--expense)'} />
        </div>

        {/* Accounts section: add accounts and view balances */}
        <AccountsPanel accounts={accounts} balances={balances} onRefresh={loadAll} />

        <hr style={dividerStyle} />

        {/* Form for adding a new transaction or editing an existing one */}
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

        {/* Transaction ledger table */}
        <h2 style={{ marginBottom: 12 }}>Transaction Ledger</h2>
       {/* Ledger table showing all transactions */}
        {loading ? (
          <p style={loadingStyle}>Loading...</p>
        ) : (
          <TransactionTable
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            // Scroll to the top so the edit form becomes visible immediately.
            onEdit={tx => { setEditingTx(tx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onDelete={handleDelete}
            editingId={editingTx?.id ?? null}
          />
        )}

        <hr style={{ ...dividerStyle, margin: '28px 0' }} />

        {/* Category manager for adding and cleaning up categories */}
        {!loading && <CategoriesPanel categories={categories} onRefresh={loadAll} />}
      </div>
    </main>
  );
}

// Reusable UI component for showing summary values like income and balance.
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
