import { checkbox, input } from '@inquirer/prompts';
import Ora from 'ora';

import { LocalesEnum } from '../../../modules/common/common.types.js';
import PathSearcher from '../../../modules/path/path.searcher.js';
import { COMMA_AND_SPACE_REGEX } from '../../../modules/common/common.const.js';
import { IncludePath } from '../../../modules/config/config.types.js';
import { Options } from './init.types.js';

export async function sourceInput(options: Options) {
  return await input({
    message: 'What is the source locale?',
    default: options.source,
    validate: (value) => {
      return LocalesEnum.safeParse(value).success || 'Please insert a valid locale';
    },
  });
}

export async function targetInput(options: Options, source: string) {
  return await input({
    message: 'What are the target locales? (separated by a comma, a space or a combination of both)',
    default: options.target.join(', '),
    validate: (value) => {
      const locales = value.split(/[\s,]+/);
    
      const invalidLocales = [];
      for(const locale of locales) {
        if(!LocalesEnum.safeParse(locale).success) {
          invalidLocales.push(locale);
        }
    
        if(locale === source) {
          return `Target locale cannot be the same as the source locale: ${locale}`;
        }
      }
    
      if(invalidLocales.length > 0) {
        return `Invalid values: ${invalidLocales.join(', ')}. Please insert a valid locale`;
      }
    
      return true;
    },
  });
}

export async function pathsInput(options: Options) {
  const spinner = Ora({ text: 'Searching for paths...', color: 'yellow' }).start();

  const paths = await PathSearcher.searchPaths();
  if(paths.length === 0) {
    spinner.warn('No paths found');
  } else {
    spinner.succeed('Paths found successfully');
  }

  if(paths.length > 0) {
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

  const inputPath = await input({
    message: 'No paths found, enter the paths to watch (separated by a comma, a space or a combination of both)',
    default: options.paths.join(', '),
    validate: (value) => {
      const paths = value.split(COMMA_AND_SPACE_REGEX);

      for(const path of paths) {
        const parsedPath = IncludePath.safeParse(path);
        if(!parsedPath.success) {
          return parsedPath.error.issues[0]?.message || 'Invalid path';
        }
      }

      return true;
    },
  });

  return inputPath.split(COMMA_AND_SPACE_REGEX);
}
