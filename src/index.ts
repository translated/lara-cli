#!/usr/bin/env node

import { Command, Option } from 'commander';
import dotenv from 'dotenv';
dotenv.config({ debug: false, quiet: true });

import initCommand from './cli/cmd/init/init.js';
import translateCommand from './cli/cmd/translate/translate.js';
import memoryCommand from './cli/cmd/memory/memory.js';

const program = new Command()
  .name('lara-cli')
  .description('Lara CLI')
  .helpOption('-h, --help', 'Show help')
  .version('0.0.1')
  .addOption(
    new Option('-y --non-interactive', 'Run in non-interactive mode')
      .default(false)
  )
  .addCommand(initCommand)
  .addCommand(translateCommand)
  .addCommand(memoryCommand);

// Parse command line arguments
program.parse();

export default program;
