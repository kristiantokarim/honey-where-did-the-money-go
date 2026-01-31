import { ParsedTransaction } from '../../common/dtos/parse-result.dto';
import { IAIProvider } from './providers/ai-provider.interface';
import { PaymentApp } from '../../common/enums';

export interface IPaymentParser {
  readonly appType: PaymentApp;
  canParse(detectedApp: string): boolean;
  getPrompt(): string;
  parse(
    provider: IAIProvider,
    imageData: string,
    mimeType: string,
  ): Promise<ParsedTransaction[]>;
}
