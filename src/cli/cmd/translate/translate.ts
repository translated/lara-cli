import { Command } from 'commander';

export default new Command()
  .command('translate')
  .description('Translate all files specified in the config file')
  .action(async () => {
  });
