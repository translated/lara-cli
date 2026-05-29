import { Command } from 'commander';

import { isRunningInInteractiveMode } from '#utils/cli.js';
import { ensureCredentials, runSafely } from '../common/command.js';
import {
  addTranslation,
  createMemory,
  deleteMemory,
  deleteTranslation,
  importTmx,
  listMemories,
  runMemoryMenu,
  updateMemory,
} from './memory.utils.js';

const memoryCommand = new Command()
  .command('memory')
  .description('Manage translation memories')
  .helpOption('-h, --help', 'Show help')
  .action(async (_options: unknown, command: Command) => {
    ensureCredentials();
    await runSafely(() => runMemoryMenu(isRunningInInteractiveMode(command)));
  });

memoryCommand
  .command('list')
  .description('List available Translation Memories')
  .helpOption('-h, --help', 'Show help')
  .action(async () => {
    ensureCredentials();
    await runSafely(() => listMemories());
  });

memoryCommand
  .command('create [name]')
  .description('Create a new Translation Memory')
  .helpOption('-h, --help', 'Show help')
  .action(async (name: string | undefined, _options: unknown, command: Command) => {
    ensureCredentials();
    await runSafely(() => createMemory(name, isRunningInInteractiveMode(command)));
  });

memoryCommand
  .command('update [id] [name]')
  .description('Update the name of an existing Translation Memory')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      name: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() => updateMemory(id, name, isRunningInInteractiveMode(command)));
    }
  );

memoryCommand
  .command('delete [id]')
  .description('Delete a Translation Memory')
  .helpOption('-h, --help', 'Show help')
  .action(async (id: string | undefined, _options: unknown, command: Command) => {
    ensureCredentials();
    await runSafely(() => deleteMemory(id, isRunningInInteractiveMode(command)));
  });

memoryCommand
  .command('add-translation [id] [source] [target] [sentence] [translation]')
  .description('Add a translation unit to a Translation Memory')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      source: string | undefined,
      target: string | undefined,
      sentence: string | undefined,
      translation: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() =>
        addTranslation(
          id,
          source,
          target,
          sentence,
          translation,
          isRunningInInteractiveMode(command)
        )
      );
    }
  );

memoryCommand
  .command('delete-translation [id] [source] [target] [sentence] [translation]')
  .description('Delete a translation unit from a Translation Memory')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      source: string | undefined,
      target: string | undefined,
      sentence: string | undefined,
      translation: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() =>
        deleteTranslation(
          id,
          source,
          target,
          sentence,
          translation,
          isRunningInInteractiveMode(command)
        )
      );
    }
  );

memoryCommand
  .command('import-tmx [id] [file]')
  .description('Import a TMX file into a Translation Memory')
  .helpOption('-h, --help', 'Show help')
  .action(
    async (
      id: string | undefined,
      file: string | undefined,
      _options: unknown,
      command: Command
    ) => {
      ensureCredentials();
      await runSafely(() => importTmx(id, file, isRunningInInteractiveMode(command)));
    }
  );

export default memoryCommand;
