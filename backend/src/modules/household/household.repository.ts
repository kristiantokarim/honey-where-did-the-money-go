import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lt, gt, count } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { BaseRepository, Database } from '../../database/base.repository';
import {
  households,
  householdMembers,
  householdInvitations,
  users,
  Household,
  HouseholdMember,
  HouseholdInvitation,
} from '../../database/schema';

@Injectable()
export class HouseholdRepository extends BaseRepository {
  constructor(
    @Inject(DATABASE_TOKEN)
    db: Database,
  ) {
    super(db);
  }

  async createHousehold(data: { name: string }): Promise<Household> {
    const [result] = await this.getDb()
      .insert(households)
      .values(data)
      .returning();
    return result;
  }

  async findHouseholdById(id: string): Promise<Household | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(households)
      .where(eq(households.id, id));
    return result;
  }

  async addMember(data: {
    householdId: string;
    userId: string;
    role: string;
  }): Promise<HouseholdMember> {
    const [result] = await this.getDb()
      .insert(householdMembers)
      .values(data)
      .returning();
    return result;
  }

  async findMembersByHousehold(
    householdId: string,
  ): Promise<
    Array<HouseholdMember & { user: { id: string; name: string; email: string } }>
  > {
    const rows = await this.getDb()
      .select({
        id: householdMembers.id,
        householdId: householdMembers.householdId,
        userId: householdMembers.userId,
        role: householdMembers.role,
        joinedAt: householdMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(eq(householdMembers.householdId, householdId));

    return rows.map((row) => ({
      id: row.id,
      householdId: row.householdId,
      userId: row.userId,
      role: row.role,
      joinedAt: row.joinedAt,
      user: {
        id: row.userId,
        name: row.userName,
        email: row.userEmail,
      },
    }));
  }

  async findHouseholdsByUser(
    userId: string,
  ): Promise<Array<{ household: Household; role: string }>> {
    const rows = await this.getDb()
      .select({
        household: households,
        role: householdMembers.role,
      })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(eq(householdMembers.userId, userId));

    return rows;
  }

  async findMembership(
    userId: string,
    householdId: string,
  ): Promise<HouseholdMember | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.householdId, householdId),
        ),
      );
    return result;
  }

  async removeMember(householdId: string, userId: string): Promise<void> {
    await this.getDb()
      .delete(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId),
        ),
      );
  }

  async updateMemberRole(
    householdId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    await this.getDb()
      .update(householdMembers)
      .set({ role })
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId),
        ),
      );
  }

  async countOwners(householdId: string): Promise<number> {
    const [result] = await this.getDb()
      .select({ count: count() })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.role, 'owner'),
        ),
      );
    return result.count;
  }

  async createInvitation(data: {
    householdId: string;
    invitedEmail: string;
    invitedByUserId: string;
    token: string;
    expiresAt: Date;
  }): Promise<HouseholdInvitation> {
    const [result] = await this.getDb()
      .insert(householdInvitations)
      .values(data)
      .returning();
    return result;
  }

  async findInvitationByToken(
    token: string,
  ): Promise<HouseholdInvitation | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(householdInvitations)
      .where(eq(householdInvitations.token, token));
    return result;
  }

  async deleteInvitation(id: string): Promise<void> {
    await this.getDb()
      .delete(householdInvitations)
      .where(eq(householdInvitations.id, id));
  }

  async findInvitationById(
    id: string,
  ): Promise<HouseholdInvitation | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(householdInvitations)
      .where(eq(householdInvitations.id, id));
    return result;
  }

  async findPendingInvitationsByHousehold(
    householdId: string,
  ): Promise<
    Array<{ id: string; invitedEmail: string; createdAt: Date | null; expiresAt: Date }>
  > {
    return this.getDb()
      .select({
        id: householdInvitations.id,
        invitedEmail: householdInvitations.invitedEmail,
        createdAt: householdInvitations.createdAt,
        expiresAt: householdInvitations.expiresAt,
      })
      .from(householdInvitations)
      .where(
        and(
          eq(householdInvitations.householdId, householdId),
          gt(householdInvitations.expiresAt, new Date()),
        ),
      );
  }

  async findPendingInvitationsByEmail(
    email: string,
  ): Promise<
    Array<{
      id: string;
      token: string;
      householdName: string | null;
      invitedByName: string;
      createdAt: Date | null;
      expiresAt: Date;
    }>
  > {
    return this.getDb()
      .select({
        id: householdInvitations.id,
        token: householdInvitations.token,
        householdName: households.name,
        invitedByName: users.name,
        createdAt: householdInvitations.createdAt,
        expiresAt: householdInvitations.expiresAt,
      })
      .from(householdInvitations)
      .innerJoin(households, eq(householdInvitations.householdId, households.id))
      .innerJoin(users, eq(householdInvitations.invitedByUserId, users.id))
      .where(
        and(
          eq(householdInvitations.invitedEmail, email),
          gt(householdInvitations.expiresAt, new Date()),
        ),
      );
  }

  async deleteExpiredInvitations(): Promise<number> {
    const result = await this.getDb()
      .delete(householdInvitations)
      .where(lt(householdInvitations.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  async getMemberNames(householdId: string): Promise<string[]> {
    const rows = await this.getDb()
      .select({ name: users.name })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(eq(householdMembers.householdId, householdId));

    return rows.map((row) => row.name);
  }
}
