import { Command } from 'commander';
import Ora from 'ora';
import { TranslationService } from '#modules/translation/translation.service.js';
import { LARA_WEB_URL } from '#modules/common/common.const.js';
import { handleLaraApiError } from '#utils/error.js';
import { LaraApiError } from '@translated/lara';

export default new Command()
  .command('glossary')
  .description('Manage glossaries')
  .helpOption('-h, --help', 'Show help')
  .action(async () => {
    if(!process.env.LARA_ACCESS_KEY_ID || !process.env.LARA_ACCESS_KEY_SECRET) {
      Ora({ text: 'No API credentials found. Please run `lara-cli init` to set the API credentials.', color: 'red' }).fail();
      process.exit(1);
    }
    await handleGlossary();
  });


async function handleGlossary(): Promise<void> {
  try{
    await listGlossaries();
  } catch(error) {
    const message = error instanceof Error ? error.message : String(error);
    Ora({ text: message, color: 'red' }).fail();
    process.exit(1);
  }
}


async function listGlossaries(): Promise<void> {
  const spinner = Ora().start('Fetching Glossaries...');
  try{
    const translationService = TranslationService.getInstance();
    const clientGlossaries = await translationService.getGlossaries();

    if (clientGlossaries.length === 0) {
      spinner.warn(`No Glossaries linked. Visit ${LARA_WEB_URL} to learn more.`);
      return;
    }

    spinner.succeed(`Found ${clientGlossaries.length} Glossary ${clientGlossaries.length === 1 ? 'Glossary' : 'Glossaries'}:\n`);

    for(const glossary of clientGlossaries) {
      console.log(`  ID: ${glossary.id}`);
      console.log(`  Name: ${glossary.name}\n`);
    } 
  } catch(error) {
    if(error instanceof LaraApiError) {
      handleLaraApiError(error, 'Error getting Glossaries', spinner);
      return;
    }

    throw error;
  } 
}
