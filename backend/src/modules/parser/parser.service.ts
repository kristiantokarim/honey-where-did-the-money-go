import { Injectable, Logger } from '@nestjs/common';
import { ParserFactory } from './parser.factory';
import { AIProviderFactory } from './providers';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    private readonly parserFactory: ParserFactory,
    private readonly aiProviderFactory: AIProviderFactory,
  ) {}

  async parseImage(
    fileBuffer: Buffer,
    mimeType: string,
    providedAppType?: string,
  ): Promise<{
    appType: string;
    transactions: ParsedTransaction[];
  }> {
    const base64Data = fileBuffer.toString('base64');
    const provider = this.aiProviderFactory.getDefaultProvider();

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
    const transactions = await parser.parse(provider, base64Data, mimeType);
    this.logger.log(`Parsed ${transactions.length} transactions`);

    return {
      appType: parser.appType,
      transactions,
    };
  }

  private async detectAppType(
    imageData: string,
    mimeType: string,
  ): Promise<string> {
    const provider = this.aiProviderFactory.getDefaultProvider();
    const supportedApps = this.parserFactory.getSupportedApps();
    const appList = [...supportedApps, 'Unknown'].join(', ');

    const response = await provider.analyzeImage(
      `Analyze this screenshot. Reply with ONLY one word: ${appList}.`,
      imageData,
      mimeType,
    );

    return (response.text || 'Unknown').trim();
  }

  getSupportedApps(): string[] {
    return this.parserFactory.getSupportedApps();
  }
}
