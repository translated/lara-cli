import { confirm, input } from '@inquirer/prompts';
import Ora from 'ora';
import { searchLocalePaths } from '#utils/path.js';
import {
  AVAILABLE_LOCALES,
  COMMA_AND_SPACE_REGEX,
  LARA_WEB_URL,
} from '#modules/common/common.const.js';
import { InitOptions } from './init.types.js';
import { FilePath } from '#modules/config/config.types.js';
import { extractLocaleFromPath, extractAllLocalesFromProject } from '#utils/locale.js';
import { displayLocaleTable, formatLocaleList } from '#utils/display.js';
import customSearchableSelect from '#utils/prompt.js';
import { TranslationService } from '#modules/translation/translation.service.js';

export async function sourceInput(options: InitOptions): Promise<string> {
  const spinner = Ora({ text: 'Searching for locales in project...', color: 'yellow' }).start();

  const foundLocales = await extractAllLocalesFromProject();

  if (foundLocales.length === 0) {
    spinner.fail('No locales found in the project');
    Ora({
      text: 'Please ensure your project contains locale files (e.g., src/i18n/[locale].json or src/i18n/[locale]/...)',
      color: 'red',
    }).fail();
    process.exit(1);
  }

  spinner.succeed(
    `Found ${foundLocales.length} ${foundLocales.length === 1 ? 'locale' : 'locales'} in project`
  );

  const choices = foundLocales.map((locale) => ({
    label: locale,
    value: locale,
  }));

  const result = await customSearchableSelect({
    message: 'What is the source locale?',
    multiple: false,
    default: options.source && foundLocales.includes(options.source) ? options.source : undefined,
    choices: choices,
  });

  if (!result || result.length === 0 || !result[0]) {
    throw new Error('Source locale selection is required');
  }

  return result[0];
}

export async function autoTargetInput(source: string): Promise<string[]> {
  const shouldAutoTarget = await confirm({
    message: 'Automatically detect and add target locales?',
  });

  if (shouldAutoTarget) {
    const spinner = Ora({ text: 'Searching for target locales...', color: 'yellow' }).start();
    const locales = await extractLocaleFromPath(source);

    if (locales.length === 0) {
      spinner.warn('No target locales were found. You can add them manually.');
      return [];
    }

    // For large lists, show a formatted table; for small lists, show inline
    const targetLocalesMessage = locales.length === 1 ? 'locale' : 'locales';
    if (locales.length > 10) {
      displayLocaleTable({
        locales,
        title: `Found ${locales.length} target ${targetLocalesMessage}`,
        spinner,
        type: 'succeed',
      });
    } else {
      spinner.succeed(
        `Found ${locales.length} target ${targetLocalesMessage}: ${formatLocaleList(locales, 10)}`
      );
    }

    return locales;
  }

  Ora({ text: 'Automatic detection of target locales was skipped.', color: 'blue' }).info();
  return [];
}

export async function targetInput(source: string, defaults: string[] = []): Promise<string[]> {
  const autoDetectedLocales = await autoTargetInput(source);
  const autoDetectedLocalesSet = new Set(autoDetectedLocales);

  const choices = AVAILABLE_LOCALES.filter(
    (locale) => locale !== source && !autoDetectedLocalesSet.has(locale)
  ).map((locale) => ({
    label: locale,
    value: locale,
  }));

  let addMoreTargetLocales = true;
  if (autoDetectedLocales.length > 0) {
    // For large lists, just show count; for small lists, show the locales
    const alreadyAddedMessage =
      autoDetectedLocales.length <= 5
        ? `Already added: ${formatLocaleList(autoDetectedLocales)}`
        : `${autoDetectedLocales.length} ${autoDetectedLocales.length === 1 ? 'locale' : 'locales'} already added`;

    addMoreTargetLocales = await confirm({
      message: `Do you want to add more target locales? (${alreadyAddedMessage})`,
    });
  }

  if (!addMoreTargetLocales) {
    return Array.from(new Set([...defaults, ...autoDetectedLocales]));
  }

  const additionalLocalesMessage =
    autoDetectedLocales.length > 0
      ? 'Select additional target locales'
      : 'What are the target locales?';

  const additionalLocales = await customSearchableSelect({
    message: additionalLocalesMessage,
    choices: choices,
    multiple: true,
    default: defaults,
    theme: {
      icon: {
        checked: '◉',
        unchecked: '◯',
        cursor: '›',
      },
    },
    validate: (value: string[]) => {
      if (autoDetectedLocales.length === 0 && value.length === 0) {
        return 'Please select at least one locale';
      }

      return true;
    },
  });

  const allTargetLocales = [...autoDetectedLocales, ...additionalLocales];

  // Show a summary of all selected target locales
  if (allTargetLocales.length > 0) {
    const autoCount = autoDetectedLocales.length;
    const manualCount = additionalLocales.length;

    const summaryParts: string[] = [];
    if (autoCount > 0) {
      summaryParts.push(`${autoCount} auto-detected`);
    }
    if (manualCount > 0) {
      summaryParts.push(`${manualCount} manually added`);
    }

    const summaryText = summaryParts.length > 0 ? ` (${summaryParts.join(', ')})` : '';

    // For large lists, show a formatted table; for small lists, show inline
    if (allTargetLocales.length > 10) {
      displayLocaleTable({
        locales: allTargetLocales,
        title: `Total ${allTargetLocales.length} target ${allTargetLocales.length === 1 ? 'locale' : 'locales'} selected${summaryText}`,
        type: 'succeed',
      });
    } else {
      Ora().succeed(
        `Target locales selected: ${formatLocaleList(allTargetLocales, 10)}${summaryText}`
      );
    }
  }

  return allTargetLocales;
}

export async function pathsInput(options: InitOptions) {
  const spinner = Ora({ text: 'Searching for paths...', color: 'yellow' }).start();

  const paths = await searchLocalePaths();

  if (paths.length === 0) {
    spinner.warn('No paths found');

    const inputPath = await input({
      message:
        'No paths found, enter the paths to watch (separated by a comma, a space or a combination of both)',
      default: options.paths.join(', '),
      validate: (value) => {
        const paths = value.split(COMMA_AND_SPACE_REGEX);

        for (const path of paths) {
          const parsedPath = FilePath.safeParse(path);
          if (!parsedPath.success) {
            return parsedPath.error.issues[0]?.message || 'Invalid path';
          }
        }

        return true;
      },
    });

    return inputPath.split(COMMA_AND_SPACE_REGEX);
  }

  spinner.succeed('Paths found successfully');

  const optionPaths = paths.map((path) => ({
    name: path,
    value: path,
    checked: options.paths.includes(path),
  }));

  return await customSearchableSelect({
    message: 'Select the paths to watch',
    choices: optionPaths.map((path) => ({
      value: path.value,
      label: path.name,
    })),
    multiple: true,
    default: options.paths,
    theme: {
      icon: {
        checked: '◉',
        unchecked: '◯',
        cursor: '›',
      },
    },
    validate: (value: string[]) => {
      return value.length > 0 || 'Please select at least one path';
    },
  });
}

export async function translationMemoriesInput(
  existingMemories: string[],
  options: InitOptions
): Promise<string[]> {
  if (options.translationMemories.length > 0) {
    return options.translationMemories;
  }

  const shouldHandleTranslationMessage =
    existingMemories.length > 0
      ? 'Do you want to update the selected Translation Memories?'
      : 'Do you want to use translation memories?';
  const shouldHandleTranslationMemories = await confirm({
    message: shouldHandleTranslationMessage,
    default: existingMemories.length === 0,
  });

  if (!shouldHandleTranslationMemories) {
    return existingMemories;
  }

  const translationService = TranslationService.getInstance();
  const clientTranslationMemories = await translationService.getTranslationMemories();

  if (clientTranslationMemories.length === 0) {
    Ora().warn(`No Translation Memories linked. Visit ${LARA_WEB_URL} to learn more.`);
    return [];
  }

  const choices = clientTranslationMemories.map((translationMemory) => ({
    value: translationMemory.id,
    label: translationMemory.name,
  }));

  const translationMemories = await customSearchableSelect({
    message: 'Select the memories Lara will use to personalize your translations',
    choices: choices,
    multiple: true,
    default: existingMemories,
  });

  return translationMemories;
}

export async function glossariesInput(
  existingGlossaries: string[],
  options: InitOptions
): Promise<string[]> {
  if (options.glossaries.length > 0) {
    return options.glossaries;
  }

  const shouldHandleGlossariesMessage =
    existingGlossaries.length > 0
      ? 'Do you want to update the selected Glossaries?'
      : 'Do you want to use glossaries?';
  const shouldHandleGlossaries = await confirm({
    message: shouldHandleGlossariesMessage,
    default: existingGlossaries.length === 0,
  });

  if (!shouldHandleGlossaries) {
    return existingGlossaries;
  }

  const translationService = TranslationService.getInstance();
  const clientGlossaries = await translationService.getGlossaries();

  if (clientGlossaries.length === 0) {
    Ora().warn(`No Glossaries linked. Visit ${LARA_WEB_URL} to learn more.`);
    return [];
  }

  const choices = clientGlossaries.map((glossary) => ({
    value: glossary.id,
    label: glossary.name,
  }));

  const glossaries = await customSearchableSelect({
    message: 'Select the glossaries Lara will use to personalize your translations',
    choices: choices,
    multiple: true,
    default: existingGlossaries,
  });

  return glossaries;
}
