import { checkbox, input } from '@inquirer/prompts';
import Ora from 'ora';
import { searchLocalePaths } from '#utils/path.js';
import { AVAILABLE_LOCALES, COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { InitOptions } from './init.types.js';
import { FilePath } from '#modules/config/config.types.js';
import { select } from 'inquirer-select-pro';

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

export async function targetInput(source: string, defaults: string[] = []) {
  const choices = AVAILABLE_LOCALES
    .filter((locale) => locale !== source)
    .map((locale) => ({
      label: locale,
      value: locale,
    }));

    
  return await select({
    message: 'What are the target locales?',
    defaultValue: defaults,
    theme: {
      icon: {
        checked: '◉',
        unchecked: '◯',
        cursor: '›',
      },
    },
    options: (input: string) => {
      return choices.filter((locale) => locale.label.includes(input));
    },
    validate: (value) => {
      return value.length > 0 || 'Please select at least one locale';
    },
  });
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

  const inputPaths = await checkbox({
    message: 'Select the paths to watch',
    choices: paths.map((path) => ({
      name: path,
      value: path,
      checked: options.paths.includes(path),
    })),
    validate: (value) => {
      return value.length > 0 || 'Please select at least one path';
    },
  });

  return inputPaths;
}
