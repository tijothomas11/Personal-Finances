import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AccountType = 'bank' | 'credit_card' | 'savings' | 'cash' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string | null;
  account_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  transaction_date: string;
  transaction_time: string;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category | null;
  account?: Account | null;
  from_account?: Account | null;
  to_account?: Account | null;
}
