import { Command, Option } from 'commander';
import Ora from 'ora';

import { COMMA_AND_SPACE_REGEX } from '#modules/common/common.const.js';
import { LocalesEnum } from '#modules/common/common.types.js';
import { ConfigProvider } from '#modules/config/config.provider.js';
import { ConfigType } from '#modules/config/config.types.js';
import { TranslationEngine } from '#modules/translation/translation.engine.js';
import { searchLocalePathsByPattern } from '#utils/path.js';
import picomatch from 'picomatch';
import { handleLaraApiError } from '#utils/error.js';
import { LaraApiError } from '@translated/lara';
import { progressWithOra } from '#utils/progressWithOra.js';

type TranslateOptions = {
  target: string[];
  input: string[];

  force: boolean;
  parallel: boolean;
};

export default new Command()
  .command('translate')
  .description('Translate all files specified in the config file')
  .addOption(
    new Option('-t, --target <locales>', 'The locale to translate to (separated by a comma, a space or a combination of both)')
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
      .default('')
  )
  .addOption(
    new Option('-f, --force', 'Force translation even if the files have not changed')
      .default(false)
  )
  .action(async (options: TranslateOptions) => {
    try{
      const config = ConfigProvider.getInstance().getConfig();

      if(options.target.includes(config.locales.source)) {
        throw new Error('Source locale cannot be included in the target locales');
      }

      const spinner = Ora({ text: 'Calculating total work...', color: 'yellow' }).start();
      const { totalElements } = await calculateTotalWork(options, config);
      spinner.succeed(`Found ${totalElements} file × locale combinations`);

      progressWithOra.start({ message: 'Translating files...', total: totalElements });

      for(const fileType of Object.keys(config.files)) {
        await handleFileType(fileType, options, config);
      }

      progressWithOra.stop('All files translated successfully!');

      Ora().succeed('Localization completed! Happy coding!');
    } catch(error) {
      const message = error instanceof Error ? error.message : String(error);
      Ora({ text: message, color: 'red' }).fail();
      process.exit(1);
    }
  });

async function handleFileType(fileType: string, options: TranslateOptions, config: ConfigType): Promise<void> {
  const fileConfig = config.files[fileType]!;
  const sourceLocale = config.locales.source;
  const targetLocales = getTargetLocales(options, config);

  const inputPathsArray = await getInputPaths(fileType, config);
  
  for(const inputPath of inputPathsArray) {
    const fileInstructionConfig = fileConfig.fileInstructions.find(fc => fc.path === inputPath);
    
    const translationEngine = new TranslationEngine({
      sourceLocale,
      targetLocales,
      inputPath,
      force: options.force,
      lockedKeys: fileConfig.lockedKeys,
      ignoredKeys: fileConfig.ignoredKeys,
      projectInstruction: config.project?.instruction,
      fileInstruction: fileInstructionConfig?.instruction,
      fileKeyInstructions: fileInstructionConfig?.keyInstructions || [],
      globalKeyInstructions: fileConfig.keyInstructions,
    });

    try{
      await translationEngine.translate();
    } catch(error) {
      if(error instanceof LaraApiError) {
        handleLaraApiError(error, inputPath, progressWithOra.spinner);
        continue;
      }

      const message = error instanceof Error ? error.message : String(error);
      progressWithOra.stop(`Error translating ${inputPath}: ${message}`, 'fail');
      return;
    }
  }
}


function getTargetLocales(options: TranslateOptions, config: ConfigType): string[] {
  const targetLocales = options.target.length > 0
    ? options.target
    : config.locales.target;

  if (targetLocales.length === 0) {
    throw new Error('No target locales specified. Please add target locales in config or use -t option.');
  }

  return targetLocales;
}

async function getInputPaths(fileType: string, config: ConfigType): Promise<string[]> {
  const fileConfig = config.files[fileType]!;
  const excludePatterns = fileConfig.exclude.map((key) => picomatch(key));
  const inputPaths: Set<string> = new Set();

  for(const includePath of fileConfig.include) {
    // Static path, no need to search for files
    if(!includePath.includes('*')) {
      inputPaths.add(includePath);
      continue;
    } 

    // Dynamic path, search for files
    const files = await searchLocalePathsByPattern(includePath);

    files.forEach((file) => {
      if(excludePatterns.some((pattern) => pattern(file))) {
        return;
      }

      inputPaths.add(file);
    });
  }
  return Array.from(inputPaths);
}

async function calculateTotalWork(options: TranslateOptions, config: ConfigType): Promise<{ totalElements: number; }> {
  const targetLocales = getTargetLocales(options, config);
  let totalElements = 0;

  for(const fileType of Object.keys(config.files)) {
    const inputPaths = await getInputPaths(fileType, config);
    totalElements += inputPaths.length * targetLocales.length;
  }
  
  return { totalElements };
}
