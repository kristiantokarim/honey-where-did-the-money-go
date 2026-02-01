import { pgTable, uuid, text, integer, timestamp, serial, jsonb, index, unique } from 'drizzle-orm/pg-core';

export const scanSessions = pgTable(
  'scan_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    status: text('status').notNull().default('in_progress'),
    currentPageIndex: integer('current_page_index').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_scan_sessions_user_id').on(table.userId),
    index('idx_scan_sessions_status').on(table.status),
    index('idx_scan_sessions_expires_at').on(table.expiresAt),
  ],
);

export const scanSessionPages = pgTable(
  'scan_session_pages',
  {
    id: serial('id').primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => scanSessions.id, { onDelete: 'cascade' }),
    pageIndex: integer('page_index').notNull(),
    imageKey: text('image_key').notNull(),
    imageUrl: text('image_url').notNull(),
    appType: text('app_type'),
    parseStatus: text('parse_status').notNull().default('pending'),
    parseResult: jsonb('parse_result'),
    parseError: text('parse_error'),
    retryCount: integer('retry_count').notNull().default(0),
    reviewStatus: text('review_status').notNull().default('pending'),
    confirmedAt: timestamp('confirmed_at'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_scan_session_pages_session_id').on(table.sessionId),
    index('idx_scan_session_pages_parse_status').on(table.parseStatus),
    unique('unique_session_page').on(table.sessionId, table.pageIndex),
  ],
);

export type ScanSession = typeof scanSessions.$inferSelect;
export type NewScanSession = typeof scanSessions.$inferInsert;
export type ScanSessionPage = typeof scanSessionPages.$inferSelect;
export type NewScanSessionPage = typeof scanSessionPages.$inferInsert;
