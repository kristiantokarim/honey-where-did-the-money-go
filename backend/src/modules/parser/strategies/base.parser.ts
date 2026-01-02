import { GenerativeModel } from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { IPaymentParser } from '../parser.interface';
import { ParsedTransaction } from '../../../common/dtos/parse-result.dto';

export abstract class BaseParser implements IPaymentParser {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly appType: string;
  abstract canParse(detectedApp: string): boolean;
  abstract getPrompt(): string;

  async parse(model: GenerativeModel, imageData: string, mimeType: string): Promise<ParsedTransaction[]> {
    const prompt = this.buildFullPrompt();

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType } },
    ]);

    const text = result.response.text();
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
  "isValid": boolean
}].

Rules:
- 'price' will be equal to 'total' by default.
- 'quantity' is 1.
- 'by' should be empty (user will fill).
- isValid is false if status is failed/cancelled.
- In Indonesia, 'Rp. 34.000' means '34000' rupiah.`;
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
      }));
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${error.message}`);
      throw new Error(`Failed to parse transaction data: ${error.message}`);
    }
  }
}
