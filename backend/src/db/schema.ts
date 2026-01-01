import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  category: text('category').notNull(),
  expense: text('expense').notNull(),
  price: integer('price').notNull(),
  quantity: integer('quantity').default(1),
  total: integer('total').notNull(),
  payment: text('payment').notNull(),
  by: text('by').notNull(),
  to: text('to').notNull(),
  remarks: text('remarks'),
  paymentCorrection: text('payment_correction'),
  // New column to support the dashboard exclusion feature
  isExcluded: integer('is_excluded', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});