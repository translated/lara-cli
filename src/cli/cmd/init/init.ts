import { Command, Option } from 'commander';
import Ora from 'ora';
import { confirm } from '@inquirer/prompts';

import { LocalesEnum } from '#modules/common/common.types.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

import { isRunningInInteractiveMode } from '#utils/cli.js';

import { COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { pathsInput, sourceInput, targetInput } from './init.input.js';
import { InitOptions } from './init.types.js';
import { ConfigType } from '#modules/config/config.types.js';

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
  .action(async (options: InitOptions, command: Command) => {
    const config = isRunningInInteractiveMode(command)
      ? await handleInteractiveMode(options)
      : handleNonInteractiveMode(options);

    const spinner = Ora({ text: 'Creating config file...', color: 'yellow' }).start();

    ConfigProvider.getInstance().saveConfig(config);

    spinner.succeed('Config file created successfully');

    Ora().info('Config file created successfully! Make sure to insert your API keys in the .env file and you can run `lara translate` to start translating your files.');
    Ora().info('You can find more info at https://support.laratranslate.com/en/about-lara');
  })

function handleNonInteractiveMode(options: InitOptions): ConfigType {
  return {
    version: '1.0.0',
    locales: {
      source: options.source,
      target: options.target,
    },
    files: {
      json: {
        include: options.paths,
        exclude: [],
        lockedKeys: [],
        ignoredKeys: [],
      },
    },
  }
}

async function handleInteractiveMode(options: InitOptions): Promise<ConfigType> {
  if(ConfigProvider.getInstance().doesConfigExists() && !options.force) {
    const shouldOverwrite = await confirm({
      message: 'Config file already exists, do you want to overwrite it?',
    });

    if(!shouldOverwrite) {
      Ora({ text: 'Config file already exists, and the user did not want to overwrite it', color: 'red' }).fail();
      return process.exit(1);
    }
  }

  const inputSource = await sourceInput(options);
  const inputTarget = await targetInput(inputSource);
  const inputPaths = await pathsInput(options);

  return {
    version: '1.0.0',
    locales: {
      source: inputSource,
      target: inputTarget,
    },
    files: {
      json: {
        include: inputPaths,
        exclude: [],
        lockedKeys: [],
        ignoredKeys: [],
      },
    },
  }
}
