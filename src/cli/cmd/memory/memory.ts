import { Command } from 'commander';
import Ora from 'ora';
import { TranslationService } from '#modules/translation/translation.service.js';
import { LARA_WEB_URL } from '#modules/common/common.const.js';
import { handleLaraApiError } from '#utils/error.js';
import { LaraApiError } from '@translated/lara';
import { Messages } from '#messages/messages.js';

export default new Command()
  .command('memory')
  .description('Manage translation memories')
  .helpOption('-h, --help', 'Show help')
  .action(async () => {
    if (!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
      Ora({
        text: Messages.errors.noApiCredentials,
        color: 'red',
      }).fail();
      process.exit(1);
    }
    await handleMemory();
  });

async function handleMemory(): Promise<void> {
  try {
    await listMemories();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Ora({ text: message, color: 'red' }).fail();
    process.exit(1);
  }
}

async function listMemories(): Promise<void> {
  const spinner = Ora().start(Messages.info.fetchingMemories);
  try {
    const translationService = TranslationService.getInstance();
    const clientTranslationMemories = await translationService.getTranslationMemories();

    if (clientTranslationMemories.length === 0) {
      spinner.warn(Messages.warnings.noMemoriesLinked(LARA_WEB_URL));
      return;
    }

    spinner.succeed(Messages.success.foundMemories(clientTranslationMemories.length));

    for (const memory of clientTranslationMemories) {
      console.log(Messages.ui.itemId(memory.id));
      console.log(Messages.ui.itemName(memory.name) + '\n');
    }
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.gettingMemories, spinner);
      return;
    }

    throw error;
  }
}
