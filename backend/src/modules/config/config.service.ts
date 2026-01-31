import { Injectable } from '@nestjs/common';
import { ParserFactory } from '../parser/parser.factory';
import { Category } from '../../common/enums/category.enum';

export interface AppConfig {
  categories: string[];
  users: string[];
  paymentMethods: string[];
}

@Injectable()
export class ConfigAppService {
  constructor(private readonly parserFactory: ParserFactory) {}

  // For now, return static values for categories/users
  // Later with auth, these will be fetched from database per user/household
  getConfig(): AppConfig {
    return {
      categories: Object.values(Category),
      users: ['Kris', 'Iven'],
      paymentMethods: this.parserFactory.getSupportedApps(),
    };
  }
}
