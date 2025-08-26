import { Command, Option } from 'commander';
import Ora from 'ora';
import { confirm } from '@inquirer/prompts';

import { LocalesEnum } from '../../../modules/common/common.types.js';
import ConfigProvider from '../../../modules/config/config.provider.js';
import { ConfigType } from '../../../modules/config/config.types.js';
import { COMMA_AND_SPACE_REGEX } from '../../../modules/common/common.const.js';

import { CommandUtils } from '../../lib/utils.js';
import { pathsInput, sourceInput, targetInput } from './init.input.js';
import { Options } from './init.types.js';

export default new Command()
  .command('init')
  .description('Initialize a new Lara project')
  .helpOption('-h, --help', 'Show help')
  .addOption(
    new Option('-f --force', 'Overwrite existing config file')
      .default(false)
  )
  .addOption(
    new Option('-s --source', 'Source locale')
      .argParser((value) => {
        const locale = LocalesEnum.safeParse(value);

        if(!locale.success) {
          Ora({ text: `Invalid locale: ${value}`, color: 'red' }).fail();
          return process.exit(1);
        }

        return locale.data;
      })
      .default('en-US')
  )
  .addOption(
    new Option('-t --target <locales>', 'Target locales, separated by a comma, a space or a combination of both')
      .argParser((value) => {
        const locales = value.split(COMMA_AND_SPACE_REGEX);

        return locales.map((locale) => {
          const parsed = LocalesEnum.safeParse(locale);

          if(!parsed.success) {
            Ora({ text: `Invalid locale: ${locale}`, color: 'red' }).fail();
            return process.exit(1);
          }

          return parsed.data;
        })
      })
      .default(['it-IT', 'es-ES'])
  )
  .addOption(
    new Option('-p --paths <paths>', 'Paths to watch, separated by a comma, a space or a combination of both')
      .argParser((value) => {
        const paths = value.split(COMMA_AND_SPACE_REGEX);

        return paths.map((path) => {
          return path.toString();
        })
      })
      .default(['./src/i18n/[locale].json'])
  )
  .action(async (options: Options, command: Command) => {
    const config = CommandUtils.isRunningInInteractiveMode(command)
      ? await handleInteractiveMode(options)
      : handleNonInteractiveMode(options);

    const spinner = Ora({ text: 'Creating config file...', color: 'yellow' }).start();

    ConfigProvider.saveConfig(config);

    spinner.succeed('Config file created successfully');
  })

function handleNonInteractiveMode(options: Options): ConfigType {
  return {
    locales: {
      source: options.source,
      target: options.target,
    },
    paths: {
      include: options.paths,
      exclude: [],
    },
  }
}

async function handleInteractiveMode(options: Options): Promise<ConfigType> {
  if(ConfigProvider.doesConfigExists() && !options.force) {
    const shouldOverwrite = await confirm({
      message: 'Config file already exists, do you want to overwrite it?',
    });

    if(!shouldOverwrite) {
      Ora({ text: 'Config file already exists, and the user did not want to overwrite it', color: 'red' }).fail();
      return process.exit(1);
    }
  }

  const inputSource = await sourceInput(options);
  const inputTarget = await targetInput(options, inputSource);
  const inputPaths = await pathsInput(options);

  return {
    locales: {
      source: LocalesEnum.parse(inputSource),
      target: LocalesEnum.array().parse(inputTarget.split(/[\s,]+/)),
    },
    paths: {
      include: inputPaths,
      exclude: [],
    },
  }
}
