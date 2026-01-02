export interface Transaction {
  id: number;
  date: string;
  category: string;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: string;
  by: string;
  to: string;
  remarks?: string;
  imageUrl?: string;
  isExcluded?: boolean;
}

export interface ParsedTransaction extends Omit<Transaction, 'id'> {
  isDuplicate?: boolean;
  isValid?: boolean;
  status?: string;
}

export interface DashboardItem {
  name: string;
  total: number;
}

export interface AppConfig {
  categories: string[];
  users: string[];
  paymentMethods: string[];
}

export interface ParseResult {
  appType: string;
  transactions: ParsedTransaction[];
  imageUrl?: string;
}
