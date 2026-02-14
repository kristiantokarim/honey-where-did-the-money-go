import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { SKIP_HOUSEHOLD_KEY } from './decorators/skip-household.decorator';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { Database } from '../../database/base.repository';
import { householdMembers } from '../../database/schema';

@Injectable()
export class HouseholdGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(DATABASE_TOKEN)
    private db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skipHousehold = this.reflector.getAllAndOverride<boolean>(SKIP_HOUSEHOLD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipHousehold) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const householdId = request.headers['x-household-id'];
    const userId = request.user?.sub;

    if (!householdId) {
      throw new ForbiddenException('X-Household-Id header is required');
    }

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const [membership] = await this.db
      .select()
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId),
        ),
      );

    if (!membership) {
      throw new ForbiddenException('You are not a member of this household');
    }

    request.householdId = householdId;
    request.householdRole = membership.role;

    return true;
  }
}
