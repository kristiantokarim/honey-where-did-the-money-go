import { Logger } from '@nestjs/common';
import { IPaymentParser } from '../parser.interface';
import { IAIProvider } from '../providers/ai-provider.interface';
import { ParsedTransaction } from '../../../common/dtos/parse-result.dto';
import { Category, PaymentApp, TransactionType } from '../../../common/enums';
import { applyCategoryOverrides } from '../category-overrides';

const SYSTEM_PROMPT =
  'You extract financial transaction data from receipt/payment app screenshots. Return only valid JSON matching the requested schema.';

export abstract class BaseParser implements IPaymentParser {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly appType: PaymentApp;
  abstract getPrompt(): string;
  abstract getRulesSummary(): string;

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === this.appType.toLowerCase();
  }

  postProcess(transactions: ParsedTransaction[]): ParsedTransaction[] {
    return transactions;
  }

  async parse(
    provider: IAIProvider,
    imageData: string,
    mimeType: string,
  ): Promise<ParsedTransaction[]> {
    const prompt = this.buildFullPrompt();
    const response = await provider.analyzeImage(prompt, imageData, mimeType, {
      systemPrompt: SYSTEM_PROMPT,
    });
    const transactions = this.extractJson(response.text);
    return applyCategoryOverrides(transactions);
  }

  static buildCombinedPrompt(allRulesSummaries: string): string {
    const categoryList = Object.values(Category).join('|');
    const appNames = allRulesSummaries
      .match(/^\[(.+?)\]/gm)
      ?.map((m) => m.slice(1, -1))
      .join(', ') || 'Unknown';

    return `Step 1: Identify which payment app this screenshot is from: ${appNames}.

Step 2: Extract transactions using the app-specific rules below.

${allRulesSummaries}

If the app is not recognized, extract transactions generically.

Return ONLY a JSON object (not an array): {
  "app": "DetectedAppName",
  "transactions": [{
    "date": "YYYY-MM-DD",
    "expense": "Item Name or Description",
    "to": "Merchant Name (e.g. Gojek, Indomaret)",
    "category": "${categoryList}",
    "total": number (Absolute value),
    "payment": "DetectedAppName",
    "status": "string",
    "isValid": boolean,
    "transactionType": "expense|income|transfer_out|transfer_in"
  }]
}

Rules:
- 'price' will be equal to 'total' by default.
- 'quantity' is 1.
- 'by' should be empty (user will fill).
- isValid is false if status is failed/cancelled.
- In Indonesia, 'Rp. 34.000' means '34000' rupiah.

Transaction Type Detection:
- "Transfer to [App]", "Top Up to [App]", "Send to [Account]", "Kirim ke" → transactionType: "transfer_out"
- "Received from [App]", "Top Up from [Account]", "Transfer from", "Terima dari" → transactionType: "transfer_in"
- "Cashback", "Refund", "Reward", salary deposits, "Pengembalian" → transactionType: "income"
- Everything else (purchases, payments, fees, orders) → transactionType: "expense"

Return ONLY the JSON object. No markdown fences, no summary, no explanation.`;
  }

  static extractCombinedJson(
    text: string,
    fallbackAppType: PaymentApp,
  ): { app: string; transactions: ParsedTransaction[] } {
    try {
      let cleaned = text.replace(/```json|```/g, '').trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);
      const app: string = parsed.app || fallbackAppType;
      const rawTransactions: any[] = parsed.transactions || [];

      const transactions: ParsedTransaction[] = rawTransactions.map((item: any) => ({
        date: item.date,
        category: item.category || Category.TOPUP,
        expense: item.expense || item.description || '',
        price: item.total,
        quantity: 1,
        total: item.total,
        payment: item.payment || app,
        to: item.to || item.merchant || '',
        remarks: item.remarks,
        status: item.status || 'success',
        isValid: item.isValid !== false,
        transactionType: item.transactionType || TransactionType.Expense,
      }));

      return { app, transactions };
    } catch (error) {
      const logger = new Logger('BaseParser');
      logger.error(`Failed to parse combined JSON response: ${error.message}`);
      logger.debug(`Raw response: ${text.substring(0, 500)}`);
      throw new Error(`Failed to parse combined transaction data: ${error.message}`);
    }
  }

  protected buildFullPrompt(): string {
    const categoryList = Object.values(Category).join('|');

    return `${this.getPrompt()}

Return ONLY a JSON array with this exact structure: [{
  "date": "YYYY-MM-DD",
  "expense": "Item Name or Description",
  "to": "Merchant Name (e.g. Gojek, Indomaret)",
  "category": "${categoryList}",
  "total": number (Absolute value),
  "payment": "${this.appType}",
  "status": "string",
  "isValid": boolean,
  "transactionType": "expense|income|transfer_out|transfer_in"
}].

Rules:
- 'price' will be equal to 'total' by default.
- 'quantity' is 1.
- 'by' should be empty (user will fill).
- isValid is false if status is failed/cancelled.
- In Indonesia, 'Rp. 34.000' means '34000' rupiah.

Transaction Type Detection:
- "Transfer to [App]", "Top Up to [App]", "Send to [Account]", "Kirim ke" → transactionType: "transfer_out"
- "Received from [App]", "Top Up from [Account]", "Transfer from", "Terima dari" → transactionType: "transfer_in"
- "Cashback", "Refund", "Reward", salary deposits, "Pengembalian" → transactionType: "income"
- Everything else (purchases, payments, fees, orders) → transactionType: "expense"

Return ONLY the JSON array. No markdown fences, no summary, no explanation.`;
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
        payment: item.payment || this.appType,
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
