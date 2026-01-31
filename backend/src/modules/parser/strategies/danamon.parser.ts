import { BaseParser } from './base.parser';
import { PaymentApp } from '../../../common/enums';

export class DanamonParser extends BaseParser {
  readonly appType = PaymentApp.Danamon;

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'danamon' ||
           detectedApp.toLowerCase() === 'd-bank';
  }

  getPrompt(): string {
    return `Extract Bank Danamon (D-Bank PRO) transaction history from this screenshot.

Look for:
- Transfer transactions (BI-Fast, SKN, RTGS)
- QRIS payments
- Card transactions
- Bill payments (PLN, PDAM, etc.)
- Purchase transactions

Danamon/D-Bank typically shows:
- Transaction date
- Transaction description
- Debit/Credit indicator
- Amount in Rupiah
- Running balance

For each transaction, identify:
- Date and time
- Recipient or merchant name
- Amount (distinguish between debit and credit)
- Transaction type/category`;
  }
}
