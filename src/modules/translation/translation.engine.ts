import Ora from 'ora';

import { TranslationService } from './translation.service.js';
import { calculateChecksum } from '#utils/checksum.js';

export type TranslationEngineOptions = {
  sourceLocale: string;
  targetLocales: string[];

  inputPath: string;

  force: boolean;

  lockedKeys: string[];
  ignoredKeys: string[];
};

/**
 * Handles the translation of a given input path to a set of target locales.
 * Every instance of this class is responsible for translating a single input path.
 * 
 * Options:
 *  - sourceLocale: The locale to translate from
 *  - targetLocales: The locales to translate to
 *  - inputPath: The path to the input file
 *  - force: Whether to force translation even if the files have not changed
 *  - lockedKeys: The keys to lock
 *  - ignoredKeys: The keys to ignore
 */
export class TranslationEngine {
  private readonly sourceLocale: string;
  private readonly targetLocales: string[];

  private readonly inputPath: string;

  private readonly force: boolean;

  private readonly lockedKeys: string[];
  private readonly ignoredKeys: string[];

  private readonly translatorService: TranslationService;

  constructor(options: TranslationEngineOptions) {
    this.sourceLocale = options.sourceLocale;
    this.targetLocales = options.targetLocales;

    this.inputPath = options.inputPath;

    this.force = options.force;

    this.lockedKeys = options.lockedKeys;
    this.ignoredKeys = options.ignoredKeys;

    this.translatorService = TranslationService.getInstance();
  }

  public async translate() {
    Ora({ text: `Translating files in ${this.inputPath} to ${this.targetLocales.join(', ')}...` }).start();
      
    await this.handleInputPath(this.inputPath);

    Ora().succeed(`Translated files in ${this.inputPath} successfully`);

  }

  private async handleInputPath(inputPath: string) {
    const changelog = calculateChecksum(inputPath);
  }
}
