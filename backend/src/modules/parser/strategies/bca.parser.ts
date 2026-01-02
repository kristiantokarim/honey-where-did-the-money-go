import { BaseParser } from './base.parser';

export class BCAParser extends BaseParser {
  readonly appType = 'BCA';

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'bca';
  }

  getPrompt(): string {
    return `Extract BCA m-Banking transaction history from this screenshot.

Look for:
- m-Transfer (bank transfers)
- Payment transactions
- 'DB' marker indicates debit (money out)
- 'CR' marker indicates credit (money in)

For each transaction, identify:
- Date
- Description/recipient
- Amount
- Transaction type (debit/credit)

Focus on debit transactions for expense tracking.`;
  }
}
