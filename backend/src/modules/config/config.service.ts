import { Injectable } from '@nestjs/common';

export interface AppConfig {
  categories: string[];
  users: string[];
  paymentMethods: string[];
}

@Injectable()
export class ConfigAppService {
  // For now, return static values
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
      paymentMethods: ['Gojek', 'OVO', 'BCA', 'Grab'],
    };
  }
}
