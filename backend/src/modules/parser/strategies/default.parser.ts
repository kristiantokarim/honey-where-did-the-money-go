import { BaseParser } from './base.parser';

export class DefaultParser extends BaseParser {
  readonly appType = 'Unknown';

  canParse(detectedApp: string): boolean {
    return true; // Always matches as fallback
  }

  getPrompt(): string {
    return `Extract financial transactions from this screenshot.

Look for any payment or transaction records including:
- Dates
- Amounts (in any currency)
- Merchant or recipient names
- Transaction descriptions

Try to categorize each transaction as:
- Food
- Transport
- Bills
- Shopping
- Others`;
  }
}
