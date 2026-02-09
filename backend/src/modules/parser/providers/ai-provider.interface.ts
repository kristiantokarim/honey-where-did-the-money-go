export interface AnalyzeImageOptions {
  systemPrompt?: string;
}

export interface IAIProvider {
  readonly name: string;
  analyzeImage(
    prompt: string,
    imageData: string,
    mimeType: string,
    options?: AnalyzeImageOptions,
  ): Promise<{ text: string }>;
}
