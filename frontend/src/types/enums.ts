// Keep in sync with backend enums

export enum Category {
  Rent = 'Rent',
  Insurance = 'Insurance',
  Gift = 'Gift',
  Transport = 'Transport',
  Meals = 'Meals',
  Fashion = 'Fashion',
  Healthcare = 'Healthcare',
  Trip = 'Trip',
  Skincare = 'Skincare',
  Utilities = 'Utilities',
  Groceries = 'Groceries',
  TopUp = 'Top-up',
  Household = 'Household',
  Entertainment = 'Entertainment',
  Gadget = 'Gadget',
  WiFi = 'WiFi',
}

export enum TransactionType {
  Expense = 'expense',
  Income = 'income',
  TransferOut = 'transfer_out',
  TransferIn = 'transfer_in',
}

export enum PaymentApp {
  Gojek = 'Gojek',
  OVO = 'OVO',
  BCA = 'BCA',
  Grab = 'Grab',
  Dana = 'Dana',
  Jenius = 'Jenius',
  Jago = 'Jago',
  Danamon = 'Danamon',
  Mandiri_CC = 'Mandiri CC',
  Unknown = 'Unknown',
}

export enum LedgerMode {
  ExpensesOnly = 'expenses_only',
  NetTotal = 'net_total',
}

export enum SortBy {
  Date = 'date',
  Total = 'total',
}
