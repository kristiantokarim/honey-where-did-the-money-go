import { ParsedTransaction } from '../../common/dtos/parse-result.dto';
import { IAIProvider } from './providers/ai-provider.interface';

export interface IPaymentParser {
  readonly appType: string;
  canParse(detectedApp: string): boolean;
  getPrompt(): string;
  parse(
    provider: IAIProvider,
    imageData: string,
    mimeType: string,
  ): Promise<ParsedTransaction[]>;
}

export const PARSER_FACTORY = 'PARSER_FACTORY';
