import picomatch, { Matcher } from 'picomatch';

import { TranslationService } from './translation.service.js';
import { calculateChecksum, ChecksumState } from '#utils/checksum.js';
import { buildLocalePath, ensureDirectoryExists, readSafe } from '#utils/path.js';
import { detectFormatting } from '#utils/formatting.js';
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

  forceTranslation: boolean;

  lockedKeys: string[];
  ignoredKeys: string[];
  includeKeys: string[];

  projectInstruction: string | undefined;
  fileInstruction: string | undefined;
  fileKeyInstructions: Array<{ path: string; instruction: string }>;
  globalKeyInstructions: Array<{ path: string; instruction: string }>;

  translationMemoryIds: Memory['id'][];
  glossaryIds: string[];

  noTrace: boolean;

  batchSize: number;
};

type OutputSlot = { kind: 'omit' } | { kind: 'keep'; value: unknown } | { kind: 'translate' };

type TranslateTask = {
  key: string;
  text: string;
  instruction: string | undefined;
};

type ClassifiedEntries = {
  ordered: Array<[string, OutputSlot]>;
  solo: TranslateTask[];
  batch: TranslateTask[];
};

/**
 * Handles the translation of a given input path to a set of target locales.
 * Every instance of this class is responsible for translating a single input path.
 */
export class TranslationEngine {
  private readonly sourceLocale: string;
  private readonly targetLocales: string[];

  private readonly inputPath: string;

  private readonly forceTranslation: boolean;

  private readonly lockedPatterns: Matcher[];
  private readonly ignoredPatterns: Matcher[];
  private readonly includePatterns: Matcher[];

  private readonly projectInstruction: string | undefined;
  private readonly fileInstruction: string | undefined;
  private readonly fileKeyInstructionPatterns: Array<{ matcher: Matcher; instruction: string }>;
  private readonly globalKeyInstructionPatterns: Array<{ matcher: Matcher; instruction: string }>;

  private readonly translationMemoryIds: Memory['id'][];
  private readonly glossaryIds: string[];

  private readonly noTrace: boolean;

  private readonly batchSize: number;

  private readonly translatorService: TranslationService;

  // Parser instance used to parse and serialize translation files.
  // Automatically detects the file format based on the input path extension.
  private readonly parser: ParserFactory;

  constructor(options: TranslationEngineOptions) {
    this.sourceLocale = options.sourceLocale;
    this.targetLocales = options.targetLocales;

    this.inputPath = options.inputPath;

    this.forceTranslation = options.forceTranslation;

    this.lockedPatterns = options.lockedKeys.map((pattern) => picomatch(pattern));
    this.ignoredPatterns = options.ignoredKeys.map((pattern) => picomatch(pattern));
    this.includePatterns = options.includeKeys.map((pattern) => picomatch(pattern));

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

    this.noTrace = options.noTrace;

    this.batchSize = options.batchSize;

    this.translatorService = TranslationService.getInstance();

    this.parser = new ParserFactory(this.inputPath);
  }

  public async translate() {
    await this.handleInputPath(this.inputPath);
  }

  private async handleInputPath(inputPath: string): Promise<void> {
    const sourcePath = buildLocalePath(inputPath, this.sourceLocale);
    const changelog = calculateChecksum(sourcePath, this.parser, this.sourceLocale);
    const keysCount = Object.keys(changelog).length;

    // Read source content to use as structure template when target is empty
    const sourceContent = await readSafe(sourcePath, '');

    for (const targetLocale of this.targetLocales) {
      progressWithOra.setText(
        Messages.info.translatingFileProgress(inputPath, targetLocale, keysCount)
      );

      const targetPath = buildLocalePath(inputPath, targetLocale);

      const fallback = this.parser.getFallback();
      const targetContent = await readSafe(targetPath, fallback);

      // Check if target file is empty (either matches fallback or is empty string)
      const isTargetEmpty = targetContent === fallback || targetContent.trim() === '';

      // Use source content structure when target is empty, otherwise use target content
      const contentForStructure = isTargetEmpty ? sourceContent : targetContent;
      const formatting = detectFormatting(contentForStructure);

      const target = this.parser.parse(targetContent, { targetLocale });

      const classified = this.classifyEntries(changelog, target);
      const translations = await this.executeTasks(classified, targetLocale);

      const entries: Array<[string, unknown]> = [];
      for (const [key, slot] of classified.ordered) {
        if (slot.kind === 'omit') {
          continue;
        }
        if (slot.kind === 'keep') {
          entries.push([key, slot.value]);
          continue;
        }
        const translated = translations.get(key);
        if (translated === undefined) {
          throw new Error(Messages.errors.emptyTranslationResult(key));
        }
        entries.push([key, translated]);
      }

      const newContent = Object.fromEntries(entries);

      await ensureDirectoryExists(targetPath);
      await writeFile(
        targetPath,
        this.parser.serialize(newContent, {
          ...formatting,
          targetLocale,
          // For i18n.ts files (where source and target paths are the same),
          // use targetContent to preserve translations from previous iterations.
          // For separate files, use sourceContent to ensure output structure matches source.
          originalContent: sourcePath === targetPath ? targetContent : sourceContent,
        })
      );
      progressWithOra.tick(1);
    }
  }

  private classifyEntries(
    changelog: ReturnType<typeof calculateChecksum>,
    target: Record<string, unknown>
  ): ClassifiedEntries {
    const ordered: Array<[string, OutputSlot]> = [];
    const solo: TranslateTask[] = [];
    const batch: TranslateTask[] = [];

    for (const [key, entry] of Object.entries(changelog)) {
      const userKey = TranslationEngine.toUserKey(key);
      const state = entry.state;
      const sourceValue = entry.value;
      const targetValue = target[key];

      if (!this.isIncluded(userKey) || this.isIgnored(userKey)) {
        ordered.push([
          key,
          targetValue !== undefined ? { kind: 'keep', value: targetValue } : { kind: 'omit' },
        ]);
        continue;
      }

      if (state === ChecksumState.DELETED) {
        ordered.push([key, { kind: 'omit' }]);
        continue;
      }

      if (this.isLocked(userKey)) {
        ordered.push([key, { kind: 'keep', value: sourceValue }]);
        continue;
      }

      const shouldTranslate = !targetValue || this.forceTranslation;

      if (!shouldTranslate) {
        if (state === 'unchanged' || (state === 'new' && targetValue)) {
          ordered.push([key, { kind: 'keep', value: targetValue }]);
          continue;
        }
      }

      if (typeof sourceValue !== 'string' || sourceValue.trim() === '') {
        ordered.push([key, { kind: 'keep', value: sourceValue }]);
        continue;
      }

      const { instruction, isKeySpecific } = this.resolveInstructionForKey(userKey);
      const task: TranslateTask = { key, text: sourceValue, instruction };
      (isKeySpecific ? solo : batch).push(task);
      ordered.push([key, { kind: 'translate' }]);
    }

    return { ordered, solo, batch };
  }

  private async executeTasks(
    classified: ClassifiedEntries,
    targetLocale: string
  ): Promise<Map<string, string>> {
    const translations = new Map<string, string>();

    const soloPromises = classified.solo.map(async (task) => {
      const result = await this.translatorService.translate(
        [{ text: task.text, translatable: true }],
        this.sourceLocale,
        targetLocale,
        this.buildTranslateOptions(task.instruction)
      );
      const translated = result[0];
      if (!translated) {
        throw new Error(Messages.errors.emptyTranslationResult(task.text));
      }
      translations.set(task.key, translated.text);
    });

    const batchPromises: Promise<void>[] = [];
    // All batch tasks share the same effective instruction (fileInstruction /
    // projectInstruction / none) — isKeySpecific=false implies this. Read it
    // off the first task instead of re-resolving.
    const batchInstruction = classified.batch[0]?.instruction;
    const batchOptions = this.buildTranslateOptions(batchInstruction);

    for (let i = 0; i < classified.batch.length; i += this.batchSize) {
      const chunk = classified.batch.slice(i, i + this.batchSize);
      const textBlocks: TextBlock[] = chunk.map((task) => ({
        text: task.text,
        translatable: true,
      }));

      batchPromises.push(
        (async () => {
          const result = await this.translatorService.translateBatchWithFallback(
            textBlocks,
            this.sourceLocale,
            targetLocale,
            batchOptions
          );
          chunk.forEach((task, idx) => {
            const translated = result[idx];
            if (!translated) {
              throw new Error(Messages.errors.emptyTranslationResult(task.text));
            }
            translations.set(task.key, translated.text);
          });
        })()
      );
    }

    await Promise.all([...soloPromises, ...batchPromises]);
    return translations;
  }

  private buildTranslateOptions(instruction: string | undefined): TranslateOptions {
    return {
      instructions: instruction ? [instruction] : undefined,
      adaptTo: this.translationMemoryIds.length > 0 ? this.translationMemoryIds : [], // Always pass an array for adaptTo; an empty array prevents Lara from using translation memories when none are explicitly selected
      glossaries: this.glossaryIds.length > 0 ? this.glossaryIds : undefined,
      noTrace: this.noTrace || undefined,
    };
  }

  /**
   * Converts an internal flattened key (using \0 delimiter) to a user-facing
   * key path (using "/" delimiter) for pattern matching against user config.
   */
  private static toUserKey(key: string): string {
    return key.replaceAll('\0', '/');
  }

  private isIgnored(userKey: string): boolean {
    return this.ignoredPatterns.some((pattern) => pattern(userKey));
  }

  private isLocked(userKey: string): boolean {
    return this.lockedPatterns.some((pattern) => pattern(userKey));
  }

  private isIncluded(userKey: string): boolean {
    if (this.includePatterns.length === 0) {
      return true;
    }
    return this.includePatterns.some((pattern) => pattern(userKey));
  }

  /**
   * Resolves the most specific instruction for a key and reports whether it
   * comes from a key-level match (fileKeyInstructions / globalKeyInstructions)
   * or from a file/project-level fallback. Key-specific matches mean the key
   * must be translated in its own API call; fallback-level instructions are
   * shared across the file and can be batched.
   *
   * Priority (highest to lowest):
   * 1. File-specific key instruction  (isKeySpecific = true)
   * 2. Global key instruction          (isKeySpecific = true)
   * 3. File instruction                (isKeySpecific = false)
   * 4. Project instruction             (isKeySpecific = false)
   */
  private resolveInstructionForKey(userKey: string): {
    instruction: string | undefined;
    isKeySpecific: boolean;
  } {
    for (const { matcher, instruction } of this.fileKeyInstructionPatterns) {
      if (matcher(userKey)) {
        return { instruction, isKeySpecific: true };
      }
    }

    for (const { matcher, instruction } of this.globalKeyInstructionPatterns) {
      if (matcher(userKey)) {
        return { instruction, isKeySpecific: true };
      }
    }

    if (this.fileInstruction) {
      return { instruction: this.fileInstruction, isKeySpecific: false };
    }

    if (this.projectInstruction) {
      return { instruction: this.projectInstruction, isKeySpecific: false };
    }

    return { instruction: undefined, isKeySpecific: false };
  }
}
