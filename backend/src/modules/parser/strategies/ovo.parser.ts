import { BaseParser } from './base.parser';

export class OVOParser extends BaseParser {
  readonly appType = 'OVO';

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'ovo';
  }

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
}
