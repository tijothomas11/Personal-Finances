
/*
# Personal Finance Ledger - Foundation Schema

## Summary
Creates the core tables for a personal finance ledger app: categories, accounts, and transactions.
No authentication is required - this is a single-tenant app using the anon key.

## New Tables

### categories
Stores spending/income categories (e.g. Food & Dining, Salary).
- id: uuid primary key
- name: text, unique category label
- is_default: bool, marks built-in categories that cannot be deleted
- created_at: timestamp

### accounts
Stores money containers (bank accounts, credit cards, savings, cash, etc.)
- id: uuid primary key
- name: text, user-given account name
- type: text, one of: bank, credit_card, savings, cash, other
- opening_balance: numeric, starting balance when account was added
- created_at: timestamp

### transactions
Core ledger table. Every movement of money is a row here.
- id: uuid primary key
- type: text, one of: income, expense, transfer
- amount: numeric, always positive
- description: text, what the transaction actually was (e.g. "KFC Lunch")
- category_id: uuid FK → categories (nullable for transfers)
- account_id: uuid FK → accounts (the primary account for income/expense)
- from_account_id: uuid FK → accounts (source for transfers)
- to_account_id: uuid FK → accounts (destination for transfers)
- transaction_date: date, the real-world date the transaction occurred
- transaction_time: time, the real-world time the transaction occurred
- created_at: timestamp, when the row was entered in the app
- updated_at: timestamp, when the row was last edited

## Security
RLS enabled on all tables. Anon + authenticated roles can do full CRUD
because this is a single-tenant personal app with no login screen.

## Notes
1. transfer rows typically have no category_id
2. income/expense rows use account_id; from/to account fields will be null
3. transfer rows use from_account_id + to_account_id; account_id will be null
4. Default categories are seeded at the end of this migration
*/

-- ─── CATEGORIES ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_idx ON categories (name);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- ─── ACCOUNTS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  type            text NOT NULL DEFAULT 'bank'
                    CHECK (type IN ('bank','credit_card','savings','cash','other')),
  opening_balance numeric(14,2) NOT NULL DEFAULT 0.00,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_accounts" ON accounts;
CREATE POLICY "anon_select_accounts" ON accounts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_accounts" ON accounts;
CREATE POLICY "anon_insert_accounts" ON accounts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_accounts" ON accounts;
CREATE POLICY "anon_update_accounts" ON accounts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_accounts" ON accounts;
CREATE POLICY "anon_delete_accounts" ON accounts FOR DELETE
  TO anon, authenticated USING (true);

-- ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              text NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount            numeric(14,2) NOT NULL CHECK (amount > 0),
  description       text NOT NULL DEFAULT '',
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  account_id        uuid REFERENCES accounts(id) ON DELETE SET NULL,
  from_account_id   uuid REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id     uuid REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_date  date NOT NULL DEFAULT CURRENT_DATE,
  transaction_time  time NOT NULL DEFAULT CURRENT_TIME,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_date_time_idx
  ON transactions (transaction_date DESC, transaction_time DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

-- ─── SEED DEFAULT CATEGORIES ─────────────────────────────────────────────────

INSERT INTO categories (name, is_default) VALUES
  ('Salary',          true),
  ('Food & Dining',   true),
  ('Groceries',       true),
  ('Transport',       true),
  ('Rent / Housing',  true),
  ('Utilities',       true),
  ('Shopping',        true),
  ('Health',          true),
  ('Education',       true),
  ('Entertainment',   true),
  ('Miscellaneous',   true)
ON CONFLICT (name) DO NOTHING;
