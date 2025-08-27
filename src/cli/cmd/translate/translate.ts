import { Command } from 'commander';
import { TranslationEngine } from '../../../modules/translation/translation.engine.js';

export default new Command()
  .command('translate')
  .description('Translate all files specified in the config file')
  .action(async () => {
    const translationEngine = new TranslationEngine();

    await translationEngine.translate();
  });
