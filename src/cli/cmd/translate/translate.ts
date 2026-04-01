import { Command, Option } from 'commander';
import Ora from 'ora';
import { readFile, writeFile } from 'fs/promises';

import { COMMA_AND_SPACE_REGEX, SEARCHABLE_EXTENSIONS, SUPPORTED_FILE_TYPES } from '#modules/common/common.const.js';
import { LocalesEnum } from '#modules/common/common.types.js';
import { ConfigProvider } from '#modules/config/config.provider.js';
import { ConfigType } from '#modules/config/config.types.js';
import { TranslationEngine } from '#modules/translation/translation.engine.js';
import { TranslationService, TextBlock } from '#modules/translation/translation.service.js';
import { searchLocalePathsByPattern, ensureDirectoryExists, getFileType } from '#utils/path.js';
import { detectFormatting } from '#utils/formatting.js';
import picomatch from 'picomatch';
import { handleLaraApiError } from '#utils/error.js';
import { LaraApiError, TranslateOptions as LaraTranslateOptions } from '@translated/lara';
import { progressWithOra } from '#utils/progressWithOra.js';
import { Messages } from '#messages/messages.js';
import { displaySummaryBox } from '#utils/display.js';
import { ParserFactory } from '../../../parsers/parser.factory.js';

type TranslateOptions = {
  target: string[];
  paths: string[];
  force: boolean;
  parallel: boolean;
  // Direct translation options
  file?: string;
  text?: string;
  source?: string;
  output?: string;
  translationMemories?: string[];
  glossaries?: string[];
};

type TranslateMode = 'text' | 'file' | 'config';

export default new Command()
  .command('translate')
  .description('Translate all files specified in the config file')
  .addOption(
    new Option(
      '-t, --target <locales>',
      'The locale to translate to (separated by a comma, a space or a combination of both)'
    )
      .argParser((value) => {
        const locales = value.split(COMMA_AND_SPACE_REGEX);

        for (const locale of locales) {
          const parsed = LocalesEnum.safeParse(locale);

          if (!parsed.success) {
            Ora({ text: Messages.errors.invalidLocale(locale), color: 'red' }).fail();
            process.exit(1);
          }
        }

        return locales.map((locale) => LocalesEnum.parse(locale));
      })
      .default('')
  )
  .addOption(
    new Option(
      '-p, --paths <paths>',
      'Specific file paths to translate (separated by a comma, a space or a combination of both). Must include [locale] placeholder.'
    )
      .argParser((value) => {
        return value.split(COMMA_AND_SPACE_REGEX).map((path) => path.trim());
      })
      .default([])
  )
  .addOption(
    new Option('-f, --force', 'Force translation even if the files have not changed').default(false)
  )
  .addOption(
    new Option('--file <path>', 'Path to a file to translate directly (bypasses config)')
  )
  .addOption(
    new Option('--text <string>', 'Text string to translate directly')
  )
  .addOption(
    new Option('-s, --source <locale>', 'Source locale (required with --file or --text)')
      .argParser((value) => {
        const parsed = LocalesEnum.safeParse(value);
        if (!parsed.success) {
          Ora({ text: Messages.errors.invalidLocale(value), color: 'red' }).fail();
          process.exit(1);
        }
        return LocalesEnum.parse(value);
      })
  )
  .addOption(
    new Option('-o, --output <path>', 'Output file path (only with --file)')
  )
  .addOption(
    new Option(
      '-m, --translation-memories <ids>',
      'Translation Memory IDs to use (separated by a comma, a space or a combination of both). Only with --file or --text.'
    )
      .argParser((value) => value.split(COMMA_AND_SPACE_REGEX))
  )
  .addOption(
    new Option(
      '-g, --glossaries <ids>',
      'Glossary IDs to use (separated by a comma, a space or a combination of both). Only with --file or --text.'
    )
      .argParser((value) => value.split(COMMA_AND_SPACE_REGEX))
  )
  .action(async (options: TranslateOptions) => {
    try {
      const mode = validateAndDetectMode(options);

      if (mode === 'text') {
        await handleTextMode(options);
        return;
      }

      if (mode === 'file') {
        await handleFileMode(options);
        return;
      }

      // Existing config-based flow
      const config = ConfigProvider.getInstance().getConfig();

      if (options.target.includes(config.locales.source)) {
        throw new Error(Messages.errors.sourceLocaleInTarget);
      }

      const spinner = Ora({ text: Messages.info.calculatingWork, color: 'yellow' }).start();
      const { totalElements } = await calculateTotalWork(options, config);
      spinner.succeed(Messages.success.foundFileCombinations(totalElements));

      progressWithOra.start({ message: Messages.info.translatingFiles, total: totalElements });

      let hasErrors = false;
      for (const fileType of Object.keys(config.files)) {
        hasErrors = hasErrors || await handleFileType(fileType, options, config);
      }

      if (hasErrors) {
        process.exit(1);
      }

      const totalTargetLocales = getTargetLocales(options, config).length;
      progressWithOra.stop();

      displaySummaryBox({
        title: Messages.summary.title,
        items: [
          [Messages.summary.filesLabel, Messages.summary.filesLocalized(totalElements)],
          [Messages.summary.targetLocalesLabel, Messages.summary.targetLocales(totalTargetLocales)],
        ],
        footer: Messages.summary.allDone,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Ora({ text: message, color: 'red' }).fail();
      process.exit(1);
    }
  });

function validateAndDetectMode(options: TranslateOptions): TranslateMode {
  const isDirectMode = !!(options.file || options.text);

  if (options.file && options.text) {
    throw new Error(Messages.errors.fileAndTextMutuallyExclusive);
  }

  if (!isDirectMode) {
    if (options.source) {
      throw new Error(Messages.errors.sourceOnlyWithDirect);
    }
    if (options.output) {
      throw new Error(Messages.errors.outputOnlyWithFile);
    }
    if (options.translationMemories || options.glossaries) {
      throw new Error(Messages.errors.memoriesGlossariesOnlyWithDirect);
    }
    return 'config';
  }

  // Direct mode validations
  if (!options.source) {
    throw new Error(Messages.errors.sourceRequiredForDirect);
  }

  if (!options.target || options.target.length === 0) {
    throw new Error(Messages.errors.targetRequiredForDirect);
  }

  if (options.target.length > 1) {
    throw new Error(Messages.errors.directModeSingleTarget);
  }

  if (options.target.includes(options.source)) {
    throw new Error(Messages.errors.sourceEqualsTarget);
  }

  if (options.force) {
    throw new Error(Messages.errors.forceNotAllowedWithDirect);
  }

  if (options.paths && options.paths.length > 0) {
    throw new Error(Messages.errors.pathsNotAllowedWithDirect);
  }

  if (options.output && !options.file) {
    throw new Error(Messages.errors.outputOnlyWithFile);
  }

  return options.text ? 'text' : 'file';
}

function buildTranslateOptions(options: TranslateOptions): LaraTranslateOptions {
  return {
    adaptTo: options.translationMemories ?? [],
    glossaries: options.glossaries && options.glossaries.length > 0 ? options.glossaries : undefined,
  };
}

async function handleTextMode(options: TranslateOptions): Promise<void> {
  const text = options.text!;
  const source = options.source!;
  const target = options.target[0]!;

  if (text.trim() === '') {
    throw new Error(Messages.errors.emptyText);
  }

  const spinner = Ora({ text: Messages.info.translatingText, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const translateOptions = buildTranslateOptions(options);
    const textBlocks: TextBlock[] = [{ text, translatable: true }];
    const translations = await translationService.translate(textBlocks, source, target, translateOptions);
    const translatedText = translations[0]?.text ?? '';

    spinner.succeed();
    process.stdout.write(translatedText + '\n');
  } catch (error) {
    spinner.fail();
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.info.translatingText, spinner);
    }
    throw error;
  }
}

async function handleFileMode(options: TranslateOptions): Promise<void> {
  const filePath = options.file!;
  const source = options.source!;
  const target = options.target[0]!;

  const fileType = getFileType(filePath);
  if (!SUPPORTED_FILE_TYPES.includes(fileType)) {
    throw new Error(
      Messages.errors.unsupportedFileType(fileType, SEARCHABLE_EXTENSIONS.join(', '))
    );
  }

  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    throw new Error(Messages.errors.fileNotFound(filePath));
  }

  const spinner = Ora({ text: Messages.info.translatingDirectFile(filePath), color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const translateOptions = buildTranslateOptions(options);

    const parser = new ParserFactory(filePath);
    const parsed = parser.parse(content, { targetLocale: target });
    const translatedData: Record<string, unknown> = { ...parsed };

    const translatableEntries: [string, string][] = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim() !== '') {
        translatableEntries.push([key, value]);
      }
    }

    if (translatableEntries.length > 0) {
      const textBlocks: TextBlock[] = translatableEntries.map(([, v]) => ({ text: v, translatable: true }));
      const translations = await translationService.translate(textBlocks, source, target, translateOptions);
      for (let i = 0; i < translatableEntries.length; i++) {
        translatedData[translatableEntries[i]![0]] = translations[i]?.text ?? translatableEntries[i]![1];
      }
    }

    const formatting = detectFormatting(content);
    const result = parser.serialize(translatedData, {
      ...formatting,
      targetLocale: target,
      originalContent: content,
    }) as string;

    spinner.succeed();

    if (options.output) {
      await ensureDirectoryExists(options.output);
      await writeFile(options.output, result);
    } else {
      process.stdout.write(result);
    }
  } catch (error) {
    spinner.fail();
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.info.translatingDirectFile(filePath), spinner);
    }
    throw error;
  }
}

async function handleFileType(
  fileType: string,
  options: TranslateOptions,
  config: ConfigType
): Promise<boolean> {
  const fileConfig = config.files[fileType]!;
  const sourceLocale = config.locales.source;
  const targetLocales = getTargetLocales(options, config);

  const inputPathsArray = await getInputPaths(fileType, config, options.paths);
  let hasErrors = false;

  for (const inputPath of inputPathsArray) {
    const fileInstructionConfig = fileConfig.fileInstructions.find((fc) => fc.path === inputPath);

    const translationEngine = new TranslationEngine({
      sourceLocale,
      targetLocales,
      inputPath,
      forceTranslation: options.force,
      lockedKeys: fileConfig.lockedKeys,
      ignoredKeys: fileConfig.ignoredKeys,
      projectInstruction: config.project?.instruction,
      fileInstruction: fileInstructionConfig?.instruction,
      fileKeyInstructions: fileInstructionConfig?.keyInstructions || [],
      globalKeyInstructions: fileConfig.keyInstructions,
      translationMemoryIds: config.memories,
      glossaryIds: config.glossaries,
    });

    try {
      await translationEngine.translate();
    } catch (error) {
      if (error instanceof LaraApiError) {
        handleLaraApiError(
          error,
          Messages.errors.errorTranslatingFile(inputPath),
          progressWithOra.spinner
        );
        // Check if the error was fatal (401 or >= 500) - if so, process.exit was called
        // For non-fatal errors, continue but mark as having errors
        if (error.statusCode !== 401 && error.statusCode < 500) {
          hasErrors = true;
        }
        continue;
      }

      const message = error instanceof Error ? error.message : String(error);
      const errorMessage = Messages.errors.translatingFile(inputPath, message);
      console.error(errorMessage);
      progressWithOra.stop(errorMessage, 'fail');
      // For non-API errors (including parsing errors), continue processing other files
      // but mark as having errors so the overall result reflects the failure
      hasErrors = true;
      continue;
    }
  }

  return hasErrors;
}

function getTargetLocales(options: TranslateOptions, config: ConfigType): string[] {
  const targetLocales = options.target.length > 0 ? options.target : config.locales.target;

  if (targetLocales.length === 0) {
    throw new Error(Messages.errors.noTargetLocales);
  }

  return targetLocales;
}

async function getInputPaths(
  fileType: string,
  config: ConfigType,
  customPaths?: string[]
): Promise<string[]> {
  const fileConfig = config.files[fileType]!;
  const excludePatterns = fileConfig.exclude.map((key) => picomatch(key));
  const inputPaths: Set<string> = new Set();

  // Use custom paths if provided, otherwise use config paths
  const pathsToProcess = customPaths && customPaths.length > 0 ? customPaths : fileConfig.include;

  for (const includePath of pathsToProcess) {
    // Static path, no need to search for files
    if (!includePath.includes('*')) {
      inputPaths.add(includePath);
      continue;
    }

    // Dynamic path, search for files
    const files = await searchLocalePathsByPattern(includePath);

    files.forEach((file) => {
      if (excludePatterns.some((pattern) => pattern(file))) {
        return;
      }

      inputPaths.add(file);
    });
  }
  return Array.from(inputPaths);
}

async function calculateTotalWork(
  options: TranslateOptions,
  config: ConfigType
): Promise<{ totalElements: number }> {
  const targetLocales = getTargetLocales(options, config);
  let totalElements = 0;

  for (const fileType of Object.keys(config.files)) {
    const inputPaths = await getInputPaths(fileType, config, options.paths);
    totalElements += inputPaths.length * targetLocales.length;
  }

  return { totalElements };
}
