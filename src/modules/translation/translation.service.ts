import { Credentials, TranslateOptions, Translator, Memory } from '@translated/lara';
import { Messages } from '#messages/messages.js';

export type TextBlock = {
  text: string;
  translatable: boolean;
};

export class TranslationService {
  private static instance: TranslationService;

  private readonly client: Translator;

  private constructor() {
    const keyId = process.env.LARA_ACCESS_KEY_ID!;
    const keySecret = process.env.LARA_ACCESS_KEY_SECRET!;

    if (!keyId || !keySecret) {
      throw new Error(Messages.errors.envVarsNotSet);
    }

    this.client = new Translator(new Credentials(keyId, keySecret));
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }

    return TranslationService.instance;
  }

  public async translate(
    textBlocks: TextBlock[],
    sourceLocale: string,
    targetLocale: string,
    options: TranslateOptions
  ): Promise<TextBlock[]> {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await this.client.translate(
          textBlocks,
          sourceLocale,
          targetLocale,
          options
        );
        return response.translation;
      } catch (error) {
        attempt++;

        if (attempt >= maxRetries) {
          throw error;
        }

        // Wait 200ms before retrying
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error(Messages.errors.maxRetriesExceeded);
  }

  public async getTranslationMemories(): Promise<Memory[]> {
    return this.client.memories.list();
  }

  public async getGlossaries() {
    return this.client.glossaries.list();
  }
}
