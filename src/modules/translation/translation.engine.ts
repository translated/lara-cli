import fs from 'fs/promises';
import Ora from 'ora';

import { ConfigProvider } from '../config/config.provider.js';
import { ConfigType } from '../config/config.types.js';
import { TranslationService } from './translation.service.js';
import { ChecksumService } from '../checksum/checksum.service.js';
import { LaraApiError } from '@translated/lara';

import { buildPath, ensureDirectoryExists } from '../../utils/path.utils.js';
import { parseFlattened, unflatten } from '../../utils/json.utils.js';

export class TranslationEngine {

  private config: ConfigType;

  private readonly translatorService: TranslationService;
  private readonly checksumService: ChecksumService;

  constructor() {
    this.config = ConfigProvider.getInstance().getConfig();

    this.translatorService = new TranslationService();
    this.checksumService = new ChecksumService();
  }

  public async translate() {
    const inputPaths = this.config.paths.include;

    Ora().info(`Translating from ${this.config.locales.source} to ${this.config.locales.target.join(', ')}...`);

    for (const inputPath of inputPaths) {
      await this.handleInputPath(inputPath);
    }

    Ora().succeed('Localization completed! Happy coding!');
  }

  private async handleInputPath(inputPath: string) {
    Ora().info(`Translating files in ${inputPath}...`);
     
    // All keys represents all the keys in the source file
    // Changed keys represents the keys that have been changed in the source file
    const { sourceFlattenedJson, allKeys, changedKeys } = await this.fetchInputPath(inputPath);
    const sourceLocale = this.config.locales.source;

    for(const targetLocale of this.config.locales.target) {
      const spinner = Ora({
        text: `Translating ${sourceLocale} to ${targetLocale}...`,
        color: 'yellow',
      });

      const targetContentPath = buildPath(inputPath, targetLocale);

      let targetContent: string;
      try {
        targetContent = await fs.readFile(targetContentPath, 'utf8');
      } catch {
        // Case where the target file does not exist yet
        targetContent = '{}';
      }

      const targetFlattenedJson = parseFlattened(targetContent!);
      // Target keys represents all the keys in the target file. The target file may not have all the keys contained in the source file.
      const targetKeys = Object.keys(targetFlattenedJson);

      const keysToTranslate = this.findDiff(allKeys, targetKeys, changedKeys);


      if(keysToTranslate.length === 0) {
        spinner.succeed(`Translation in ${targetLocale} completed (no new keys to translate).`);
        continue;
      }

      await Promise.all(keysToTranslate.map(async (key) => {
        const content = sourceFlattenedJson[key];
        if(!content) {
          Ora().warn(`Key ${key} not found in source file`);
          return;
        }

        // If the content is not a string, it means it's a number, boolean, or object.
        // In this case, we don't need to translate it.
        if(typeof content !== 'string') {
          targetFlattenedJson[key] = content;
          return;
        }
   
        try {
          const translatedContent = await this.translatorService.translate(content, sourceLocale, targetLocale);
          targetFlattenedJson[key] = translatedContent;
        } catch(error) {
          if(error instanceof LaraApiError) {
            Ora().fail(`${error.message}. Please check your API key and try again.`);
            process.exit(1);
          } else {
            Ora().fail(`Error translating key ${key} in ${targetLocale} locale: ${error}`);
            process.exit(1);
          }
        }
      }));

      spinner.succeed(`Translation in ${targetLocale} completed`);

      // This is to ensure the target file is ordered in the same way as the source file.
      const orderedTargetFlattenedJson = this.orderObjectByKeys(targetFlattenedJson, allKeys);
      const unflattened = unflatten(orderedTargetFlattenedJson);

      // Ensure the directory exists before writing the file
      await ensureDirectoryExists(targetContentPath);
      await fs.writeFile(targetContentPath, JSON.stringify(unflattened, null, 4));
    }
  }

  private async fetchInputPath(inputPath: string) {
    const sourceContentPath = buildPath(inputPath, this.config.locales.source);

    let sourceContent: string;
    try {
      sourceContent = await fs.readFile(sourceContentPath, 'utf8');
    } catch {
      Ora().fail(`Error reading input path: ${sourceContentPath}. Make sure the file exists and is valid JSON.`);
      process.exit(1);
    }

    const flattenedJson = parseFlattened(sourceContent!);
    const changedKeys = await this.checksumService.getChangedKeys(sourceContentPath, flattenedJson);

    return {
      sourceFlattenedJson: flattenedJson,
      allKeys: Object.keys(flattenedJson),
      changedKeys,
    }
  }

  private findDiff(allKeys: string[], targetKeys: string[], changedKeys: string[]) {
    const keysToTranslate: string[] = [];

    allKeys.forEach(key => {
      // Case 1: The key is not present in the target file
      if(!targetKeys.includes(key)) {
        keysToTranslate.push(key);
        return;
      }

      // Case 2: The key has been changed
      if(changedKeys.includes(key)) {
        keysToTranslate.push(key);
      }
    });

    return keysToTranslate;
  }

  private orderObjectByKeys( map: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    return keys.reduce((acc, key) => {
      acc[key] = map[key];
      return acc;
    }, {} as Record<string, unknown>);
  }
}
