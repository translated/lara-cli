import { Credentials, Translator } from '@translated/lara';
import Ora from 'ora';

export class TranslationService {

  private readonly client: Translator;

  constructor() {
    const keyId = process.env.LARA_ACCESS_KEY_ID!;
    const keySecret = process.env.LARA_ACCESS_KEY_SECRET!;

    if(!keyId || !keySecret) {
      Ora({
        text: 'LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET must be set',
        color: 'red',
      }).fail();
      process.exit(1);
    }

    this.client = new Translator(new Credentials(keyId, keySecret));
  }

  public async translate(text: string, sourceLocale: string, targetLocale: string) {
    const response = await this.client.translate(text, sourceLocale, targetLocale);
    return response.translation;
  }
}
