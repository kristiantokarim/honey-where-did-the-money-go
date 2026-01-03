import type { GoogleGenAI } from '@google/genai';
import { Logger } from '@nestjs/common';
import { IPaymentParser } from '../parser.interface';
import { ParsedTransaction } from '../../../common/dtos/parse-result.dto';

export abstract class BaseParser implements IPaymentParser {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly appType: string;
  abstract canParse(detectedApp: string): boolean;
  abstract getPrompt(): string;

  async parse(client: GoogleGenAI, model: string, imageData: string, mimeType: string): Promise<ParsedTransaction[]> {
    const prompt = this.buildFullPrompt();

    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageData,
                mimeType,
              },
            },
          ],
        },
      ],
    });

    const text = response.text || '';
    return this.extractJson(text);
  }

  protected buildFullPrompt(): string {
    return `${this.getPrompt()}

Return ONLY a JSON array with this exact structure: [{
  "date": "YYYY-MM-DD",
  "expense": "Item Name or Description",
  "to": "Merchant Name (e.g. Gojek, Indomaret)",
  "category": "Food|Transport|Top-up|Bills|Insurance|Rent|Wifi|Others",
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
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return parsed.map((item: any) => ({
        date: item.date,
        category: item.category || 'Others',
        expense: item.expense || item.description || '',
        price: item.total,
        quantity: 1,
        total: item.total,
        payment: item.payment || this.appType,
        to: item.to || item.merchant || '',
        remarks: item.remarks,
        status: item.status,
        isValid: item.isValid !== false,
        transactionType: item.transactionType || 'expense',
      }));
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${error.message}`);
      throw new Error(`Failed to parse transaction data: ${error.message}`);
    }
  }
}
