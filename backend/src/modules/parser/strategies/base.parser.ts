import { Logger } from '@nestjs/common';
import { IPaymentParser } from '../parser.interface';
import { IAIProvider } from '../providers/ai-provider.interface';
import { ParsedTransaction } from '../../../common/dtos/parse-result.dto';
import { Category, PaymentApp, TransactionType } from '../../../common/enums';
import { applyCategoryOverrides } from '../category-overrides';

export abstract class BaseParser implements IPaymentParser {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly appType: PaymentApp;
  abstract getPrompt(): string;

  canParse(detectedApp: string): boolean {
    return detectedApp.toLowerCase() === this.appType.toLowerCase();
  }

  async parse(
    provider: IAIProvider,
    imageData: string,
    mimeType: string,
  ): Promise<ParsedTransaction[]> {
    const prompt = this.buildFullPrompt();
    const response = await provider.analyzeImage(prompt, imageData, mimeType);
    const transactions = this.extractJson(response.text);
    return applyCategoryOverrides(transactions);
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
- Everything else (purchases, payments, fees, orders) → transactionType: "expense"`;
  }

  protected extractJson(text: string): ParsedTransaction[] {
    try {
      // Remove markdown code blocks
      let cleaned = text.replace(/```json|```/g, '').trim();

      // Find JSON array in the response - Claude might add text before/after
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
