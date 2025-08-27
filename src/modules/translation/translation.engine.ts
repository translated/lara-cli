import fs from 'fs/promises';
import Ora from 'ora';

import ConfigProvider from '../config/config.provider.js';
import { ConfigType } from '../config/config.types.js';
import PathLocator from '../path/path.locator.js';
import { JsonParser } from '../json/json.parser.js';
import TranslatorService from './translation.service.js';
import ChecksumService from '../checksum/checksum.service.js';

export default class TranslationEngine {

  private config: ConfigType;

  private readonly translatorService: TranslatorService;
  private readonly checksumService: ChecksumService;

  constructor() {
    this.config = ConfigProvider.getConfig();

    this.translatorService = new TranslatorService();
    this.checksumService = new ChecksumService();
  }

  public async translate() {
    const inputPaths = this.config.paths.include;

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
      const targetContentPath = PathLocator.buildPath(inputPath, targetLocale);

      let targetContent: string;
      try {
        targetContent = await fs.readFile(targetContentPath, 'utf8');
      } catch {
        // Case where the target file does not exist yet
        targetContent = '{}';
      }

      const targetFlattenedJson = JsonParser.parseFlattened(targetContent!);
      // Target keys represents all the keys in the target file. The target file may not have all the keys contained in the source file.
      const targetKeys = Object.keys(targetFlattenedJson);

      const keysToTranslate = this.findDiff(allKeys, targetKeys, changedKeys);

      const spinner = Ora({
        text: `Translating ${keysToTranslate.length} keys in ${targetLocale} locale...`,
        color: 'yellow',
      });

      if(keysToTranslate.length === 0) {
        spinner.succeed(`Translation in ${targetLocale} completed. No keys to translate.`);
        continue;
      }

      console.log(keysToTranslate);

      await Promise.all(keysToTranslate.map(async (key) => {
        const content = sourceFlattenedJson[key];
        if(!content) {
          Ora().warn(`Key ${key} not found in source file`);
          return;
        }
    
        const translatedContent = await this.translatorService.translate(content, sourceLocale, targetLocale);
        targetFlattenedJson[key] = translatedContent;
      }));

      spinner.succeed(`Translation in ${targetLocale} completed`);

      const unflattened = JsonParser.unflatten(targetFlattenedJson);

      await fs.writeFile(targetContentPath, JSON.stringify(unflattened, null, 2));
    }
  }

  private async fetchInputPath(inputPath: string) {
    const spinner = Ora({
      text: 'Detecting changed keys...',
      color: 'yellow',
    });

    const sourceContentPath = PathLocator.buildPath(inputPath, this.config.locales.source);

    let sourceContent: string;
    try {
      sourceContent = await fs.readFile(sourceContentPath, 'utf8');
    } catch {
      Ora().fail(`Error reading input path: ${sourceContentPath}. Make sure the file exists and is valid JSON.`);
      process.exit(1);
    }

    const flattenedJson = JsonParser.parseFlattened(sourceContent!);
    const changedKeys = await this.checksumService.getChangedKeys(sourceContentPath, flattenedJson);

    spinner.succeed('Changed keys detected');

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
}

