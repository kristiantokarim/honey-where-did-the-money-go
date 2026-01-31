import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAIProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { ClaudeCodeProvider } from './claude-code.provider';

export type AIProviderType = 'gemini' | 'claude-code';

@Injectable()
export class AIProviderFactory {
  private readonly logger = new Logger(AIProviderFactory.name);
  private readonly providers: Map<string, IAIProvider>;
  private readonly defaultProvider: AIProviderType;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly claudeCodeProvider: ClaudeCodeProvider,
  ) {
    this.providers = new Map<string, IAIProvider>([
      ['gemini', this.geminiProvider],
      ['claude-code', this.claudeCodeProvider],
    ]);

    this.defaultProvider =
      (this.configService.get<AIProviderType>('ai.defaultProvider') as AIProviderType) ||
      'gemini';

    this.logger.log(`Default AI provider: ${this.defaultProvider}`);
  }

  getProvider(providerName?: AIProviderType): IAIProvider {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(
        `Unknown AI provider: ${name}. Available: ${this.getAvailableProviders().join(', ')}`,
      );
    }

    this.logger.debug(`Using AI provider: ${provider.name}`);
    return provider;
  }

  getDefaultProvider(): IAIProvider {
    return this.getProvider(this.defaultProvider);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
