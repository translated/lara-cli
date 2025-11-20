import picomatch, { Matcher } from 'picomatch';

import { TranslationService } from './translation.service.js';
import { calculateChecksum } from '#utils/checksum.js';
import { buildLocalePath, ensureDirectoryExists, readSafe } from '#utils/path.js';
import { writeFile } from 'fs/promises';
import { progressWithOra } from '#utils/progressWithOra.js';
import { TextBlock } from './translation.service.js';
import { Memory, TranslateOptions } from '@translated/lara';
import { Messages } from '#messages/messages.js';
import { ParserFactory } from '../../parsers/parser.factory.js';

export type TranslationEngineOptions = {
  sourceLocale: string;
  targetLocales: string[];

  inputPath: string;

  force: boolean;

  lockedKeys: string[];
  ignoredKeys: string[];

  projectInstruction: string | undefined;
  fileInstruction: string | undefined;
  fileKeyInstructions: Array<{ path: string; instruction: string }>;
  globalKeyInstructions: Array<{ path: string; instruction: string }>;

  translationMemoryIds: Memory['id'][];
  glossaryIds: string[];
};

/**
 * Detects the formatting used in a JSON string by analyzing indentation patterns
 * and trailing newlines.
 *
 * @param jsonContent - The JSON string to analyze
 * @returns Object containing detected indentation (tabs or number of spaces) and trailing newline
 */
function detectFormatting(jsonContent: string): {
  indentation: string | number;
  trailingNewline: string;
} {
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

  private readonly projectInstruction: string | undefined;
  private readonly fileInstruction: string | undefined;
  private readonly fileKeyInstructionPatterns: Array<{ matcher: Matcher; instruction: string }>;
  private readonly globalKeyInstructionPatterns: Array<{ matcher: Matcher; instruction: string }>;

  private readonly translationMemoryIds: Memory['id'][];
  private readonly glossaryIds: string[];

  private readonly translatorService: TranslationService;

  // Parser instance used to parse and serialize translation files.
  // Automatically detects the file format based on the input path extension.
  private readonly parser: ParserFactory;

  constructor(options: TranslationEngineOptions) {
    this.sourceLocale = options.sourceLocale;
    this.targetLocales = options.targetLocales;

    this.inputPath = options.inputPath;

    this.force = options.force;

    this.lockedPatterns = options.lockedKeys.map((pattern) => picomatch(pattern));
    this.ignoredPatterns = options.ignoredKeys.map((pattern) => picomatch(pattern));

    this.projectInstruction = options.projectInstruction;
    this.fileInstruction = options.fileInstruction;
    this.fileKeyInstructionPatterns = options.fileKeyInstructions.map(({ path, instruction }) => ({
      matcher: picomatch(path),
      instruction,
    }));
    this.globalKeyInstructionPatterns = options.globalKeyInstructions.map(
      ({ path, instruction }) => ({
        matcher: picomatch(path),
        instruction,
      })
    );

    this.translationMemoryIds = options.translationMemoryIds;
    this.glossaryIds = options.glossaryIds;

    this.translatorService = TranslationService.getInstance();

    this.parser = new ParserFactory(this.inputPath);
  }

  public async translate() {
    await this.handleInputPath(this.inputPath);
  }

  private async handleInputPath(inputPath: string): Promise<void> {
    const sourcePath = buildLocalePath(inputPath, this.sourceLocale);
    const changelog = calculateChecksum(sourcePath, this.parser);
    const keysCount = Object.keys(changelog).length;

    for (const targetLocale of this.targetLocales) {
      progressWithOra.setText(
        Messages.info.translatingFileProgress(inputPath, targetLocale, keysCount)
      );

      const targetPath = buildLocalePath(inputPath, targetLocale);

      const fallback = this.parser.getFallback();
      const targetContent = await readSafe(targetPath, fallback);
      const target = this.parser.parse(targetContent);
      const formatting = detectFormatting(targetContent);

      const entries = (
        await Promise.all(
          Object.entries(changelog)
            .filter(([key]) => !this.isIgnored(key))
            .map(async ([key, value]) => {
              const state = value.state;
              const sourceValue = value.value;
              const targetValue = target[key];

              // If the key is locked, we should NOT elaborate it and therefore return the source value
              if (this.isLocked(key)) {
                return [key, sourceValue];
              }

              // If the target value does not exists or the force flag is set, we should always translate the source value
              if (!targetValue || this.force) {
                const translatedValue = await this.translateKey(
                  key,
                  sourceValue,
                  this.sourceLocale,
                  targetLocale
                );
                return [key, translatedValue];
              }

              // If the key is unchanged, we should keep the target value
              if (state === 'unchanged') {
                return [key, targetValue];
              }

              // If the key is new and the target value exists, we should keep the target value
              if (state === 'new' && targetValue) {
                return [key, targetValue];
              }

              // Last case where the key is updated

              if (typeof sourceValue !== 'string') {
                // If the source value is not a string, we take for granted that it cannot be translated, therefore we return the source value
                return [key, sourceValue];
              }

              const translatedValue = await this.translateKey(
                key,
                sourceValue,
                this.sourceLocale,
                targetLocale
              );
              return [key, translatedValue];
            })
        )
      ).filter((entry): entry is [string, unknown] => entry !== null);

      const newContent = Object.fromEntries(entries);

      await ensureDirectoryExists(targetPath);
      await writeFile(
        targetPath,
        this.parser.serialize(newContent, { ...formatting, targetLocale })
      );
      progressWithOra.tick(1);
    }
  }

  private async translateKey(
    key: string,
    value: unknown,
    sourceLocale: string,
    targetLocale: string
  ) {
    // If the value is not a string, we return it as is. We take for granted that it cannot be translated
    if (typeof value !== 'string') {
      return value;
    }

    // If the value is an empty string, we return it as is
    if (value.trim() === '') {
      return value;
    }

    const textBlocks: TextBlock[] = [{ text: value, translatable: true }];
    const instruction = this.getInstructionForKey(key);

    const options: TranslateOptions = {
      instructions: instruction ? [instruction] : undefined,
      adaptTo: this.translationMemoryIds.length > 0 ? this.translationMemoryIds : [], // Always pass an array for adaptTo; an empty array prevents Lara from using translation memories when none are explicitly selected
      glossaries: this.glossaryIds.length > 0 ? this.glossaryIds : undefined,
    };

    const translations = await this.translatorService.translate(
      textBlocks,
      sourceLocale,
      targetLocale,
      options
    );

    const lastTranslation = translations.pop();
    if (!lastTranslation) {
      throw new Error(Messages.errors.emptyTranslationResult(value));
    }

    return lastTranslation.text;
  }

  private isIgnored(key: string): boolean {
    return this.ignoredPatterns.some((pattern) => pattern(key));
  }

  private isLocked(key: string): boolean {
    return this.lockedPatterns.some((pattern) => pattern(key));
  }

  /**
   * Retrieves the most specific instruction for a key using override strategy.
   * Priority (highest to lowest):
   * 1. File-specific key instruction
   * 2. Global key instruction
   * 3. File instruction
   * 4. Project instruction
   *
   * @param key - The translation key path
   * @returns Instruction string or undefined
   */
  private getInstructionForKey(key: string): string | undefined {
    // Priority 1: File-specific key instructions (highest)
    for (const { matcher, instruction } of this.fileKeyInstructionPatterns) {
      if (matcher(key)) {
        return instruction;
      }
    }

    // Priority 2: Global key instructions
    for (const { matcher, instruction } of this.globalKeyInstructionPatterns) {
      if (matcher(key)) {
        return instruction;
      }
    }

    // Priority 3: File instruction
    if (this.fileInstruction) {
      return this.fileInstruction;
    }

    // Priority 4: Project instruction (lowest)
    if (this.projectInstruction) {
      return this.projectInstruction;
    }

    return undefined;
  }
}
