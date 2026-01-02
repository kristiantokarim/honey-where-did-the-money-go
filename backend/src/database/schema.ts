import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
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
  imageUrl: text('image_url'),
  isExcluded: boolean('is_excluded').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
