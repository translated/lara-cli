import { confirm, input } from '@inquirer/prompts';
import Ora from 'ora';
import { searchLocalePaths } from '#utils/path.js';
import { AVAILABLE_LOCALES, COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { InitOptions } from './init.types.js';
import { FilePath } from '#modules/config/config.types.js';
import { select } from 'inquirer-select-pro';
import { extractLocaleFromPath } from '#utils/locale.js';
import { displayLocaleTable, formatLocaleList } from '#utils/display.js';

export async function sourceInput(options: InitOptions): Promise<string> {
  const choices = AVAILABLE_LOCALES.map((locale) => ({
    label: locale,
    value: locale,
  }));
  
  const result = await select({
    message: 'What is the source locale?',
    multiple: false,
    defaultValue: options.source,
    confirmDelete: true,
    options: (input: string) => {
      return choices.filter((locale) => locale.label.includes(input));
    },
    validate: (value) => {
      return !!value;
    },
  });

  if(!result) {
    throw new Error('Source locale selection is required');
  }

  return result;
}

export async function autoTargetInput(source: string): Promise<string[]> {
  const shouldAutoTarget = await confirm({
    message: 'Automatically detect target locales?',
  });

  if (shouldAutoTarget) {
    const spinner = Ora({ text: 'Searching for target locales...', color: 'yellow' }).start();
    const locales = await extractLocaleFromPath(source);

    if (locales.length === 0) {
      spinner.warn('No target locales were found. You can add them manually.');
      return [];
    }

    // For large lists, show a formatted table; for small lists, show inline
    if (locales.length > 10) {
      spinner.succeed(`Found ${locales.length} target locale(s)`);
      displayLocaleTable(locales, 'Detected locales');
    } else {
      spinner.succeed(`Found ${locales.length} target locale(s): ${formatLocaleList(locales, 10)}`);
    }

    const choices = locales.map((locale) => ({
      label: locale,
      value: locale,
    }));

    const shouldAddAll = await confirm({
      message: `Add all ${locales.length} detected locales to the target list? (Select "No" to select specific locales from the detected locales list)`,
    });

    if (shouldAddAll) {
      return locales;
    }

    const result = await select({
      message: 'Select detected locales to include in the target list:',
      theme: {
        icon: {
          checked: '◉',
          unchecked: '◯',
          cursor: '›',
        },
      },
      clearInputWhenSelected: true,
      options: (input: string) => {
        return choices.filter((locale) => locale.label.includes(input));
      },
    });

    if (result) {
      return result;
    }
  }

  return [];
}

export async function targetInput(source: string, defaults: string[] = []): Promise<string[]> {

  const autoDetectedLocales = await autoTargetInput(source);
  const autoDetectedLocalesSet = new Set(autoDetectedLocales);

  const choices = AVAILABLE_LOCALES
    .filter((locale) => locale !== source && !autoDetectedLocalesSet.has(locale))
    .map((locale) => ({
      label: locale,
      value: locale,
    }));

  let addMoreTargetLocales = true;
  if(autoDetectedLocales.length > 0) {
    // For large lists, just show count; for small lists, show the locales
    const alreadyAddedMessage = autoDetectedLocales.length <= 5
      ? `Already added: ${formatLocaleList(autoDetectedLocales)}`
      : `${autoDetectedLocales.length} locale(s) already added`;
    
    addMoreTargetLocales = await confirm({
      message: `Add more target locales? (${alreadyAddedMessage})`,
    });
  }

  if(!addMoreTargetLocales) {
    return Array.from(new Set([...defaults, ...autoDetectedLocales]));
  }

  const additionalLocalesMessage = autoDetectedLocales.length > 0
    ? `Select additional target locales (${autoDetectedLocales.length} already added)`
    : 'What are the target locales?';

  const additionalLocales = await select({
    message: additionalLocalesMessage,
    defaultValue: defaults,
    theme: {
      icon: {
        checked: '◉',
        unchecked: '◯',
        cursor: '›',
      },
    },
    clearInputWhenSelected: true,
    options: (input: string) => {
      return choices.filter((locale) => locale.label.includes(input));
    },
    validate: (value) => {
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
    
    const summaryText = summaryParts.length > 0 
      ? ` (${summaryParts.join(', ')})`
      : '';

    // For large lists, show a formatted table; for small lists, show inline
    if (allTargetLocales.length > 10) {
      Ora().info(`Total ${allTargetLocales.length} target locale(s) selected${summaryText}`);
      displayLocaleTable(allTargetLocales, 'Selected target locales');
    } else {
      Ora().info(`Target locales selected: ${formatLocaleList(allTargetLocales, 10)}${summaryText}`);
    }
  }

  return allTargetLocales;
}

export async function pathsInput(options: InitOptions) {
  const spinner = Ora({ text: 'Searching for paths...', color: 'yellow' }).start();

  const paths = await searchLocalePaths();

  if(paths.length === 0) {
    spinner.warn('No paths found');

    const inputPath = await input({
      message: 'No paths found, enter the paths to watch (separated by a comma, a space or a combination of both)',
      default: options.paths.join(', '),
      validate: (value) => {
        const paths = value.split(COMMA_AND_SPACE_REGEX);
  
        for(const path of paths) {
          const parsedPath = FilePath.safeParse(path);
          if(!parsedPath.success) {
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

  return await select({
    message: 'Select the paths to watch',
    theme: {
      icon: {
        checked: '◉',
        unchecked: '◯',
        cursor: '›',
      },
    },
    options: (input: string) => {
      return optionPaths.filter((path) => path.name.includes(input));
    },
    validate: (value) => {
      return value.length > 0 || 'Please select at least one path';
    },
  });
}
