import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { HouseholdRepository } from './household.repository';
import { EmailService } from '../auth/email.service';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { Database } from '../../database/base.repository';
import { users } from '../../database/schema';

@Injectable()
export class HouseholdService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly emailService: EmailService,
    @Inject(DATABASE_TOKEN) private readonly db: Database,
  ) {}

  async getUserHouseholds(userId: string) {
    const results = await this.repository.findHouseholdsByUser(userId);
    return results.map(({ household, role }) => ({
      id: household.id,
      name: household.name,
      role,
      createdAt: household.createdAt,
    }));
  }

  async getHouseholdMembers(householdId: string, userId: string) {
    const membership = await this.repository.findMembership(userId, householdId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this household');
    }
    return this.repository.findMembersByHousehold(householdId);
  }

  async createHousehold(userId: string, name: string) {
    const household = await this.db.transaction(async (tx) => {
      const repo = this.repository.withTx(tx);
      const created = await repo.createHousehold({ name });
      await repo.addMember({
        householdId: created.id,
        userId,
        role: 'owner',
      });
      return created;
    });
    return household;
  }

  async inviteMember(
    householdId: string,
    email: string,
    invitedByUserId: string,
  ) {
    const inviterMembership = await this.repository.findMembership(invitedByUserId, householdId);
    if (!inviterMembership || inviterMembership.role !== 'owner') {
      throw new ForbiddenException('Only owners can invite members');
    }

    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      const membership = await this.repository.findMembership(
        existingUser.id,
        householdId,
      );
      if (membership) {
        throw new BadRequestException('User is already a member of this household');
      }
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.repository.createInvitation({
      householdId,
      invitedEmail: email,
      invitedByUserId,
      token,
      expiresAt,
    });

    const inviter = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, invitedByUserId));
    const household = await this.repository.findHouseholdById(householdId);

    // Send email outside DB operations per robustness guidelines
    await this.emailService.sendHouseholdInviteEmail(
      email,
      inviter[0]?.name ?? 'A user',
      household?.name ?? 'a household',
      token,
    );

    return { message: 'Invitation sent' };
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.repository.findInvitationByToken(token);

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    const existingMembership = await this.repository.findMembership(
      userId,
      invitation.householdId,
    );

    if (!existingMembership) {
      await this.db.transaction(async (tx) => {
        const repo = this.repository.withTx(tx);
        await repo.addMember({
          householdId: invitation.householdId,
          userId,
          role: 'member',
        });
        await repo.deleteInvitation(invitation.id);
      });
    } else {
      await this.repository.deleteInvitation(invitation.id);
    }

    return this.repository.findHouseholdById(invitation.householdId);
  }

  async removeMember(
    householdId: string,
    targetUserId: string,
    requestingUserId: string,
  ) {
    const requestingMembership = await this.repository.findMembership(
      requestingUserId,
      householdId,
    );

    if (!requestingMembership || requestingMembership.role !== 'owner') {
      throw new ForbiddenException('Only owners can remove members');
    }

    if (targetUserId === requestingUserId) {
      throw new BadRequestException('Use leave endpoint instead');
    }

    await this.repository.removeMember(householdId, targetUserId);
  }

  async leaveHousehold(householdId: string, userId: string) {
    const membership = await this.repository.findMembership(userId, householdId);

    if (!membership) {
      throw new NotFoundException('Not a member of this household');
    }

    if (membership.role === 'owner') {
      const ownerCount = await this.repository.countOwners(householdId);
      if (ownerCount <= 1) {
        throw new BadRequestException('Transfer ownership before leaving');
      }
    }

    await this.repository.removeMember(householdId, userId);
  }

  async getHouseholdInvitations(householdId: string, userId: string) {
    const membership = await this.repository.findMembership(userId, householdId);
    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only owners can view invitations');
    }
    return this.repository.findPendingInvitationsByHousehold(householdId);
  }

  async getReceivedInvitations(email: string) {
    return this.repository.findPendingInvitationsByEmail(email);
  }

  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await this.repository.findInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const membership = await this.repository.findMembership(
      userId,
      invitation.householdId,
    );
    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only owners can cancel invitations');
    }

    await this.repository.deleteInvitation(invitationId);
  }

  async declineInvitation(invitationId: string, email: string) {
    const invitation = await this.repository.findInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedEmail !== email) {
      throw new ForbiddenException('This invitation is not for you');
    }

    await this.repository.deleteInvitation(invitationId);
  }

  async getMemberNames(householdId: string): Promise<string[]> {
    return this.repository.getMemberNames(householdId);
  }
}
