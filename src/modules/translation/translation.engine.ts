import picomatch, { Matcher } from 'picomatch';

import { TranslationService } from './translation.service.js';
import { calculateChecksum } from '#utils/checksum.js';
import { parseFlattened, unflatten } from '#utils/json.js';
import { buildLocalePath, ensureDirectoryExists, readSafe } from '#utils/path.js';
import { writeFile } from 'fs/promises';

export type TranslationEngineOptions = {
  sourceLocale: string;
  targetLocales: string[];

  inputPath: string;

  force: boolean;

  lockedKeys: string[];
  ignoredKeys: string[];

  context: string | undefined;
};

/**
 * Detects the formatting used in a JSON string
 * @param jsonContent - The JSON string to analyze
 * @returns Object with indentation and trailing newline information
 */
function detectFormatting(jsonContent: string): { indentation: string | number; trailingNewline: string } {
  const lines = jsonContent.split('\n');
  let indentation: string | number = 2; // default
  
  // Detect indentation
  for (const line of lines) {
    const match = line.match(/^(\s+)\S/);
    if (match && match[1]) {
      const indent = match[1];
      
      // Check if it's tabs
      if (indent.includes('\t')) {
        indentation = '\t';
        break;
      }
      
      // Check if it's spaces
      if (indent.match(/^ +$/)) {
        indentation = indent.length;
        break;
      }
    }
  }
  
  // Detect trailing newline
  const trailingNewline = jsonContent.endsWith('\n') ? '\n' : '';
  
  return { indentation, trailingNewline };
}

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

  private readonly lockedPatterns: Matcher[];
  private readonly ignoredPatterns: Matcher[];

  private readonly instructions: string[] | undefined;

  private readonly translatorService: TranslationService;

  constructor(options: TranslationEngineOptions) {
    this.sourceLocale = options.sourceLocale;
    this.targetLocales = options.targetLocales;

    this.inputPath = options.inputPath;

    this.force = options.force;

    this.lockedPatterns = options.lockedKeys.map(pattern => picomatch(pattern));
    this.ignoredPatterns = options.ignoredKeys.map(pattern => picomatch(pattern));

    this.instructions = options.context ? [
      `Translate the content taking into account the context of the project: ${options.context}`,
    ] : undefined;

    this.translatorService = TranslationService.getInstance();
  }

  public async translate() {
    await this.handleInputPath(this.inputPath);
  }

  private async handleInputPath(inputPath: string) {
    const sourcePath = buildLocalePath(inputPath, this.sourceLocale);
    const changelog = calculateChecksum(sourcePath);

    for(const targetLocale of this.targetLocales) {
      const targetPath = buildLocalePath(inputPath, targetLocale);
      const targetContent = await readSafe(targetPath, '{}');
      const targetJson = parseFlattened(targetContent);
      const formatting = detectFormatting(targetContent);

      const newContent = Object.fromEntries(await Promise.all(
        Object.entries(changelog).map(async ([key, value]) => {
          // If the key is ignored, we should NOT include it in the new content
          if(this.isIgnored(key)) {
            return [];
          }

          const state = value.state;
          const sourceValue = value.value;
          const targetValue = targetJson[key];

          // If the key is locked, we should NOT elaborate it and therefore return the source value
          if(this.isLocked(key)) {
            return [key, sourceValue];
          }

          // If the target value does not exists or the force flag is set, we should always translate the source value
          if(!targetValue || this.force) {
            const translatedValue = await this.translateKey(sourceValue, this.sourceLocale, targetLocale);
            return [key, translatedValue];
          }

          // If the key is unchanged, we should keep the target value
          if(state === 'unchanged') {
            return [key, targetValue];
          }


          // If the key is new and the target value exists, we should keep the target value
          if(state === 'new' && targetValue) {
            return [key, targetValue];
          }

          // Last case where the key is updated

          if(typeof sourceValue !== 'string') {
            // If the source value is not a string, we take for granted that it cannot be translated, therefore we return the source value
            return [key, sourceValue];
          }

          const translatedValue = await this.translateKey(sourceValue, this.sourceLocale, targetLocale);
          return [key, translatedValue];
        })
      ));

      await ensureDirectoryExists(targetPath);
      await writeFile(targetPath, JSON.stringify(unflatten(newContent), null, formatting.indentation) + formatting.trailingNewline);
    };
  }

  private async translateKey(value: unknown, sourceLocale: string, targetLocale: string) {
    // If the value is not a string, we return it as is. We take for granted that it cannot be translated
    if(typeof value !== 'string') {
      return value;
    }

    // If the value is an empty string, we return it as is
    if(value.trim() === '') {
      return value;
    }
    
    return await this.translatorService.translate(value, sourceLocale, targetLocale, {
      instructions: this.instructions,
    });
  }

  private isIgnored(key: string): boolean {
    return this.ignoredPatterns.some(pattern => pattern(key));
  }

  private isLocked(key: string): boolean {
    return this.lockedPatterns.some(pattern => pattern(key));
  }
}
