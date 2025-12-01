import { Command, Option } from 'commander';
import Ora from 'ora';

import { COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { LocalesEnum } from '#modules/common/common.types.js';
import { ConfigProvider } from '#modules/config/config.provider.js';
import { ConfigType } from '#modules/config/config.types.js';
import { TranslationEngine } from '#modules/translation/translation.engine.js';
import { searchLocalePathsByPattern } from '#utils/path.js';
import picomatch from 'picomatch';
import { handleLaraApiError } from '#utils/error.js';
import { LaraApiError } from '@translated/lara';
import { progressWithOra } from '#utils/progressWithOra.js';
import { Messages } from '#messages/messages.js';
import { displaySummaryBox } from '#utils/display.js';

type TranslateOptions = {
  target: string[];
  input: string[];

  force: boolean;
  parallel: boolean;
};

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
  .action(async (options: TranslateOptions) => {
    try {
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

async function handleFileType(
  fileType: string,
  options: TranslateOptions,
  config: ConfigType
): Promise<boolean> {
  const fileConfig = config.files[fileType]!;
  const sourceLocale = config.locales.source;
  const targetLocales = getTargetLocales(options, config);

  const inputPathsArray = await getInputPaths(fileType, config, options.input);
  let hasErrors = false;

  for (const inputPath of inputPathsArray) {
    const fileInstructionConfig = fileConfig.fileInstructions.find((fc) => fc.path === inputPath);

    const translationEngine = new TranslationEngine({
      sourceLocale,
      targetLocales,
      inputPath,
      force: options.force,
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
      progressWithOra.stop(Messages.errors.translatingFile(inputPath, message), 'fail');
      return true;
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
    const inputPaths = await getInputPaths(fileType, config, options.input);
    totalElements += inputPaths.length * targetLocales.length;
  }

  return { totalElements };
}
