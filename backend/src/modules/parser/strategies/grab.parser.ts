import { BaseParser } from './base.parser';
import { PaymentApp } from '../../../common/enums';

export class GrabParser extends BaseParser {
  readonly appType = PaymentApp.Grab;

  getPrompt(): string {
    return `Extract Grab transaction history from this screenshot.

Look for:
- GrabFood orders (food delivery)
- GrabCar/GrabBike rides (transport)
- GrabPay transactions
- GrabMart orders (grocery/shopping)

For each transaction, identify:
- Date and time
- Restaurant/merchant name or trip destination
- Amount paid
- Service type (Food/Transport/Shopping)
- Order status (completed/cancelled)`;
  }

  getRulesSummary(): string {
    return `[Grab]
- Services: GrabFood (food), GrabCar/GrabBike (transport), GrabMart (grocery), GrabPay
- Extract: date, restaurant/merchant/destination, amount, service type, order status`;
  }
}
