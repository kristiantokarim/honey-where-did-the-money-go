import { Injectable } from '@nestjs/common';
import { ParserFactory } from '../parser/parser.factory';

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
      categories: [
        'Food',
        'Transport',
        'Wifi',
        'Insurance',
        'Rent',
        'Top-up',
        'Bills',
        'Others',
      ],
      users: ['Kris', 'Iven'],
      paymentMethods: this.parserFactory.getSupportedApps(),
    };
  }
}
