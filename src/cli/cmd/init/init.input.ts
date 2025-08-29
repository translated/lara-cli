import { checkbox, input } from '@inquirer/prompts';
import Ora from 'ora';

import { searchLocalePaths } from '#utils/path.js';
import { LocalesEnum } from '#modules/common/common.types.js';
import { AVAILABLE_LOCALES, COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { InitOptions } from './init.types.js';
import { FilePath } from '#modules/config/config.types.js';

export async function sourceInput(options: InitOptions) {
  return await input({
    message: 'What is the source locale?',
    default: options.source,
    validate: (value) => {
      return LocalesEnum.safeParse(value).success || 'Please insert a valid locale';
    },
  });
}

export async function targetInput(source: string) {
  const choices = AVAILABLE_LOCALES
    .filter((locale) => locale !== source)
    .map((locale) => ({
      name: locale,
      value: locale,
    }));

  return await checkbox({
    message: 'What are the target locales?',
    choices,
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
    })),
    validate: (value) => {
      return value.length > 0 || 'Please select at least one path';
    },
  });

  return inputPaths;
}
