export interface IAIProvider {
  readonly name: string;
  analyzeImage(
    prompt: string,
    imageData: string,
    mimeType: string,
  ): Promise<{ text: string }>;
}

export const AI_PROVIDER_FACTORY = 'AI_PROVIDER_FACTORY';
