import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { EmailService } from './email.service';
import { AuthGuard } from './auth.guard';
import { HouseholdGuard } from './household.guard';
import { AuthCleanupService } from './auth-cleanup.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    EmailService,
    AuthCleanupService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: HouseholdGuard,
    },
  ],
  exports: [AuthService, AuthRepository, EmailService],
})
export class AuthModule {}
