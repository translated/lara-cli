import picomatch, { Matcher } from 'picomatch';

import { TranslationService, isFatalApiError } from './translation.service.js';
import { calculateChecksum, commitChecksum, ChecksumState } from '#utils/checksum.js';
import { buildLocalePath, ensureDirectoryExists, readSafe } from '#utils/path.js';
import { detectFormatting } from '#utils/formatting.js';
import { normalizeEntities } from '#utils/entities.js';
import { weaveOrphans } from '#utils/parser.js';
import { resolveContentType } from '#utils/contentType.js';
import { writeFile } from 'fs/promises';
import { progressWithOra } from '#utils/progressWithOra.js';
import { TextBlock } from './translation.service.js';
import { Memory, TranslateOptions } from '@translated/lara';
import { Messages } from '#messages/messages.js';
import { ParserFactory } from '../../parsers/parser.factory.js';
import { OrphanKeysMode } from '#modules/config/config.types.js';

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

  orphanKeys: OrphanKeysMode;
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

  private readonly orphanKeys: OrphanKeysMode;

  private readonly translatorService: TranslationService;

  // Parser instance used to parse and serialize translation files.
  // Automatically detects the file format based on the input path extension.
  private readonly parser: ParserFactory;

  // Default Lara content type for this format. Overridden per value when
  // the source string contains inline HTML markup.
  private readonly defaultContentType: string;

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

    this.orphanKeys = options.orphanKeys;

    this.translatorService = TranslationService.getInstance();

    this.parser = new ParserFactory(this.inputPath);
    this.defaultContentType = this.parser.getContentType();
  }

  public async translate() {
    await this.handleInputPath(this.inputPath);
  }

  private async handleInputPath(inputPath: string): Promise<void> {
    const sourcePath = buildLocalePath(inputPath, this.sourceLocale);
    const { changelog, hasChanges } = calculateChecksum(sourcePath, this.parser, this.sourceLocale);
    const keysCount = Object.keys(changelog).length;

    // Read source content to use as structure template when target is empty
    const sourceContent = await readSafe(sourcePath, '');

    // Items that could not be translated (source text kept). Reported to the user
    // after every locale is written; the run then exits non-zero.
    const failures: Array<{ locale: string; text: string }> = [];

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
      const { translations, failedTasks } = await this.executeTasks(classified, targetLocale);

      for (const task of failedTasks) {
        failures.push({ locale: targetLocale, text: task.text });
      }

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
          throw new Error(Messages.errors.emptyTranslationResult(TranslationEngine.toUserKey(key)));
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
          // The existing target file, so merge-based parsers can graft back keys
          // that live only in the target ("orphan" keys, absent from source) at
          // their original position. Empty when the target does not exist yet.
          targetContent: isTargetEmpty ? '' : targetContent,
        })
      );
      progressWithOra.tick(1);
    }

    // Persist source hashes only after every target locale has been written.
    // If any target above throws, we skip this step so the next run still sees
    // the source as changed and retries.
    if (hasChanges) {
      commitChecksum(sourcePath, changelog);
    }

    // Every file has been written (originals kept for failed items). Report the
    // failures and fail the run so the exit code is non-zero, without discarding
    // the work already done.
    if (failures.length > 0) {
      throw new Error(Messages.errors.itemsTranslationFailed(failures));
    }
  }

  private classifyEntries(
    changelog: ReturnType<typeof calculateChecksum>['changelog'],
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

    // Preserve "orphan" keys: keys present in the target file but not in the
    // source (so absent from the changelog). They are kept verbatim at their
    // original target position, anchored to the nearest preceding shared key.
    // Note: source-deleted keys DO appear in the changelog (state 'deleted'),
    // so they are correctly excluded here and still get removed.
    //
    // Stopping here is the whole of `orphanKeys: delete`: the merge-based
    // parsers filter their own graft on the keys we emit, so they follow suit.
    // Android's `translatable="false"` resources survive regardless —
    // android-xml.parser.ts keeps them unconditionally because parse() skips
    // them, making them non-translatable entries rather than orphans.
    if (this.orphanKeys === 'delete') {
      return { ordered, solo, batch };
    }

    const targetEntries: Array<[string, OutputSlot]> = Object.keys(target).map((key) => [
      key,
      { kind: 'keep', value: target[key] },
    ]);
    const changelogKeys = new Set(Object.keys(changelog));
    const woven = weaveOrphans(ordered, targetEntries, (entry) => entry[0], changelogKeys);

    return { ordered: woven, solo, batch };
  }

  private async executeTasks(
    classified: ClassifiedEntries,
    targetLocale: string
  ): Promise<{ translations: Map<string, string>; failedTasks: TranslateTask[] }> {
    const translations = new Map<string, string>();
    // Tasks whose first translation came back containing the U+FFFD
    // replacement character. Symptomatic of a UTF-8 streaming bug in
    // @translated/lara (chunk.toString() per chunk loses bytes when a
    // multi-byte character straddles a TCP chunk boundary). Retried below
    // as solo calls, which produce tiny responses unlikely to span chunks.
    const corruptedTasks: TranslateTask[] = [];

    // Tasks that could not be translated at all (API failed for that item). Their
    // source text is kept and they are reported to the user, but they never abort
    // the rest of the file.
    const failedTasks: TranslateTask[] = [];

    const recordResult = (task: TranslateTask, translatedText: string): void => {
      const normalized = normalizeEntities(task.text, translatedText);
      if (normalized.includes('�')) {
        corruptedTasks.push(task);
      } else {
        translations.set(task.key, normalized);
      }
    };

    const soloPromises = classified.solo.map(async (task) => {
      const contentType = resolveContentType(task.text, this.defaultContentType);
      try {
        const result = await this.translatorService.translate(
          [{ text: task.text, translatable: true }],
          this.sourceLocale,
          targetLocale,
          this.buildTranslateOptions(task.instruction, contentType)
        );
        const translated = result[0];
        if (!translated) {
          throw new Error(Messages.errors.emptyTranslationResult(task.text));
        }
        recordResult(task, translated.text);
      } catch (error) {
        // Account-level failures (auth/quota) abort the whole run with a clear message.
        if (isFatalApiError(error)) {
          throw error;
        }
        // Keep the source text for this item and report it later.
        translations.set(task.key, task.text);
        failedTasks.push(task);
      }
    });

    const batchPromises: Promise<void>[] = [];
    // All batch tasks share the same effective instruction (fileInstruction /
    // projectInstruction / none) — isKeySpecific=false implies this. Read it
    // off the first task instead of re-resolving.
    const batchInstruction = classified.batch[0]?.instruction;

    // Group all batch tasks by detected content type before chunking. A JSON
    // file can mix plain values with values that contain inline HTML (e.g.
    // `"Click <a href='/x'>here</a>"`); these two must be sent in separate
    // API calls with the matching `contentType`, otherwise the plain pipeline
    // strips tags or the HTML pipeline corrupts plain Cyrillic/Greek text.
    // Grouping across all chunks (instead of within each chunk) minimises
    // the number of API calls when one content type is sparse.
    const groups = new Map<string, TranslateTask[]>();
    for (const task of classified.batch) {
      const contentType = resolveContentType(task.text, this.defaultContentType);
      const bucket = groups.get(contentType);
      if (bucket) {
        bucket.push(task);
      } else {
        groups.set(contentType, [task]);
      }
    }

    for (const [contentType, tasks] of groups) {
      const groupOptions = this.buildTranslateOptions(batchInstruction, contentType);
      for (let i = 0; i < tasks.length; i += this.batchSize) {
        const chunk = tasks.slice(i, i + this.batchSize);
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
              groupOptions
            );
            chunk.forEach((task, idx) => {
              const translated = result[idx];
              if (!translated || translated.translationFailed) {
                // The item could not be translated: keep its source text and report it.
                translations.set(task.key, task.text);
                failedTasks.push(task);
                return;
              }
              recordResult(task, translated.text);
            });
          })()
        );
      }
    }

    await Promise.all([...soloPromises, ...batchPromises]);

    if (corruptedTasks.length > 0) {
      await this.retryCorruptedTasks(corruptedTasks, targetLocale, translations);
    }

    return { translations, failedTasks };
  }

  /**
   * Re-translate each task as a solo call. Solo responses are small enough
   * that they almost never span a TCP chunk boundary, so the U+FFFD bug
   * does not fire on them. We retry up to MAX_RETRIES times silently; if
   * every attempt still comes back with U+FFFD we surface a short, neutral
   * error so the user knows to re-run without exposing SDK internals.
   */
  private async retryCorruptedTasks(
    tasks: TranslateTask[],
    targetLocale: string,
    translations: Map<string, string>
  ): Promise<void> {
    const MAX_RETRIES = 3;
    let anyStillCorrupted = false;

    await Promise.all(
      tasks.map(async (task) => {
        const contentType = resolveContentType(task.text, this.defaultContentType);
        const options = this.buildTranslateOptions(task.instruction, contentType);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          const result = await this.translatorService.translate(
            [{ text: task.text, translatable: true }],
            this.sourceLocale,
            targetLocale,
            options
          );
          const translated = result[0];
          if (!translated) {
            throw new Error(Messages.errors.emptyTranslationResult(task.text));
          }
          const normalized = normalizeEntities(task.text, translated.text);
          if (!normalized.includes('�')) {
            translations.set(task.key, normalized);
            return;
          }
        }

        anyStillCorrupted = true;
      })
    );

    if (anyStillCorrupted) {
      throw new Error(Messages.errors.translationRetryFailed);
    }
  }

  private buildTranslateOptions(
    instruction: string | undefined,
    contentType: string
  ): TranslateOptions {
    return {
      instructions: instruction ? [instruction] : undefined,
      adaptTo: this.translationMemoryIds.length > 0 ? this.translationMemoryIds : [], // Always pass an array for adaptTo; an empty array prevents Lara from using translation memories when none are explicitly selected
      glossaries: this.glossaryIds.length > 0 ? this.glossaryIds : undefined,
      // Setting contentType explicitly prevents Lara from auto-detecting
      // TextBlock[] input as HTML-flavored content, which can otherwise
      // corrupt plain text (e.g., replacing characters with `?`).
      contentType,
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
