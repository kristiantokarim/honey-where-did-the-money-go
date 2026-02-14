import { Module } from '@nestjs/common';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';
import { HouseholdRepository } from './household.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HouseholdController],
  providers: [HouseholdService, HouseholdRepository],
  exports: [HouseholdService, HouseholdRepository],
})
export class HouseholdModule {}
