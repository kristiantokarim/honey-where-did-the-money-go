import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { HouseholdService } from './household.service';
import {
  CreateHouseholdDto,
  InviteMemberDto,
  AcceptInvitationDto,
} from './household.dto';
import { CurrentUser, SkipHousehold } from '../auth/decorators';

@Controller('households')
@SkipHousehold()
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  @Get()
  async getUserHouseholds(@CurrentUser('sub') userId: string) {
    return this.householdService.getUserHouseholds(userId);
  }

  @Post()
  async createHousehold(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.householdService.createHousehold(userId, dto.name);
  }

  // Static routes before parameterized :id routes
  @Get('my-invitations')
  async getReceivedInvitations(@CurrentUser('email') email: string) {
    return this.householdService.getReceivedInvitations(email);
  }

  @Delete('my-invitations/:invitationId')
  async declineInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser('email') email: string,
  ) {
    await this.householdService.declineInvitation(invitationId, email);
    return { success: true };
  }

  @Post('accept-invitation')
  async acceptInvitation(
    @CurrentUser('sub') userId: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.householdService.acceptInvitation(dto.token, userId);
  }

  @Get(':id/members')
  async getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.householdService.getHouseholdMembers(id, userId);
  }

  @Get(':id/invitations')
  async getHouseholdInvitations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.householdService.getHouseholdInvitations(id, userId);
  }

  @Delete(':id/invitations/:invitationId')
  async cancelInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.householdService.cancelInvitation(invitationId, userId);
    return { success: true };
  }

  @Post(':id/invite')
  async inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.householdService.inviteMember(id, dto.email, userId);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser('sub') requestingUserId: string,
  ) {
    await this.householdService.removeMember(id, targetUserId, requestingUserId);
    return { success: true };
  }

  @Post(':id/leave')
  async leaveHousehold(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.householdService.leaveHousehold(id, userId);
    return { success: true };
  }
}
