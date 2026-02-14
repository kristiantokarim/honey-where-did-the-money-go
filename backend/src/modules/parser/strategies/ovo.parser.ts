import { BaseParser } from './base.parser';
import { PaymentApp } from '../../../common/enums';

export class OVOParser extends BaseParser {
  readonly appType = PaymentApp.OVO;

  getPrompt(): string {
    return `Extract OVO transaction history from this screenshot.

Look for:
- Transfer Out (money transfers)
- Merchant Payment (store purchases)
- Top-up transactions
- Cashback received

Differentiate between:
- Outgoing payments (negative amounts)
- Incoming transfers/cashback (positive amounts)

For each transaction, identify:
- Date and time
- Recipient or merchant name
- Amount
- Transaction type`;
  }

  getRulesSummary(): string {
    return `[OVO]
- Types: Transfer Out, Merchant Payment, Top-up, Cashback
- Outgoing payments = negative amounts, incoming transfers/cashback = positive
- Extract: date, recipient/merchant, amount, transaction type`;
  }
}
