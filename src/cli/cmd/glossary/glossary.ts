import { Command } from 'commander';
import Ora from 'ora';
import { TranslationService } from '#modules/translation/translation.service.js';
import { LARA_WEB_URL } from '#modules/common/common.const.js';
import { handleLaraApiError } from '#utils/error.js';
import { LaraApiError } from '@translated/lara';
import { Messages } from '#messages/messages.js';

export default new Command()
  .command('glossary')
  .description('Manage glossaries')
  .helpOption('-h, --help', 'Show help')
  .action(async () => {
    if (!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
      Ora({
        text: Messages.errors.noApiCredentials,
        color: 'red',
      }).fail();
      process.exit(1);
    }
    await handleGlossary();
  });

async function handleGlossary(): Promise<void> {
  try {
    await listGlossaries();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Ora({ text: message, color: 'red' }).fail();
    process.exit(1);
  }
}

async function listGlossaries(): Promise<void> {
  const spinner = Ora().start(Messages.info.fetchingGlossaries);
  try {
    const translationService = TranslationService.getInstance();
    const clientGlossaries = await translationService.getGlossaries();

    if (clientGlossaries.length === 0) {
      spinner.warn(Messages.warnings.noGlossariesLinked(LARA_WEB_URL));
      return;
    }

    spinner.succeed(Messages.success.foundGlossaries(clientGlossaries.length));

    for (const glossary of clientGlossaries) {
      console.log(Messages.ui.itemId(glossary.id));
      console.log(Messages.ui.itemName(glossary.name) + '\n');
    }
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.gettingGlossaries, spinner);
      return;
    }

    throw error;
  }
}
