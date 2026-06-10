#!/usr/bin/env node

import { Command, Option } from 'commander';
import { ExitPromptError } from '@inquirer/core';
import dotenv from 'dotenv';

dotenv.config({ debug: false, quiet: true });

import { Messages } from './messages/messages.js';
import { getPackageVersion } from './utils/version.js';
import initCommand from './cli/cmd/init/init.js';
import translateCommand from './cli/cmd/translate/translate.js';
import memoryCommand from './cli/cmd/memory/memory.js';
import glossaryCommand from './cli/cmd/glossary/glossary.js';

const version = getPackageVersion();

const program = new Command()
  .name('lara-cli')
  .description('Lara CLI')
  .helpOption('-h, --help', 'Show help')
  .version(version)
  .addOption(new Option('-y --non-interactive', 'Run in non-interactive mode').default(false))
  .addCommand(initCommand)
  .addCommand(translateCommand)
  .addCommand(memoryCommand)
  .addCommand(glossaryCommand);

// Parse command line arguments
program.parseAsync().catch((error: unknown) => {
  if (error instanceof ExitPromptError) {
    console.log(`\n${Messages.info.operationCancelled}`);
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

export default program;
