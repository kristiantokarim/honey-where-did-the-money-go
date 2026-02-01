import { Injectable, Logger } from '@nestjs/common';
import { ParserFactory } from './parser.factory';
import { AIProviderFactory } from './providers';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';
import { PaymentApp } from '../../common/enums';

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

    // Step 1: Use provided app type or detect it
    let appType: string;
    if (providedAppType) {
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

    const prompt = `Identify which payment/financial app this screenshot is from.

Look for these visual markers:
- Gojek: "GoPay Saldo" text, filter buttons (Date/Services/Methods), red fork icons
- Grab: "Activity" title, bottom nav (Home/Discover/Payment/Activity/Messages), "Reorder" or "Rebook" links
- Mandiri CC: "Transaksi" title, "e-Billing" link, date range tabs, merchant codes like "GRAB* A-xxx"
- OVO: Purple theme, "OVO Cash" balance
- BCA: "m-BCA" or blue BCA branding
- Dana: "DANA" logo, blue theme
- Jenius: "Jenius" branding, teal/turquoise theme
- Jago: "Jago" branding
- Danamon: "Danamon" branding

Reply with ONLY one word from: ${appList}`;

    const response = await provider.analyzeImage(prompt, imageData, mimeType);
    return (response.text || 'Unknown').trim();
  }

  getSupportedApps(): PaymentApp[] {
    return this.parserFactory.getSupportedApps();
  }
}
