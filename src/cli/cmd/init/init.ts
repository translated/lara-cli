import { Command, Option } from 'commander';
import Ora from 'ora';
import { confirm, input } from '@inquirer/prompts';

import { LocalesEnum } from '#modules/common/common.types.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

import { isRunningInInteractiveMode } from '#utils/cli.js';

import { COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { contextInput, pathsInput, sourceInput, targetInput } from './init.input.js';
import { InitOptions } from './init.types.js';
import { ConfigType } from '#modules/config/config.types.js';
import { appendFileSync } from 'fs';
import { NO_API_CREDENTIALS_MESSAGE } from './init.const.js';
import { getExistingContext, resetCredentials, resolveProjectContext } from './init.utils.js';


export default new Command()
  .command('init')
  .description('Initialize a new Lara project')
  .helpOption('-h, --help', 'Show help')
  .addOption(
    new Option('-f --force', 'Overwrite existing config file')
      .default(false)
  )
  .addOption(
    new Option('-s --source <locale>', 'Source locale')
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
  )
  .addOption(
    new Option('-p --paths <paths>', 'Paths to watch, separated by a comma, a space or a combination of both')
      .argParser((value) => {
        const paths = value.split(COMMA_AND_SPACE_REGEX);

        return paths.map((path) => {
          return path.toString();
        })
      })
      .default(['src/i18n/[locale].json'])
  )
  .addOption(
    new Option('-r --reset-credentials', 'Reset credentials')
      .default(false)
  )
  .addOption(
    new Option('-c --context <context>', 'Project context to help with translations')
  )
  .action(async (options: InitOptions, command: Command) => {
    const config = isRunningInInteractiveMode(command)
      ? await handleInteractiveMode(options)
      : handleNonInteractiveMode(options);

    const spinner = Ora({ text: 'Creating config file...', color: 'yellow' }).start();

    ConfigProvider.getInstance().saveConfig(config);

    spinner.succeed('Config file created successfully! You can run `lara-cli translate` to start translating your files.');
  })

function handleNonInteractiveMode(options: InitOptions): ConfigType {
  if(!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
    Ora({ 
      text: `No API credentials found on machine. ${NO_API_CREDENTIALS_MESSAGE}`, 
      color: 'yellow' 
    }).warn();

    return process.exit(1);
  }

  const context = resolveProjectContext(options.context);

  return {
    version: '1.0.0',
    project: {
      context,
    },
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
  if(options.resetCredentials) {
    const shouldOverwrite = await confirm({
      message: 'Do you want to reset the API credentials?',
    });

    if(shouldOverwrite) {
      await resetCredentials();
    }
  }
  
  const configProvider = ConfigProvider.getInstance();

  if(configProvider.doesConfigExists() && !options.force) {
    const shouldOverwrite = await confirm({
      message: 'Config file already exists, do you want to overwrite it?',
    });

    if(!shouldOverwrite) {
      Ora({ text: 'Config file already exists and the user did not want to overwrite it', color: 'red' }).fail();
      return process.exit(1);
    }
  }

  const existingContext = getExistingContext(options.force);
  const projectContext = await contextInput(existingContext, options.context);
  
  const inputSource = await sourceInput(options);
  const inputTarget = await targetInput(inputSource, options.target);
  const inputPaths = await pathsInput(options);

  if(!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
    const shouldInsertCredentials = await confirm({
      message: 'No API credentials found on machine, do you want to insert them now in a .env file?',
    });

    if(shouldInsertCredentials) {
      const apiKey = await input({ message: 'Insert your API Key:' });
      const apiSecret = await input({ message: 'Insert your API Secret:' });

      const envContent = `# Lara API credentials\nLARA_ACCESS_KEY_ID=${apiKey}\nLARA_ACCESS_KEY_SECRET=${apiSecret}\n`;

      appendFileSync('.env', `\n${envContent}`);

      Ora({ text: 'API credentials inserted successfully', color: 'green' }).succeed();
    } else {
      Ora({ 
        text: NO_API_CREDENTIALS_MESSAGE, 
        color: 'yellow' 
      }).warn();
    }
  }

  return {
    version: '1.0.0',
    project: {
      context: projectContext,
    },
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
