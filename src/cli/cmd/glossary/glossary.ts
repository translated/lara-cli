import { Command } from 'commander';

import { isRunningInInteractiveMode } from '#utils/cli.js';
import { ensureCredentials, runSafely } from '../common/command.js';
import {
  addEntry,
  createGlossary,
  deleteEntry,
  deleteGlossary,
  importCsv,
  listGlossaries,
  runGlossaryMenu,
  updateGlossary,
} from './glossary.utils.js';

const glossaryCommand = new Command()
  .command('glossary')
  .description('Manage glossaries')
  .helpOption('-h, --help', 'Show help')
  .action(async (_options: unknown, command: Command) => {
    ensureCredentials();
    await runSafely(() => runGlossaryMenu(isRunningInInteractiveMode(command)), 'glossary');
  });

glossaryCommand
  .command('list')
  .description('List available Glossaries')
  .helpOption('-h, --help', 'Show help')
  .action(async () => {
    ensureCredentials();
    await runSafely(() => listGlossaries(), 'glossary list');
  });

glossaryCommand
  .command('create [name]')
  .description('Create a new Glossary')
  .helpOption('-h, --help', 'Show help')
  .action(async (name: string | undefined, _options: unknown, command: Command) => {
    ensureCredentials();
    await runSafely(() => createGlossary(name, isRunningInInteractiveMode(command)), 'glossary create');
  });

glossaryCommand
  .command('update [id] [name]')
  .description('Update the name of an existing Glossary')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      name: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() => updateGlossary(id, name, isRunningInInteractiveMode(command)), 'glossary update');
    }
  );

glossaryCommand
  .command('delete [id]')
  .description('Delete a Glossary')
  .helpOption('-h, --help', 'Show help')
  .action(async (id: string | undefined, _options: unknown, command: Command) => {
    ensureCredentials();
    await runSafely(() => deleteGlossary(id, isRunningInInteractiveMode(command)), 'glossary delete');
  });

glossaryCommand
  .command('add-entry [id] [sourceLang] [sourceTerm] [targetLang] [targetTerm]')
  .description('Add a source→target entry to a Glossary')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      sourceLang: string | undefined,
      sourceTerm: string | undefined,
      targetLang: string | undefined,
      targetTerm: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() =>
        addEntry(
          id,
          sourceLang,
          sourceTerm,
          targetLang,
          targetTerm,
          isRunningInInteractiveMode(command)
        ),
        'glossary add-entry'
      );
    }
  );

glossaryCommand
  .command('delete-entry [id] [language] [value]')
  .description('Delete an entry from a Glossary')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      language: string | undefined,
      value: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() => deleteEntry(id, language, value, isRunningInInteractiveMode(command)), 'glossary delete-entry');
    }
  );

glossaryCommand
  .command('import-csv [id] [file]')
  .description('Import a CSV file into a Glossary')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      file: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() => importCsv(id, file, isRunningInInteractiveMode(command)), 'glossary import-csv');
    }
  );

export default glossaryCommand;
