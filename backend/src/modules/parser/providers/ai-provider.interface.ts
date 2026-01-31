export interface IAIProvider {
  readonly name: string;
  analyzeImage(
    prompt: string,
    imageData: string,
    mimeType: string,
  ): Promise<{ text: string }>;
}
