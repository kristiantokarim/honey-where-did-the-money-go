import { BaseParser } from './base.parser';
import { IAIProvider } from '../providers/ai-provider.interface';
import { ParsedTransaction } from '../../../common/dtos/parse-result.dto';
import { Category, PaymentApp, TransactionType } from '../../../common/enums';
import { applyCategoryOverrides } from '../category-overrides';

interface ForwardedPattern {
  patterns: RegExp[];
  forwardedFromApp: PaymentApp;
}

const FORWARDED_PATTERNS: ForwardedPattern[] = [
  {
    patterns: [/^GRAB\*/i, /^GRAB\s*-/i, /GRAB\s+[A-Z0-9-]+/i],
    forwardedFromApp: PaymentApp.Grab,
  },
  {
    // GOPAYID pattern - Gojek CC transactions appear as "GOPAYID ..."
    patterns: [/^GOJEK\*/i, /^PT\s*GOJEK/i, /^GO-/i, /GOJEK\s+[A-Z0-9-]+/i, /^GOPAYID/i],
    forwardedFromApp: PaymentApp.Gojek,
  },
];

export class MandiriCCParser extends BaseParser {
  readonly appType = PaymentApp.Mandiri_CC;

  getPrompt(): string {
    return `Extract Mandiri credit card transactions from this statement/screenshot.

Look for:
- Transaction date
- Description/merchant name
- Transaction amount
- Transaction type (purchase, payment, fee)

Common patterns to identify:
- "GRAB* ..." or "GRAB - ..." are Grab purchases paid via credit card
- "GOPAYID ..." or "GOJEK* ..." or "PT GOJEK ..." or "GO-..." are Gojek/GoPay purchases paid via credit card
- Regular merchant names for direct purchases

For each transaction, extract:
- Date (YYYY-MM-DD format)
- Description (keep original text for pattern matching)
- Amount
- Whether it's a fee, payment, or purchase`;
  }

  async parse(
    provider: IAIProvider,
    imageData: string,
    mimeType: string,
  ): Promise<ParsedTransaction[]> {
    const prompt = this.buildFullPrompt();
    const response = await provider.analyzeImage(prompt, imageData, mimeType);
    const transactions = this.extractJson(response.text);

    // Detect forwarded transactions based on description patterns
    const processedTransactions = transactions.map((tx) => {
      const forwardedFromApp = this.detectForwardedApp(tx.expense);
      return {
        ...tx,
        forwardedFromApp,
      };
    });

    return applyCategoryOverrides(processedTransactions);
  }

  private detectForwardedApp(description: string): PaymentApp | undefined {
    if (!description) return undefined;

    for (const { patterns, forwardedFromApp } of FORWARDED_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(description)) {
          this.logger.debug(
            `Detected forwarded transaction: "${description}" -> ${forwardedFromApp}`,
          );
          return forwardedFromApp;
        }
      }
    }

    return undefined;
  }

  protected extractJson(text: string): ParsedTransaction[] {
    try {
      let cleaned = text.replace(/```json|```/g, '').trim();

      const jsonMatch = cleaned.match(/\[[\s\S]*]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      return parsed.map((item: any) => ({
        date: item.date,
        category: item.category || Category.TOPUP,
        expense: item.expense || item.description || '',
        price: item.total,
        quantity: 1,
        total: item.total,
        payment: this.appType,
        to: item.to || item.merchant || '',
        remarks: item.remarks,
        status: item.status || 'success',
        isValid: item.isValid !== false,
        transactionType: item.transactionType || TransactionType.Expense,
      }));
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${error.message}`);
      this.logger.debug(`Raw response: ${text.substring(0, 500)}`);
      throw new Error(`Failed to parse transaction data: ${error.message}`);
    }
  }
}
