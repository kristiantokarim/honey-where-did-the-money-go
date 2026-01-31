import { BaseParser } from './base.parser';
import { PaymentApp } from '../../../common/enums';

export class DanaParser extends BaseParser {
  readonly appType = PaymentApp.Dana;

  getPrompt(): string {
    return `Extract Dana transaction history from this screenshot.

Look for:
- Transfer Out (money transfers to other users/banks)
- Payment transactions (merchant payments, QR payments)
- Top-up transactions
- Cashback and rewards

Dana typically shows:
- Transaction date and time
- Recipient name or merchant
- Amount with "Rp" prefix
- Transaction status (Berhasil/Success, Gagal/Failed)

For each transaction, identify:
- Date and time
- Recipient or merchant name
- Amount (distinguish between outgoing payments and incoming transfers)
- Transaction type/category`;
  }
}
