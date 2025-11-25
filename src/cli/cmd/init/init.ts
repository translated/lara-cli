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
import { Messages } from '#messages/messages.js';
import { setCredentials, resolveProjectInstruction } from './init.utils.js';

export default new Command()
  .command('init')
  .description('Initialize a new Lara project')
  .helpOption('-h, --help', 'Show help')
  .addOption(new Option('-f --force', 'Overwrite existing config file').default(false))
  .addOption(
    new Option('-s --source <locale>', 'Source locale')
      .argParser((value) => {
        const locale = LocalesEnum.safeParse(value);

        if (!locale.success) {
          Ora({ text: Messages.errors.invalidLocale(value), color: 'red' }).fail();
          return process.exit(1);
        }

        return locale.data;
      })
      .default('en')
  )
  .addOption(
    new Option(
      '-t --target <locales>',
      'Target locales, separated by a comma, a space or a combination of both'
    ).argParser((value) => {
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
  )
  .addOption(
    new Option(
      '-p --paths <paths>',
      'Paths to watch, separated by a comma, a space or a combination of both'
    )
      .argParser((value) => {
        const paths = value.split(COMMA_AND_SPACE_REGEX);

        return paths.map((path) => {
          return path.toString();
        });
      })
      .default(['src/i18n/[locale].json'])
  )
  .addOption(new Option('-r --reset-credentials', 'Reset credentials').default(false))
  .addOption(
    new Option('-i --instruction <instruction>', 'Project instruction to help with translations')
  )
  .addOption(
    new Option(
      '-m --translation-memories <translation-memories>',
      'Translation memories to use for translations'
    )
      .argParser((value) => {
        return value.split(COMMA_AND_SPACE_REGEX);
      })
      .default([])
  )
  .addOption(
    new Option('-g --glossaries <glossaries>', 'Glossaries to use for translations')
      .argParser((value) => {
        return value.split(COMMA_AND_SPACE_REGEX);
      })
      .default([])
  )
  .action(async (options: InitOptions, command: Command) => {
    const config = isRunningInInteractiveMode(command)
      ? await handleInteractiveMode(options)
      : handleNonInteractiveMode(options);

    const spinner = Ora({ text: Messages.info.creatingConfig, color: 'yellow' }).start();

    ConfigProvider.getInstance().saveConfig(config);

    spinner.succeed(Messages.success.configCreated);
  });

function handleNonInteractiveMode(options: InitOptions): ConfigType {
  if (!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
    Ora({
      text: Messages.warnings.noApiCredentials,
      color: 'yellow',
    }).warn();

    return process.exit(1);
  }

  const instruction = resolveProjectInstruction(options.instruction);

  return {
    version: '1.0.0',
    project: {
      instruction,
    },
    locales: {
      source: options.source,
      target: options.target,
    },
    memories: options.translationMemories,
    glossaries: options.glossaries,
    files: {
      json: {
        include: options.paths,
        exclude: [],
        fileInstructions: [],
        keyInstructions: [],
        lockedKeys: [],
        ignoredKeys: [],
      },
    },
  };
}

async function handleInteractiveMode(options: InitOptions): Promise<ConfigType> {
  if (options.resetCredentials) {
    const shouldOverwrite = await confirm({
      message: Messages.prompts.resetCredentials,
    });

    if (shouldOverwrite) {
      await setCredentials();
    }
  }

  const configProvider = ConfigProvider.getInstance();

  if (configProvider.doesConfigExists() && !options.force) {
    const shouldOverwrite = await confirm({
      message: Messages.prompts.overwriteConfig,
    });

    if (!shouldOverwrite) {
      Ora({
        text: Messages.errors.configOverwriteDeclined,
        color: 'red',
      }).fail();
      return process.exit(1);
    }
  }

  const inputSource = await sourceInput(options);
  const inputTarget = await targetInput(inputSource, options.target);

  // Update the source in the options object so pathsInput can use it to search for files matching the source locale patterns
  options.source = inputSource;
  const inputPaths = await pathsInput(options);

  if (!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
    const shouldInsertCredentials = await confirm({
      message: Messages.prompts.insertCredentials,
    });

    if (shouldInsertCredentials) {
      await setCredentials();
    } else {
      Ora({
        text: Messages.warnings.noApiCredentials,
        color: 'yellow',
      }).warn();
    }
  }

  return {
    version: '1.0.0',
    locales: {
      source: inputSource,
      target: inputTarget,
    },
    memories: [],
    glossaries: [],
    files: {
      json: {
        include: inputPaths,
        exclude: [],
        fileInstructions: [],
        keyInstructions: [],
        lockedKeys: [],
        ignoredKeys: [],
      },
    },
  };
}
