import { pgTable, uuid, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const households = pgTable(
  'households',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
);

export const householdMembers = pgTable(
  'household_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    joinedAt: timestamp('joined_at').defaultNow(),
  },
  (table) => [
    unique('unique_household_member').on(table.householdId, table.userId),
    index('idx_household_members_household_id').on(table.householdId),
    index('idx_household_members_user_id').on(table.userId),
  ],
);

export const householdInvitations = pgTable(
  'household_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    invitedEmail: text('invited_email').notNull(),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => users.id),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_household_invitations_token').on(table.token),
  ],
);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type NewHouseholdMember = typeof householdMembers.$inferInsert;
export type HouseholdInvitation = typeof householdInvitations.$inferSelect;
export type NewHouseholdInvitation = typeof householdInvitations.$inferInsert;
