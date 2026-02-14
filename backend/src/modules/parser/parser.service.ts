import { Injectable, Logger } from '@nestjs/common';
import { ParserFactory } from './parser.factory';
import { AIProviderFactory } from './providers';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';
import { PaymentApp } from '../../common/enums';
import { BaseParser } from './strategies/base.parser';
import { applyCategoryOverrides } from './category-overrides';

const SYSTEM_PROMPT =
  'You extract financial transaction data from receipt/payment app screenshots. Return only valid JSON matching the requested schema.';

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
    providedAppType?: PaymentApp,
  ): Promise<{
    appType: PaymentApp;
    transactions: ParsedTransaction[];
  }> {
    const base64Data = fileBuffer.toString('base64');
    const provider = this.aiProviderFactory.getDefaultProvider();

    if (providedAppType) {
      this.logger.log(`Using provided app type: ${providedAppType}`);
      const parser = this.parserFactory.getParser(providedAppType);
      const transactions = await parser.parse(provider, base64Data, mimeType);
      this.logger.log(`Parsed ${transactions.length} transactions`);
      return { appType: parser.appType, transactions };
    }

    // Combined detect + parse in a single AI call
    const combinedPrompt = BaseParser.buildCombinedPrompt(
      this.parserFactory.getAllRulesSummaries(),
    );
    const response = await provider.analyzeImage(
      combinedPrompt,
      base64Data,
      mimeType,
      { systemPrompt: SYSTEM_PROMPT },
    );

    const result = BaseParser.extractCombinedJson(response.text, PaymentApp.Unknown);
    this.logger.log(`Detected app: ${result.app}, extracted ${result.transactions.length} transactions`);

    const parser = this.parserFactory.getParser(result.app);
    const processed = parser.postProcess(result.transactions);
    const transactions = applyCategoryOverrides(processed);
    this.logger.log(`Parsed ${transactions.length} transactions`);

    return { appType: parser.appType, transactions };
  }

  getSupportedApps(): PaymentApp[] {
    return this.parserFactory.getSupportedApps();
  }
}
