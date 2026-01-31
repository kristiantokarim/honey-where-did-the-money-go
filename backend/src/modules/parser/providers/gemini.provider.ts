import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { IAIProvider } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements IAIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  readonly name = 'gemini';
  private client?: GoogleGenAI;
  private readonly model = 'gemini-2.5-flash';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('google.apiKey');
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
      this.logger.log('Gemini provider initialized');
    }
  }

  async analyzeImage(
    prompt: string,
    imageData: string,
    mimeType: string,
  ): Promise<{ text: string }> {
    if (!this.client) {
      throw new Error('Gemini not configured - set GOOGLE_API_KEY');
    }

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: imageData, mimeType } },
          ],
        },
      ],
    });

    return { text: response.text || '' };
  }
}
