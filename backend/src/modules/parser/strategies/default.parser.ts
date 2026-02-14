import { BaseParser } from './base.parser';
import { PaymentApp } from '../../../common/enums';

export class DefaultParser extends BaseParser {
  readonly appType = PaymentApp.Unknown;

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

  getRulesSummary(): string {
    return `[Unknown/Other]
- Generic extraction: dates, amounts (any currency), merchant/recipient names, descriptions`;
  }
}
