import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerificationToken: text('email_verification_token'),
    emailVerificationExpiresAt: timestamp('email_verification_expires_at'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpiresAt: timestamp('password_reset_expires_at'),
    lastVerificationEmailSentAt: timestamp('last_verification_email_sent_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_refresh_tokens_user_id').on(table.userId),
    index('idx_refresh_tokens_expires_at').on(table.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
