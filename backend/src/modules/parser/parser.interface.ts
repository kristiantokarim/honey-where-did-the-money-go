import type { GoogleGenAI } from '@google/genai';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';

export interface IPaymentParser {
  readonly appType: string;
  canParse(detectedApp: string): boolean;
  getPrompt(): string;
  parse(client: GoogleGenAI, model: string, imageData: string, mimeType: string): Promise<ParsedTransaction[]>;
}

export const PARSER_FACTORY = 'PARSER_FACTORY';
