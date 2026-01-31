import { BaseParser } from './base.parser';
import { PaymentApp } from '../../../common/enums';

export class GojekParser extends BaseParser {
  readonly appType = PaymentApp.Gojek;

  getPrompt(): string {
    return `Extract Gojek transaction history from this screenshot.

Look for:
- Gofood orders (food delivery)
- Goride/Gocar (transport)
- Gopay transactions
- Transaction status: 'Selesai' (completed) vs 'Dibatalkan' (cancelled)

For each transaction, identify:
- Date and time
- Merchant/restaurant name or driver destination
- Amount paid
- Service type (Food/Transport)`;
  }
}
