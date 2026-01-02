import { GenerativeModel } from '@google/generative-ai';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';

export interface IPaymentParser {
  readonly appType: string;
  canParse(detectedApp: string): boolean;
  getPrompt(): string;
  parse(model: GenerativeModel, imageData: string, mimeType: string): Promise<ParsedTransaction[]>;
}

export const PARSER_FACTORY = 'PARSER_FACTORY';
