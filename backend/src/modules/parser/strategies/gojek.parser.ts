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
- Payment method: Look for "GoPay Saldo" (wallet balance) or "xx-XXXX" pattern (credit card)

For each transaction, identify:
- Date and time
- Merchant/restaurant name or driver destination
- Amount paid
- Service type (Food/Transport)
- remarks: Include payment method if visible, e.g. "Paid with CC xx-1394" or "Paid with GoPay Saldo"`;
  }

  getRulesSummary(): string {
    return `[Gojek]
- Services: Gofood (food delivery), Goride/Gocar (transport), Gopay
- Status: "Selesai" = completed, "Dibatalkan" = cancelled
- Payment: "GoPay Saldo" (wallet) or "xx-XXXX" pattern (credit card)
- Include payment method in remarks (e.g. "Paid with CC xx-1394")`;
  }
}
