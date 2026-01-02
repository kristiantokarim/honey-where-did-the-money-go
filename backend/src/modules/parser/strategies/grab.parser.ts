import { BaseParser } from './base.parser';

export class GrabParser extends BaseParser {
  readonly appType = 'Grab';

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === 'grab';
  }

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
}
