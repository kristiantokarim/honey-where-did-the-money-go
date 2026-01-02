import { BaseParser } from './base.parser';

export class JeniusParser extends BaseParser {
  readonly appType = 'Jenius';

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'jenius';
  }

  getPrompt(): string {
    return `Extract Jenius (BTPN) transaction history from this screenshot.

Look for:
- Transfer Out (BI-Fast, RTGS, internal transfers)
- Card payments (Visa/Mastercard transactions)
- QR payments (QRIS)
- E-wallet top-ups
- Bill payments
- Flexi Cash transactions

Jenius typically shows:
- Transaction date
- Description/merchant name
- Amount with +/- indicator
- Transaction category icons

For each transaction, identify:
- Date and time
- Recipient or merchant name
- Amount (distinguish between debit and credit)
- Transaction type/category`;
  }
}
