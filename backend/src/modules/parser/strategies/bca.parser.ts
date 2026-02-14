import { BaseParser } from './base.parser';
import { PaymentApp } from '../../../common/enums';

export class BCAParser extends BaseParser {
  readonly appType = PaymentApp.BCA;

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

  getRulesSummary(): string {
    return `[BCA]
- m-Banking: m-Transfer, payment transactions
- "DB" marker = debit (money out), "CR" = credit (money in)
- Focus on debit transactions for expense tracking`;
  }
}
