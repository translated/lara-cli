#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command, Option } from 'commander';
import dotenv from 'dotenv';

dotenv.config({ debug: false, quiet: true });

import initCommand from './cli/cmd/init/init.js';
import translateCommand from './cli/cmd/translate/translate.js';
import memoryCommand from './cli/cmd/memory/memory.js';
import glossaryCommand from './cli/cmd/glossary/glossary.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };
const version = packageJson.version;

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
program.parse();

export default program;
