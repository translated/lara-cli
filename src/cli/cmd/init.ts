import { Command, Option } from 'commander';
import Ora from 'ora';
import { confirm, input } from '@inquirer/prompts';

import { LocalesEnum, LocalesType } from '../../modules/common/common.types.js';
import ConfigProvider from '../../modules/config/config.provider.js';
import { ConfigType } from '../../modules/config/config.types.js';
import { COMMA_AND_SPACE_REGEX } from '../../modules/common/common.const.js';

import { CommandUtils } from '../lib/utils.js';

type Options = {
  force: boolean;
  source: LocalesType;
  target: LocalesType[];
  paths: string[];
};

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
      .default('en')
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
      .default(['it', 'es'])
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
      json: {
        include: options.paths,
        exclude: [],
      },
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

  const inputSource = await input({
    message: 'What is the source locale?',
    default: options.source,
    validate: (value) => {
      return LocalesEnum.safeParse(value).success || 'Please insert a valid locale';
    },
  });

  const inputTarget = await input({
    message: 'What are the target locales? (separated by a comma, a space or a combination of both)',
    default: options.target.join(', '),
    validate: (value) => {
      const locales = value.split(/[\s,]+/);

      const invalidLocales = [];
      for(const locale of locales) {
        if(!LocalesEnum.safeParse(locale).success) {
          invalidLocales.push(locale);
        }

        if(locale === inputSource) {
          return `Target locale cannot be the same as the source locale: ${locale}`;
        }
      }

      if(invalidLocales.length > 0) {
        return `Invalid values: ${invalidLocales.join(', ')}. Please insert a valid locale`;
      }

      return true;
    },
  });
    
  return {
    locales: {
      source: LocalesEnum.parse(inputSource),
      target: LocalesEnum.array().parse(inputTarget.split(/[\s,]+/)),
    },
    paths: {
      json: {
        include: options.paths,
        exclude: [],
      },
    },
  }
}
