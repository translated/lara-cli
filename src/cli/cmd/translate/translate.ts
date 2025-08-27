import { Command } from 'commander';
import { TranslationEngine } from '../../../modules/translation/translation.engine.js';
import Ora from 'ora';

export default new Command()
  .command('translate')
  .description('Translate all files specified in the config file')
  .action(async () => {
    const translationEngine = new TranslationEngine();

    try{
      await translationEngine.translate();
    } catch(error) {
      Ora({ text: error.message, color: 'red' }).fail();
      process.exit(1);
    }
  });
