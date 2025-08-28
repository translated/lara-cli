import { Command } from 'commander';

/**
 * Checks if the CLI is running in interactive mode.
 * 
 * @param command - The command to check.
 * @returns True if the CLI is running in interactive mode, false otherwise.
 */
export function isRunningInInteractiveMode(command: Command) {
  return command.parent?.opts().nonInteractive === false;
}
