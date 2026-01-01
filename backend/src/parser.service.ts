import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ParserService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  }

  async parseImage(fileBuffer: Buffer, mimeType: string) {
    const model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const base64Data = fileBuffer.toString('base64');

    // STEP 1: Determine the E-Money App
    const appType = await this.determineAppType(model, base64Data, mimeType);
    
    // STEP 2: Route to the specific parser
    return this.runSpecializedParser(model, appType, base64Data, mimeType);
  }

  private async determineAppType(model: any, data: string, mimeType: string): Promise<string> {
    const result = await model.generateContent([
      "Analyze this screenshot. Reply with ONLY one word: Gojek, Grab, OVO, BCA, or Unknown.",
      { inlineData: { data, mimeType } }
    ]);
    return result.response.text().trim();
  }

  private async runSpecializedParser(model: any, app: string, data: string, mimeType: string) {
    const prompts = {
      Gojek: "Extract Gojek history. Look for 'Gofood', 'Goride'. Find status 'Selesai' vs 'Dibatalkan'.",
      OVO: "Extract OVO history. Differentiate between 'Transfer Out' and 'Merchant Payment'.",
      BCA: "Extract BCA m-Banking. Look for 'm-Transfer' and 'DB' (debit) vs 'CR' (credit) markers.",
      Default: "Extract financial transactions from this screenshot."
    };

    const selectedPrompt = `${prompts[app] || prompts.Default}
      Return ONLY a JSON array with this exact structure: [{
        "date": "YYYY-MM-DD",
        "expense": "Item Name or Description",
        "to": "Merchant Name (e.g. Gojek, Indomaret)",
        "category": "Food|Transport|Top-up|Bills|Insurance|Rent|Others",
        "total": number (Absolute value),
        "payment": "${app}", 
        "status": "string",
        "isValid": boolean
      }].
      
      Rules:
      - 'price' will be equal to 'total' by default.
      - 'quantity' is 1.
      - 'by' should be empty (user will fill).
      - isValid is false if status is failed/cancelled.
      - In Indonesia, 'Rp. 34.000' means '34000' rupiah.
    `;

    const result = await model.generateContent([
      selectedPrompt,
      { inlineData: { data, mimeType } }
    ]);

    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }
}
