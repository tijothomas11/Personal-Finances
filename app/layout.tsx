import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

// Load Inter font and apply it globally to the app
const inter = Inter({ subsets: ['latin'] })

// Global metadata for the app (page title, description, etc.)
export const metadata: Metadata = {
  title: 'Personal Finance Ledger',
  description: 'Track income, expenses, and account balances',
}

// Root layout for the entire app.
// Wraps all pages and applies global styles and fonts.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
