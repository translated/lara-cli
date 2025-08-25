#!/usr/bin/env node

import { Command, Option } from 'commander';

import initCommand from './cli/cmd/init.js';

const program = new Command()
  .name('lara-cli')
  .description('Lara CLI')
  .helpOption('-h, --help', 'Show help')
  .version('0.0.1')
  .addOption(
    new Option('-y --non-interactive', 'Run in non-interactive mode')
      .default(false)
  )
  .addCommand(initCommand);

// Parse command line arguments
program.parse();

export default program;
