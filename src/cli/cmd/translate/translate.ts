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

        return locales.map((locale) => {
          const parsed = LocalesEnum.safeParse(locale);

          if(!parsed.success) {
            Ora({ text: `Invalid locale: ${locale}`, color: 'red' }).fail();
            return process.exit(1);
          }

          return parsed.data;
        })
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

      for(const fileType of Object.keys(config.files)) {
        await handleFileType(fileType, options, config);
      }
    } catch(error) {
      Ora({ text: error.message, color: 'red' }).fail();
      process.exit(1);
    }

    Ora().succeed('Localization completed! Happy coding!');
  });

async function handleFileType(fileType: string, options: TranslateOptions, config: ConfigType) {
  const spinner = Ora({ text: `Translating ${fileType} files...`, color: 'yellow' }).start();

  const fileConfig = config.files[fileType]!;
  const sourceLocale = config.locales.source;
  const targetLocales = options.target.length > 0
    ? options.target
    : config.locales.target;

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

  for(const inputPath of inputPaths) {
    spinner.text = `Translating ${inputPath}...`;
    
    const translationEngine = new TranslationEngine({
      sourceLocale,
      targetLocales,

      inputPath,
      force: options.force,
      lockedKeys: fileConfig.lockedKeys,
      ignoredKeys: fileConfig.ignoredKeys,

      context: config.project?.context,
    });

    try{
      await translationEngine.translate();

      spinner.succeed(`Translated ${fileType} files!`);
    } catch(error) {
      if(error instanceof LaraApiError) {
        handleLaraApiError(error, inputPath, spinner);
        continue;
      }
      
      const message = error.message;
      spinner.fail(`Error translating ${inputPath}: ${message}`);
    }
  }
}
