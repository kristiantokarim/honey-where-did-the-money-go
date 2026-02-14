import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateHouseholdDto {
  @IsString()
  name: string;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;
}

export class UpdateMemberRoleDto {
  @IsEnum(['owner', 'member'])
  role: 'owner' | 'member';
}
