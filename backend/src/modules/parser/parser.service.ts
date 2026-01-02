import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ParserFactory } from './parser.factory';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly parserFactory: ParserFactory,
  ) {
    const apiKey = this.configService.get<string>('google.apiKey');
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async parseImage(fileBuffer: Buffer, mimeType: string): Promise<{
    appType: string;
    transactions: ParsedTransaction[];
  }> {
    const base64Data = fileBuffer.toString('base64');

    // Step 1: Detect the payment app
    const appType = await this.detectAppType(base64Data, mimeType);
    this.logger.log(`Detected app type: ${appType}`);

    // Step 2: Get the appropriate parser using factory
    const parser = this.parserFactory.getParser(appType);

    // Step 3: Parse the image using the selected strategy
    const transactions = await parser.parse(this.model, base64Data, mimeType);
    this.logger.log(`Parsed ${transactions.length} transactions`);

    return {
      appType: parser.appType,
      transactions,
    };
  }

  private async detectAppType(imageData: string, mimeType: string): Promise<string> {
    const result = await this.model.generateContent([
      'Analyze this screenshot. Reply with ONLY one word: Gojek, Grab, OVO, BCA, or Unknown.',
      { inlineData: { data: imageData, mimeType } },
    ]);

    return result.response.text().trim();
  }

  getSupportedApps(): string[] {
    return this.parserFactory.getSupportedApps();
  }
}
