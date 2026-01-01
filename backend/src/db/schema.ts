import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Date Fields
  date: text('date').notNull(), // Store as YYYY-MM-DD for sorting
  
  // Item Details
  category: text('category').notNull(),
  expense: text('expense').notNull(), // The item name (e.g., "Casman Rent Jun")
  
  // Financials
  price: integer('price').notNull(),
  quantity: integer('quantity').default(1),
  total: integer('total').notNull(),
  
  // Payment Details
  payment: text('payment').notNull(), // Jago, CC Mandiri, etc.
  by: text('by').notNull(),           // Kris, Iven
  to: text('to').notNull(),           // Merchant (Link Net, Allianz)
  
  // Extras
  remarks: text('remarks'),
  paymentCorrection: text('payment_correction'),
  
  // System
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});