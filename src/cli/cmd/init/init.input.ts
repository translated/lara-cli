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
import { Messages } from '#messages/messages.js';

export async function sourceInput(options: InitOptions): Promise<string> {
  const spinner = Ora({ text: Messages.info.searchingLocales, color: 'yellow' }).start();

  const foundLocales = await extractAllLocalesFromProject();

  if (foundLocales.length === 0) {
    spinner.fail(Messages.errors.noLocalesFound);
    Ora({
      text: Messages.errors.noLocalesFoundHint,
      color: 'red',
    }).fail();
    process.exit(1);
  }

  spinner.succeed(Messages.success.foundLocales(foundLocales.length));

  const choices = foundLocales.map((locale) => ({
    label: locale,
    value: locale,
  }));

  const result = await customSearchableSelect({
    message: Messages.prompts.sourceLocale,
    multiple: false,
    default: options.source && foundLocales.includes(options.source) ? options.source : undefined,
    choices: choices,
  });

  if (!result || result.length === 0 || !result[0]) {
    throw new Error(Messages.errors.sourceLocaleRequired);
  }

  return result[0];
}

export async function autoTargetInput(source: string): Promise<string[]> {
  const shouldAutoTarget = await confirm({
    message: Messages.prompts.autoDetectTarget,
  });

  if (shouldAutoTarget) {
    const spinner = Ora({ text: Messages.info.searchingTargetLocales, color: 'yellow' }).start();
    const locales = await extractLocaleFromPath(source);

    if (locales.length === 0) {
      spinner.warn(Messages.info.noTargetLocalesFound);
      return [];
    }

    // For large lists, show a formatted table; for small lists, show inline
    if (locales.length > 10) {
      displayLocaleTable({
        locales,
        title: Messages.success.foundTargetLocales(locales.length),
        spinner,
        type: 'succeed',
      });
    } else {
      spinner.succeed(
        Messages.success.foundTargetLocales(locales.length, formatLocaleList(locales, 10))
      );
    }

    return locales;
  }

  Ora({ text: Messages.info.autoDetectionSkipped, color: 'blue' }).info();
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
        ? Messages.info.alreadyAdded(formatLocaleList(autoDetectedLocales))
        : Messages.info.localesAlreadyAdded(autoDetectedLocales.length);

    addMoreTargetLocales = await confirm({
      message: Messages.prompts.addMoreTargetLocales(alreadyAddedMessage),
    });
  }

  if (!addMoreTargetLocales) {
    return Array.from(new Set([...defaults, ...autoDetectedLocales]));
  }

  const additionalLocalesMessage =
    autoDetectedLocales.length > 0
      ? Messages.prompts.selectAdditionalTargetLocales
      : Messages.prompts.selectTargetLocales;

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
        return Messages.errors.selectAtLeastOneLocale;
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
      summaryParts.push(Messages.info.autoDetected(autoCount));
    }
    if (manualCount > 0) {
      summaryParts.push(Messages.info.manuallyAdded(manualCount));
    }

    const summaryText = summaryParts.length > 0 ? ` (${summaryParts.join(', ')})` : '';

    // For large lists, show a formatted table; for small lists, show inline
    if (allTargetLocales.length > 10) {
      displayLocaleTable({
        locales: allTargetLocales,
        title: Messages.success.totalTargetLocalesSelected(allTargetLocales.length, summaryText),
        type: 'succeed',
      });
    } else {
      Ora().succeed(
        Messages.success.targetLocalesSelected(formatLocaleList(allTargetLocales, 10), summaryText)
      );
    }
  }

  return allTargetLocales;
}

export async function pathsInput(options: InitOptions) {
  const spinner = Ora({ text: Messages.info.searchingPaths, color: 'yellow' }).start();

  const allPaths = await searchLocalePaths(options);
  console.log('allPaths', allPaths);
  const paths = allPaths.filter((path) => path.startsWith('locales/'));

  if (paths.length === 0) {
    spinner.warn(Messages.info.noPathsFound);

    const inputPath = await input({
      message: Messages.prompts.enterPaths,
      default: options.paths.join(', '),
      validate: (value) => {
        const paths = value.split(COMMA_AND_SPACE_REGEX);

        for (const path of paths) {
          const parsedPath = FilePath.safeParse(path);
          if (!parsedPath.success) {
            return parsedPath.error.issues[0]?.message || Messages.errors.invalidPath;
          }
        }

        return true;
      },
    });

    return inputPath.split(COMMA_AND_SPACE_REGEX);
  }

  spinner.succeed(Messages.success.pathsFound);

  const optionPaths = paths.map((path) => ({
    name: path,
    value: path,
    checked: options.paths.includes(path),
  }));

  return await customSearchableSelect({
    message: Messages.prompts.selectPaths,
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
      return value.length > 0 || Messages.errors.selectAtLeastOnePath;
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
    existingMemories.length > 0 ? Messages.prompts.updateMemories : Messages.prompts.useMemories;
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
    Ora().warn(Messages.warnings.noMemoriesLinked(LARA_WEB_URL));
    return [];
  }

  const choices = clientTranslationMemories.map((translationMemory) => ({
    value: translationMemory.id,
    label: translationMemory.name,
  }));

  const translationMemories = await customSearchableSelect({
    message: Messages.prompts.selectMemories,
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
      ? Messages.prompts.updateGlossaries
      : Messages.prompts.useGlossaries;
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
    Ora().warn(Messages.warnings.noGlossariesLinked(LARA_WEB_URL));
    return [];
  }

  const choices = clientGlossaries.map((glossary) => ({
    value: glossary.id,
    label: glossary.name,
  }));

  const glossaries = await customSearchableSelect({
    message: Messages.prompts.selectGlossaries,
    choices: choices,
    multiple: true,
    default: existingGlossaries,
  });

  return glossaries;
}
