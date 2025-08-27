import { Command } from 'commander';

export function isRunningInInteractiveMode(command: Command) {
  return command.parent?.opts().nonInteractive === false;
}
