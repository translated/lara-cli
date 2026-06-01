import { Command } from 'commander';

/**
 * Checks if the CLI is running in interactive mode.
 *
 * @param command - The command to check.
 * @returns True if the CLI is running in interactive mode, false otherwise.
 */
export function isRunningInInteractiveMode(command: Command) {
  // optsWithGlobals walks up the parent chain so this works both for direct
  // children of the root program (init, translate) and for nested subcommands
  // (e.g. `memory create`, `glossary update`).
  return command.optsWithGlobals().nonInteractive === false;
}
