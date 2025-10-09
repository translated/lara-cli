import { Command, Option } from 'commander';
import Ora from 'ora';
import { confirm } from '@inquirer/prompts';

import { LocalesEnum } from '#modules/common/common.types.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

import { isRunningInInteractiveMode } from '#utils/cli.js';

import { COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { fileInstructionsInput, instructionInput, pathsInput, sourceInput, targetInput, translationMemoriesInput, glossariesInput } from './init.input.js';
import { InitOptions } from './init.types.js';
import { ConfigType } from '#modules/config/config.types.js';
import { NO_API_CREDENTIALS_MESSAGE } from './init.const.js';
import { getExistingInstruction, setCredentials, resolveProjectInstruction, getExistingMemories, getExistingGlossaries } from './init.utils.js';


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

        for (const locale of locales) {
          const parsed = LocalesEnum.safeParse(locale);

          if(!parsed.success) {
            Ora({ text: `Invalid locale: ${locale}`, color: 'red' }).fail();
            process.exit(1);
          }
        }

        return locales.map((locale) => LocalesEnum.parse(locale));
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
    new Option('-i --instruction <instruction>', 'Project instruction to help with translations')
  )
  .addOption(
    new Option('-m --translation-memories <translation-memories>', 'Translation memories to use for translations')
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
  }
}

async function handleInteractiveMode(options: InitOptions): Promise<ConfigType> {
  if(options.resetCredentials) {
    const shouldOverwrite = await confirm({
      message: 'Do you want to reset the API credentials?',
    });

    if(shouldOverwrite) {
      await setCredentials();
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
  
  const inputSource = await sourceInput(options);
  const inputTarget = await targetInput(inputSource, options.target);
  const inputPaths = await pathsInput(options);
  const inputFileInstructions = await fileInstructionsInput(inputPaths);

  if(!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
    const shouldInsertCredentials = await confirm({
      message: 'No API credentials found on machine, do you want to insert them now in a .env file?',
    });

    if(shouldInsertCredentials) {
      await setCredentials();
    } else {
      Ora({
        text: NO_API_CREDENTIALS_MESSAGE,
        color: 'yellow'
      }).warn();
    }
  }

  const existingInstruction = getExistingInstruction(options.force);
  const projectInstruction = await instructionInput(existingInstruction, options.instruction);

  const existingMemories = getExistingMemories(options.force);
  const inputTranslationMemories = await translationMemoriesInput(existingMemories, options);

  const existingGlossaries = getExistingGlossaries(options.force);
  const inputGlossaries = await glossariesInput(existingGlossaries, options);

  return {
    version: '1.0.0',
    project: {
      instruction: projectInstruction,
    },
    locales: {
      source: inputSource,
      target: inputTarget,
    },
    memories: inputTranslationMemories,
    glossaries: inputGlossaries,
    files: {
      json: {
        include: inputPaths,
        exclude: [],
        fileInstructions: inputFileInstructions,
        keyInstructions: [],
        lockedKeys: [],
        ignoredKeys: [],
      },
    },
  }
}
