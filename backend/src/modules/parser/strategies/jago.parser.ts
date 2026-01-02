import { BaseParser } from './base.parser';

export class JagoParser extends BaseParser {
  readonly appType = 'Jago';

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'jago';
  }

  getPrompt(): string {
    return `Extract Bank Jago transaction history from this screenshot.

Look for:
- Transfer Out (to other banks, Jago users)
- Pocket transfers (between Jago pockets)
- Card transactions (debit card purchases)
- QRIS payments
- Bill payments
- Top-ups to e-wallets

Jago typically shows:
- Transaction date and time
- Description with merchant/recipient name
- Amount (red for outgoing, green for incoming)
- Pocket name if applicable

For each transaction, identify:
- Date and time
- Recipient or merchant name
- Amount (distinguish between outgoing and incoming)
- Transaction type/category`;
  }
}
