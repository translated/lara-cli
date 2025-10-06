import { Command } from 'commander';
import Ora from 'ora';
import { TranslationService } from '#modules/translation/translation.service.js';
import { LARA_WEB_URL } from '#modules/common/common.const.js';

export default new Command()
  .command('memory')
  .description('Manage translation memories')
  .helpOption('-h, --help', 'Show help')
  .action(async () => {
    if(!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
      Ora({ text: 'No API credentials found. Please run `lara-cli init` to set the API credentials.', color: 'red' }).fail();
      process.exit(1);
    }

    try{
      await handleMemory();
    } catch(error) {
      const message = error instanceof Error ? error.message : String(error);
      Ora({ text: message, color: 'red' }).fail();
      process.exit(1);
    }
  });


async function handleMemory(): Promise<void> {
  await listMemories();
}


async function listMemories(): Promise<void> {
  const translationService = TranslationService.getInstance();
  const clientTranslationMemories = await translationService.getTranslationMemories();

  if (clientTranslationMemories.length === 0) {
    Ora().warn(`No Translation Memories linked. Visit ${LARA_WEB_URL} to learn more.`);
    return;
  }

  Ora().succeed(`Found ${clientTranslationMemories.length} Translation ${clientTranslationMemories.length === 1 ? 'Memory' : 'Memories'}:\n`);

  for(const memory of clientTranslationMemories) {
    console.log(`  ID: ${memory.id}`);
    console.log(`  Name: ${memory.name}\n`);
  } 
}
