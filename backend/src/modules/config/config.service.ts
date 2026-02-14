import { Injectable } from '@nestjs/common';
import { ParserFactory } from '../parser/parser.factory';
import { Category } from '../../common/enums/category.enum';
import { HouseholdRepository } from '../household/household.repository';

export interface AppConfig {
  categories: string[];
  users: string[];
  paymentMethods: string[];
}

@Injectable()
export class ConfigAppService {
  constructor(
    private readonly parserFactory: ParserFactory,
    private readonly householdRepository: HouseholdRepository,
  ) {}

  async getConfig(householdId: string): Promise<AppConfig> {
    const memberNames = await this.householdRepository.getMemberNames(householdId);
    return {
      categories: Object.values(Category),
      users: memberNames,
      paymentMethods: this.parserFactory.getSupportedApps(),
    };
  }
}
