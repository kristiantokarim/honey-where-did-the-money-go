import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ParserFactory } from './parser.factory';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly client: GoogleGenAI;
  private readonly model: string = 'gemini-2.5-flash';

  constructor(
    private readonly configService: ConfigService,
    private readonly parserFactory: ParserFactory,
  ) {
    const apiKey = this.configService.get<string>('google.apiKey');
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async parseImage(fileBuffer: Buffer, mimeType: string, providedAppType?: string): Promise<{
    appType: string;
    transactions: ParsedTransaction[];
  }> {
    const base64Data = fileBuffer.toString('base64');

    // Step 1: Use provided app type or detect it
    let appType: string;
    if (providedAppType && providedAppType !== 'auto') {
      appType = providedAppType;
      this.logger.log(`Using provided app type: ${appType}`);
    } else {
      appType = await this.detectAppType(base64Data, mimeType);
      this.logger.log(`Detected app type: ${appType}`);
    }

    // Step 2: Get the appropriate parser using factory
    const parser = this.parserFactory.getParser(appType);

    // Step 3: Parse the image using the selected strategy
    const transactions = await parser.parse(this.client, this.model, base64Data, mimeType);
    this.logger.log(`Parsed ${transactions.length} transactions`);

    return {
      appType: parser.appType,
      transactions,
    };
  }

  private async detectAppType(imageData: string, mimeType: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Analyze this screenshot. Reply with ONLY one word: Gojek, Grab, OVO, BCA, or Unknown.' },
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

    return (response.text || 'Unknown').trim();
  }

  getSupportedApps(): string[] {
    return this.parserFactory.getSupportedApps();
  }
}
