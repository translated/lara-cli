import { Credentials, Translator } from '@translated/lara';

export class TranslationService {

  private readonly client: Translator;

  constructor() {
    const keyId = process.env.LARA_ACCESS_KEY_ID!;
    const keySecret = process.env.LARA_ACCESS_KEY_SECRET!;

    if(!keyId || !keySecret) {
      throw new Error('LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET must be set');
    }

    this.client = new Translator(new Credentials(keyId, keySecret));
  }

  public async translate(text: string, sourceLocale: string, targetLocale: string) {
    const response = await this.client.translate(text, sourceLocale, targetLocale);
    return response.translation;
  }
}
