export interface ParsedTransaction {
  date: string;
  category: string;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: string;
  to: string;
  remarks?: string;
  status?: string;
  isValid?: boolean;
}

export interface ParseResult {
  appType: string;
  transactions: ParsedTransaction[];
  imageUrl?: string;
}
